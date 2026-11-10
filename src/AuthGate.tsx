import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar, ActivityIndicator, Modal, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

const BLUE = "#1D9BF0";
const interests = ["البرمجة", "الأمن السيبراني", "الذكاء الاصطناعي", "الشبكات", "تطوير التطبيقات", "تصميم UI/UX", "تحليل البيانات", "الحوسبة السحابية", "الألعاب", "التقنية وريادة الأعمال"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [needsInterests, setNeedsInterests] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [datePickerPart, setDatePickerPart] = useState<"day" | "month" | "year" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const loadProfile = async (user: any) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("interests,onboarding_completed").eq("id", user.id).maybeSingle();
    setNeedsInterests(!error && data?.onboarding_completed !== true);
  };

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const current = data.session;
      setSession(current);
      if (current?.user) await loadProfile(current.user);
      if (alive) setChecking(false);
    });
    const handleAuthUrl = async (url:string) => {
      try {
        if (url.includes("code=")) {
          await supabase.auth.exchangeCodeForSession(url);
          return;
        }
        const parsed = new URL(url.replace("#", "?"));
        const access_token = parsed.searchParams.get("access_token");
        const refresh_token = parsed.searchParams.get("refresh_token");
        if (access_token && refresh_token) await supabase.auth.setSession({access_token,refresh_token});
      } catch (error:any) { setNotice("تعذر فتح رابط الاستعادة: "+(error?.message||"الرابط غير صالح أو منتهي.")); }
    };
    Linking.getInitialURL().then(url=>{if(url?.startsWith("techcommunity://")) handleAuthUrl(url);});
    const urlSubscription=Linking.addEventListener("url",({url})=>{if(url.startsWith("techcommunity://")) handleAuthUrl(url);});
    const { data: listener } = supabase.auth.onAuthStateChange((event, current) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(current);
      if (current?.user) loadProfile(current.user);
      else { setNeedsInterests(false); setSelected([]); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); urlSubscription.remove(); };
  }, []);

  const strongPassword = (value: string) => value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  const normalizeBirthDate = (raw: string): string | null => {
    if (!raw) return null;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > days) return null;
    const normalized = String(year) + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");
    const now = new Date();
    const today = String(now.getFullYear()) + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    return normalized < today ? normalized : null;
  };
  const updateBirthDate = (day: string, month: string, year: string) => {
    setBirthDay(day); setBirthMonth(month); setBirthYear(year);
    setBirthDate(day && month && year ? year + "-" + month.padStart(2,"0") + "-" + day.padStart(2,"0") : "");
  };
  const daysInSelectedMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;
  const pickerOptions = datePickerPart === "year" ? Array.from({length:new Date().getFullYear()-1899},(_,i)=>String(new Date().getFullYear()-i)) : datePickerPart === "month" ? Array.from({length:12},(_,i)=>String(i+1)) : Array.from({length:daysInSelectedMonth},(_,i)=>String(i+1));

  const submit = async () => {
    if (!supabase) { setNotice("تعذر الاتصال بالخادم حالياً."); return; }
    setNotice("");
    let normalizedBirthDate: string | null = null;
    if (mode === "signup") {
      if (!name.trim() || !username.trim() || !email.trim()) { setNotice("أكمل الاسم واسم المستخدم والبريد الإلكتروني."); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) { setNotice("اسم المستخدم يجب أن يكون 3–20 حرفاً إنجليزياً أو رقماً أو _ فقط."); return; }
      if (birthDate) { normalizedBirthDate = normalizeBirthDate(birthDate); if (!normalizedBirthDate) { setNotice("اختر تاريخ ميلاد صحيحاً، أو اتركه فارغاً."); return; } }
      if (!strongPassword(password)) { setNotice("كلمة المرور ضعيفة. استخدم 10 خانات على الأقل مع حرف كبير وصغير ورقم ورمز."); return; }
      if (password !== confirmPassword) { setNotice("كلمتا المرور غير متطابقتين."); return; }
    } else if (!email.trim() || !password) { setNotice("أدخل البريد الإلكتروني وكلمة المرور."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data: usernameAvailable, error: usernameCheckError } = await supabase.rpc("is_username_available", { candidate: username.trim().toLowerCase() });
        if (usernameCheckError) throw usernameCheckError;
        if (!usernameAvailable) {
          setNotice("اسم المستخدم مستخدم مسبقاً. اختر اسم مستخدم آخر.");
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: name.trim(), username: username.trim().toLowerCase(), ...(normalizedBirthDate ? { date_of_birth: normalizedBirthDate } : {}), is_private: isPrivate, account_type: accountType, company_name: companyName.trim(), company_website: companyWebsite.trim(), company_industry: companyIndustry.trim() } }
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("الحساب أُنشئ لكن Supabase ما زال يطلب تأكيد البريد. عطّل Confirm email من إعدادات Authentication في Supabase ثم جرّب التسجيل.");
        } else {
          // The database trigger creates the profile from signup metadata.
          // Do not update account_type or verification fields from the client.
          setSession(data.session);
          setNeedsInterests(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        setSession(data.session);
        await loadProfile(data.user);
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      setNotice(msg.toLowerCase().includes("invalid login credentials") ? "البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من كتابتهما أو استخدم رابط استعادة كلمة المرور." : msg.toLowerCase().includes("email not confirmed") ? "يجب تأكيد البريد الإلكتروني أولاً. افتح رسالة التأكيد ثم سجّل الدخول." : msg.includes("already registered") ? "هذا البريد مسجل مسبقاً. جرّب تسجيل الدخول." : (e?.code === "23505" || msg.toLowerCase().includes("duplicate key") || msg.includes("profiles_username_key")) ? "اسم المستخدم مستخدم مسبقاً. اختر اسم مستخدم آخر." : "تعذر إكمال العملية: " + msg);
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if(!supabase||!email.trim()){setNotice("أدخل بريدك الإلكتروني أولاً لإرسال رابط استعادة كلمة المرور.");return;}
    setBusy(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: "techcommunity://reset-password" });
    setBusy(false);
    setNotice(error?("تعذر إرسال رابط الاستعادة: "+error.message):"إذا كان البريد مسجلاً، سيصلك رابط استعادة كلمة المرور.");
  };

  const saveNewPassword = async () => {
    if (!supabase || password.length < 10 || password !== confirmPassword) {
      setNotice(password.length < 10 ? "كلمة المرور يجب أن تكون 10 خانات على الأقل." : "كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setNotice("تعذر تحديث كلمة المرور: " + error.message); return; }
    setRecoveryMode(false); setPassword(""); setConfirmPassword(""); setNotice("تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");
    await supabase.auth.signOut();
  };

  const finishInterests = async (skip = false) => {
    if (!supabase || !session?.user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ interests: skip ? [] : selected, onboarding_completed: true }).eq("id", session.user.id);
    setBusy(false);
    if (error) { setNotice("تعذر حفظ الإعداد الأولي. تأكد من تشغيل آخر تحديث لقاعدة البيانات، ثم أعد المحاولة: " + error.message); return; }
    setNeedsInterests(false);
  };

  if (checking) return <SafeAreaView style={a.center}><ActivityIndicator color={BLUE} size="large" /></SafeAreaView>;
  if (recoveryMode) return <SafeAreaView style={a.safe}><StatusBar barStyle="dark-content" backgroundColor="#F5F8FA"/><ScrollView contentContainerStyle={a.auth}><Brand/><View style={a.card}><Text style={a.title}>تعيين كلمة مرور جديدة</Text><Text style={a.sub}>أدخل كلمة مرور جديدة لحسابك.</Text><Field label="كلمة المرور الجديدة" value={password} change={setPassword} placeholder="كلمة مرور قوية" secure visible={showPassword} autoComplete="new-password" toggleVisible={() => setShowPassword(v=>!v)}/><Field label="تأكيد كلمة المرور" value={confirmPassword} change={setConfirmPassword} placeholder="أعد كتابة كلمة المرور" secure visible={showConfirmPassword} autoComplete="new-password" toggleVisible={() => setShowConfirmPassword(v=>!v)}/>{!!notice&&<Text style={a.error}>{notice}</Text>}<Pressable style={a.primary} onPress={saveNewPassword} disabled={busy}><Text style={a.primaryText}>{busy?"جارٍ الحفظ...":"حفظ كلمة المرور الجديدة"}</Text></Pressable></View></ScrollView></SafeAreaView>;
  if (session && needsInterests) return <SafeAreaView style={a.safe}><StatusBar barStyle="dark-content" backgroundColor="#F5F8FA"/><ScrollView contentContainerStyle={a.onboard}>
    <Brand />
    <Text style={a.title}>شو المجالات اللي بتهمك؟</Text>
    <Text style={a.sub}>اختار مجالاتك، أو تخطَّ هذه الخطوة وغيّرها لاحقاً من الإعدادات.</Text>
    <View style={a.interests}>{interests.map(item => <Pressable key={item} onPress={() => setSelected(old => old.includes(item) ? old.filter(x => x !== item) : [...old, item])} style={[a.interest, selected.includes(item) && a.interestOn]}><Text style={[a.interestText, selected.includes(item) && a.interestTextOn]}>{item}</Text>{selected.includes(item) && <MaterialCommunityIcons name="check-circle" size={17} color={BLUE}/>}</Pressable>)}</View>
    {!!notice && <Text style={a.error}>{notice}</Text>}
    <Pressable style={a.primary} onPress={() => finishInterests(false)} disabled={busy}><Text style={a.primaryText}>{busy ? "جارٍ الحفظ..." : "متابعة"}</Text></Pressable>
    <Pressable style={a.skipButton} onPress={() => finishInterests(true)} disabled={busy}><Text style={a.skipText}>تخطي الآن</Text></Pressable>
  </ScrollView></SafeAreaView>;
  if (session) return <>{children}</>;
  return <SafeAreaView style={a.safe}><StatusBar barStyle="dark-content" backgroundColor="#F5F8FA"/><ScrollView contentContainerStyle={a.auth}>
    <Brand />
    <View style={a.card}>
      <Text style={a.title}>{mode === "signup" ? "انضم إلى مجتمع التقنية" : "أهلاً بعودتك"}</Text>
      <Text style={a.sub}>{mode === "signup" ? "أنشئ حسابك وابدأ بمشاركة اهتماماتك." : "سجّل الدخول للمتابعة إلى حسابك."}</Text>
      {mode === "signup" && <>
        <Field label="الاسم" value={name} change={setName} placeholder="اسمك الكامل"/>
        <Field label="اسم المستخدم" value={username} change={setUsername} placeholder="username" autoCapitalize="none" autoComplete="username"/>
        <Text style={a.label}>نوع الحساب</Text><View style={a.privacyRow}><Pressable style={[a.privacy,accountType==="personal"&&a.privacyOn]} onPress={()=>setAccountType("personal")}><Text style={[a.privacyText,accountType==="personal"&&a.privacyTextOn]}>شخصي</Text></Pressable><Pressable style={[a.privacy,accountType==="company"&&a.privacyOn]} onPress={()=>setAccountType("company")}><Text style={[a.privacyText,accountType==="company"&&a.privacyTextOn]}>شركة / مؤسسة</Text></Pressable></View>
        {accountType === "company" && <><Field label="اسم الشركة" value={companyName} change={setCompanyName} placeholder="اسم الشركة"/><Field label="الموقع الإلكتروني (اختياري)" value={companyWebsite} change={setCompanyWebsite} placeholder="https://example.com" autoCapitalize="none"/><Field label="مجال الشركة" value={companyIndustry} change={setCompanyIndustry} placeholder="مثلاً: التقنية"/></>}
        <Text style={a.label}>تاريخ الميلاد (اختياري)</Text>
        <View style={a.dateRow}>
          <Pressable style={a.dateChoice} onPress={() => setDatePickerPart("day")}><Text style={a.dateChoiceText}>{birthDay || "اليوم"}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#657786"/></Pressable>
          <Pressable style={a.dateChoice} onPress={() => setDatePickerPart("month")}><Text style={a.dateChoiceText}>{birthMonth ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][Number(birthMonth)-1] : "الشهر"}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#657786"/></Pressable>
          <Pressable style={a.dateChoice} onPress={() => setDatePickerPart("year")}><Text style={a.dateChoiceText}>{birthYear || "السنة"}</Text><MaterialCommunityIcons name="chevron-down" size={18} color="#657786"/></Pressable>
        </View>
        {!!birthDate && <Pressable onPress={() => updateBirthDate("","","")}><Text style={a.clearDate}>مسح تاريخ الميلاد</Text></Pressable>}
        <Field label="البريد الإلكتروني" value={email} change={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email"/>
        <Text style={a.label}>خصوصية الحساب</Text>
        <View style={a.privacyRow}>
          <Pressable style={[a.privacy, !isPrivate && a.privacyOn]} onPress={() => setIsPrivate(false)}><Text style={[a.privacyText, !isPrivate && a.privacyTextOn]}>عام</Text></Pressable>
          <Pressable style={[a.privacy, isPrivate && a.privacyOn]} onPress={() => setIsPrivate(true)}><Text style={[a.privacyText, isPrivate && a.privacyTextOn]}>خاص</Text></Pressable>
        </View>
      </>}
      {mode === "login" && <Field label="البريد الإلكتروني" value={email} change={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none"/>}
      <Field label="كلمة المرور" value={password} change={setPassword} placeholder="كلمة مرور قوية" secure visible={showPassword} autoComplete={mode==="signup"?"new-password":"current-password"} toggleVisible={() => setShowPassword(v => !v)}/>
      {mode === "signup" && <Pressable onPress={() => { const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"; let generated=""; for(let i=0;i<16;i++) generated+=chars[Math.floor(Math.random()*chars.length)]; setPassword(generated); setConfirmPassword(generated); setShowPassword(true); setShowConfirmPassword(true); }} style={{alignSelf:"flex-start",paddingVertical:8}}><Text style={{color:BLUE,fontSize:12,fontWeight:"800"}}>اقترح كلمة مرور قوية</Text></Pressable>}
      {mode === "signup" && <><Field label="تأكيد كلمة المرور" value={confirmPassword} change={setConfirmPassword} placeholder="أعد كتابة كلمة المرور" secure visible={showConfirmPassword} autoComplete="new-password" toggleVisible={() => setShowConfirmPassword(v => !v)}/><Text style={a.hint}>10 خانات على الأقل، حرف كبير وصغير ورقم ورمز.</Text></>}
      {!!notice && <Text style={a.error}>{notice}</Text>}
      <Pressable style={[a.primary, busy && {opacity:0.6}]} onPress={submit} disabled={busy}><Text style={a.primaryText}>{busy ? "لحظة..." : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}</Text></Pressable>
      <Pressable onPress={() => { setMode(mode === "signup" ? "login" : "signup"); setNotice(""); }}><Text style={a.switch}>{mode === "signup" ? "عندك حساب؟ سجّل الدخول" : "ما عندك حساب؟ أنشئ حساباً"}</Text></Pressable>
      {mode === "login" && <Pressable onPress={resetPassword} disabled={busy}><Text style={a.switch}>نسيت كلمة المرور؟ أرسل رابط استعادة</Text></Pressable>}
    </View>
    <Text style={a.legal}>Tech Community · Connect, learn and build</Text>
    <Modal visible={!!datePickerPart} transparent animationType="slide" onRequestClose={() => setDatePickerPart(null)}>
      <View style={a.modalBackdrop}><View style={a.dateModal}>
        <View style={a.modalHeader}><Text style={a.modalTitle}>{datePickerPart === "day" ? "اختر اليوم" : datePickerPart === "month" ? "اختر الشهر" : "اختر السنة"}</Text><Pressable onPress={() => setDatePickerPart(null)}><MaterialCommunityIcons name="close" size={23} color="#33424F"/></Pressable></View>
        <ScrollView style={a.optionsList}>{pickerOptions.map(option => <Pressable key={option} style={a.optionItem} onPress={() => {
          if (datePickerPart === "day") updateBirthDate(option,birthMonth,birthYear);
          if (datePickerPart === "month") updateBirthDate(birthDay && Number(birthDay) > new Date(Number(birthYear || new Date().getFullYear()),Number(option),0).getDate() ? "" : birthDay,option,birthYear);
          if (datePickerPart === "year") updateBirthDate(birthDay,birthMonth,option);
          setDatePickerPart(null);
        }}><Text style={a.optionText}>{datePickerPart === "month" ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][Number(option)-1] : option}</Text></Pressable>)}</ScrollView>
      </View></View>
    </Modal>
  </ScrollView></SafeAreaView>;
}

function Brand() { return <View style={a.brand}><View style={a.mark}><MaterialCommunityIcons name="orbit-variant" size={28} color="#FFFFFF"/></View><Text style={a.brandName}>Tech Community</Text><Text style={a.brandSub}>مساحة تجمع المهتمين بالتقنية</Text></View>; }
function Field({label,value,change,placeholder,secure,visible,toggleVisible,keyboardType,autoCapitalize,autoComplete}:any) { return <><Text style={a.label}>{label}</Text><View style={secure ? a.passwordWrap : undefined}><TextInput value={value} onChangeText={change} placeholder={placeholder} placeholderTextColor="#8B98A5" secureTextEntry={secure && !visible} keyboardType={keyboardType || "default"} autoCapitalize={autoCapitalize || "sentences"} autoComplete={autoComplete} textContentType={autoComplete==="new-password"?"newPassword":autoComplete==="current-password"?"password":autoComplete==="email"?"emailAddress":autoComplete==="username"?"username":undefined} importantForAutofill="yes" style={[a.input,secure && a.passwordInput]}/>{secure && <Pressable style={a.eyeButton} onPress={toggleVisible}><MaterialCommunityIcons name={visible ? "eye-off-outline" : "eye-outline"} size={21} color="#657786"/></Pressable>}</View></>; }

const a = StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F5F8FA"},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F5F8FA"},
 auth:{flexGrow:1,justifyContent:"center",padding:22,paddingTop:34,paddingBottom:30},onboard:{padding:22,paddingTop:45,paddingBottom:35},
 brand:{alignItems:"center",marginBottom:25},mark:{width:58,height:58,borderRadius:20,backgroundColor:BLUE,alignItems:"center",justifyContent:"center",marginBottom:10},brandName:{fontSize:23,fontWeight:"900",color:"#17202A"},brandSub:{fontSize:12,color:"#657786",marginTop:5},
 card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:20,borderWidth:1,borderColor:"#E6ECF0"},
 title:{fontSize:22,fontWeight:"900",color:"#17202A",textAlign:"center",marginBottom:7},sub:{fontSize:13,color:"#657786",textAlign:"center",lineHeight:21,marginBottom:17},
 label:{fontSize:12,fontWeight:"800",color:"#33424F",marginTop:13,marginBottom:7},input:{height:48,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,paddingHorizontal:13,color:"#17202A",backgroundColor:"#FFFFFF",textAlign:"left"},hint:{fontSize:10,color:"#657786",marginTop:5},
 dateRow:{flexDirection:"row",gap:7},dateChoice:{flex:1,height:48,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,backgroundColor:"#FFFFFF",paddingHorizontal:9,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},dateChoiceText:{fontSize:12,color:"#33424F"},clearDate:{fontSize:11,color:BLUE,marginTop:7,textAlign:"left"},
 passwordWrap:{position:"relative",justifyContent:"center"},passwordInput:{paddingRight:48},eyeButton:{position:"absolute",right:13,height:48,justifyContent:"center"},
 modalBackdrop:{flex:1,backgroundColor:"rgba(0,0,0,0.35)",justifyContent:"flex-end"},dateModal:{backgroundColor:"#FFFFFF",borderTopLeftRadius:22,borderTopRightRadius:22,padding:18,maxHeight:"65%"},modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingBottom:12,borderBottomWidth:1,borderBottomColor:"#E6ECF0"},modalTitle:{fontSize:17,fontWeight:"800",color:"#17202A"},optionsList:{marginTop:8},optionItem:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:"#F0F3F5"},optionText:{textAlign:"center",fontSize:15,color:"#33424F"},
 privacyRow:{flexDirection:"row",gap:8},privacy:{flex:1,padding:12,borderWidth:1,borderColor:"#CFD9DE",borderRadius:11,alignItems:"center"},privacyOn:{borderColor:BLUE,backgroundColor:"#E8F5FD"},privacyText:{fontSize:12,color:"#657786",fontWeight:"700"},privacyTextOn:{color:BLUE},
 primary:{height:49,backgroundColor:BLUE,borderRadius:25,alignItems:"center",justifyContent:"center",marginTop:20},primaryText:{color:"#FFFFFF",fontSize:14,fontWeight:"900"},switch:{color:BLUE,textAlign:"center",fontSize:12,fontWeight:"800",marginTop:18},error:{color:"#C0392B",fontSize:12,lineHeight:18,marginTop:12},legal:{textAlign:"center",fontSize:10,color:"#8B98A5",marginTop:22},
 skipButton:{height:46,borderWidth:1,borderColor:"#CFD9DE",borderRadius:24,alignItems:"center",justifyContent:"center",marginTop:10,backgroundColor:"#FFFFFF"},skipText:{color:"#536471",fontSize:13,fontWeight:"800"},
 interests:{flexDirection:"row",flexWrap:"wrap",gap:9,marginTop:20},interest:{paddingVertical:12,paddingHorizontal:13,borderWidth:1,borderColor:"#CFD9DE",borderRadius:22,backgroundColor:"#FFFFFF",flexDirection:"row",alignItems:"center",gap:7},interestOn:{borderColor:BLUE,backgroundColor:"#E8F5FD"},interestText:{fontSize:12,color:"#536471",fontWeight:"700"},interestTextOn:{color:BLUE}
});

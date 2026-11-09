import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, StatusBar, ActivityIndicator } from "react-native";
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
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProfile = async (user: any) => {
    if (!supabase) return;
    const { data } = await supabase.from("profiles").select("interests").eq("id", user.id).maybeSingle();
    setNeedsInterests(!data?.interests || data.interests.length === 0);
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      if (current?.user) loadProfile(current.user);
      else { setNeedsInterests(false); setSelected([]); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  const strongPassword = (value: string) => value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
  const validDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date < new Date();
  };

  const submit = async () => {
    if (!supabase) { setNotice("تعذر الاتصال بالخادم حالياً."); return; }
    setNotice("");
    if (mode === "signup") {
      if (!name.trim() || !username.trim() || !email.trim() || !birthDate.trim()) { setNotice("أكمل جميع الحقول المطلوبة."); return; }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) { setNotice("اسم المستخدم يجب أن يكون 3–20 حرفاً إنجليزياً أو رقماً أو _ فقط."); return; }
      if (!validDate(birthDate.trim())) { setNotice("اكتب تاريخ الميلاد بصيغة YYYY-MM-DD وتأكد أنه تاريخ صحيح."); return; }
      if (!strongPassword(password)) { setNotice("كلمة المرور ضعيفة. استخدم 10 خانات على الأقل مع حرف كبير وصغير ورقم ورمز."); return; }
      if (password !== confirmPassword) { setNotice("كلمتا المرور غير متطابقتين."); return; }
    } else if (!email.trim() || !password) { setNotice("أدخل البريد الإلكتروني وكلمة المرور."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: name.trim(), username: username.trim().toLowerCase(), date_of_birth: birthDate.trim(), is_private: isPrivate, account_type: "personal" } }
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("الحساب أُنشئ لكن Supabase ما زال يطلب تأكيد البريد. عطّل Confirm email من إعدادات Authentication في Supabase ثم جرّب التسجيل.");
        } else {
          setSession(data.session);
          await supabase.from("profiles").update({ username: username.trim().toLowerCase(), is_private: isPrivate }).eq("id", data.user!.id);
          await supabase.from("account_private_details").upsert({ user_id: data.user!.id, date_of_birth: birthDate.trim() });
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
      setNotice(msg.includes("already registered") ? "هذا البريد مسجل مسبقاً. جرّب تسجيل الدخول." : msg.includes("duplicate key") ? "اسم المستخدم مستخدم مسبقاً." : "تعذر إكمال العملية: " + msg);
    } finally { setBusy(false); }
  };

  const finishInterests = async () => {
    if (!supabase || !session?.user || selected.length === 0) { setNotice("اختر اهتماماً واحداً على الأقل."); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ interests: selected }).eq("id", session.user.id);
    setBusy(false);
    if (error) { setNotice("تعذر حفظ اهتماماتك: " + error.message); return; }
    setNeedsInterests(false);
  };

  if (checking) return <SafeAreaView style={a.center}><ActivityIndicator color={BLUE} size="large" /></SafeAreaView>;
  if (session && needsInterests) return <SafeAreaView style={a.safe}><StatusBar barStyle="dark-content" backgroundColor="#F5F8FA"/><ScrollView contentContainerStyle={a.onboard}>
    <Brand />
    <Text style={a.title}>شو المجالات اللي بتهمك؟</Text>
    <Text style={a.sub}>اختار مجالاً واحداً أو أكثر لنرتّب لك المحتوى المناسب.</Text>
    <View style={a.interests}>{interests.map(item => <Pressable key={item} onPress={() => setSelected(old => old.includes(item) ? old.filter(x => x !== item) : [...old, item])} style={[a.interest, selected.includes(item) && a.interestOn]}><Text style={[a.interestText, selected.includes(item) && a.interestTextOn]}>{item}</Text>{selected.includes(item) && <MaterialCommunityIcons name="check-circle" size={17} color={BLUE}/>}</Pressable>)}</View>
    {!!notice && <Text style={a.error}>{notice}</Text>}
    <Pressable style={a.primary} onPress={finishInterests} disabled={busy}><Text style={a.primaryText}>{busy ? "جارٍ الحفظ..." : "ابدأ استخدام المنصة"}</Text></Pressable>
  </ScrollView></SafeAreaView>;
  if (session) return <>{children}</>;
  return <SafeAreaView style={a.safe}><StatusBar barStyle="dark-content" backgroundColor="#F5F8FA"/><ScrollView contentContainerStyle={a.auth}>
    <Brand />
    <View style={a.card}>
      <Text style={a.title}>{mode === "signup" ? "انضم إلى مجتمع التقنية" : "أهلاً بعودتك"}</Text>
      <Text style={a.sub}>{mode === "signup" ? "أنشئ حسابك وابدأ بمشاركة اهتماماتك." : "سجّل الدخول للمتابعة إلى حسابك."}</Text>
      {mode === "signup" && <>
        <Field label="الاسم" value={name} change={setName} placeholder="اسمك الكامل"/>
        <Field label="اسم المستخدم" value={username} change={setUsername} placeholder="username" autoCapitalize="none"/>
        <Field label="تاريخ الميلاد" value={birthDate} change={setBirthDate} placeholder="YYYY-MM-DD"/>
        <Text style={a.hint}>مثال: 2008-04-21</Text>
        <Field label="البريد الإلكتروني" value={email} change={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none"/>
        <Text style={a.label}>خصوصية الحساب</Text>
        <View style={a.privacyRow}>
          <Pressable style={[a.privacy, !isPrivate && a.privacyOn]} onPress={() => setIsPrivate(false)}><Text style={[a.privacyText, !isPrivate && a.privacyTextOn]}>عام</Text></Pressable>
          <Pressable style={[a.privacy, isPrivate && a.privacyOn]} onPress={() => setIsPrivate(true)}><Text style={[a.privacyText, isPrivate && a.privacyTextOn]}>خاص</Text></Pressable>
        </View>
      </>}
      {mode === "login" && <Field label="البريد الإلكتروني" value={email} change={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none"/>}
      <Field label="كلمة المرور" value={password} change={setPassword} placeholder="كلمة مرور قوية" secure/>
      {mode === "signup" && <><Field label="تأكيد كلمة المرور" value={confirmPassword} change={setConfirmPassword} placeholder="أعد كتابة كلمة المرور" secure/><Text style={a.hint}>10 خانات على الأقل، حرف كبير وصغير ورقم ورمز.</Text></>}
      {!!notice && <Text style={a.error}>{notice}</Text>}
      <Pressable style={[a.primary, busy && {opacity:0.6}]} onPress={submit} disabled={busy}><Text style={a.primaryText}>{busy ? "لحظة..." : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}</Text></Pressable>
      <Pressable onPress={() => { setMode(mode === "signup" ? "login" : "signup"); setNotice(""); }}><Text style={a.switch}>{mode === "signup" ? "عندك حساب؟ سجّل الدخول" : "ما عندك حساب؟ أنشئ حساباً"}</Text></Pressable>
    </View>
    <Text style={a.legal}>Tech Community · Connect, learn and build</Text>
  </ScrollView></SafeAreaView>;
}

function Brand() { return <View style={a.brand}><View style={a.mark}><MaterialCommunityIcons name="orbit-variant" size={28} color="#FFFFFF"/></View><Text style={a.brandName}>Tech Community</Text><Text style={a.brandSub}>مساحة تجمع المهتمين بالتقنية</Text></View>; }
function Field({label,value,change,placeholder,secure,keyboardType,autoCapitalize}:any) { return <><Text style={a.label}>{label}</Text><TextInput value={value} onChangeText={change} placeholder={placeholder} placeholderTextColor="#8B98A5" secureTextEntry={secure} keyboardType={keyboardType || "default"} autoCapitalize={autoCapitalize || "sentences"} style={a.input}/></>; }

const a = StyleSheet.create({
 safe:{flex:1,backgroundColor:"#F5F8FA"},center:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#F5F8FA"},
 auth:{flexGrow:1,justifyContent:"center",padding:22,paddingTop:34,paddingBottom:30},onboard:{padding:22,paddingTop:45,paddingBottom:35},
 brand:{alignItems:"center",marginBottom:25},mark:{width:58,height:58,borderRadius:20,backgroundColor:BLUE,alignItems:"center",justifyContent:"center",marginBottom:10},brandName:{fontSize:23,fontWeight:"900",color:"#17202A"},brandSub:{fontSize:12,color:"#657786",marginTop:5},
 card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:20,borderWidth:1,borderColor:"#E6ECF0"},
 title:{fontSize:22,fontWeight:"900",color:"#17202A",textAlign:"center",marginBottom:7},sub:{fontSize:13,color:"#657786",textAlign:"center",lineHeight:21,marginBottom:17},
 label:{fontSize:12,fontWeight:"800",color:"#33424F",marginTop:13,marginBottom:7},input:{height:48,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,paddingHorizontal:13,color:"#17202A",backgroundColor:"#FFFFFF",textAlign:"left"},hint:{fontSize:10,color:"#657786",marginTop:5},
 privacyRow:{flexDirection:"row",gap:8},privacy:{flex:1,padding:12,borderWidth:1,borderColor:"#CFD9DE",borderRadius:11,alignItems:"center"},privacyOn:{borderColor:BLUE,backgroundColor:"#E8F5FD"},privacyText:{fontSize:12,color:"#657786",fontWeight:"700"},privacyTextOn:{color:BLUE},
 primary:{height:49,backgroundColor:BLUE,borderRadius:25,alignItems:"center",justifyContent:"center",marginTop:20},primaryText:{color:"#FFFFFF",fontSize:14,fontWeight:"900"},switch:{color:BLUE,textAlign:"center",fontSize:12,fontWeight:"800",marginTop:18},error:{color:"#C0392B",fontSize:12,lineHeight:18,marginTop:12},legal:{textAlign:"center",fontSize:10,color:"#8B98A5",marginTop:22},
 interests:{flexDirection:"row",flexWrap:"wrap",gap:9,marginTop:20},interest:{paddingVertical:12,paddingHorizontal:13,borderWidth:1,borderColor:"#CFD9DE",borderRadius:22,backgroundColor:"#FFFFFF",flexDirection:"row",alignItems:"center",gap:7},interestOn:{borderColor:BLUE,backgroundColor:"#E8F5FD"},interestText:{fontSize:12,color:"#536471",fontWeight:"700"},interestTextOn:{color:BLUE}
});

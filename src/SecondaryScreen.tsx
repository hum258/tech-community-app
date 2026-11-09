import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Props = { tab: string; isArabic: boolean; onBackHome: () => void };

const palette = {
  panel: "#0D1F32", border: "#1B344D", text: "#E8F4FF",
  muted: "#8FAAC2", cyan: "#69C9F3", deep: "#102943"
};

export default function SecondaryScreen({ tab, isArabic, onBackHome }: Props) {
  const ar = isArabic;
  const [registering, setRegistering] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exploreQuery, setExploreQuery] = useState("");
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const title = tab === "explore" ? (ar ? "استكشف المجتمع" : "Explore the community")
    : tab === "groups" ? (ar ? "المجتمعات التقنية" : "Technical communities")
    : tab === "messages" ? (ar ? "الرسائل" : "Messages")
    : (ar ? "ملفي الشخصي" : "My profile");

  const communities = [
    { icon: "shield-check-outline" as const, name: ar ? "الأمن السيبراني" : "Cybersecurity", detail: ar ? "نقاشات ومصادر ومشاركة خبرات" : "Discussions, resources and shared experience", members: "2.4K" },
    { icon: "code-tags" as const, name: ar ? "البرمجة وتطوير البرمجيات" : "Programming & Software", detail: ar ? "تطوير الويب والتطبيقات والبرمجيات" : "Web, mobile and software development", members: "3.1K" },
    { icon: "brain" as const, name: ar ? "الذكاء الاصطناعي" : "Artificial Intelligence", detail: ar ? "تعلم الآلة وأدوات الذكاء الاصطناعي" : "Machine learning and AI tools", members: "1.8K" },
    { icon: "lan" as const, name: ar ? "الشبكات والبنية التحتية" : "Networks & Infrastructure", detail: ar ? "الشبكات والأنظمة والحوسبة السحابية" : "Networks, systems and cloud", members: "960" }
  ];

  const suggestions = [
    { icon: "account-circle-outline" as const, name: ar ? "أشخاص في مجالك" : "People in your field", detail: ar ? "اكتشف أعضاء يشاركونك الاهتمامات" : "Find members with similar interests" },
    { icon: "folder-star-outline" as const, name: ar ? "مشاريع المجتمع" : "Community projects", detail: ar ? "تعرّف على مشاريع وأفكار جديدة" : "Discover new projects and ideas" },
    { icon: "briefcase-outline" as const, name: ar ? "فرص وتدريب" : "Jobs & training", detail: ar ? "فرص مهنية وتدريبية للمجتمع" : "Career and learning opportunities" }
  ];

  return (
    <View style={s.wrap}>
      <Text style={[s.eyebrow, ar && s.rtl]}>{ar ? "مساحتك التقنية" : "YOUR TECH SPACE"}</Text>
      <Text style={[s.title, ar && s.rtl]}>{title}</Text>
      {tab === "explore" && <>
        <View style={s.search}><MaterialCommunityIcons name="magnify" size={20} color={palette.muted}/><TextInput value={exploreQuery} onChangeText={setExploreQuery} placeholder={ar ? "ابحث عن تخصص..." : "Search specialties..."} placeholderTextColor="#7188A2" style={[s.searchInput, ar && s.rtl]}/></View>
        {suggestions.map((x, i) => <View key={i} style={s.rowCard}><View style={s.icon}><MaterialCommunityIcons name={x.icon} size={22} color={palette.cyan}/></View><View style={s.flex}><Text style={[s.cardTitle, ar && s.rtl]}>{x.name}</Text><Text style={[s.detail, ar && s.rtl]}>{x.detail}</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color={palette.muted}/></View>)}
        <Text style={[s.section, ar && s.rtl]}>{ar ? "تخصصات شائعة" : "Popular specialties"}</Text>
        <View style={s.tags}>{communities.filter(x => x.name.toLowerCase().includes(exploreQuery.trim().toLowerCase()) || x.detail.toLowerCase().includes(exploreQuery.trim().toLowerCase())).map(x => <View key={x.name} style={s.tag}><Text style={s.tagText}>{x.name}</Text></View>)}</View>
      </>}
      {tab === "groups" && <>
        <Text style={[s.intro, ar && s.rtl]}>{ar ? "انضم إلى مجتمعات حسب تخصصك وشارك المعرفة والمشاريع." : "Join communities by specialty and share knowledge and projects."}</Text>
        {communities.map(x => { const joined = joinedCommunities.includes(x.name); return <View key={x.name} style={s.communityCard}><View style={s.row}><View style={s.icon}><MaterialCommunityIcons name={x.icon} size={23} color={palette.cyan}/></View><View style={s.flex}><Text style={[s.cardTitle, ar && s.rtl]}>{x.name}</Text><Text style={[s.detail, ar && s.rtl]}>{x.detail}</Text></View></View><View style={s.communityFoot}><Text style={s.detail}>{x.members} {ar ? "عضو" : "members"}</Text><Pressable onPress={() => setJoinedCommunities(old => joined ? old.filter(name => name !== x.name) : [...old, x.name])} style={[s.join, joined && s.joined]}><Text style={[s.joinText, joined && s.joinedText]}>{joined ? (ar ? "تم الانضمام" : "Joined") : (ar ? "انضمام" : "Join")}</Text></Pressable></View></View>; })}
      </>}
      {tab === "messages" && <>
        <View style={s.notice}><MaterialCommunityIcons name="lock-outline" size={21} color={palette.cyan}/><Text style={[s.noticeText, ar && s.rtl]}>{ar ? "ستظهر محادثاتك هنا بعد تفعيل الحسابات والرسائل الخاصة." : "Your conversations will appear here when accounts and direct messaging are connected."}</Text></View>
        <View style={s.empty}><MaterialCommunityIcons name="message-text-outline" size={38} color="#52718E"/><Text style={s.emptyTitle}>{ar ? "لا توجد محادثات بعد" : "No conversations yet"}</Text><Text style={s.detail}>{ar ? "ابدأ بالتواصل مع أعضاء المجتمع لاحقاً." : "Connect with community members here later."}</Text></View>
      </>}
      {tab === "profile" && <>
        {!registering ? <>
          <View style={s.profileCard}><View style={s.profileAvatar}><MaterialCommunityIcons name="account" size={36} color={palette.cyan}/></View><Text style={s.profileName}>{ar ? "ملفك التقني" : "Your tech profile"}</Text><Text style={s.detail}>{ar ? "أنشئ حسابك وابدأ ببناء هويتك التقنية." : "Create your account and start building your tech identity."}</Text><Pressable style={s.join} onPress={() => { setRegistering(true); setRegistrationNotice(""); }}><Text style={s.joinText}>{ar ? "إنشاء حساب جديد" : "Create an account"}</Text></Pressable></View>
          <View style={s.rowCard}><MaterialCommunityIcons name="folder-outline" size={21} color={palette.cyan}/><Text style={[s.cardTitle, s.flex, ar && s.rtl]}>{ar ? "معرض المشاريع" : "Project portfolio"}</Text><MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted}/></View>
          <View style={s.rowCard}><MaterialCommunityIcons name="cog-outline" size={21} color={palette.cyan}/><Text style={[s.cardTitle, s.flex, ar && s.rtl]}>{ar ? "الإعدادات والخصوصية" : "Settings & privacy"}</Text><MaterialCommunityIcons name="chevron-right" size={20} color={palette.muted}/></View>
          <View style={s.verifyCard}>
            <Text style={[s.verifyTitle, ar && s.rtl]}>{ar ? "التوثيق المجاني" : "Free verification"}</Text>
            <Text style={[s.detail, ar && s.rtl]}>{ar ? "التوثيق تلقائي ومجاني فور إنشاء الحساب." : "Verification is automatic and free as soon as an account is created."}</Text>
            <View style={s.verifyRow}>
              <MaterialCommunityIcons name="check-decagram" size={22} color="#35AFFF"/>
              <View style={s.flex}><Text style={s.verifyName}>{ar ? "الحسابات الشخصية" : "Personal accounts"}</Text><Text style={s.verifyDetail}>{ar ? "شارة زرقاء" : "Blue badge"}</Text></View>
              <Text style={s.freeLabel}>{ar ? "مجاني" : "FREE"}</Text>
            </View>
            <View style={s.verifyRow}>
              <MaterialCommunityIcons name="check-decagram" size={22} color="#B8C3D0"/>
              <View style={s.flex}><Text style={s.verifyName}>{ar ? "الشركات والمؤسسات" : "Companies & organizations"}</Text><Text style={s.verifyDetail}>{ar ? "شارة فضية" : "Silver badge"}</Text></View>
              <Text style={s.freeLabel}>{ar ? "مجاني" : "FREE"}</Text>
            </View>
            <Text style={[s.verifyFoot, ar && s.rtl]}>{ar ? "تظهر الشارة تلقائياً عند إنشاء الحساب: زرقاء للشخصي وفضية للشركات، دون طلب أو انتظار." : "The badge is assigned automatically at signup: blue for personal accounts and silver for companies, with no application or waiting."}</Text>
          </View>
        </> : <>
          <View style={s.formCard}>
            <Text style={[s.formHeading, ar && s.rtl]}>{ar ? "أنشئ حسابك" : "Create your account"}</Text>
            <Text style={[s.detail, ar && s.rtl]}>{ar ? "اختر نوع الحساب ثم أدخل بياناتك الأساسية." : "Choose an account type and enter your basic details."}</Text>
            <Text style={[s.fieldLabel, ar && s.rtl]}>{ar ? "نوع الحساب" : "ACCOUNT TYPE"}</Text>
            <View style={s.typeRow}>
              <Pressable onPress={() => setAccountType("personal")} style={[s.typeOption, accountType === "personal" && s.typeSelected]}>
                <MaterialCommunityIcons name="account-outline" size={21} color={accountType === "personal" ? palette.cyan : palette.muted}/>
                <Text style={[s.typeText, accountType === "personal" && s.typeTextSelected]}>{ar ? "شخصي" : "Personal"}</Text>
              </Pressable>
              <Pressable onPress={() => setAccountType("company")} style={[s.typeOption, accountType === "company" && s.typeSelected]}>
                <MaterialCommunityIcons name="domain" size={21} color={accountType === "company" ? palette.cyan : palette.muted}/>
                <Text style={[s.typeText, accountType === "company" && s.typeTextSelected]}>{ar ? "شركة / مؤسسة" : "Company"}</Text>
              </Pressable>
            </View>
            <Text style={[s.fieldLabel, ar && s.rtl]}>{accountType === "personal" ? (ar ? "الاسم الكامل" : "FULL NAME") : (ar ? "اسم الشركة أو المؤسسة" : "COMPANY NAME")}</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder={accountType === "personal" ? (ar ? "اكتب اسمك" : "Your name") : (ar ? "اكتب اسم الشركة" : "Company name")} placeholderTextColor="#7188A2" style={[s.fieldInput, ar && s.rtl]}/>
            <Text style={[s.fieldLabel, ar && s.rtl]}>{ar ? "البريد الإلكتروني" : "EMAIL ADDRESS"}</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="name@example.com" placeholderTextColor="#7188A2" style={s.fieldInput}/>
            <Text style={[s.fieldLabel, ar && s.rtl]}>{ar ? "كلمة المرور" : "PASSWORD"}</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={ar ? "8 أحرف على الأقل" : "At least 8 characters"} placeholderTextColor="#7188A2" style={s.fieldInput}/>
            <Pressable style={[s.submit, submitting && { opacity: 0.65 }]} disabled={submitting} onPress={async () => {
              if (!fullName.trim() || !email.trim() || password.length < 8) {
                setRegistrationNotice(ar ? "أكمل الاسم والبريد الإلكتروني، واجعل كلمة المرور 8 أحرف على الأقل." : "Enter your name and email, and use a password of at least 8 characters.");
                return;
              }
              if (!isSupabaseConfigured || !supabase) {
                setRegistrationNotice(ar ? "الاتصال بقاعدة البيانات غير مهيأ حالياً." : "Database connection is not configured yet.");
                return;
              }
              setSubmitting(true);
              setRegistrationNotice("");
              try {
                const { data, error } = await supabase.auth.signUp({
                  email: email.trim().toLowerCase(),
                  password,
                  options: { data: { account_type: accountType, display_name: fullName.trim() } }
                });
                if (error) throw error;
                if (data.session) {
                  setRegistrationNotice(ar ? "تم إنشاء حسابك وتسجيل دخولك بنجاح. ستُمنح شارة التوثيق تلقائياً حسب نوع الحساب بعد تفعيل قاعدة البيانات." : "Your account was created and you are signed in. Your badge is assigned automatically by account type once the database trigger is active.");
                } else {
                  setRegistrationNotice(ar ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول." : "Account created. Check your email to confirm it, then sign in.");
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                setRegistrationNotice((ar ? "تعذر إنشاء الحساب: " : "Could not create account: ") + message);
              } finally {
                setSubmitting(false);
              }
            }}>
              <Text style={s.submitText}>{submitting ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء الحساب" : "Create account")}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color="#071426"/>
            </Pressable>
            {registrationNotice ? <View style={s.formNotice}><MaterialCommunityIcons name="information-outline" size={18} color={palette.cyan}/><Text style={s.noticeText}>{registrationNotice}</Text></View> : null}
            <Pressable onPress={() => { setRegistering(false); setRegistrationNotice(""); }} style={s.backForm}><Text style={s.backText}>{ar ? "العودة إلى الملف الشخصي" : "Back to profile"}</Text></Pressable>
          </View>
        </>}
      </>}
      <Pressable onPress={onBackHome} style={s.back}><MaterialCommunityIcons name="home-outline" size={18} color={palette.cyan}/><Text style={s.backText}>{ar ? "العودة للرئيسية" : "Back to Home"}</Text></Pressable>
      <Text style={[s.footnote, ar && s.rtl]}>{ar ? "واجهة تجريبية — بعض الوظائف ستُفعّل عند ربط الخادم وقاعدة البيانات." : "Prototype screen — some features will be enabled after backend integration."}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:{paddingTop:12,paddingBottom:25},
  eyebrow:{color:"#6EC6EA",fontSize:9,fontWeight:"900",letterSpacing:1.4,marginBottom:7},
  title:{color:palette.text,fontSize:22,fontWeight:"900",marginBottom:17},
  intro:{color:palette.muted,fontSize:12,lineHeight:21,marginBottom:14},
  search:{height:49,backgroundColor:"#0D2034",borderWidth:1,borderColor:palette.border,borderRadius:14,paddingHorizontal:12,flexDirection:"row",alignItems:"center",gap:9,marginBottom:15},
  searchInput:{flex:1,color:palette.text,fontSize:12,paddingVertical:0},
  rowCard:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:15,padding:14,flexDirection:"row",alignItems:"center",gap:11,marginBottom:10},
  icon:{width:42,height:42,borderRadius:13,backgroundColor:"#15334B",alignItems:"center",justifyContent:"center"},
  flex:{flex:1},
  cardTitle:{color:palette.text,fontSize:13,fontWeight:"800"},
  detail:{color:palette.muted,fontSize:10,lineHeight:17,marginTop:4},
  section:{color:palette.text,fontSize:14,fontWeight:"900",marginTop:14,marginBottom:10},
  tags:{flexDirection:"row",flexWrap:"wrap",gap:8},
  tag:{backgroundColor:"#15334B",borderRadius:10,paddingHorizontal:11,paddingVertical:8},
  tagText:{color:"#8EDCFA",fontSize:10,fontWeight:"700"},
  communityCard:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:16,padding:13,marginBottom:10},
  row:{flexDirection:"row",alignItems:"center",gap:10},
  communityFoot:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:palette.border},
  join:{backgroundColor:"#69C9F3",paddingHorizontal:14,paddingVertical:8,borderRadius:10},
  joinText:{color:"#071426",fontSize:10,fontWeight:"900"},
  joined:{backgroundColor:"#15334B",borderWidth:1,borderColor:"#39718F"},
  joinedText:{color:"#A5E5FF"},
  notice:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#102943",borderWidth:1,borderColor:"#28516D",borderRadius:14,padding:13},
  noticeText:{color:"#B6D0E3",fontSize:11,lineHeight:19,flex:1},
  empty:{alignItems:"center",paddingVertical:55,gap:8},
  emptyTitle:{color:palette.text,fontSize:15,fontWeight:"800"},
  profileCard:{alignItems:"center",backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:18,padding:22,marginBottom:12},
  verifyCard:{backgroundColor:"#0D1F32",borderWidth:1,borderColor:"#29445D",borderRadius:16,padding:14,marginTop:5,marginBottom:12},
  verifyTitle:{color:palette.text,fontSize:14,fontWeight:"900"},
  verifyRow:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#102943",padding:11,borderRadius:12,marginTop:10},
  verifyName:{color:palette.text,fontSize:11,fontWeight:"800"},
  verifyDetail:{color:palette.muted,fontSize:10,marginTop:3},
  freeLabel:{color:"#83DDBB",fontSize:9,fontWeight:"900"},
  verifyFoot:{color:"#718BA4",fontSize:9,lineHeight:15,marginTop:10},
  formCard:{backgroundColor:palette.panel,borderWidth:1,borderColor:palette.border,borderRadius:18,padding:16},
  formHeading:{color:palette.text,fontSize:18,fontWeight:"900",marginBottom:5},
  fieldLabel:{color:"#78CBEF",fontSize:9,fontWeight:"900",letterSpacing:1,marginTop:17,marginBottom:8},
  typeRow:{flexDirection:"row",gap:9},
  typeOption:{flex:1,minHeight:53,backgroundColor:"#102943",borderWidth:1,borderColor:palette.border,borderRadius:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,padding:8},
  typeSelected:{borderColor:palette.cyan,backgroundColor:"#153B56"},
  typeText:{color:palette.muted,fontSize:11,fontWeight:"700"},
  typeTextSelected:{color:"#A5E5FF"},
  fieldInput:{height:47,backgroundColor:"#091A2B",borderWidth:1,borderColor:palette.border,borderRadius:11,paddingHorizontal:12,color:palette.text,fontSize:12},
  submit:{height:46,backgroundColor:palette.cyan,borderRadius:11,marginTop:21,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},
  submitText:{color:"#071426",fontWeight:"900",fontSize:12},
  formNotice:{flexDirection:"row",gap:8,alignItems:"center",backgroundColor:"#102943",padding:11,borderRadius:10,marginTop:12},
  backForm:{alignItems:"center",padding:12,marginTop:5},
  profileAvatar:{width:70,height:70,borderRadius:23,backgroundColor:"#15334B",alignItems:"center",justifyContent:"center",marginBottom:12},
  profileName:{color:palette.text,fontSize:16,fontWeight:"900",marginBottom:4},
  back:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:20,padding:12},
  backText:{color:palette.cyan,fontSize:12,fontWeight:"800"},
  footnote:{color:"#647F98",fontSize:9,lineHeight:16,textAlign:"center",marginTop:8},
  rtl:{textAlign:"right",writingDirection:"rtl"}
});

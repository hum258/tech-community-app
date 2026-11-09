import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

type Props = { tab: string; isArabic: boolean; onBackHome: () => void };
type Profile = { id:string; account_type:"personal"|"company"; display_name:string; username:string; bio:string; specialty:string|null; is_private:boolean; interests:string[]; company_name:string|null; company_website:string|null; company_industry:string|null; verification_status:string; verified_at:string|null };
type Community = { id:string; name:string; description:string; specialty:string };
type Conversation = { id:string; created_at:string; peerName:string; peerUsername:string };

const C = { blue:"#1D9BF0", ink:"#17202A", muted:"#657786", line:"#E6ECF0", pale:"#F5F8FA", white:"#FFFFFF", green:"#168A62", red:"#D9485F" };

export default function SecondaryScreen({tab,isArabic,onBackHome}:Props) {
  const ar=isArabic;
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [userId,setUserId]=useState("");
  const [profile,setProfile]=useState<Profile|null>(null);
  const [communities,setCommunities]=useState<Community[]>([]);
  const [joined,setJoined]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [edit,setEdit]=useState(false);
  const [displayName,setDisplayName]=useState("");
  const [username,setUsername]=useState("");
  const [bio,setBio]=useState("");
  const [specialty,setSpecialty]=useState("");
  const [privateAccount,setPrivateAccount]=useState(false);
  const [requestReason,setRequestReason]=useState("");
  const [evidenceUrl,setEvidenceUrl]=useState("");
  const [requestStatus,setRequestStatus]=useState("");
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [targetUsername,setTargetUsername]=useState("");
  const [activeConversation,setActiveConversation]=useState<string|null>(null);
  const [activePeer,setActivePeer]=useState("");
  const [messages,setMessages]=useState<any[]>([]);
  const [messageDraft,setMessageDraft]=useState("");

  const loadProfile=useCallback(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    setUserId(user.id);
    const {data}=await supabase.from("profiles").select("id,account_type,display_name,username,bio,specialty,is_private,interests,company_name,company_website,company_industry,verification_status,verified_at").eq("id",user.id).maybeSingle();
    if(data){const p=data as Profile;setProfile(p);setDisplayName(p.display_name||"");setUsername(p.username||"");setBio(p.bio||"");setSpecialty(p.specialty||"");setPrivateAccount(!!p.is_private);}
    const {data:req}=await supabase.from("verification_requests").select("status,reviewer_note").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(req)setRequestStatus(req.status+(req.reviewer_note?" — "+req.reviewer_note:""));
  },[]);

  const loadGroups=useCallback(async()=>{
    if(!supabase)return;
    const {data:rows}=await supabase.from("communities").select("id,name,description,specialty").order("name");
    if(rows)setCommunities(rows as Community[]);
    const {data:{user}}=await supabase.auth.getUser();
    if(user){const {data:members}=await supabase.from("community_members").select("community_id").eq("user_id",user.id);setJoined((members||[]).map((m:any)=>m.community_id));}
  },[]);

  const loadMessages=useCallback(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();if(!user)return;
    const {data:rows}=await supabase.from("conversation_members").select("conversation_id,conversations(id,created_at,conversation_members(user_id,profiles(display_name,username)))").eq("user_id",user.id);
    const mapped:Conversation[]=(rows||[]).map((r:any)=>{
      const conv=Array.isArray(r.conversations)?r.conversations[0]:r.conversations;
      const members=conv?.conversation_members||[];
      const peer=members.find((m:any)=>m.user_id!==user.id);
      const p=peer?.profiles||{};
      return {id:conv?.id||r.conversation_id,created_at:conv?.created_at||"",peerName:p.display_name||"عضو",peerUsername:p.username||""};
    }).filter(x=>!!x.id);
    setConversations(mapped);
  },[]);

  useEffect(()=>{if(tab==="profile")loadProfile();if(tab==="groups")loadGroups();if(tab==="messages")loadMessages();},[tab,loadProfile,loadGroups,loadMessages]);

  const showNotice=(v:string)=>setNotice(v);
  const saveProfile=async()=>{
    if(!supabase||!userId||!displayName.trim()||!username.trim()){showNotice(ar?"الاسم واسم المستخدم مطلوبان.":"Name and username are required.");return;}
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())){showNotice(ar?"اسم المستخدم يجب أن يكون 3–20 حرفاً أو رقماً أو _.":"Username must be 3–20 letters, numbers or underscores.");return;}
    setBusy(true);const {error}=await supabase.from("profiles").update({display_name:displayName.trim(),username:username.trim().toLowerCase(),bio:bio.trim(),specialty:specialty.trim()||null,is_private:privateAccount}).eq("id",userId);setBusy(false);
    if(error){showNotice(error.message);return;}setEdit(false);showNotice(ar?"تم حفظ الملف الشخصي.":"Profile saved.");loadProfile();
  };

  const toggleCommunity=async(id:string)=>{
    if(!supabase||!userId)return;
    const isJoined=joined.includes(id);setBusy(true);
    const result=isJoined?await supabase.from("community_members").delete().eq("community_id",id).eq("user_id",userId):await supabase.from("community_members").insert({community_id:id,user_id:userId,role:"member"});
    setBusy(false);if(result.error){showNotice(result.error.message);return;}
    setJoined(old=>isJoined?old.filter(x=>x!==id):[...old,id]);
  };

  const submitVerification=async()=>{
    if(!supabase||!userId||!profile)return;
    if(requestReason.trim().length<20){showNotice(ar?"اكتب سبباً واضحاً لا يقل عن 20 حرفاً.":"Please provide a reason of at least 20 characters.");return;}
    if(profile.verification_status==="approved"){showNotice(ar?"حسابك موثّق بالفعل.":"Your account is already verified.");return;}
    setBusy(true);
    const {error}=await supabase.from("verification_requests").insert({user_id:userId,account_type:profile.account_type,reason:requestReason.trim(),evidence_url:evidenceUrl.trim()||null,status:"pending"});
    setBusy(false);if(error){showNotice(error.code==="23505"?(ar?"لديك طلب قيد المراجعة بالفعل.":"You already have a pending request."):error.message);return;}
    setRequestStatus("pending");setRequestReason("");setEvidenceUrl("");showNotice(ar?"تم إرسال طلب التوثيق للمراجعة اليدوية.":"Verification request submitted for manual review.");
    loadProfile();
  };

  const startConversation=async()=>{
    if(!supabase||!targetUsername.trim())return;
    setBusy(true);
    const {data:person,error:findError}=await supabase.from("profiles").select("id,display_name,username").eq("username",targetUsername.trim().replace(/^@/,"").toLowerCase()).maybeSingle();
    if(findError||!person){setBusy(false);showNotice(ar?"لم نعثر على هذا المستخدم أو أن حسابه غير متاح.":"User not found or unavailable.");return;}
    if(person.id===userId){setBusy(false);showNotice(ar?"لا يمكنك بدء محادثة مع نفسك.":"You cannot message yourself.");return;}
    const {data,error}=await supabase.rpc("create_direct_conversation",{target_user:person.id});
    setBusy(false);if(error||!data){showNotice(error?.message||"Could not create conversation.");return;}
    setActiveConversation(data);setActivePeer(person.display_name||person.username);setTargetUsername("");await loadMessages();await loadConversationMessages(data);
  };

  const loadConversationMessages=async(id:string)=>{
    if(!supabase)return;
    const {data,error}=await supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(100);
    if(error){showNotice(error.message);return;}setMessages(data||[]);
  };

  const sendMessage=async()=>{
    if(!supabase||!userId||!activeConversation||!messageDraft.trim())return;
    const body=messageDraft.trim();setBusy(true);
    const {error}=await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:userId,body});
    setBusy(false);if(error){showNotice(error.message);return;}setMessageDraft("");await loadConversationMessages(activeConversation);
  };

  const title=tab==="explore"?(ar?"استكشف المجتمع":"Explore"):tab==="groups"?(ar?"المجتمعات التقنية":"Communities"):tab==="messages"?(ar?"الرسائل":"Messages"):(ar?"ملفي الشخصي":"My profile");
  const Field=({label,value,onChange,placeholder,multiline=false}:any)=><View style={{marginTop:12}}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9AA8B2" multiline={multiline} style={[s.input,multiline&&{height:90,textAlignVertical:"top",paddingTop:12},ar&&s.rtl]}/></View>;
  const Button=({label,onPress,disabled=false}:any)=><Pressable disabled={disabled||busy} onPress={onPress} style={[s.button,(disabled||busy)&&{opacity:.55}]}><Text style={s.buttonText}>{busy? (ar?"جارٍ التنفيذ...":"Please wait..."):label}</Text></Pressable>;

  return <View style={s.wrap}>
    <Text style={s.eyebrow}>{ar?"مساحتك التقنية":"YOUR TECH SPACE"}</Text>
    <Text style={[s.title,ar&&s.rtl]}>{title}</Text>
    {!!notice&&<View style={s.notice}><Text style={[s.noticeText,ar&&s.rtl]}>{notice}</Text><Pressable onPress={()=>setNotice("")}><MaterialCommunityIcons name="close" size={17} color={C.muted}/></Pressable></View>}

    {tab==="explore"&&<>
      <TextInput value={query} onChangeText={setQuery} placeholder={ar?"ابحث عن مجتمعات وتخصصات...":"Search communities and topics..."} placeholderTextColor="#9AA8B2" style={[s.input,ar&&s.rtl]}/>
      {communities.filter(x=>(x.name+" "+x.description+" "+x.specialty).toLowerCase().includes(query.toLowerCase())).map(x=><View key={x.id} style={s.card}><Text style={s.cardTitle}>{x.name}</Text><Text style={s.detail}>{x.description}</Text><Text style={s.tag}>{x.specialty}</Text></View>)}
      <Button label={ar?"عرض المجتمعات":"View communities"} onPress={onBackHome}/>
    </>}

    {tab==="groups"&&<>
      <Text style={[s.detail,ar&&s.rtl]}>{ar?"انضم إلى مجتمعك المفضل، وسيبقى انضمامك محفوظاً بحسابك.":"Join a community; your membership is saved to your account."}</Text>
      {communities.map(x=>{const yes=joined.includes(x.id);return <View key={x.id} style={s.card}><Text style={[s.cardTitle,ar&&s.rtl]}>{x.name}</Text><Text style={[s.detail,ar&&s.rtl]}>{x.description}</Text><View style={s.cardFoot}><Text style={s.tag}>{x.specialty}</Text><Pressable onPress={()=>toggleCommunity(x.id)} style={[s.smallButton,yes&&s.secondaryButton]}><Text style={[s.smallButtonText,yes&&s.secondaryButtonText]}>{yes?(ar?"مغادرة":"Leave"):(ar?"انضمام":"Join")}</Text></Pressable></View></View>})}
    </>}

    {tab==="profile"&&<>
      {!profile?<ActivityIndicator color={C.blue}/>:<>
        <View style={s.profileCard}><View style={s.avatar}><MaterialCommunityIcons name={profile.account_type==="company"?"domain":"account"} size={31} color={C.blue}/></View><Text style={s.profileName}>{profile.display_name}</Text><Text style={s.detail}>@{profile.username}</Text><Text style={s.detail}>{profile.account_type==="company"?(ar?"حساب شركة":"Company account"):(ar?"حساب شخصي":"Personal account")}</Text><Text style={s.detail}>{profile.is_private?(ar?"حساب خاص":"Private account"):(ar?"حساب عام":"Public account")}</Text><View style={s.tags}>{(profile.interests||[]).map(x=><Text key={x} style={s.tag}>{x}</Text>)}</View></View>
        <Button label={edit?(ar?"إلغاء التعديل":"Cancel edit"):(ar?"تعديل الملف الشخصي":"Edit profile")} onPress={()=>setEdit(!edit)} disabled={busy}/>
        {edit&&<View style={s.card}><Field label={ar?"الاسم":"Display name"} value={displayName} onChange={setDisplayName}/><Field label={ar?"اسم المستخدم":"Username"} value={username} onChange={setUsername}/><Field label={ar?"نبذة":"Bio"} value={bio} onChange={setBio} multiline/><Field label={ar?"التخصص":"Specialty"} value={specialty} onChange={setSpecialty}/><Text style={s.label}>{ar?"خصوصية الحساب":"Account privacy"}</Text><View style={s.row}><Pressable onPress={()=>setPrivateAccount(false)} style={[s.choice,!privateAccount&&s.choiceOn]}><Text style={s.choiceText}>{ar?"عام":"Public"}</Text></Pressable><Pressable onPress={()=>setPrivateAccount(true)} style={[s.choice,privateAccount&&s.choiceOn]}><Text style={s.choiceText}>{ar?"خاص":"Private"}</Text></Pressable></View><Button label={ar?"حفظ التعديلات":"Save changes"} onPress={saveProfile}/></View>}
        <View style={s.card}><View style={s.cardFoot}><Text style={s.cardTitle}>{ar?"توثيق الحساب":"Account verification"}</Text><MaterialCommunityIcons name={profile.verification_status==="approved"?"check-decagram":"shield-check-outline"} size={23} color={profile.verification_status==="approved"?C.green:C.blue}/></View><Text style={s.detail}>{profile.account_type==="company"?(ar?"طلب توثيق شركة / مؤسسة":"Company verification"):(ar?"طلب توثيق فرد":"Individual verification")}</Text><Text style={s.status}>{profile.verification_status==="approved"?(ar?"موثّق":"Verified"):profile.verification_status==="pending"?(ar?"قيد المراجعة":"Pending review"):profile.verification_status==="rejected"?(ar?"مرفوض — يمكنك تقديم طلب جديد بعد التعديل":"Rejected — you may submit an updated request"):(ar?"غير موثّق":"Not verified")}</Text>
          {profile.verification_status!=="approved"&&profile.verification_status!=="pending"&&<><Field label={ar?"سبب طلب التوثيق":"Reason for verification"} value={requestReason} onChange={setRequestReason} multiline placeholder={ar?"عرّف بنفسك أو بنشاط الشركة وسبب طلب التوثيق":"Describe yourself or your company and why verification is requested"}/><Field label={ar?"رابط إثبات أو موقع رسمي (اختياري)":"Evidence or official website URL (optional)"} value={evidenceUrl} onChange={setEvidenceUrl} placeholder="https://..."/><Button label={ar?"إرسال طلب التوثيق":"Submit verification request"} onPress={submitVerification}/></>}
          {!!requestStatus&&<Text style={s.detail}>{ar?"آخر طلب: ":"Latest request: "}{requestStatus}</Text>}
          <Text style={s.hint}>{ar?"التوثيق لا يتم تلقائياً. يراجع فريق الإدارة الطلب ويقرر الموافقة أو الرفض.":"Verification is never automatic. An administrator manually reviews and approves or rejects requests."}</Text>
        </View>
        <Pressable style={s.signout} onPress={async()=>{await supabase?.auth.signOut();}}><Text style={s.signoutText}>{ar?"تسجيل الخروج":"Sign out"}</Text></Pressable>
      </>}
    </>}

    {tab==="messages"&&<>
      {!activeConversation?<><Text style={[s.detail,ar&&s.rtl]}>{ar?"ابدأ محادثة جديدة باستخدام اسم المستخدم.":"Start a conversation using a member's username."}</Text><Field label={ar?"اسم المستخدم":"Username"} value={targetUsername} onChange={setTargetUsername} placeholder="@username"/><Button label={ar?"بدء محادثة":"Start chat"} onPress={startConversation}/><Text style={[s.section,ar&&s.rtl]}>{ar?"محادثاتك":"Your conversations"}</Text>
        {conversations.map(c=><Pressable key={c.id} onPress={()=>{setActiveConversation(c.id);setActivePeer(c.peerName);loadConversationMessages(c.id);}} style={s.card}><Text style={s.cardTitle}>{c.peerName}</Text><Text style={s.detail}>@{c.peerUsername}</Text></Pressable>)}
        {!conversations.length&&<Text style={s.empty}>{ar?"لا توجد محادثات بعد.":"No conversations yet."}</Text>}
      </>:<><Pressable onPress={()=>setActiveConversation(null)} style={s.back}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={s.backText}>{ar?"كل المحادثات":"All conversations"}</Text></Pressable><Text style={s.cardTitle}>{activePeer}</Text><ScrollView style={s.messageList}>{messages.map(m=><View key={m.id} style={[s.bubble,m.sender_id===userId&&s.myBubble]}><Text style={[s.bubbleText,m.sender_id===userId&&s.myBubbleText]}>{m.body}</Text><Text style={[s.time,m.sender_id===userId&&s.myBubbleText]}>{new Date(m.created_at).toLocaleString()}</Text></View>)}</ScrollView><View style={s.compose}><TextInput value={messageDraft} onChangeText={setMessageDraft} placeholder={ar?"اكتب رسالة...":"Write a message..."} placeholderTextColor="#9AA8B2" style={[s.composeInput,ar&&s.rtl]}/><Pressable onPress={sendMessage} style={s.send}><MaterialCommunityIcons name="send" size={19} color="#FFFFFF"/></Pressable></View></>}
    </>}

    <Pressable onPress={onBackHome} style={s.back}><MaterialCommunityIcons name="home-outline" size={18} color={C.blue}/><Text style={s.backText}>{ar?"العودة للرئيسية":"Back to Home"}</Text></Pressable>
  </View>;
}

const s=StyleSheet.create({
 wrap:{paddingTop:12,paddingBottom:26},eyebrow:{color:C.blue,fontSize:9,fontWeight:"900",letterSpacing:1.4,marginBottom:7},title:{color:C.ink,fontSize:22,fontWeight:"900",marginBottom:16},
 card:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,marginTop:11},cardTitle:{color:C.ink,fontSize:14,fontWeight:"800"},detail:{color:C.muted,fontSize:11,lineHeight:18,marginTop:5},label:{color:C.ink,fontSize:11,fontWeight:"800",marginBottom:7,marginTop:12},
 input:{minHeight:45,backgroundColor:C.white,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,paddingHorizontal:12,color:C.ink,fontSize:12,marginTop:8},button:{height:44,backgroundColor:C.blue,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:13},buttonText:{color:C.white,fontSize:12,fontWeight:"900"},
 notice:{backgroundColor:"#EFF8FE",borderColor:"#C8E7FA",borderWidth:1,borderRadius:12,padding:11,marginBottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},noticeText:{color:C.ink,fontSize:11,flex:1,lineHeight:18},
 cardFoot:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},tag:{color:"#1876B8",backgroundColor:"#E8F5FD",overflow:"hidden",borderRadius:9,paddingHorizontal:9,paddingVertical:5,fontSize:10,alignSelf:"flex-start",marginTop:8},smallButton:{backgroundColor:C.blue,borderRadius:10,paddingHorizontal:15,paddingVertical:8},smallButtonText:{color:C.white,fontWeight:"800",fontSize:11},secondaryButton:{backgroundColor:C.pale,borderWidth:1,borderColor:C.line},secondaryButtonText:{color:C.muted},profileCard:{alignItems:"center",backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:18,padding:20,marginBottom:12},avatar:{width:66,height:66,borderRadius:22,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center",marginBottom:10},profileName:{fontSize:17,color:C.ink,fontWeight:"900"},tags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},status:{color:C.blue,fontWeight:"900",fontSize:12,marginTop:9},hint:{fontSize:10,color:C.muted,lineHeight:17,marginTop:12},row:{flexDirection:"row",gap:8},choice:{flex:1,borderWidth:1,borderColor:C.line,borderRadius:10,padding:10,alignItems:"center"},choiceOn:{borderColor:C.blue,backgroundColor:"#E8F5FD"},choiceText:{color:C.ink,fontWeight:"700",fontSize:11},signout:{backgroundColor:"#FCE8EA",borderRadius:11,padding:12,alignItems:"center",marginTop:12},signoutText:{color:C.red,fontWeight:"900",fontSize:12},section:{color:C.ink,fontSize:14,fontWeight:"900",marginTop:22,marginBottom:5},empty:{textAlign:"center",color:C.muted,padding:30},messageList:{maxHeight:390,marginTop:12},bubble:{alignSelf:"flex-start",maxWidth:"85%",backgroundColor:C.pale,borderRadius:14,padding:11,marginVertical:5},myBubble:{alignSelf:"flex-end",backgroundColor:"#DFF1FD"},bubbleText:{color:C.ink,fontSize:12,lineHeight:18},myBubbleText:{color:"#13527D"},time:{color:C.muted,fontSize:9,marginTop:5},compose:{flexDirection:"row",alignItems:"center",gap:8,marginTop:10},composeInput:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:12,color:C.ink},send:{width:44,height:44,borderRadius:12,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},back:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:18,padding:10},backText:{color:C.blue,fontSize:12,fontWeight:"800"},rtl:{textAlign:"right",writingDirection:"rtl"}
});

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "./lib/supabase";

type Props = { isArabic: boolean; userId: string };
const blue="#1D9BF0", ink="#17202A", muted="#657786", line="#E6ECF0", pale="#F5F8FA";
const modules=[
  ["lists","قوائم المتابعة","Lists","format-list-bulleted"],
  ["polls","استطلاعات الرأي","Polls","poll"],
  ["drafts","المسودات","Drafts","file-document-edit-outline"],
  ["search","البحث المتقدم","Advanced search","filter-variant"],
  ["schedule","جدولة المنشورات","Scheduled posts","calendar-clock"],
  ["badges","الإنجازات والشارات","Achievements","trophy-outline"],
  ["learning","مسارات التعلم","Learning paths","school-outline"],
  ["qa","الأسئلة والأجوبة","Q&A","frequently-asked-questions"],
  ["portfolio","ملفي الاحترافي","Professional profile","briefcase-outline"],
  ["events","الفعاليات والورش","Events & workshops","calendar-star"],
  ["audio","المساحات الصوتية","Audio rooms","headphones"]
] as const;

export default function FeatureHub({isArabic,userId}:Props){
  const ar=isArabic;
  const [active,setActive]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [rows,setRows]=useState<any[]>([]);
  const [q,setQ]=useState("");
  const [category,setCategory]=useState("الكل");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [extra,setExtra]=useState("");
  const [date,setDate]=useState("");
  const [listId,setListId]=useState("");
  const [questionId,setQuestionId]=useState("");
  const [answerDraft,setAnswerDraft]=useState("");

  const say=(s:string)=>setNotice(s);
  const load=async()=>{
    if(!supabase||!active)return;
    setBusy(true);
    const table=active==="lists"?"follow_lists":active==="polls"?"polls":active==="drafts"?"post_drafts":active==="schedule"?"scheduled_posts":active==="badges"?"user_achievements":active==="learning"?"learning_paths":active==="qa"?"questions":active==="portfolio"?"profile_portfolio_items":active==="events"?"events":"audio_rooms";
    let req:any=supabase.from(table).select("*").order("created_at",{ascending:false}).limit(50);
    if(["lists","drafts","schedule","portfolio"].includes(active))req=req.eq(active==="lists"?"owner_id":"user_id",userId);
    if(active==="polls"||active==="qa"){}
    if(active==="search")req=supabase.from("posts").select("id,title,body,category,created_at").order("created_at",{ascending:false}).limit(100);
    if(active==="learning")req=supabase.from("learning_paths").select("*").eq("is_published",true).order("created_at",{ascending:false});
    if(active==="badges")req=supabase.from("user_achievements").select("awarded_at,achievements(title,description,icon)").eq("user_id",userId);
    const {data,error}=await req;
    setBusy(false);
    if(error){say((ar?"تعذر التحميل: ":"Could not load: ")+error.message);return;}
    setRows(data||[]);
  };
  useEffect(()=>{if(active)load();},[active]);
  const filtered=useMemo(()=>rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase())&&(category==="الكل"||x.category===category)),[rows,q,category]);
  const add=async()=>{
    if(!supabase||!userId){say(ar?"سجّل الدخول أولاً.":"Sign in first.");return;}
    setBusy(true);
    let result:any;
    if(active==="lists")result=await supabase.from("follow_lists").insert({owner_id:userId,name:title.trim(),description:body.trim()});
    else if(active==="drafts")result=await supabase.from("post_drafts").insert({user_id:userId,title:title.trim(),body,category:category==="الكل"?"عام":category});
    else if(active==="schedule")result=await supabase.from("scheduled_posts").insert({user_id:userId,title:title.trim(),body,category:category==="الكل"?"عام":category,scheduled_at:new Date(date).toISOString()});
    else if(active==="qa")result=await supabase.from("questions").insert({author_id:userId,title:title.trim(),body,category:category==="الكل"?"عام":category});
    else if(active==="portfolio")result=await supabase.from("profile_portfolio_items").insert({user_id:userId,title:title.trim(),description:body,item_type:category==="الكل"?"project":category,url:extra.trim()||null});
    else if(active==="events")result=await supabase.from("events").insert({creator_id:userId,title:title.trim(),description:body,starts_at:new Date(date).toISOString(),location:extra.trim()||"عن بُعد"});
    else if(active==="audio")result=await supabase.from("audio_rooms").insert({host_id:userId,title:title.trim(),starts_at:date?new Date(date).toISOString():new Date().toISOString(),status:"scheduled"});
    else if(active==="polls"){
      const options=body.split("\\n").map(x=>x.trim()).filter(Boolean).slice(0,8);
      if(options.length<2){setBusy(false);say(ar?"أضف خيارين على الأقل قبل إنشاء الاستطلاع.":"Add at least two options before creating a poll.");return;}
      const created=await supabase.from("polls").insert({author_id:userId,question:title.trim()}).select("id").single();
      if(created.error)result=created;
      else {const options=body.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8);result=options.length>=2?await supabase.from("poll_options").insert(options.map((label,position)=>({poll_id:created.data.id,label,position}))):{error:{message:"أضف خيارين على الأقل"}};}
    }
    setBusy(false);
    if(result?.error){say((ar?"لم يتم الحفظ: ":"Save failed: ")+result.error.message);return;}
    setTitle("");setBody("");setExtra("");setDate("");say(ar?"تم الحفظ بنجاح.":"Saved successfully.");await load();
  };
  const saveLearningProgress=async(path:any)=>{
    const {data:old}=await supabase!.from("learning_path_progress").select("completed_lessons").eq("user_id",userId).eq("path_id",path.id).maybeSingle();
    const completed=Array.isArray(old?.completed_lessons)?old.completed_lessons:[];
    const next=[...completed,"intro"];
    const {error}=await supabase!.from("learning_path_progress").upsert({user_id:userId,path_id:path.id,completed_lessons:next,updated_at:new Date().toISOString()});
    say(error?error.message:(ar?"تم تحديث تقدمك في المسار.":"Learning progress updated."));
  };
  const vote=async(poll:any)=>{
    const {data:opts}=await supabase!.from("poll_options").select("id,label").eq("poll_id",poll.id).order("position");
    if(!opts?.length)return;
    Alert.alert(poll.question,undefined,opts.map((o:any)=>({text:o.label,onPress:async()=>{const {error}=await supabase!.from("poll_votes").insert({poll_id:poll.id,option_id:o.id,user_id:userId});say(error?error.message:(ar?"تم تسجيل صوتك.":"Vote recorded."));}})));
  };
  const addListMember=async()=>{
    if(!supabase||!listId||!extra.trim())return;
    const {data:person,error:findError}=await supabase.from("profiles").select("id").eq("username",extra.trim().replace(/^@/,"").toLowerCase()).maybeSingle();
    if(findError||!person){say(ar?"لم نعثر على اسم المستخدم.":"Username not found.");return;}
    const {error}=await supabase.from("follow_list_members").insert({list_id:listId,profile_id:person.id});
    say(error?error.message:(ar?"تمت إضافة العضو إلى القائمة.":"Member added to list."));
    setExtra("");
  };
  const joinEvent=async(event:any)=>{const {error}=await supabase!.from("event_registrations").insert({event_id:event.id,user_id:userId});say(error?error.message:(ar?"تم تسجيلك في الفعالية.":"Registered for event."));};
  const joinRoom=async(room:any)=>{const {error}=await supabase!.from("audio_room_participants").upsert({room_id:room.id,user_id:userId,role:"listener"});say(error?error.message:(ar?"انضممت كمستمع. البث الصوتي المباشر يحتاج خدمة صوت خارجية ولم يُفعّل بعد.":"Joined as listener. Live audio transport still needs an external audio service."));};
  const addAnswer=async()=>{if(!supabase||!questionId||!answerDraft.trim())return;const {error}=await supabase.from("answers").insert({question_id:questionId,author_id:userId,body:answerDraft.trim()});say(error?error.message:(ar?"تمت إضافة الإجابة.":"Answer added."));setAnswerDraft("");};
  const acceptAnswer=async(question:any,answer:any)=>{const {error}=await supabase!.from("questions").update({accepted_answer_id:answer.id}).eq("id",question.id).eq("author_id",userId);say(error?error.message:(ar?"تم اعتماد الإجابة.":"Answer accepted."));await load();};

  const Field=({label,value,onChange,placeholder,multiline=false}:any)=><View style={{marginTop:10}}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#8A9AA8" multiline={multiline} style={[s.input,multiline&&{height:88,textAlignVertical:"top"},ar&&{textAlign:"right"}]}/></View>;
  const Button=({label,onPress}:any)=><Pressable onPress={onPress} disabled={busy} style={[s.button,busy&&{opacity:.5}]}><Text style={s.buttonText}>{label}</Text></Pressable>;
  const Card=({children}:any)=><View style={s.card}>{children}</View>;
  return <View style={{gap:12}}>
    {!!notice&&<Pressable onPress={()=>setNotice("")} style={s.notice}><Text style={{color:ink}}>{notice}</Text></Pressable>}
    {!active?<>
      <Text style={[s.sub,ar&&{textAlign:"right"}]}>{ar?"أدوات إضافية لتنظيم تعلمك ومشاركاتك ومشاريعك.":"Tools for learning, sharing and building your professional presence."}</Text>
      {modules.map(([key,arabic,english,icon])=><Pressable key={key} onPress={()=>{setActive(key);setRows([]);setNotice("");}} style={s.module}><View style={s.icon}><MaterialCommunityIcons name={icon as any} size={23} color={blue}/></View><Text style={[s.moduleText,ar&&{textAlign:"right"}]}>{ar?arabic:english}</Text><MaterialCommunityIcons name="chevron-left" size={21} color={muted}/></Pressable>)}
    </>:<>
      <Pressable onPress={()=>setActive(null)} style={s.back}><MaterialCommunityIcons name="arrow-left" size={19} color={blue}/><Text style={{color:blue,fontWeight:"800"}}>{ar?"كل الأدوات":"All tools"}</Text></Pressable>
      <Text style={s.heading}>{(modules.find(x=>x[0]===active)?.[ar?1:2])}</Text>
      {["lists","drafts","schedule","qa","portfolio","events","audio","polls"].includes(active)&&<Card>
        <Field label={active==="polls"?(ar?"السؤال":"Question"):(ar?"العنوان":"Title")} value={title} onChange={setTitle}/>
        {active!=="lists"&&<Field label={active==="polls"?(ar?"الخيارات، كل خيار بسطر":"Options, one per line"):(ar?"التفاصيل":"Details")} value={body} onChange={setBody} multiline/>}
        {["schedule","events","audio"].includes(active)&&<Field label={ar?"الموعد (مثال 2026-12-20T18:00)":"Date/time (e.g. 2026-12-20T18:00)"} value={date} onChange={setDate}/>}
        {["portfolio","events"].includes(active)&&<Field label={active==="events"?(ar?"المكان أو رابط الاجتماع":"Location or meeting link"):(ar?"رابط المشروع أو الشهادة":"Project/certificate link")} value={extra} onChange={setExtra}/>}
        {active==="portfolio"&&<Field label={ar?"النوع: skill أو project أو certificate أو link":"Type: skill, project, certificate or link"} value={category} onChange={setCategory}/>}
        <Button label={ar?"حفظ":"Save"} onPress={add}/>
      </Card>}
      {active==="search"&&<Card><Field label={ar?"ابحث في النتائج":"Search results"} value={q} onChange={setQ}/><View style={{flexDirection:"row",gap:7,flexWrap:"wrap"}}>{["الكل","البرمجة","الأمن السيبراني","الذكاء الاصطناعي","الشبكات"].map(x=><Pressable key={x} onPress={()=>setCategory(x)} style={[s.chip,category===x&&s.chipOn]}><Text style={{color:category===x?blue:muted}}>{x}</Text></Pressable>)}</View></Card>}
      {active==="learning"&&<Text style={s.sub}>{ar?"افتح مساراً لتسجيل تقدمك.":"Open a path to record your progress."}</Text>}
      {active==="badges"&&<Text style={s.sub}>{ar?"الشارات التي حصلت عليها.":"Your earned achievements."}</Text>}
      {busy&&<Text style={s.sub}>{ar?"جارٍ التحميل...":"Loading..."}</Text>}
      {filtered.map((x:any)=><Card key={x.id||x.achievement_id}>
        {active==="badges"?<><Text style={s.itemTitle}>{x.achievements?.title||"Achievement"}</Text><Text style={s.sub}>{x.achievements?.description}</Text></>
        :active==="learning"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.description}</Text><Button label={ar?"تسجيل التقدم":"Track progress"} onPress={()=>saveLearningProgress(x)}/></>
        :active==="polls"?<><Text style={s.itemTitle}>{x.question}</Text><Button label={ar?"صوّت":"Vote"} onPress={()=>vote(x)}/></>
        :active==="qa"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.body}</Text>{(x.answers||[]).map((a:any)=><View key={a.id} style={{padding:9,backgroundColor:pale,borderRadius:9,marginTop:5}}><Text style={s.sub}>{a.body}</Text>{x.author_id===userId&&<Button label={ar?"اعتماد هذه الإجابة":"Accept this answer"} onPress={()=>acceptAnswer(x,a)}/>}</View>)}<Button label={ar?"إجابة عن السؤال":"Answer question"} onPress={()=>setQuestionId(x.id)}/>{x.accepted_answer_id&&<Text style={{color:"#168A62"}}>{ar?"تم اعتماد إجابة":"Accepted answer selected"}</Text>}</>
        :active==="events"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.description} · {x.location}</Text><Button label={ar?"سجّل حضورك":"Register"} onPress={()=>joinEvent(x)}/></>
        :active==="audio"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.status} · {new Date(x.starts_at).toLocaleString()}</Text><Button label={ar?"انضم كمستمع":"Join as listener"} onPress={()=>joinRoom(x)}/></>
        :active==="schedule"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.status} · {new Date(x.scheduled_at).toLocaleString()}</Text></>
        :active==="portfolio"?<><Text style={s.itemTitle}>{x.title}</Text><Text style={s.sub}>{x.item_type} · {x.description}</Text></>
        :active==="drafts"?<><Text style={s.itemTitle}>{x.title||"Draft"}</Text><Text style={s.sub}>{x.body}</Text></>
        :<><Text style={s.itemTitle}>{x.name}</Text><Text style={s.sub}>{x.description}</Text><Button label={ar?"إدارة القائمة":"Manage list"} onPress={()=>setListId(x.id)}/></>}
        {active==="qa"&&questionId===x.id&&<><Field label={ar?"اكتب إجابتك":"Your answer"} value={answerDraft} onChange={setAnswerDraft}/><Button label={ar?"إرسال الإجابة":"Submit answer"} onPress={addAnswer}/></>}
        {active==="lists"&&listId===x.id&&<><Field label={ar?"اسم المستخدم لإضافته إلى القائمة":"Username to add"} value={extra} onChange={setExtra} placeholder="@username"/><Button label={ar?"إضافة إلى القائمة":"Add to list"} onPress={addListMember}/></>}
      </Card>)}
      {active==="qa"&&filtered.length===0&&<Text style={s.sub}>{ar?"لا توجد أسئلة بعد.":"No questions yet."}</Text>}
    </>}
  </View>;
}
const s=StyleSheet.create({
  module:{minHeight:62,backgroundColor:"#FFFFFF",borderWidth:1,borderColor:line,borderRadius:14,padding:10,flexDirection:"row",alignItems:"center",gap:12},
  icon:{width:42,height:42,borderRadius:12,backgroundColor:"#EAF6FD",alignItems:"center",justifyContent:"center"},
  moduleText:{flex:1,color:ink,fontSize:14,fontWeight:"800"},
  card:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:line,borderRadius:15,padding:13,gap:7},
  input:{borderWidth:1,borderColor:line,borderRadius:10,minHeight:42,paddingHorizontal:11,color:ink,marginTop:5},
  label:{color:muted,fontSize:11,fontWeight:"800"},
  button:{backgroundColor:blue,borderRadius:10,paddingVertical:11,paddingHorizontal:15,alignItems:"center",marginTop:10},
  buttonText:{color:"#FFFFFF",fontWeight:"900",fontSize:12},
  heading:{color:ink,fontWeight:"900",fontSize:19},
  sub:{color:muted,fontSize:12,lineHeight:19},
  itemTitle:{color:ink,fontWeight:"900",fontSize:14},
  back:{flexDirection:"row",alignItems:"center",gap:7,paddingVertical:8},
  notice:{backgroundColor:"#EAF6FD",borderRadius:11,padding:11},
  chip:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:line,borderRadius:20},
  chipOn:{backgroundColor:"#EAF6FD",borderColor:blue}
});

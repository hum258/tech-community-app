import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image,
  StatusBar, Share, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SecondaryScreen from "./src/SecondaryScreen";
import AuthGate from "./src/AuthGate";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./src/lib/supabase";

type Post = {
  id: string | number; authorId?: string; hideLikeCount?: boolean; name: string; role: string; time: string; category: string;
  title: string; body: string; tags: string[]; likes: number; comments: number; views?:number; reposts?:number; savesCount?:number; shares?:number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; imageUrl?: string | null; avatarUrl?: string | null; isVerified?: boolean; accountType?: "personal" | "company";
};

const categories = ["الكل", "البرمجة", "الأمن السيبراني", "الذكاء الاصطناعي", "الشبكات"];

function CommunityApp() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [activeTab, setActiveTab] = useState("home");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<Array<string | number>>([]);
  const [saved, setSaved] = useState<Array<string | number>>([]);
  const [reposted,setReposted]=useState<Array<string>>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [showComposerChoices, setShowComposerChoices] = useState(false);
  const [composerType, setComposerType] = useState<"post" | "article">("post");
  const [draft, setDraft] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [postCategory, setPostCategory] = useState("عام");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentingPost, setCommentingPost] = useState<string | number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [likedComments,setLikedComments]=useState<string[]>([]);
  const [replyToComment,setReplyToComment]=useState<string|null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [feedNotice, setFeedNotice] = useState("");
  const [openPostMenuId, setOpenPostMenuId] = useState<string | number | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    const load = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!alive) return;
      setCurrentUserId(session?.user.id ?? null);
      if (!session) return;
      const { data, error } = await client.from("posts").select("id,title,body,category,tags,image_url,created_at,author_id,hide_like_count,profiles(display_name,specialty,account_type,avatar_url,is_verified)").order("created_at", { ascending: false }).limit(50);
      if (error) { setFeedNotice("تعذر تحميل المنشورات من قاعدة البيانات. تأكد من تشغيل ترحيل 0003."); return; }
      if (data && alive) {
        const rows: Post[] = data.map((p: any) => ({ id:p.id, authorId:p.author_id, hideLikeCount:!!p.hide_like_count, name:p.profiles?.display_name || "عضو", role:p.profiles?.specialty || (p.profiles?.account_type === "company" ? "شركة" : "عضو المجتمع"), time:new Date(p.created_at).toLocaleString(), category:p.category, title:p.title, body:p.body, tags:p.tags || [], imageUrl:p.image_url, avatarUrl:p.profiles?.avatar_url, isVerified:!!p.profiles?.is_verified, accountType:p.profiles?.account_type, likes:0, comments:0, views:0, reposts:0, savesCount:0, icon:"account-outline", color:"#1D9BF0" }));
        setPosts(rows);
        const ids=rows.map(p=>p.id);
        if(ids.length){
          const [{data: likes},{data: comments},{data: mine},{data:saves},{data:reposts},{data:views},{data:myReposts}] = await Promise.all([
            client.from("post_likes").select("post_id").in("post_id",ids),
            client.from("comments").select("post_id").in("post_id",ids),
            client.from("post_likes").select("post_id").eq("user_id",session.user.id).in("post_id",ids),
            client.from("post_saves").select("post_id").in("post_id",ids),
            client.from("post_reposts").select("post_id").in("post_id",ids),
            client.from("post_views").select("post_id").in("post_id",ids),
            client.from("post_reposts").select("post_id").eq("user_id",session.user.id).in("post_id",ids)
          ]);
          const notMine=rows.filter(p=>p.authorId!==session.user.id).map(p=>({post_id:p.id,user_id:session.user.id}));
          if(notMine.length) await client.from("post_views").upsert(notMine,{onConflict:"post_id,user_id,viewed_on",ignoreDuplicates:true});
          const {data:metrics}=await client.rpc("get_post_metrics",{post_ids:ids});
          setPosts(old=>old.map(p=>{const m=(metrics||[]).find((x:any)=>x.post_id===p.id);return {...p,likes:(likes||[]).filter((x:any)=>x.post_id===p.id).length,comments:(comments||[]).filter((x:any)=>x.post_id===p.id).length,views:Number(m?.views||0),reposts:Number(m?.reposts||0),savesCount:Number(m?.saves||0),shares:Number(m?.shares||0)};}));
          setLiked((mine||[]).map((x:any)=>x.post_id)); setSaved((saves||[]).filter((x:any)=>x.user_id===session.user.id).map((x:any)=>x.post_id)); setReposted((myReposts||[]).map((x:any)=>x.post_id));
        }
        setFeedNotice("");
      }
    };
    load();
    const { data: listener } = client.auth.onAuthStateChange((_event, session)=>{setCurrentUserId(session?.user.id ?? null); if(session) load();});
    const feedChannel = client.channel("live-public-feed")
      .on("postgres_changes",{event:"*",schema:"public",table:"posts"},()=>{if(alive) void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"post_likes"},()=>{if(alive) void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"comments"},()=>{if(alive) void load();})
      .subscribe();
    return ()=>{alive=false;listener.subscription.unsubscribe();void client.removeChannel(feedChannel);};
  }, []);

  const isArabic = language === "ar";
  const visiblePosts = useMemo(() => posts.filter(post => {
    const categoryMatch = activeCategory === "الكل" || post.category === activeCategory;
    const q = query.trim().toLowerCase();
    const queryMatch = !q || [post.title, post.body, post.name, ...post.tags].join(" ").toLowerCase().includes(q);
    return categoryMatch && queryMatch;
  }), [posts, activeCategory, query]);

  const labels = isArabic
    ? { home:"الرئيسية", explore:"استكشف", groups:"المجتمعات", messages:"الرسائل", profile:"حسابي", greeting:"مساحة تجمع العقول التقنية", subtitle:"تعلّم، شارك، وابنِ شيئاً مميزاً.", search:"ابحث عن أشخاص أو مشاريع أو مواضيع...", feed:"آخر النقاشات", all:"لك", popular:"الأكثر صلة", compose:"اكتب منشوراً تقنياً...", publish:"نشر", cancel:"إلغاء", empty:"لا توجد منشورات مطابقة حالياً", welcome:"مرحباً بك في مجتمع التقنية", join:"مساحتك للتعلّم والتواصل وبناء المشاريع", login:"المتابعة باستخدام Google", personal:"حساب شخصي", company:"حساب شركة", demo:"معاينة الواجهة — البيانات تجريبية" }
    : { home:"Home", explore:"Explore", groups:"Communities", messages:"Messages", profile:"Profile", greeting:"A place for technical minds", subtitle:"Learn, share, and build something remarkable.", search:"Search people, projects, or topics...", feed:"Latest discussions", all:"For you", popular:"Relevant", compose:"Write a technical post...", publish:"Publish", cancel:"Cancel", empty:"No matching posts yet", welcome:"Welcome to the tech community", join:"Your space to learn, connect, and build projects", login:"Continue with Google", personal:"Personal account", company:"Company account", demo:"Interface preview — sample content" };

  const navItems = [
    { key:"home", icon:"home-variant-outline" as const, label:labels.home },
    { key:"explore", icon:"compass-outline" as const, label:labels.explore },
    { key:"features", icon:"apps" as const, label:isArabic?"الميزات":"Features" },
    { key:"groups", icon:"account-group-outline" as const, label:labels.groups },
    { key:"messages", icon:"message-text-outline" as const, label:labels.messages },
    { key:"profile", icon:"account-circle-outline" as const, label:labels.profile },
    { key:"settings", icon:"cog-outline" as const, label:isArabic?"الإعدادات":"Settings" }
  ];

  const loadPostComments = async (postId:string) => {
    if(!supabase)return;
    const {data,error}=await supabase.from("comments").select("id,body,created_at,parent_comment_id,profiles(display_name)").eq("post_id",postId).order("created_at",{ascending:true}).limit(100);
    if(error){setFeedNotice("تعذر تحميل التعليقات: "+error.message);return;}
    setPostComments(old=>({...old,[postId]:data||[]}));
    const ids=(data||[]).map((x:any)=>x.id);if(ids.length&&currentUserId){const {data:mine}=await supabase.from("comment_likes").select("comment_id").eq("user_id",currentUserId).in("comment_id",ids);setLikedComments(old=>[...old.filter(x=>!ids.includes(x)),...(mine||[]).map((x:any)=>x.comment_id)]);}
  };

  const toggleCommentLike=async(commentId:string)=>{
    if(!supabase||!currentUserId)return;
    const exists=likedComments.includes(commentId);
    const {error}=exists?await supabase.from("comment_likes").delete().eq("comment_id",commentId).eq("user_id",currentUserId):await supabase.from("comment_likes").insert({comment_id:commentId,user_id:currentUserId});
    if(error){setFeedNotice(error.message);return;}
    setLikedComments(old=>exists?old.filter(x=>x!==commentId):[...old,commentId]);
  };

  const toggleLike = async (id:string | number) => {
    if (!supabase || !currentUserId || typeof id !== "string") { setFeedNotice("سجّل الدخول لتتمكن من الإعجاب."); return; }
    const exists=liked.includes(id);
    setLiked(old=>exists?old.filter(x=>x!==id):[...old,id]);
    setPosts(old=>old.map(p=>p.id===id?{...p,likes:Math.max(0,p.likes+(exists?-1:1))}:p));
    const result=exists ? await supabase.from("post_likes").delete().eq("post_id",id).eq("user_id",currentUserId) : await supabase.from("post_likes").insert({post_id:id,user_id:currentUserId});
    if(result.error){
      setLiked(old=>exists?[...old,id]:old.filter(x=>x!==id));
      setPosts(old=>old.map(p=>p.id===id?{...p,likes:Math.max(0,p.likes+(exists?1:-1))}:p));
      setFeedNotice(result.error.message);
    }
  };
  const toggleLikeVisibility = async (post:Post) => {
    if(!supabase || !currentUserId || post.authorId!==currentUserId || typeof post.id!=="string"){
      setFeedNotice("يمكنك إخفاء عدد الإعجابات في منشوراتك أنت فقط.");
      return;
    }
    const next=!post.hideLikeCount;
    const {error}=await supabase.from("posts").update({hide_like_count:next}).eq("id",post.id).eq("author_id",currentUserId);
    if(error){setFeedNotice("تعذر تحديث إعداد الإعجابات: "+error.message);return;}
    setPosts(old=>old.map(p=>p.id===post.id?{...p,hideLikeCount:next}:p));
    setFeedNotice(next?"تم إخفاء عدد الإعجابات عن هذا المنشور.":"تم إظهار عدد الإعجابات.");
  };

  const toggleRepost=async(id:string|number)=>{
    if(!supabase||!currentUserId||typeof id!=="string"){setFeedNotice("سجّل الدخول لإعادة النشر.");return;}
    const exists=reposted.includes(id);
    const {error}=exists?await supabase.from("post_reposts").delete().eq("post_id",id).eq("user_id",currentUserId):await supabase.from("post_reposts").insert({post_id:id,user_id:currentUserId});
    if(error){setFeedNotice(error.message);return;}
    setReposted(old=>exists?old.filter(x=>x!==id):[...old,id]);
    setFeedNotice(exists?"تم إلغاء إعادة النشر.":"تمت إعادة نشر المنشور.");
  };
  const deletePost=async(post:Post)=>{
    if(!supabase||!currentUserId||post.authorId!==currentUserId||typeof post.id!=="string")return;
    Alert.alert("حذف المنشور","هل أنت متأكد من حذف هذا المنشور؟",[{text:"إلغاء",style:"cancel"},{text:"حذف",style:"destructive",onPress:async()=>{const {error}=await supabase!.from("posts").delete().eq("id",post.id).eq("author_id",currentUserId);if(error){setFeedNotice("تعذر حذف المنشور: "+error.message);return;}setPosts(old=>old.filter(p=>p.id!==post.id));setFeedNotice("تم حذف المنشور.");}}]);
  };
  const openPostMenu=(post:Post)=>{
    setOpenPostMenuId(current=>current===post.id?null:post.id);
  };

  const reportPost=async(id:string|number)=>{
    if(!supabase||!currentUserId||typeof id!=="string")return;
    Alert.alert("الإبلاغ عن المنشور","اختر سبب الإبلاغ",["محتوى مزعج","معلومات مضللة","إساءة أو مضايقة"].map(reason=>({text:reason,onPress:async()=>{const {error}=await supabase!.from("content_reports").insert({reporter_id:currentUserId,post_id:id,reason});setFeedNotice(error?error.message:"تم إرسال البلاغ للمراجعة.");}})).concat([{text:"إلغاء",style:"cancel"}] as any));
  };

  const sharePost=async(post:Post)=>{
    if(supabase&&currentUserId&&typeof post.id==="string")await supabase.from("post_shares").insert({post_id:post.id,user_id:currentUserId});
    await Share.share({message:post.title+"\\n\\n"+post.body+"\\n\\n"+post.tags.map(tag=>"#"+tag).join(" ")});
  };

  const toggleSave = async (id:string | number) => {
    if (!supabase || !currentUserId || typeof id !== "string") { setFeedNotice("سجّل الدخول لحفظ المنشورات."); return; }
    const exists=saved.includes(id); setSaved(old=>exists?old.filter(x=>x!==id):[...old,id]);
    const result=exists ? await supabase.from("post_saves").delete().eq("post_id",id).eq("user_id",currentUserId) : await supabase.from("post_saves").insert({post_id:id,user_id:currentUserId});
    if(result.error){setSaved(old=>exists?[...old,id]:old.filter(x=>x!==id));setFeedNotice(result.error.message);}
  };
  const saveCurrentDraft = async () => {
    if(!supabase||!currentUserId){setFeedNotice("سجّل الدخول لحفظ المسودة.");return;}
    if(!draft.trim()&&!articleTitle.trim()){setFeedNotice("اكتب محتوى قبل حفظ المسودة.");return;}
    const {error}=await supabase.from("post_drafts").insert({user_id:currentUserId,title:composerType==="article"?articleTitle.trim():"",body:draft,category:postCategory});
    setFeedNotice(error?"تعذر حفظ المسودة: "+error.message:"تم حفظ المسودة.");
  };
  const openSavedDrafts = async () => {
    if(!supabase||!currentUserId){setFeedNotice("سجّل الدخول لعرض المسودات.");return;}
    const {data,error}=await supabase.from("post_drafts").select("id,title,body,category").eq("user_id",currentUserId).order("updated_at",{ascending:false}).limit(10);
    if(error){setFeedNotice(error.message);return;}
    if(!data?.length){setFeedNotice("لا توجد مسودات محفوظة.");return;}
    Alert.alert("مسوداتي","اختر مسودة للمتابعة",[...data.map((d:any)=>({text:(d.title||d.body||"مسودة").slice(0,35),onPress:()=>{setComposerType(d.title?"article":"post");setArticleTitle(d.title||"");setDraft(d.body||"");setPostCategory(d.category||"عام");setComposerOpen(true);}})),{text:"إلغاء",style:"cancel"}] as any);
  };

  const publish = async () => {
    if (!draft.trim() && !selectedImage) return;
    if (!supabase || !currentUserId) { setFeedNotice("أنشئ حساباً وسجّل الدخول قبل النشر."); return; }
    let imageUrl: string | null = null;
    if (selectedImage) {
      const response = await fetch(selectedImage);
      const bytes = await response.arrayBuffer();
      const ext = selectedImage.split(".").pop()?.split("?")[0] || "jpg";
      const path = currentUserId + "/" + Date.now() + "." + ext;
      const uploaded = await supabase.storage.from("post-images").upload(path, bytes, { contentType: ext === "png" ? "image/png" : "image/jpeg" });
      if (uploaded.error) { setFeedNotice("تعذر رفع الصورة: " + uploaded.error.message); return; }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const content = draft.trim();
    const finalTitle=composerType==="article"?(articleTitle.trim().slice(0,120)||"مقال جديد"):(content.slice(0,80)||"صورة");
    const {error}=await supabase.from("posts").insert({author_id:currentUserId,category:postCategory,title:finalTitle,body:content,tags:[],image_url:imageUrl});
    if(error){setFeedNotice("تعذر نشر المنشور: "+error.message);return;}
    setDraft(""); setArticleTitle(""); setPostCategory("عام"); setSelectedImage(null); setComposerOpen(false); setComposerType("post");
    const {data}=await supabase.from("posts").select("id,title,body,category,tags,image_url,created_at,author_id,hide_like_count,profiles(display_name,specialty,account_type,avatar_url,is_verified)").order("created_at",{ascending:false}).limit(50);
    if(data)setPosts(data.map((p:any)=>({id:p.id,authorId:p.author_id,hideLikeCount:!!p.hide_like_count,name:p.profiles?.display_name||"عضو",role:p.profiles?.specialty||"عضو المجتمع",time:new Date(p.created_at).toLocaleString(),category:p.category,title:p.title,body:p.body,tags:p.tags||[],imageUrl:p.image_url,avatarUrl:p.profiles?.avatar_url,isVerified:!!p.profiles?.is_verified,accountType:p.profiles?.account_type,likes:0,comments:0,icon:"account-outline",color:"#1D9BF0"})));
    setFeedNotice("تم النشر بنجاح.");
    setTimeout(()=>setFeedNotice(current=>current==="تم النشر بنجاح."?"":current),1800);
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:"#FFFFFF"}]}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.app,{backgroundColor:"#FFFFFF"}]}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.brandMark}><MaterialCommunityIcons name="code-braces" size={22} color="#FFFFFF" /></View>
            <View>
              <Text style={styles.brand}>TECH COMMUNITY</Text>
              <Text style={styles.brandSub}>CONNECT • LEARN • BUILD</Text>
            </View>
          </View>
          <View style={styles.topActions}>
            <Pressable style={styles.langButton} onPress={()=>setLanguage(language==="ar"?"en":"ar")}>
              <Text style={styles.langText}>{isArabic ? "EN" : "ع"} </Text>
            </Pressable>
            <Pressable style={styles.iconButton} onPress={()=>setActiveTab("messages")}>
              <MaterialCommunityIcons name="bell-outline" size={21} color="#536471" />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab !== "home" ? <SecondaryScreen tab={activeTab} isArabic={isArabic} onBackHome={() => setActiveTab("home")} onOpenMessages={() => setActiveTab("messages")} onOpenComposer={()=>{setActiveTab("home");setComposerType("post");setComposerOpen(true);}} /> : <>
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={styles.livePill}><View style={styles.liveDot}/><Text style={styles.liveText}>TECH NETWORK</Text></View>
              <MaterialCommunityIcons name="orbit" size={25} color="#1D9BF0" />
            </View>
            <Text style={[styles.heroTitle, isArabic && styles.rtl]}>{labels.greeting}</Text>
            <Text style={[styles.heroSubtitle, isArabic && styles.rtl]}>{labels.subtitle}</Text>
            <View style={[styles.heroStats,{display:"none"}]}>
              <View><Text style={styles.statNumber}>12K+</Text><Text style={styles.statLabel}>{isArabic?"عضو تقني":"Members"}</Text></View>
              <View style={styles.statDivider}/>
              <View><Text style={styles.statNumber}>850+</Text><Text style={styles.statLabel}>{isArabic?"مشروع":"Projects"}</Text></View>
              <View style={styles.statDivider}/>
              <View><Text style={styles.statNumber}>24/7</Text><Text style={styles.statLabel}>{isArabic?"تعلّم وتواصل":"Community"}</Text></View>
            </View>
          </View>

          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={21} color="#7F9AB6" />
            <TextInput value={query} onChangeText={setQuery} placeholder={labels.search} placeholderTextColor="#7188A2" style={[styles.searchInput, isArabic && styles.rtl]} />
            <MaterialCommunityIcons name="tune-variant" size={19} color="#7F9AB6" />
          </View>

          {!!feedNotice && <View style={{marginTop:10,paddingVertical:10,paddingHorizontal:12,borderRadius:10,backgroundColor:feedNotice==="تم النشر بنجاح."?"#E8F7EF":"#FFF4E5",borderWidth:1,borderColor:feedNotice==="تم النشر بنجاح."?"#B7E4C7":"#F1D6A8",flexDirection:"row",alignItems:"center",gap:8}}><MaterialCommunityIcons name={feedNotice==="تم النشر بنجاح."?"check-circle":"information-outline"} size={18} color={feedNotice==="تم النشر بنجاح."?"#168A62":"#A66A00"}/><Text style={{color:feedNotice==="تم النشر بنجاح."?"#176B45":"#805400",fontSize:12,fontWeight:"800",flex:1}}>{feedNotice}</Text></View>}
          <View style={styles.sectionHeading}>
            <View><Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{labels.feed}</Text></View>
            <Pressable style={styles.writeButton} onPress={()=>setShowComposerChoices(v=>!v)}>
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.writeText}>{isArabic?"منشور":"Post"}</Text>
            </Pressable>
          </View>

          {showComposerChoices && <View style={styles.composerChoices}>
            {[
              {key:"post",label:"منشور",icon:"text-box-outline"},
              {key:"video",label:"فيديو",icon:"video-outline"},
              {key:"article",label:"مقال",icon:"file-document-outline"},
              {key:"audio",label:"مساحة صوتية",icon:"headphones"}
            ].map(item=><Pressable key={item.key} style={styles.composerChoice} onPress={()=>{
              setShowComposerChoices(false);
              if(item.key==="post"||item.key==="article"){setComposerType(item.key);setComposerOpen(true);}
              else Alert.alert(item.label,"هذا النوع يحتاج تجهيز ميزة الرفع/البث الفعلي قبل تفعيله، ولن أظهره كأنه يعمل وهو غير جاهز.");
            }}><MaterialCommunityIcons name={item.icon as any} size={21} color="#1D9BF0"/><Text style={styles.composerChoiceText}>{item.label}</Text></Pressable>)}
          </View>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((cat, index) => (
              <Pressable key={cat} onPress={()=>setActiveCategory(cat)} style={[styles.chip, activeCategory===cat && styles.chipActive]}>
                <Text style={[styles.chipText, activeCategory===cat && styles.chipTextActive]}>{isArabic ? cat : ["All","Programming","Cybersecurity","Artificial Intelligence","Networking"][index]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {composerOpen && <View style={styles.composer}>
            <Text style={[styles.composerTitle, isArabic && styles.rtl]}>{composerType==="article"?(isArabic?"اكتب مقالك":"Write an article"):(isArabic?"أنشئ منشورك":"Create a post")}</Text>
            {composerType==="article"&&<TextInput value={articleTitle} onChangeText={setArticleTitle} placeholder={isArabic?"عنوان المقال":"Article title"} placeholderTextColor="#657786" style={[styles.composerInput,{minHeight:46,textAlignVertical:"center"},isArabic&&styles.rtl]}/>}
            <TextInput multiline value={draft} onChangeText={setDraft} placeholder={composerType==="article"?(isArabic?"محتوى المقال...":"Article content..."):labels.compose} placeholderTextColor="#657786" style={[styles.composerInput, isArabic && styles.rtl]} />
            <Text style={{color:"#657786",fontSize:11,marginTop:10}}>{isArabic?"تصنيف المحتوى":"Content category"}</Text>
            <View style={{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:7}}>
              {["عام","البرمجة","الأمن السيبراني","الذكاء الاصطناعي","الشبكات"].map(cat=><Pressable key={cat} onPress={()=>setPostCategory(cat)} style={{paddingHorizontal:10,paddingVertical:7,borderRadius:10,borderWidth:1,borderColor:postCategory===cat?"#1D9BF0":"#CFD9DE",backgroundColor:postCategory===cat?"#E8F5FD":"#FFFFFF"}}><Text style={{color:postCategory===cat?"#1D9BF0":"#657786",fontSize:11,fontWeight:"700"}}>{cat}</Text></Pressable>)}
            </View>
            <Pressable onPress={async ()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:0.8});if(!result.canceled && result.assets[0])setSelectedImage(result.assets[0].uri);}} style={{flexDirection:"row",alignItems:"center",gap:7,marginTop:10}}>
              <MaterialCommunityIcons name="image-outline" size={21} color="#1D9BF0"/><Text style={{color:"#1D9BF0",fontWeight:"700"}}>إضافة صورة من المعرض</Text>
            </Pressable>
            {selectedImage ? <View style={{flexDirection:"row",alignItems:"center",gap:10,marginTop:10}}><Image source={{uri:selectedImage}} style={{width:100,height:90,borderRadius:12}}/><Pressable onPress={()=>setSelectedImage(null)}><MaterialCommunityIcons name="close-circle" size={24} color="#E0245E"/></Pressable></View> : null}
            <View style={styles.composerActions}>
              <Pressable onPress={saveCurrentDraft}><Text style={styles.cancelText}>{isArabic?"حفظ كمسودة":"Save draft"}</Text></Pressable>
              <Pressable onPress={openSavedDrafts}><Text style={styles.cancelText}>{isArabic?"مسوداتي":"My drafts"}</Text></Pressable>
              <Pressable onPress={()=>{setComposerOpen(false);setSelectedImage(null);}}><Text style={styles.cancelText}>{labels.cancel}</Text></Pressable>
              <Pressable onPress={publish} style={styles.publishButton}><Text style={styles.publishText}>{labels.publish}</Text></Pressable>
            </View>
          </View>}

          {visiblePosts.length===0 && <View style={styles.empty}><MaterialCommunityIcons name="text-search" size={32} color="#5D7895"/><Text style={styles.emptyText}>{labels.empty}</Text></View>}

          {visiblePosts.map(post => {
            const isLiked = liked.includes(post.id);
            const isSaved = saved.includes(post.id);
            return <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                {post.avatarUrl ? <Image source={{uri:post.avatarUrl}} style={[styles.avatar,{overflow:"hidden"}]} /> : <View style={[styles.avatar,{backgroundColor:post.color+"22",borderColor:post.color+"66"}]}><MaterialCommunityIcons name={post.icon} size={23} color={post.color}/></View>}
                <View style={styles.authorInfo}>
                  <View style={styles.nameLine}><Text style={styles.authorName}>{post.name}</Text>{post.isVerified&&<Pressable onPress={()=>Alert.alert("توثيق الحساب","تم التوثيق من شركة المجتمع التقني.\\nالمؤسسة: المجتمع التقني – Tech Community.")}><MaterialCommunityIcons name="check-decagram" size={15} color={post.accountType==="company"?"#89939D":"#1D9BF0"}/></Pressable>}</View>
                  <Text style={styles.authorRole}>{post.role} · {post.time}</Text>
                </View>
                <Pressable hitSlop={12} style={[styles.moreButton,{position:"absolute",left:12,top:12,zIndex:5,padding:7,borderRadius:10,backgroundColor:"#F5F8FA"}]} onPress={()=>openPostMenu(post)}><MaterialCommunityIcons name="dots-horizontal" size={22} color="#657786"/></Pressable>
              </View>
              {openPostMenuId===post.id&&<View style={{marginTop:8,marginBottom:8,padding:8,borderWidth:1,borderColor:"#DCE5EC",borderRadius:13,backgroundColor:"#FFFFFF",elevation:3,shadowColor:"#000",shadowOpacity:0.08,shadowRadius:8}}>
                <Text style={{fontSize:12,fontWeight:"900",color:"#17202A",textAlign:isArabic?"right":"left",paddingHorizontal:8,paddingVertical:5}}>{isArabic?"خيارات المنشور":"Post options"}</Text>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>
                  <Pressable onPress={()=>{toggleSave(post.id);setOpenPostMenuId(null);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:10,borderRadius:9,backgroundColor:"#F5F8FA"}}><MaterialCommunityIcons name={isSaved?"bookmark-off-outline":"bookmark-outline"} size={18} color="#1D9BF0"/><Text style={{color:"#17202A",fontSize:12,fontWeight:"700"}}>{isSaved?(isArabic?"إلغاء الحفظ":"Unsave"):(isArabic?"حفظ المنشور":"Save post")}</Text></Pressable>
                  <Pressable onPress={()=>{sharePost(post);setOpenPostMenuId(null);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:10,borderRadius:9,backgroundColor:"#F5F8FA"}}><MaterialCommunityIcons name="share-variant-outline" size={18} color="#657786"/><Text style={{color:"#17202A",fontSize:12,fontWeight:"700"}}>{isArabic?"مشاركة":"Share"}</Text></Pressable>
                  {post.authorId===currentUserId&&<Pressable onPress={()=>{setOpenPostMenuId(null);toggleLikeVisibility(post);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:10,borderRadius:9,backgroundColor:"#F5F8FA"}}><MaterialCommunityIcons name="heart-off-outline" size={18} color="#657786"/><Text style={{color:"#17202A",fontSize:12,fontWeight:"700"}}>{post.hideLikeCount?(isArabic?"إظهار الإعجابات":"Show likes"):(isArabic?"إخفاء الإعجابات":"Hide likes")}</Text></Pressable>}
                  {post.authorId===currentUserId?<Pressable onPress={()=>{setOpenPostMenuId(null);deletePost(post);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:10,borderRadius:9,backgroundColor:"#FCEBED"}}><MaterialCommunityIcons name="trash-can-outline" size={18} color="#D9485F"/><Text style={{color:"#D9485F",fontSize:12,fontWeight:"800"}}>{isArabic?"حذف المنشور":"Delete post"}</Text></Pressable>:<Pressable onPress={()=>{setOpenPostMenuId(null);reportPost(post.id);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:10,borderRadius:9,backgroundColor:"#F5F8FA"}}><MaterialCommunityIcons name="flag-outline" size={18} color="#D9485F"/><Text style={{color:"#17202A",fontSize:12,fontWeight:"700"}}>{isArabic?"إبلاغ":"Report"}</Text></Pressable>}
                </View>
              </View>}
              <View style={styles.postCategory}><Text style={styles.categoryText}>{post.category}</Text></View>
              <Text style={[styles.postTitle, isArabic && styles.rtl]}>{post.title}</Text>
              <Text style={[styles.postBody, isArabic && styles.rtl]}>{post.body}</Text>
              {post.imageUrl ? <Image source={{uri:post.imageUrl}} style={{width:"100%",height:230,borderRadius:14,marginTop:12}} resizeMode="cover"/> : null}<View style={styles.tags}>{post.tags.map(tag=><View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>)}</View>
              <View style={styles.postDivider}/>
              <View style={styles.postActions}>
                <Pressable style={styles.xAction} onPress={()=>toggleLike(post.id)}><MaterialCommunityIcons name={isLiked?"heart":"heart-outline"} size={20} color={isLiked?"#D83F69":"#657786"}/><Text style={[styles.xActionText,isLiked&&styles.likedText]}>{post.hideLikeCount?"":post.likes||0}</Text></Pressable>
                <Pressable style={styles.xAction} onPress={()=>{const opening=commentingPost!==post.id;setCommentingPost(opening?post.id:null);setCommentDraft("");if(opening&&typeof post.id==="string")loadPostComments(post.id);}}><MaterialCommunityIcons name="comment-outline" size={20} color={commentingPost===post.id?"#1D9BF0":"#657786"}/><Text style={styles.xActionText}>{post.comments||0}</Text></Pressable>
                <Pressable style={styles.xAction} onPress={()=>toggleRepost(post.id)}><MaterialCommunityIcons name="repeat" size={20} color={reposted.includes(String(post.id))?"#168A62":"#657786"}/><Text style={styles.xActionText}>{post.reposts||0}</Text></Pressable>
                <Pressable style={styles.xAction} onPress={() => Share.share({ message: post.title + "\n\n" + post.body + "\n\n" + post.tags.map(tag => "#" + tag).join(" ") })}><MaterialCommunityIcons name="share-variant-outline" size={20} color="#657786"/><Text style={styles.xActionText}>{post.shares||0}</Text></Pressable>
                <Pressable style={styles.xAction} onPress={()=>toggleSave(post.id)}><MaterialCommunityIcons name={isSaved?"bookmark":"bookmark-outline"} size={20} color={isSaved?"#1D9BF0":"#657786"}/><Text style={styles.xActionText}>{post.savesCount||0}</Text></Pressable>
                <Pressable style={styles.xAction} onPress={()=>Alert.alert(isArabic?"تحليلات المنشور":"Post analytics",[(isArabic?"المشاهدات: ":"Views: ")+(post.views||0),(isArabic?"الإعجابات: ":"Likes: ")+(post.likes||0),(isArabic?"التعليقات: ":"Comments: ")+(post.comments||0),(isArabic?"إعادات النشر: ":"Reposts: ")+(post.reposts||0),(isArabic?"مرات الحفظ: ":"Saves: ")+(post.savesCount||0)].join("\\n"))}><MaterialCommunityIcons name="chart-box-outline" size={20} color="#657786"/><Text style={styles.xActionText}>{post.views||0}</Text></Pressable>
              </View>
              {commentingPost===post.id && <View style={styles.commentPanel}>
                {(postComments[String(post.id)]||[]).map((comment:any)=><View key={comment.id} style={styles.commentBubble}><Text style={styles.commentAuthor}>{comment.profiles?.display_name|| (isArabic?"عضو":"Member")}</Text><Text style={[styles.commentBody,isArabic&&styles.rtl]}>{comment.body}</Text><View style={{flexDirection:"row",gap:16,marginTop:6}}><Pressable onPress={()=>toggleCommentLike(comment.id)} style={{flexDirection:"row",alignItems:"center",gap:4}}><MaterialCommunityIcons name={likedComments.includes(comment.id)?"heart":"heart-outline"} size={15} color={likedComments.includes(comment.id)?"#D83F69":"#657786"}/><Text style={{fontSize:11,color:"#657786"}}>{likedComments.includes(comment.id)?(isArabic?"أعجبك":"Liked"):(isArabic?"إعجاب":"Like")}</Text></Pressable><Pressable onPress={()=>{setReplyToComment(comment.id);setCommentDraft("");}}><Text style={{fontSize:11,color:"#1D9BF0",fontWeight:"700"}}>{isArabic?"رد":"Reply"}</Text></Pressable></View></View>)}
                <View style={styles.commentComposer}>
                  <TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder={replyToComment?(isArabic?"اكتب ردك...":"Write a reply..."):(isArabic?"اكتب تعليقاً...":"Write a comment...")} placeholderTextColor="#7188A2" style={[styles.commentInput,isArabic&&styles.rtl]}/>
                  <Pressable onPress={async ()=>{if(!commentDraft.trim())return;if(!supabase||!currentUserId||typeof post.id!=="string"){setFeedNotice("سجّل الدخول لإضافة تعليق.");return;}const value=commentDraft.trim();const {data:created,error}=await supabase.from("comments").insert({post_id:post.id,author_id:currentUserId,body:value,parent_comment_id:replyToComment}).select("id,body,created_at,profiles(display_name)").single();if(error){setFeedNotice("تعذر إضافة التعليق: "+error.message);return;}setPostComments(old=>({...old,[String(post.id)]:[...(old[String(post.id)]||[]),created||{body:value,id:String(Date.now()),profiles:{display_name:"أنت"}}]}));setReplyToComment(null);setPosts(old=>old.map(p=>p.id===post.id?{...p,comments:p.comments+1}:p));setCommentDraft("");}} style={styles.commentSend}><MaterialCommunityIcons name="send" size={17} color="#FFFFFF"/></Pressable>
                </View>
              </View>}
            </View>;
          })}
          <View style={styles.bottomSpace}/>
          </>}
        </ScrollView>

        <View style={styles.bottomNav}>
          {navItems.map(item=><Pressable key={item.key} onPress={()=>setActiveTab(item.key)} style={styles.navItem}>
            <View style={[styles.navIconWrap,activeTab===item.key&&styles.navIconActive]}><MaterialCommunityIcons name={item.icon} size={21} color={activeTab===item.key?"#1D9BF0":"#7891AB"}/></View>
            <Text style={[styles.navLabel,activeTab===item.key&&styles.navLabelActive]}>{item.label}</Text>
          </Pressable>)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#FFFFFF"},
  app:{flex:1,backgroundColor:"#FFFFFF"},
  topBar:{height:66,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#E6ECF0"},
  brandWrap:{flexDirection:"row",alignItems:"center",gap:10},
  brandMark:{width:39,height:39,borderRadius:13,backgroundColor:"#1D9BF0",alignItems:"center",justifyContent:"center"},
  brand:{color:"#17202A",fontWeight:"900",fontSize:13,letterSpacing:1.3},
  brandSub:{color:"#6D8AA7",fontSize:8,letterSpacing:1.7,marginTop:3},
  topActions:{flexDirection:"row",alignItems:"center",gap:9},
  langButton:{height:35,minWidth:38,paddingHorizontal:8,borderRadius:11,borderWidth:1,borderColor:"#CFD9DE",alignItems:"center",justifyContent:"center"},
  langText:{color:"#B9D8ED",fontSize:12,fontWeight:"800"},
  iconButton:{width:37,height:37,borderRadius:12,backgroundColor:"#10243A",alignItems:"center",justifyContent:"center"},
  notificationDot:{position:"absolute",top:7,right:8,width:6,height:6,borderRadius:3,backgroundColor:"#1D9BF0"},
  scroll:{flex:1},
  content:{paddingHorizontal:16,paddingTop:17},
  hero:{backgroundColor:"#F5F8FA",borderWidth:1,borderColor:"#E6ECF0",borderRadius:22,padding:19,overflow:"hidden"},
  heroGlow:{position:"absolute",width:180,height:180,borderRadius:90,backgroundColor:"#E8F5FD",opacity:0.35,top:-100,right:-35},
  heroTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:15},
  livePill:{flexDirection:"row",alignItems:"center",gap:7,backgroundColor:"#E8F5FD",paddingHorizontal:10,paddingVertical:6,borderRadius:20},
  liveDot:{width:6,height:6,borderRadius:3,backgroundColor:"#61D4B0"},
  liveText:{color:"#8BD8F4",fontSize:9,fontWeight:"800",letterSpacing:1.1},
  heroTitle:{color:"#17202A",fontSize:23,fontWeight:"900",textAlign:"left",lineHeight:32},
  heroSubtitle:{color:"#A6C2D9",fontSize:13,marginTop:5,textAlign:"left",lineHeight:21},
  heroStats:{flexDirection:"row",alignItems:"center",gap:18,marginTop:22},
  statNumber:{color:"#79D4F8",fontSize:17,fontWeight:"900"},
  statLabel:{color:"#657786",fontSize:10,marginTop:3},
  statDivider:{height:29,width:1,backgroundColor:"#2A4B67"},
  searchBox:{height:49,backgroundColor:"#F5F8FA",borderWidth:1,borderColor:"#CFD9DE",borderRadius:15,marginTop:17,paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:9},
  searchInput:{flex:1,color:"#E7F3FD",fontSize:12,textAlign:"left",paddingVertical:0},
  sectionHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:24,marginBottom:13},
  sectionTitle:{color:"#17202A",fontSize:18,fontWeight:"900",textAlign:"left"},
  sectionHint:{color:"#657786",fontSize:10,marginTop:4,textAlign:"left"},
  writeButton:{height:37,paddingHorizontal:12,borderRadius:12,backgroundColor:"#1D9BF0",flexDirection:"row",alignItems:"center",gap:4},
  writeText:{color:"#FFFFFF",fontSize:12,fontWeight:"900"},
  composerChoices:{flexDirection:"row",flexWrap:"wrap",gap:9,marginTop:10,marginBottom:6},
  composerChoice:{width:"48%",minHeight:48,borderWidth:1,borderColor:"#D7E3EC",borderRadius:12,backgroundColor:"#FFFFFF",flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:12},
  composerChoiceText:{color:"#33424F",fontSize:13,fontWeight:"800"},
  chips:{gap:8,paddingBottom:13},
  chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:20,backgroundColor:"#F5F8FA",borderWidth:1,borderColor:"#CFD9DE"},
  chipActive:{backgroundColor:"#E8F5FD",borderColor:"#4CAED8"},
  chipText:{color:"#657786",fontSize:11,fontWeight:"700"},
  chipTextActive:{color:"#8EDCFA"},
  postCard:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:"#E6ECF0",borderRadius:19,padding:15,marginBottom:12},
  postHeader:{flexDirection:"row",alignItems:"center",gap:10},
  avatar:{width:42,height:42,borderRadius:14,borderWidth:1,alignItems:"center",justifyContent:"center"},
  authorInfo:{flex:1},
  nameLine:{flexDirection:"row",alignItems:"center",gap:5},
  authorName:{color:"#17202A",fontSize:13,fontWeight:"800"},
  authorRole:{color:"#657786",fontSize:10,marginTop:4},
  moreButton:{padding:4},
  postCategory:{alignSelf:"flex-start",marginTop:14,backgroundColor:"#E8F5FD",paddingHorizontal:9,paddingVertical:5,borderRadius:8},
  categoryText:{color:"#81D1F2",fontSize:9,fontWeight:"800"},
  postTitle:{color:"#17202A",fontSize:15,fontWeight:"900",marginTop:10,lineHeight:23,textAlign:"left"},
  postBody:{color:"#536471",fontSize:12,lineHeight:21,marginTop:6,textAlign:"left"},
  tags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12},
  tag:{backgroundColor:"#F5F8FA",paddingHorizontal:8,paddingVertical:5,borderRadius:7},
  tagText:{color:"#6EC6EA",fontSize:10,fontWeight:"700"},
  postDivider:{height:1,backgroundColor:"#E6ECF0",marginTop:14,marginBottom:10},
  postActions:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"nowrap",columnGap:0,rowGap:0},
  xAction:{flex:1,minWidth:0,minHeight:42,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:4,paddingHorizontal:1,borderRadius:8},
  xActionText:{fontSize:11,color:"#657786",fontWeight:"600"},
  action:{width:"49%",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:48,paddingHorizontal:8,borderRadius:12,backgroundColor:"#F1F7FB",borderWidth:1,borderColor:"#D7E8F3"},
  actionText:{color:"#243746",fontSize:13,fontWeight:"800"},
  likedText:{color:"#D83F69"},
  saveAction:{width:"49%",marginLeft:0,paddingHorizontal:8,minHeight:48,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,borderRadius:12,backgroundColor:"#F1F7FB",borderWidth:1,borderColor:"#D7E8F3"},
  commentPanel:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:"#E6ECF0"},
  commentBubble:{backgroundColor:"#F5F8FA",borderRadius:10,padding:9,marginBottom:7},
  commentAuthor:{color:"#78CBEF",fontSize:10,fontWeight:"800",marginBottom:3},
  commentBody:{color:"#C0D2E1",fontSize:11,lineHeight:17},
  commentComposer:{flexDirection:"row",alignItems:"center",gap:8,marginTop:5},
  commentInput:{flex:1,minHeight:40,maxHeight:80,backgroundColor:"#F5F8FA",borderWidth:1,borderColor:"#CFD9DE",borderRadius:10,paddingHorizontal:10,color:"#17202A",fontSize:11},
  commentSend:{width:39,height:39,borderRadius:11,backgroundColor:"#1D9BF0",alignItems:"center",justifyContent:"center"},
  composer:{backgroundColor:"#F5F8FA",borderWidth:1,borderColor:"#2B6384",borderRadius:17,padding:14,marginBottom:14},
  composerTitle:{color:"#17202A",fontWeight:"800",fontSize:14,marginBottom:10,textAlign:"left"},
  composerInput:{minHeight:90,color:"#17202A",fontSize:13,textAlign:"left",textAlignVertical:"top",backgroundColor:"#F5F8FA",borderRadius:12,padding:12},
  composerActions:{flexDirection:"row",justifyContent:"flex-end",alignItems:"center",gap:18,marginTop:12},
  cancelText:{color:"#9CB3C8",fontSize:12},
  publishButton:{backgroundColor:"#1D9BF0",paddingHorizontal:18,paddingVertical:9,borderRadius:10},
  publishText:{color:"#FFFFFF",fontWeight:"900",fontSize:12},
  empty:{alignItems:"center",padding:35,gap:10},
  emptyText:{color:"#657786",fontSize:12},
  bottomSpace:{height:18},
  bottomNav:{height:68,backgroundColor:"#F5F8FA",borderTopWidth:1,borderTopColor:"#E6ECF0",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:4},
  navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:3},
  navIconWrap:{width:42,height:29,alignItems:"center",justifyContent:"center",borderRadius:11},
  navIconActive:{backgroundColor:"#E8F5FD"},
  navLabel:{fontSize:9,color:"#657786",fontWeight:"600"},
  navLabelActive:{color:"#78D3F6",fontWeight:"900"},
  rtl:{textAlign:"right",writingDirection:"rtl"}
});

export default function App() { return <AuthGate><CommunityApp /></AuthGate>; }

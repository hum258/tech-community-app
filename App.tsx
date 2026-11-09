import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  I18nManager, StatusBar, Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SecondaryScreen from "./src/SecondaryScreen";

type Post = {
  id: number; name: string; role: string; time: string; category: string;
  title: string; body: string; tags: string[]; likes: number; comments: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string;
};

const initialPosts: Post[] = [
  {
    id: 1, name: "سارة أحمد", role: "مهندسة أمن سيبراني", time: "منذ 12 دقيقة",
    category: "الأمن السيبراني", title: "كيف تبدأ في تحليل الروابط المشبوهة؟",
    body: "جمعت مجموعة خطوات أساسية تساعد المبتدئين على فحص الروابط وفهم المؤشرات التي تستحق الانتباه، دون فتح الرابط مباشرة.",
    tags: ["CyberSecurity", "SOC", "Beginner"], likes: 128, comments: 24,
    icon: "shield-check-outline", color: "#36B9E9"
  },
  {
    id: 2, name: "عمر خالد", role: "مطور تطبيقات", time: "منذ 38 دقيقة",
    category: "البرمجة", title: "شاركوني رأيكم في مشروع React Native",
    body: "أعمل على تطبيق متعدد المنصات وأبحث عن أفضل طريقة لتنظيم المكونات وإدارة الحالة مع نمو المشروع.",
    tags: ["ReactNative", "MobileDev"], likes: 86, comments: 17,
    icon: "code-tags", color: "#A78BFA"
  },
  {
    id: 3, name: "ليان محمود", role: "مهتمة بالذكاء الاصطناعي", time: "منذ ساعة",
    category: "الذكاء الاصطناعي", title: "مصادر عربية لتعلم أساسيات الذكاء الاصطناعي",
    body: "ما أفضل المصادر العملية التي تنصحون بها لمن يريد بناء أساس قوي في تعلم الآلة وفهم النماذج؟",
    tags: ["AI", "MachineLearning"], likes: 64, comments: 12,
    icon: "brain", color: "#F4B860"
  }
];

const categories = ["الكل", "البرمجة", "الأمن السيبراني", "الذكاء الاصطناعي", "الشبكات"];

export default function App() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [activeTab, setActiveTab] = useState("home");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [posts, setPosts] = useState(initialPosts);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [commentingPost, setCommentingPost] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postComments, setPostComments] = useState<Record<number, string[]>>({});

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
    { key:"groups", icon:"account-group-outline" as const, label:labels.groups },
    { key:"messages", icon:"message-text-outline" as const, label:labels.messages },
    { key:"profile", icon:"account-circle-outline" as const, label:labels.profile }
  ];

  const toggleLike = (id:number) => setLiked(old => old.includes(id) ? old.filter(x=>x!==id) : [...old,id]);
  const toggleSave = (id:number) => setSaved(old => old.includes(id) ? old.filter(x=>x!==id) : [...old,id]);
  const publish = () => {
    if (!draft.trim()) return;
    setPosts(old => [{
      id: Date.now(), name: isArabic ? "أنت" : "You",
      role: isArabic ? "عضو جديد" : "New member",
      time: isArabic ? "الآن" : "Now", category: isArabic ? "البرمجة" : "Programming",
      title: draft.trim(), body: isArabic ? "منشور جديد من المجتمع التقني." : "A new post from the tech community.",
      tags: ["Community"], likes:0, comments:0, icon:"account-outline", color:"#38BDF8"
    }, ...old]);
    setDraft(""); setComposerOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#071426" />
      <View style={styles.app}>
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.brandMark}><MaterialCommunityIcons name="code-braces" size={22} color="#071426" /></View>
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
              <MaterialCommunityIcons name="bell-outline" size={21} color="#DCEBFA" />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab !== "home" ? <SecondaryScreen tab={activeTab} isArabic={isArabic} onBackHome={() => setActiveTab("home")} /> : <>
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={styles.livePill}><View style={styles.liveDot}/><Text style={styles.liveText}>TECH NETWORK</Text></View>
              <MaterialCommunityIcons name="orbit" size={25} color="#69C9F3" />
            </View>
            <Text style={[styles.heroTitle, isArabic && styles.rtl]}>{labels.greeting}</Text>
            <Text style={[styles.heroSubtitle, isArabic && styles.rtl]}>{labels.subtitle}</Text>
            <View style={styles.heroStats}>
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

          <View style={styles.sectionHeading}>
            <View><Text style={[styles.sectionTitle, isArabic && styles.rtl]}>{labels.feed}</Text><Text style={[styles.sectionHint, isArabic && styles.rtl]}>{labels.demo}</Text></View>
            <Pressable style={styles.writeButton} onPress={()=>setComposerOpen(true)}>
              <MaterialCommunityIcons name="plus" size={18} color="#071426" />
              <Text style={styles.writeText}>{isArabic?"منشور":"Post"}</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((cat, index) => (
              <Pressable key={cat} onPress={()=>setActiveCategory(cat)} style={[styles.chip, activeCategory===cat && styles.chipActive]}>
                <Text style={[styles.chipText, activeCategory===cat && styles.chipTextActive]}>{isArabic ? cat : ["All","Programming","Cybersecurity","Artificial Intelligence","Networking"][index]}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {composerOpen && <View style={styles.composer}>
            <Text style={[styles.composerTitle, isArabic && styles.rtl]}>{isArabic?"أنشئ منشورك":"Create a post"}</Text>
            <TextInput multiline value={draft} onChangeText={setDraft} placeholder={labels.compose} placeholderTextColor="#7188A2" style={[styles.composerInput, isArabic && styles.rtl]} />
            <View style={styles.composerActions}>
              <Pressable onPress={()=>setComposerOpen(false)}><Text style={styles.cancelText}>{labels.cancel}</Text></Pressable>
              <Pressable onPress={publish} style={styles.publishButton}><Text style={styles.publishText}>{labels.publish}</Text></Pressable>
            </View>
          </View>}

          {visiblePosts.length===0 && <View style={styles.empty}><MaterialCommunityIcons name="text-search" size={32} color="#5D7895"/><Text style={styles.emptyText}>{labels.empty}</Text></View>}

          {visiblePosts.map(post => {
            const isLiked = liked.includes(post.id);
            const isSaved = saved.includes(post.id);
            return <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.avatar,{backgroundColor:post.color+"22",borderColor:post.color+"66"}]}><MaterialCommunityIcons name={post.icon} size={23} color={post.color}/></View>
                <View style={styles.authorInfo}>
                  <View style={styles.nameLine}><Text style={styles.authorName}>{post.name}</Text><MaterialCommunityIcons name="check-decagram" size={14} color="#43BCEB"/></View>
                  <Text style={styles.authorRole}>{post.role} · {post.time}</Text>
                </View>
                <Pressable style={styles.moreButton}><MaterialCommunityIcons name="dots-horizontal" size={22} color="#8EA5BD"/></Pressable>
              </View>
              <View style={styles.postCategory}><Text style={styles.categoryText}>{post.category}</Text></View>
              <Text style={[styles.postTitle, isArabic && styles.rtl]}>{post.title}</Text>
              <Text style={[styles.postBody, isArabic && styles.rtl]}>{post.body}</Text>
              <View style={styles.tags}>{post.tags.map(tag=><View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>)}</View>
              <View style={styles.postDivider}/>
              <View style={styles.postActions}>
                <Pressable style={styles.action} onPress={()=>toggleLike(post.id)}><MaterialCommunityIcons name={isLiked?"heart":"heart-outline"} size={20} color={isLiked?"#F07891":"#8EA5BD"}/><Text style={[styles.actionText,isLiked&&styles.likedText]}>{post.likes+(isLiked?1:0)}</Text></Pressable>
                <Pressable style={styles.action} onPress={()=>{setCommentingPost(commentingPost===post.id?null:post.id);setCommentDraft("");}}><MaterialCommunityIcons name="comment-outline" size={19} color={commentingPost===post.id?"#69C9F3":"#8EA5BD"}/><Text style={styles.actionText}>{post.comments+(postComments[post.id]?.length||0)}</Text></Pressable>
                <Pressable style={styles.action}><MaterialCommunityIcons name="share-variant-outline" size={19} color="#8EA5BD"/><Text style={styles.actionText}>{isArabic?"مشاركة":"Share"}</Text></Pressable>
                <Pressable style={styles.saveAction} onPress={()=>toggleSave(post.id)}><MaterialCommunityIcons name={isSaved?"bookmark":"bookmark-outline"} size={20} color={isSaved?"#69C9F3":"#8EA5BD"}/></Pressable>
              </View>
              {commentingPost===post.id && <View style={styles.commentPanel}>
                {(postComments[post.id]||[]).map((comment,index)=><View key={index} style={styles.commentBubble}><Text style={styles.commentAuthor}>{isArabic?"أنت":"You"}</Text><Text style={[styles.commentBody,isArabic&&styles.rtl]}>{comment}</Text></View>)}
                <View style={styles.commentComposer}>
                  <TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder={isArabic?"اكتب تعليقاً...":"Write a comment..."} placeholderTextColor="#7188A2" style={[styles.commentInput,isArabic&&styles.rtl]}/>
                  <Pressable onPress={()=>{if(commentDraft.trim()){setPostComments(old=>({...old,[post.id]:[...(old[post.id]||[]),commentDraft.trim()]}));setCommentDraft("");}}} style={styles.commentSend}><MaterialCommunityIcons name="send" size={17} color="#071426"/></Pressable>
                </View>
              </View>}
            </View>;
          })}
          <View style={styles.bottomSpace}/>
          </>}
        </ScrollView>

        <View style={styles.bottomNav}>
          {navItems.map(item=><Pressable key={item.key} onPress={()=>setActiveTab(item.key)} style={styles.navItem}>
            <View style={[styles.navIconWrap,activeTab===item.key&&styles.navIconActive]}><MaterialCommunityIcons name={item.icon} size={21} color={activeTab===item.key?"#69C9F3":"#7891AB"}/></View>
            <Text style={[styles.navLabel,activeTab===item.key&&styles.navLabelActive]}>{item.label}</Text>
          </Pressable>)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#071426"},
  app:{flex:1,backgroundColor:"#071426"},
  topBar:{height:66,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#142B43"},
  brandWrap:{flexDirection:"row",alignItems:"center",gap:10},
  brandMark:{width:39,height:39,borderRadius:13,backgroundColor:"#69C9F3",alignItems:"center",justifyContent:"center"},
  brand:{color:"#EAF5FF",fontWeight:"900",fontSize:13,letterSpacing:1.3},
  brandSub:{color:"#6D8AA7",fontSize:8,letterSpacing:1.7,marginTop:3},
  topActions:{flexDirection:"row",alignItems:"center",gap:9},
  langButton:{height:35,minWidth:38,paddingHorizontal:8,borderRadius:11,borderWidth:1,borderColor:"#25425E",alignItems:"center",justifyContent:"center"},
  langText:{color:"#B9D8ED",fontSize:12,fontWeight:"800"},
  iconButton:{width:37,height:37,borderRadius:12,backgroundColor:"#10243A",alignItems:"center",justifyContent:"center"},
  notificationDot:{position:"absolute",top:7,right:8,width:6,height:6,borderRadius:3,backgroundColor:"#69C9F3"},
  scroll:{flex:1},
  content:{paddingHorizontal:16,paddingTop:17},
  hero:{backgroundColor:"#102943",borderWidth:1,borderColor:"#1D4968",borderRadius:22,padding:19,overflow:"hidden"},
  heroGlow:{position:"absolute",width:180,height:180,borderRadius:90,backgroundColor:"#164B6A",opacity:0.35,top:-100,right:-35},
  heroTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:15},
  livePill:{flexDirection:"row",alignItems:"center",gap:7,backgroundColor:"#163B53",paddingHorizontal:10,paddingVertical:6,borderRadius:20},
  liveDot:{width:6,height:6,borderRadius:3,backgroundColor:"#61D4B0"},
  liveText:{color:"#8BD8F4",fontSize:9,fontWeight:"800",letterSpacing:1.1},
  heroTitle:{color:"#F0F8FF",fontSize:23,fontWeight:"900",textAlign:"left",lineHeight:32},
  heroSubtitle:{color:"#A6C2D9",fontSize:13,marginTop:5,textAlign:"left",lineHeight:21},
  heroStats:{flexDirection:"row",alignItems:"center",gap:18,marginTop:22},
  statNumber:{color:"#79D4F8",fontSize:17,fontWeight:"900"},
  statLabel:{color:"#8FAAC2",fontSize:10,marginTop:3},
  statDivider:{height:29,width:1,backgroundColor:"#2A4B67"},
  searchBox:{height:49,backgroundColor:"#0D2034",borderWidth:1,borderColor:"#1B3853",borderRadius:15,marginTop:17,paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:9},
  searchInput:{flex:1,color:"#E7F3FD",fontSize:12,textAlign:"left",paddingVertical:0},
  sectionHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:24,marginBottom:13},
  sectionTitle:{color:"#EAF5FF",fontSize:18,fontWeight:"900",textAlign:"left"},
  sectionHint:{color:"#718BA4",fontSize:10,marginTop:4,textAlign:"left"},
  writeButton:{height:37,paddingHorizontal:12,borderRadius:12,backgroundColor:"#69C9F3",flexDirection:"row",alignItems:"center",gap:4},
  writeText:{color:"#071426",fontSize:12,fontWeight:"900"},
  chips:{gap:8,paddingBottom:13},
  chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:20,backgroundColor:"#0D2034",borderWidth:1,borderColor:"#1B3853"},
  chipActive:{backgroundColor:"#153B56",borderColor:"#4CAED8"},
  chipText:{color:"#8FAAC2",fontSize:11,fontWeight:"700"},
  chipTextActive:{color:"#8EDCFA"},
  postCard:{backgroundColor:"#0D1F32",borderWidth:1,borderColor:"#1B344D",borderRadius:19,padding:15,marginBottom:12},
  postHeader:{flexDirection:"row",alignItems:"center",gap:10},
  avatar:{width:42,height:42,borderRadius:14,borderWidth:1,alignItems:"center",justifyContent:"center"},
  authorInfo:{flex:1},
  nameLine:{flexDirection:"row",alignItems:"center",gap:5},
  authorName:{color:"#E8F4FF",fontSize:13,fontWeight:"800"},
  authorRole:{color:"#7D96AE",fontSize:10,marginTop:4},
  moreButton:{padding:4},
  postCategory:{alignSelf:"flex-start",marginTop:14,backgroundColor:"#15334B",paddingHorizontal:9,paddingVertical:5,borderRadius:8},
  categoryText:{color:"#81D1F2",fontSize:9,fontWeight:"800"},
  postTitle:{color:"#E8F4FF",fontSize:15,fontWeight:"900",marginTop:10,lineHeight:23,textAlign:"left"},
  postBody:{color:"#A3B8CC",fontSize:12,lineHeight:21,marginTop:6,textAlign:"left"},
  tags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:12},
  tag:{backgroundColor:"#102A40",paddingHorizontal:8,paddingVertical:5,borderRadius:7},
  tagText:{color:"#6EC6EA",fontSize:10,fontWeight:"700"},
  postDivider:{height:1,backgroundColor:"#1B344D",marginTop:14,marginBottom:10},
  postActions:{flexDirection:"row",alignItems:"center",gap:20},
  action:{flexDirection:"row",alignItems:"center",gap:6},
  actionText:{color:"#8EA5BD",fontSize:11},
  likedText:{color:"#F07891"},
  saveAction:{marginLeft:"auto",padding:3},
  commentPanel:{marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:"#1B344D"},
  commentBubble:{backgroundColor:"#102A40",borderRadius:10,padding:9,marginBottom:7},
  commentAuthor:{color:"#78CBEF",fontSize:10,fontWeight:"800",marginBottom:3},
  commentBody:{color:"#C0D2E1",fontSize:11,lineHeight:17},
  commentComposer:{flexDirection:"row",alignItems:"center",gap:8,marginTop:5},
  commentInput:{flex:1,minHeight:40,maxHeight:80,backgroundColor:"#091A2B",borderWidth:1,borderColor:"#25425E",borderRadius:10,paddingHorizontal:10,color:"#EAF5FF",fontSize:11},
  commentSend:{width:39,height:39,borderRadius:11,backgroundColor:"#69C9F3",alignItems:"center",justifyContent:"center"},
  composer:{backgroundColor:"#102943",borderWidth:1,borderColor:"#2B6384",borderRadius:17,padding:14,marginBottom:14},
  composerTitle:{color:"#EAF5FF",fontWeight:"800",fontSize:14,marginBottom:10,textAlign:"left"},
  composerInput:{minHeight:90,color:"#EAF5FF",fontSize:13,textAlign:"left",textAlignVertical:"top",backgroundColor:"#0A1B2D",borderRadius:12,padding:12},
  composerActions:{flexDirection:"row",justifyContent:"flex-end",alignItems:"center",gap:18,marginTop:12},
  cancelText:{color:"#9CB3C8",fontSize:12},
  publishButton:{backgroundColor:"#69C9F3",paddingHorizontal:18,paddingVertical:9,borderRadius:10},
  publishText:{color:"#071426",fontWeight:"900",fontSize:12},
  empty:{alignItems:"center",padding:35,gap:10},
  emptyText:{color:"#8FAAC2",fontSize:12},
  bottomSpace:{height:18},
  bottomNav:{height:68,backgroundColor:"#091A2B",borderTopWidth:1,borderTopColor:"#19334C",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingHorizontal:4},
  navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:3},
  navIconWrap:{width:42,height:29,alignItems:"center",justifyContent:"center",borderRadius:11},
  navIconActive:{backgroundColor:"#14334B"},
  navLabel:{fontSize:9,color:"#718BA4",fontWeight:"600"},
  navLabelActive:{color:"#78D3F6",fontWeight:"900"},
  rtl:{textAlign:"right",writingDirection:"rtl"}
});
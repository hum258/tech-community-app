import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./lib/supabase";

type Props = { tab: string; isArabic: boolean; onBackHome: () => void; onOpenMessages: () => void };
type Profile = { id:string; account_type:"personal"|"company"; account_mode:"personal"|"business"|"company"; display_name:string; username:string; bio:string; specialty:string|null; is_private:boolean; hide_followers:boolean; interests:string[]; company_name:string|null; company_website:string|null; company_industry:string|null; verification_status:string; verified_at:string|null; avatar_url:string|null; cover_url:string|null; is_verified:boolean };
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
  const [postCount,setPostCount]=useState(0);
  const [followersCount,setFollowersCount]=useState(0);
  const [followingCount,setFollowingCount]=useState(0);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [people,setPeople]=useState<any[]>([]);
  const [followingIds,setFollowingIds]=useState<string[]>([]);
  const [targetUsername,setTargetUsername]=useState("");
  const [activeConversation,setActiveConversation]=useState<string|null>(null);
  const [activePeer,setActivePeer]=useState("");
  const [messages,setMessages]=useState<any[]>([]);
  const [messageDraft,setMessageDraft]=useState("");
  const [newCommunityName,setNewCommunityName]=useState("");
  const [newCommunityDescription,setNewCommunityDescription]=useState("");
  const [newCommunitySpecialty,setNewCommunitySpecialty]=useState("");
  const [coverUrl,setCoverUrl]=useState("");
  const [accountMode,setAccountMode]=useState<"personal"|"business"|"company">("personal");
  const [hideFollowers,setHideFollowers]=useState(false);
  const [showPeopleList,setShowPeopleList]=useState<"followers"|"following"|null>(null);
  const [peopleList,setPeopleList]=useState<any[]>([]);
  const [myPosts,setMyPosts]=useState<any[]>([]);
  const [viewedProfile,setViewedProfile]=useState<any|null>(null);
  const [viewedPosts,setViewedPosts]=useState<any[]>([]);
  const [viewedStats,setViewedStats]=useState({posts:0,followers:0,following:0});


  const loadProfile=useCallback(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    setUserId(user.id);
    const {data}=await supabase.from("profiles").select("id,account_type,account_mode,display_name,username,bio,specialty,is_private,hide_followers,interests,company_name,company_website,company_industry,verification_status,verified_at,avatar_url,cover_url,is_verified").eq("id",user.id).maybeSingle();
    if(data){const p=data as Profile;setProfile(p);setDisplayName(p.display_name||"");setUsername(p.username||"");setBio(p.bio||"");setSpecialty(p.specialty||"");setPrivateAccount(!!p.is_private);setCoverUrl(p.cover_url||"");setAccountMode(p.account_mode||p.account_type||"personal");setHideFollowers(!!p.hide_followers);}
    const [posts,followers,following]=await Promise.all([
      supabase.from("posts").select("id",{count:"exact",head:true}).eq("author_id",user.id),
      supabase.from("profile_follows").select("follower_id",{count:"exact",head:true}).eq("following_id",user.id),
      supabase.from("profile_follows").select("following_id",{count:"exact",head:true}).eq("follower_id",user.id)
    ]);
    setPostCount(posts.count||0);setFollowersCount(followers.count||0);setFollowingCount(following.count||0);
    const {data:ownPosts}=await supabase.from("posts").select("id,title,body,image_url,created_at").eq("author_id",user.id).order("created_at",{ascending:false}).limit(50);
    setMyPosts(ownPosts||[]);
  },[]);

  const loadGroups=useCallback(async()=>{
    if(!supabase)return;
    const {data:rows}=await supabase.from("communities").select("id,name,description,specialty").order("name");
    if(rows)setCommunities(rows as Community[]);
    const {data:{user}}=await supabase.auth.getUser();
    if(user){setUserId(user.id);const {data:members}=await supabase.from("community_members").select("community_id").eq("user_id",user.id);setJoined((members||[]).map((m:any)=>m.community_id));}
  },[]);

  const loadPeople=useCallback(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    setUserId(user.id);
    const term=query.trim().replace(/[%,]/g,"");
    let request=supabase.from("profiles").select("id,display_name,username,bio,specialty,avatar_url,account_type,is_verified").eq("is_private",false).neq("id",user.id).order("created_at",{ascending:false}).limit(30);
    if(term) request=request.or("username.ilike.%"+term+"%,display_name.ilike.%"+term+"%,specialty.ilike.%"+term+"%");
    const [{data:rows},{data:following}]=await Promise.all([
      request,
      supabase.from("profile_follows").select("following_id").eq("follower_id",user.id)
    ]);
    setPeople(rows||[]);
    setFollowingIds((following||[]).map((x:any)=>x.following_id));
  },[query]);

  const toggleFollow=async(targetId:string)=>{
    if(!supabase||!userId||targetId===userId)return;
    const exists=followingIds.includes(targetId);
    setBusy(true);
    const result=exists
      ? await supabase.from("profile_follows").delete().eq("follower_id",userId).eq("following_id",targetId)
      : await supabase.from("profile_follows").insert({follower_id:userId,following_id:targetId});
    setBusy(false);
    if(result.error){showNotice(result.error.message);return;}
    setFollowingIds(old=>exists?old.filter(x=>x!==targetId):[...old,targetId]);
  };

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

  useEffect(()=>{if(tab==="profile")loadProfile();if(tab==="groups")loadGroups();if(tab==="explore"){loadGroups();loadPeople();}if(tab==="messages")loadMessages();},[tab,loadProfile,loadGroups,loadMessages,loadPeople]);

  const showNotice=(v:string)=>setNotice(v);
  const saveProfile=async()=>{
    if(!supabase||!userId||!displayName.trim()||!username.trim()){showNotice(ar?"الاسم واسم المستخدم مطلوبان.":"Name and username are required.");return;}
    if(!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())){showNotice(ar?"اسم المستخدم يجب أن يكون 3–20 حرفاً أو رقماً أو _.":"Username must be 3–20 letters, numbers or underscores.");return;}
    setBusy(true);const {error}=await supabase.from("profiles").update({display_name:displayName.trim(),username:username.trim().toLowerCase(),bio:bio.trim(),specialty:specialty.trim()||null,is_private:privateAccount,account_mode:accountMode,hide_followers:hideFollowers}).eq("id",userId);setBusy(false);
    if(error){showNotice(error.message);return;}setEdit(false);showNotice(ar?"تم حفظ الملف الشخصي.":"Profile saved.");loadProfile();
  };

  const createCommunity=async()=>{
    if(!supabase||!userId||!newCommunityName.trim()){showNotice(ar?"اكتب اسم المجتمع أولاً.":"Enter a community name.");return;}
    setBusy(true);
    const {data,error}=await supabase.from("communities").insert({name:newCommunityName.trim(),description:newCommunityDescription.trim(),specialty:newCommunitySpecialty.trim()||"عام",owner_id:userId}).select("id").single();
    if(error){setBusy(false);showNotice(ar?"تعذر إنشاء المجتمع: ":"Could not create community: "+error.message);return;}
    const joinedResult=await supabase.from("community_members").insert({community_id:data.id,user_id:userId,role:"moderator"});
    setBusy(false);
    if(joinedResult.error){showNotice(joinedResult.error.message);return;}
    setNewCommunityName("");setNewCommunityDescription("");setNewCommunitySpecialty("");showNotice(ar?"تم إنشاء المجتمع والانضمام إليه.":"Community created and joined.");await loadGroups();
  };

  const toggleCommunity=async(id:string)=>{
    if(!supabase||!userId)return;
    const isJoined=joined.includes(id);setBusy(true);
    const result=isJoined?await supabase.from("community_members").delete().eq("community_id",id).eq("user_id",userId):await supabase.from("community_members").insert({community_id:id,user_id:userId,role:"member"});
    setBusy(false);if(result.error){showNotice(result.error.message);return;}
    setJoined(old=>isJoined?old.filter(x=>x!==id):[...old,id]);
  };

  const toggleVerified=async()=>{
    if(!supabase||!userId||!profile)return;
    const next=!profile.is_verified;
    setBusy(true);
    const {error}=await supabase.from("profiles").update({is_verified:next}).eq("id",userId);
    setBusy(false);
    if(error){showNotice(error.message);return;}
    setProfile({...profile,is_verified:next});
    showNotice(next?(ar?"تم تفعيل شارة التوثيق.":"Verification badge enabled."):(ar?"تم إيقاف شارة التوثيق.":"Verification badge disabled."));
  };

  const chooseCover=async()=>{
    if(!supabase||!userId||!profile)return;
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){showNotice(ar?"اسمح للتطبيق بالوصول إلى الصور.":"Allow photo library access.");return;}
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[16,5],quality:0.85});
    if(picked.canceled||!picked.assets[0])return;
    setBusy(true);
    try{
      const asset=picked.assets[0];const response=await fetch(asset.uri);const bytes=await response.arrayBuffer();
      const ext=(asset.mimeType||"image/jpeg").split("/")[1]||"jpg";const path=userId+"/cover-"+Date.now()+"."+ext;
      const uploaded=await supabase.storage.from("post-images").upload(path,bytes,{contentType:asset.mimeType||"image/jpeg",upsert:true});
      if(uploaded.error)throw uploaded.error;
      const url=supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      const saved=await supabase.from("profiles").update({cover_url:url}).eq("id",userId);
      if(saved.error)throw saved.error;
      setCoverUrl(url);setProfile({...profile,cover_url:url});showNotice(ar?"تم تحديث صورة الغلاف.":"Cover photo updated.");
    }catch(e:any){showNotice((ar?"تعذر رفع الغلاف: ":"Could not upload cover: ")+(e?.message||""));}
    finally{setBusy(false);}
  };

  const openPeopleList=async(kind:"followers"|"following")=>{
    if(!supabase||!userId)return;
    setBusy(true);
    if(kind==="followers"&&profile?.hide_followers){setBusy(false);showNotice(ar?"قائمة المتابعين مخفية في إعداداتك.":"Your followers list is hidden in settings.");return;}
    const col=kind==="followers"?"follower_id":"following_id";
    const filter=kind==="followers"?"following_id":"follower_id";
    const {data,error}=await supabase.from("profile_follows").select(col).eq(filter,userId);
    if(error){setBusy(false);showNotice(error.message);return;}
    const ids=(data||[]).map((x:any)=>x[col]);
    const {data:profiles,error:profileError}=ids.length?await supabase.from("profiles").select("id,display_name,username,avatar_url,is_verified,account_type").in("id",ids):{data:[],error:null};
    setBusy(false);
    if(profileError){showNotice(profileError.message);return;}
    setPeopleList(profiles||[]);
    setShowPeopleList(kind);
  };

  const openProfile=async(id:string)=>{
    if(!supabase)return;
    setBusy(true);
    const {data,error}=await supabase.from("profiles").select("id,display_name,username,bio,specialty,avatar_url,cover_url,is_verified,account_type,account_mode,is_private,hide_followers").eq("id",id).maybeSingle();
    if(error||!data){setBusy(false);showNotice(ar?"تعذر فتح الحساب.":"Could not open profile.");return;}
    const [postsResult,followersResult,followingResult]=await Promise.all([
      supabase.from("posts").select("id,title,body,image_url,created_at").eq("author_id",id).order("created_at",{ascending:false}).limit(50),
      supabase.from("profile_follows").select("follower_id",{count:"exact",head:true}).eq("following_id",id),
      supabase.from("profile_follows").select("following_id",{count:"exact",head:true}).eq("follower_id",id)
    ]);
    setViewedProfile(data);setViewedPosts(postsResult.data||[]);
    setViewedStats({posts:postsResult.data?.length||0,followers:followersResult.count||0,following:followingResult.count||0});setBusy(false);
  };

  const chooseAvatar=async()=>{
    if(!supabase||!userId||!profile)return;
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){showNotice(ar?"اسمح للتطبيق بالوصول إلى الصور.":"Allow photo library access.");return;}
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,aspect:[1,1],quality:0.85});
    if(picked.canceled||!picked.assets[0])return;
    setBusy(true);
    try{
      const asset=picked.assets[0];const response=await fetch(asset.uri);const bytes=await response.arrayBuffer();
      const ext=(asset.mimeType||"image/jpeg").split("/")[1]||"jpg";const path=userId+"/avatar-"+Date.now()+"."+ext;
      const uploaded=await supabase.storage.from("post-images").upload(path,bytes,{contentType:asset.mimeType||"image/jpeg",upsert:true});
      if(uploaded.error)throw uploaded.error;
      const url=supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      const saved=await supabase.from("profiles").update({avatar_url:url}).eq("id",userId);
      if(saved.error)throw saved.error;
      setProfile({...profile,avatar_url:url});showNotice(ar?"تم تحديث الصورة الشخصية.":"Profile photo updated.");
    }catch(e:any){showNotice((ar?"تعذر رفع الصورة: ":"Could not upload photo: ")+(e?.message||""));}
    finally{setBusy(false);}
  };

  const startConversationWith=async(person:any)=>{
    if(!supabase||!person?.id||!userId)return;
    if(person.id===userId){showNotice(ar?"لا يمكنك مراسلة نفسك.":"You cannot message yourself.");return;}
    setBusy(true);
    const {data,error}=await supabase.rpc("create_direct_conversation",{target_user:person.id});
    setBusy(false);
    if(error||!data){showNotice(error?.message||"تعذر فتح المحادثة.");return;}
    setActiveConversation(data);setActivePeer(person.display_name||person.username||"عضو");await loadMessages();await loadConversationMessages(data);onOpenMessages();
  };

  const startConversation=async()=>{
    if(!supabase||!targetUsername.trim())return;
    setBusy(true);
    const {data:person,error:findError}=await supabase.from("profiles").select("id,display_name,username").eq("username",targetUsername.trim().replace(/^@/,"").toLowerCase()).maybeSingle();
    setBusy(false);
    if(findError||!person){showNotice(ar?"لم نعثر على هذا المستخدم أو أن حسابه غير متاح.":"User not found or unavailable.");return;}
    setTargetUsername("");await startConversationWith(person);
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

    {showPeopleList&&<View style={s.card}>
      <Pressable onPress={()=>setShowPeopleList(null)} style={s.back}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={s.backText}>{ar?"رجوع للملف الشخصي":"Back to profile"}</Text></Pressable>
      <Text style={s.cardTitle}>{showPeopleList==="followers"?(ar?"المتابعون":"Followers"):(ar?"يتابع":"Following")}</Text>
      {peopleList.map(p=><Pressable key={p.id} onPress={()=>openProfile(p.id)} style={s.personCard}><Text style={s.cardTitle}>{p.display_name||p.username}</Text><Text style={s.detail}>@{p.username}</Text></Pressable>)}
      {!peopleList.length&&<Text style={s.empty}>{ar?"لا توجد حسابات لعرضها.":"No accounts to show."}</Text>}
    </View>}

    {viewedProfile&&!showPeopleList&&<View style={s.card}>
      <Pressable onPress={()=>setViewedProfile(null)} style={s.back}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={s.backText}>{ar?"رجوع":"Back"}</Text></Pressable>
      {viewedProfile.cover_url?<Image source={{uri:viewedProfile.cover_url}} style={s.coverImage}/>:<View style={s.coverPlaceholder}/>}
      <View style={{flexDirection:"row",alignItems:"center",gap:8,marginTop:10}}>
        {viewedProfile.avatar_url?<Image source={{uri:viewedProfile.avatar_url}} style={s.personAvatar}/>:<View style={s.personAvatarFallback}><MaterialCommunityIcons name="account" size={22} color={C.blue}/></View>}
        <View style={{flex:1}}><Text style={s.profileName}>{viewedProfile.display_name}</Text><Text style={s.detail}>@{viewedProfile.username}</Text></View>
        {viewedProfile.is_verified&&<MaterialCommunityIcons name="check-decagram" size={20} color={viewedProfile.account_type==="company"?"#89939D":C.blue}/>}
      </View>
      <Text style={s.bio}>{viewedProfile.bio||""}</Text>
      {!!viewedProfile.specialty&&<Text style={s.detail}>{viewedProfile.specialty}</Text>}
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statNum}>{viewedStats.posts}</Text><Text style={s.statLabel}>{ar?"المنشورات":"Posts"}</Text></View>
        <View style={s.stat}><Text style={s.statNum}>{viewedStats.followers}</Text><Text style={s.statLabel}>{ar?"المتابعون":"Followers"}</Text></View>
        <View style={s.stat}><Text style={s.statNum}>{viewedStats.following}</Text><Text style={s.statLabel}>{ar?"يتابع":"Following"}</Text></View>
      </View>
      <View style={s.row}>
        <Pressable onPress={()=>toggleFollow(viewedProfile.id)} style={[s.button,{flex:1},followingIds.includes(viewedProfile.id)&&s.secondaryButton]}><Text style={[s.buttonText,followingIds.includes(viewedProfile.id)&&s.secondaryButtonText]}>{followingIds.includes(viewedProfile.id)?(ar?"إلغاء المتابعة":"Unfollow"):(ar?"متابعة":"Follow")}</Text></Pressable>
        <Pressable onPress={()=>startConversationWith(viewedProfile)} style={[s.button,{flex:1,backgroundColor:C.ink}]}><Text style={s.buttonText}>{ar?"مراسلة":"Message"}</Text></Pressable>
      </View>
      {viewedProfile.is_private&&<Text style={s.detail}>{ar?"هذا الحساب خاص.":"This account is private."}</Text>}
      {viewedPosts.map(p=><View key={p.id} style={s.card}><Text style={s.cardTitle}>{p.title}</Text><Text style={s.detail}>{p.body}</Text>{p.image_url&&<Image source={{uri:p.image_url}} style={s.coverImage}/>}</View>)}
      {!viewedPosts.length&&<Text style={s.empty}>{ar?"لا توجد منشورات بعد.":"No posts yet."}</Text>}
    </View>}

    {!viewedProfile&&tab==="explore"&&<>
      <TextInput value={query} onChangeText={setQuery} placeholder={ar?"ابحث عن مجتمعات وتخصصات...":"Search communities and topics..."} placeholderTextColor="#9AA8B2" style={[s.input,ar&&s.rtl]}/>
      <Text style={[s.section,ar&&s.rtl]}>{ar?"الأشخاص":"People"}</Text>
      {people.map(person=><Pressable key={person.id} onPress={()=>openProfile(person.id)} style={s.personCard}>
        {person.avatar_url?<Image source={{uri:person.avatar_url}} style={s.personAvatar}/>:<View style={s.personAvatarFallback}><MaterialCommunityIcons name={person.account_type==="company"?"domain":"account"} size={22} color={C.blue}/></View>}
        <View style={{flex:1}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:4}}><Text style={s.cardTitle}>{person.display_name||person.username}</Text>{person.is_verified&&<MaterialCommunityIcons name="check-decagram" size={16} color={person.account_type==="company"?"#89939D":C.blue}/>}</View>
          <Text style={s.detail}>@{person.username}</Text>
          {!!person.specialty&&<Text style={s.detail}>{person.specialty}</Text>}
        </View>
        <Pressable disabled={busy} onPress={()=>toggleFollow(person.id)} style={[s.smallButton,followingIds.includes(person.id)&&s.secondaryButton]}><Text style={[s.smallButtonText,followingIds.includes(person.id)&&s.secondaryButtonText]}>{followingIds.includes(person.id)?(ar?"تتابعه":"Following"):(ar?"متابعة":"Follow")}</Text></Pressable>
      </Pressable>)}
      {!people.length&&<Text style={s.empty}>{ar?"لا يوجد أشخاص مطابقون حالياً.":"No people found."}</Text>}
      <Text style={[s.section,ar&&s.rtl]}>{ar?"المجتمعات":"Communities"}</Text>
      {communities.filter(x=>(x.name+" "+x.description+" "+x.specialty).toLowerCase().includes(query.toLowerCase())).map(x=><View key={x.id} style={s.card}><Text style={s.cardTitle}>{x.name}</Text><Text style={s.detail}>{x.description}</Text><Text style={s.tag}>{x.specialty}</Text></View>)}
      <Button label={ar?"عرض المجتمعات":"View communities"} onPress={onBackHome}/>
    </>}

    {tab==="groups"&&<>
      <View style={s.card}><Text style={s.cardTitle}>{ar?"إنشاء مجتمع جديد":"Create a community"}</Text><Field label={ar?"اسم المجتمع":"Community name"} value={newCommunityName} onChange={setNewCommunityName}/><Field label={ar?"الوصف":"Description"} value={newCommunityDescription} onChange={setNewCommunityDescription} multiline/><Field label={ar?"التخصص":"Topic"} value={newCommunitySpecialty} onChange={setNewCommunitySpecialty} placeholder={ar?"مثلاً: الأمن السيبراني":"e.g. Cybersecurity"}/><Button label={ar?"إنشاء المجتمع":"Create community"} onPress={createCommunity}/></View>
      <Text style={[s.detail,ar&&s.rtl]}>{ar?"انضم إلى مجتمعك المفضل، وسيبقى انضمامك محفوظاً بحسابك.":"Join a community; your membership is saved to your account."}</Text>
      {communities.map(x=>{const yes=joined.includes(x.id);return <View key={x.id} style={s.card}><Text style={[s.cardTitle,ar&&s.rtl]}>{x.name}</Text><Text style={[s.detail,ar&&s.rtl]}>{x.description}</Text><View style={s.cardFoot}><Text style={s.tag}>{x.specialty}</Text><Pressable onPress={()=>toggleCommunity(x.id)} style={[s.smallButton,yes&&s.secondaryButton]}><Text style={[s.smallButtonText,yes&&s.secondaryButtonText]}>{yes?(ar?"مغادرة":"Leave"):(ar?"انضمام":"Join")}</Text></Pressable></View></View>})}
    </>}

    {!viewedProfile&&tab==="profile"&&<>
      {!profile?<ActivityIndicator color={C.blue}/>:<>
        <View style={s.profileCard}>
          <Pressable onPress={chooseCover} style={{width:"100%"}}>{profile.cover_url?<Image source={{uri:profile.cover_url}} style={s.coverImage}/>:<View style={s.coverPlaceholder}><Text style={s.detail}>{ar?"إضافة صورة غلاف":"Add cover photo"}</Text></View>}</Pressable>
          <Pressable onPress={chooseAvatar} disabled={busy} style={s.avatarPress}>
            {profile.avatar_url?<Image source={{uri:profile.avatar_url}} style={s.avatarImage} />:<View style={s.avatar}><MaterialCommunityIcons name={profile.account_type==="company"?"domain":"account"} size={31} color={C.blue}/></View>}
            <View style={s.cameraBadge}><MaterialCommunityIcons name="camera" size={14} color="#FFFFFF"/></View>
          </Pressable>
          <Pressable onPress={chooseAvatar}><Text style={s.changePhoto}>{ar?"تغيير الصورة الشخصية":"Change profile photo"}</Text></Pressable>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Text style={s.profileName}>{profile.display_name}</Text>{profile.is_verified&&<MaterialCommunityIcons name="check-decagram" size={20} color={accountMode==="company"?"#89939D":C.blue}/>}</View>
          <Text style={s.detail}>@{profile.username}</Text>
          <View style={s.statsRow}><View style={s.stat}><Text style={s.statNum}>{postCount}</Text><Text style={s.statLabel}>{ar?"المنشورات":"Posts"}</Text></View><Pressable onPress={()=>openPeopleList("followers")} style={s.stat}><Text style={s.statNum}>{followersCount}</Text><Text style={s.statLabel}>{ar?"المتابعون":"Followers"}</Text></Pressable><Pressable onPress={()=>openPeopleList("following")} style={s.stat}><Text style={s.statNum}>{followingCount}</Text><Text style={s.statLabel}>{ar?"يتابع":"Following"}</Text></Pressable></View>
          <Text style={s.detail}>{accountMode==="business"?(ar?"حساب أعمال":"Business account"):accountMode==="company"?(ar?"حساب شركة":"Company account"):(ar?"حساب شخصي":"Personal account")}</Text>
          <Text style={s.bio}>{profile.bio||""}</Text>
          <View style={s.tags}>{(profile.interests||[]).map(x=><Text key={x} style={s.tag}>{x}</Text>)}</View>
        </View>
        <Button label={edit?(ar?"إلغاء التعديل":"Cancel edit"):(ar?"تعديل الملف الشخصي":"Edit profile")} onPress={()=>setEdit(!edit)} disabled={busy}/>
        {edit&&<View style={s.card}><Field label={ar?"الاسم":"Display name"} value={displayName} onChange={setDisplayName}/><Field label={ar?"اسم المستخدم":"Username"} value={username} onChange={setUsername}/><Field label={ar?"نبذة":"Bio"} value={bio} onChange={setBio} multiline/><Field label={ar?"التخصص":"Specialty"} value={specialty} onChange={setSpecialty}/><Text style={s.label}>{ar?"نوع الحساب":"Account type"}</Text><View style={s.row}>{(["personal","business","company"] as const).map(v=><Pressable key={v} onPress={()=>setAccountMode(v)} style={[s.choice,accountMode===v&&s.choiceOn]}><Text style={s.choiceText}>{v==="personal"?(ar?"شخصي":"Personal"):v==="business"?(ar?"أعمال":"Business"):(ar?"شركة":"Company")}</Text></Pressable>)}</View><Text style={s.label}>{ar?"خصوصية الحساب":"Account privacy"}</Text><View style={s.row}><Pressable onPress={()=>setPrivateAccount(false)} style={[s.choice,!privateAccount&&s.choiceOn]}><Text style={s.choiceText}>{ar?"عام":"Public"}</Text></Pressable><Pressable onPress={()=>setPrivateAccount(true)} style={[s.choice,privateAccount&&s.choiceOn]}><Text style={s.choiceText}>{ar?"خاص":"Private"}</Text></Pressable></View><Pressable onPress={()=>setHideFollowers(!hideFollowers)} style={s.settingRow}><Text style={s.detail}>{ar?"إخفاء قائمة المتابعين":"Hide followers list"}</Text><Text style={s.cardTitle}>{hideFollowers?"●":"○"}</Text></Pressable><Button label={ar?"حفظ التعديلات":"Save changes"} onPress={saveProfile}/></View>}
        <View style={s.card}><View style={s.cardFoot}><Text style={s.cardTitle}>{ar?"التوثيق":"Verification"}</Text><MaterialCommunityIcons name="check-decagram" size={24} color={profile.account_type==="company"?"#89939D":C.blue}/></View><Text style={s.detail}>{ar?"فعّل الشارة الزرقاء للحساب الشخصي أو الفضية لحساب الشركة. يمكنك تشغيلها أو إيقافها مباشرة.":"Enable the blue personal or silver company badge. Toggle it whenever you like."}</Text><View style={s.verifyRow}><View style={{flexDirection:"row",alignItems:"center",gap:7}}><MaterialCommunityIcons name="check-decagram" size={22} color={profile.account_type==="company"?"#89939D":C.blue}/><Text style={s.verifyText}>{profile.account_type==="company"?(ar?"شارة شركة فضية":"Silver company badge"):(ar?"شارة شخصية زرقاء":"Blue personal badge")}</Text></View><Pressable onPress={toggleVerified} disabled={busy} style={[s.toggle,profile.is_verified&&s.toggleOn]}><View style={[s.toggleKnob,profile.is_verified&&s.toggleKnobOn]}/></Pressable></View><Text style={s.status}>{profile.is_verified?(ar?"التوثيق مفعّل":"Verification enabled"):(ar?"التوثيق متوقف":"Verification off")}</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>{ar?"الإعدادات العامة":"General settings"}</Text>
          <Text style={s.detail}>{ar?"إصدار التطبيق: 1.0.0":"App version: 1.0.0"}</Text>
          <Text style={s.detail}>{ar?"الخصوصية ونوع الحساب من زر تعديل الملف الشخصي.":"Privacy and account type are managed in Edit profile."}</Text>
        </View>
        <Text style={[s.section,ar&&s.rtl]}>{ar?"منشوراتي":"My posts"}</Text>
        {myPosts.map(p=><View key={p.id} style={s.card}><Text style={s.cardTitle}>{p.title}</Text><Text style={s.detail}>{p.body}</Text>{p.image_url&&<Image source={{uri:p.image_url}} style={s.coverImage}/>}</View>)}
        {!myPosts.length&&<Text style={s.empty}>{ar?"لا توجد منشورات بعد. استخدم زر + في الرئيسية للنشر.":"No posts yet. Use the + button on Home to publish."}</Text>}
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
 coverImage:{width:"100%",height:110,borderRadius:13,backgroundColor:C.pale,marginBottom:8},coverPlaceholder:{width:"100%",height:92,borderRadius:13,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center"},settingRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.line},
 wrap:{paddingTop:12,paddingBottom:26},eyebrow:{color:C.blue,fontSize:9,fontWeight:"900",letterSpacing:1.4,marginBottom:7},title:{color:C.ink,fontSize:22,fontWeight:"900",marginBottom:16},
 card:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,marginTop:11},personCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:10,marginTop:9,flexDirection:"row",alignItems:"center",gap:10},personAvatar:{width:44,height:44,borderRadius:22,backgroundColor:C.pale},personAvatarFallback:{width:44,height:44,borderRadius:22,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center"},cardTitle:{color:C.ink,fontSize:14,fontWeight:"800"},detail:{color:C.muted,fontSize:11,lineHeight:18,marginTop:5},label:{color:C.ink,fontSize:11,fontWeight:"800",marginBottom:7,marginTop:12},
 input:{minHeight:45,backgroundColor:C.white,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,paddingHorizontal:12,color:C.ink,fontSize:12,marginTop:8},button:{height:44,backgroundColor:C.blue,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:13},buttonText:{color:C.white,fontSize:12,fontWeight:"900"},
 notice:{backgroundColor:"#EFF8FE",borderColor:"#C8E7FA",borderWidth:1,borderRadius:12,padding:11,marginBottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},noticeText:{color:C.ink,fontSize:11,flex:1,lineHeight:18},
 cardFoot:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},tag:{color:"#1876B8",backgroundColor:"#E8F5FD",overflow:"hidden",borderRadius:9,paddingHorizontal:9,paddingVertical:5,fontSize:10,alignSelf:"flex-start",marginTop:8},smallButton:{backgroundColor:C.blue,borderRadius:10,paddingHorizontal:15,paddingVertical:8},smallButtonText:{color:C.white,fontWeight:"800",fontSize:11},secondaryButton:{backgroundColor:C.pale,borderWidth:1,borderColor:C.line},secondaryButtonText:{color:C.muted},profileCard:{alignItems:"center",backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:18,padding:20,marginBottom:12},avatarPress:{position:"relative"},avatarImage:{width:82,height:82,borderRadius:41,backgroundColor:"#E8F5FD",overflow:"hidden"},cameraBadge:{position:"absolute",right:-2,bottom:4,width:25,height:25,borderRadius:13,backgroundColor:C.blue,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:C.white},changePhoto:{color:C.blue,fontSize:11,fontWeight:"800",marginTop:7,marginBottom:9},statsRow:{flexDirection:"row",justifyContent:"space-around",width:"100%",marginTop:17,paddingTop:13,borderTopWidth:1,borderBottomWidth:1,borderColor:C.line,paddingBottom:13},stat:{alignItems:"center",minWidth:70},statNum:{fontSize:17,fontWeight:"900",color:C.ink},statLabel:{fontSize:10,color:C.muted,marginTop:3},bio:{fontSize:12,color:C.ink,marginTop:8,textAlign:"center"},verifyRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:15},verifyText:{fontSize:12,color:C.ink,fontWeight:"800"},toggle:{width:48,height:28,borderRadius:14,backgroundColor:"#CBD2D9",padding:3,justifyContent:"center"},toggleOn:{backgroundColor:C.blue},toggleKnob:{width:22,height:22,borderRadius:11,backgroundColor:"#FFFFFF"},toggleKnobOn:{alignSelf:"flex-end"},avatar:{width:66,height:66,borderRadius:22,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center",marginBottom:10},profileName:{fontSize:17,color:C.ink,fontWeight:"900"},tags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},status:{color:C.blue,fontWeight:"900",fontSize:12,marginTop:9},hint:{fontSize:10,color:C.muted,lineHeight:17,marginTop:12},row:{flexDirection:"row",gap:8},choice:{flex:1,borderWidth:1,borderColor:C.line,borderRadius:10,padding:10,alignItems:"center"},choiceOn:{borderColor:C.blue,backgroundColor:"#E8F5FD"},choiceText:{color:C.ink,fontWeight:"700",fontSize:11},signout:{backgroundColor:"#FCE8EA",borderRadius:11,padding:12,alignItems:"center",marginTop:12},signoutText:{color:C.red,fontWeight:"900",fontSize:12},section:{color:C.ink,fontSize:14,fontWeight:"900",marginTop:22,marginBottom:5},empty:{textAlign:"center",color:C.muted,padding:30},messageList:{maxHeight:390,marginTop:12},bubble:{alignSelf:"flex-start",maxWidth:"85%",backgroundColor:C.pale,borderRadius:14,padding:11,marginVertical:5},myBubble:{alignSelf:"flex-end",backgroundColor:"#DFF1FD"},bubbleText:{color:C.ink,fontSize:12,lineHeight:18},myBubbleText:{color:"#13527D"},time:{color:C.muted,fontSize:9,marginTop:5},compose:{flexDirection:"row",alignItems:"center",gap:8,marginTop:10},composeInput:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:12,color:C.ink},send:{width:44,height:44,borderRadius:12,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},back:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:18,padding:10},backText:{color:C.blue,fontSize:12,fontWeight:"800"},rtl:{textAlign:"right",writingDirection:"rtl"}
});

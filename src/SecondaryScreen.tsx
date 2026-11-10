import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./lib/supabase";
import { requestAuthMode } from "./AuthGate";
import FeatureHub from "./FeatureHub";

type Props = { tab: string; isArabic: boolean; isDark: boolean; simpleMode: boolean; initialSettingsSection?: string; onToggleTheme: () => void; onToggleSimpleMode: () => void; onBackHome: () => void; onOpenMessages: () => void; onOpenComposer: () => void };
type Profile = { id:string; account_type:"personal"|"company"; account_mode:"personal"|"business"|"company"; display_name:string; username:string; bio:string; specialty:string|null; is_private:boolean; hide_followers:boolean; interests:string[]; company_name:string|null; company_website:string|null; company_industry:string|null; verification_status:string; verified_at:string|null; avatar_url:string|null; cover_url:string|null; is_verified:boolean; points?:number };
type Community = { id:string; name:string; description:string; specialty:string };
type Conversation = { id:string; created_at:string; peerName:string; peerUsername:string };

const C = { blue:"#1D9BF0", ink:"#17202A", muted:"#657786", line:"#E6ECF0", pale:"#F5F8FA", white:"#FFFFFF", green:"#168A62", red:"#D9485F" };

export default function SecondaryScreen({tab,isArabic,isDark,simpleMode,initialSettingsSection,onToggleTheme,onToggleSimpleMode,onBackHome,onOpenMessages,onOpenComposer}:Props) {
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
  const [likedMyPosts,setLikedMyPosts]=useState<string[]>([]);
  const [savedMyPosts,setSavedMyPosts]=useState<string[]>([]);
  const [commentingMyPost,setCommentingMyPost]=useState<string|null>(null);
  const [myPostComment,setMyPostComment]=useState("");
  const [editingMyPost,setEditingMyPost]=useState<string|null>(null);
  const [editingMyPostTitle,setEditingMyPostTitle]=useState("");
  const [editingMyPostBody,setEditingMyPostBody]=useState("");
  const [myPostMenuId,setMyPostMenuId]=useState<string|null>(null);
  const [viewedProfile,setViewedProfile]=useState<any|null>(null);
  const [viewedPosts,setViewedPosts]=useState<any[]>([]);
  const [viewedLikedPostIds,setViewedLikedPostIds]=useState<string[]>([]);
  const [viewedSavedPostIds,setViewedSavedPostIds]=useState<string[]>([]);
  const [viewedPostComments,setViewedPostComments]=useState<Record<string,any[]>>({});
  const [commentingViewedPost,setCommentingViewedPost]=useState<string|null>(null);
  const [viewedCommentDraft,setViewedCommentDraft]=useState("");
  const [viewedPostMetrics,setViewedPostMetrics]=useState<Record<string,any>>({});
  const [viewedStats,setViewedStats]=useState({posts:0,followers:0,following:0});
  const [settingsSection,setSettingsSection]=useState<string|null>(null);
  const [settingsEmail,setSettingsEmail]=useState("");
  const [settingsPrivate,setSettingsPrivate]=useState(false);
  const [settingsHideFollowers,setSettingsHideFollowers]=useState(false);
  const [notificationRows,setNotificationRows]=useState<any[]>([]);
  const [myPostMetrics,setMyPostMetrics]=useState<Record<string,any>>({});
  const [topicRows,setTopicRows]=useState<any[]>([]);
  const [followedTopics,setFollowedTopics]=useState<string[]>([]);
  const [fontScale,setFontScale]=useState(1);
  const [trendingRows,setTrendingRows]=useState<any[]>([]);


  const loadProfile=useCallback(async()=>{
    if(!supabase)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    setUserId(user.id);
    setSettingsEmail(user.email||"");
    const {data}=await supabase.from("profiles").select("id,account_type,account_mode,display_name,username,bio,specialty,is_private,hide_followers,interests,company_name,company_website,company_industry,verification_status,verified_at,avatar_url,cover_url,is_verified,points").eq("id",user.id).maybeSingle();
    if(data){const p=data as Profile;setProfile(p);setDisplayName(p.display_name||"");setUsername(p.username||"");setBio(p.bio||"");setSpecialty(p.specialty||"");setPrivateAccount(!!p.is_private);setCoverUrl(p.cover_url||"");setAccountMode(p.account_mode||p.account_type||"personal");setHideFollowers(!!p.hide_followers);setSettingsPrivate(!!p.is_private);setSettingsHideFollowers(!!p.hide_followers);}
    const [posts,followers,following]=await Promise.all([
      supabase.from("posts").select("id",{count:"exact",head:true}).eq("author_id",user.id),
      supabase.from("profile_follows").select("follower_id",{count:"exact",head:true}).eq("following_id",user.id),
      supabase.from("profile_follows").select("following_id",{count:"exact",head:true}).eq("follower_id",user.id)
    ]);
    setPostCount(posts.count||0);setFollowersCount(followers.count||0);setFollowingCount(following.count||0);
    const {data:ownPosts}=await supabase.from("posts").select("id,title,body,image_url,created_at,pinned_at").eq("author_id",user.id).order("pinned_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).limit(50);
    setMyPosts(ownPosts||[]);
    const ids=(ownPosts||[]).map((p:any)=>p.id);
    if(ids.length){const {data:metrics}=await supabase.rpc("get_post_metrics",{post_ids:ids});const map:any={};(metrics||[]).forEach((m:any)=>map[m.post_id]=m);setMyPostMetrics(map);}else setMyPostMetrics({});
    const postIds=(ownPosts||[]).map((p:any)=>p.id);
    if(postIds.length){const [likes,saves]=await Promise.all([supabase.from("post_likes").select("post_id").eq("user_id",user.id).in("post_id",postIds),supabase.from("post_saves").select("post_id").eq("user_id",user.id).in("post_id",postIds)]);setLikedMyPosts((likes.data||[]).map((x:any)=>x.post_id));setSavedMyPosts((saves.data||[]).map((x:any)=>x.post_id));}else{setLikedMyPosts([]);setSavedMyPosts([]);}
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
    if(viewedProfile?.id===targetId)setViewedStats(old=>({...old,followers:Math.max(0,old.followers+(exists?-1:1))}));
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

  useEffect(()=>{if(tab==="settings")setSettingsSection(initialSettingsSection||null);},[tab,initialSettingsSection]);

  useEffect(()=>{if(tab==="profile"||tab==="settings"||tab==="features")loadProfile();if(tab==="explore"){loadTopics();loadTrending();}if(tab==="groups")loadGroups();if(tab==="explore"){loadGroups();loadPeople();}if(tab==="messages")loadMessages();},[tab,loadProfile,loadGroups,loadMessages,loadPeople]);

  const showNotice=(v:string)=>setNotice(v);
  const showVerificationInfo=(companyName?:string|null)=>Alert.alert(ar?"شارة التوثيق":"Verification badge",ar?`تم التوثيق من شركة المجتمع التقني.\\nاسم التطبيق: المجتمع التقني – Tech Community${companyName?"\\nالجهة: "+companyName:""}`:`Verified by Tech Community.\\nApp: Tech Community${companyName?"\\nOrganization: "+companyName:""}`);
  const saveProfile=async()=>{
    if(!supabase||!userId||!displayName.trim()||!username.trim()){showNotice(ar?"الاسم واسم المستخدم مطلوبان.":"Name and username are required.");return;}
    if(!/^[a-zA-Z0-9_]{1,20}$/.test(username.trim())){showNotice(ar?"اسم المستخدم يجب أن يكون من 1 إلى 20 حرفاً أو رقماً أو _.":"Username must be 3–20 letters, numbers or underscores.");return;}
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
    const [postsResult,postCountResult,followersResult,followingResult]=await Promise.all([
      supabase.from("posts").select("id,title,body,image_url,created_at").eq("author_id",id).order("created_at",{ascending:false}).limit(50),
      supabase.from("posts").select("id",{count:"exact",head:true}).eq("author_id",id),
      supabase.from("profile_follows").select("follower_id",{count:"exact",head:true}).eq("following_id",id),
      supabase.from("profile_follows").select("following_id",{count:"exact",head:true}).eq("follower_id",id)
    ]);
    const ids=(postsResult.data||[]).map((p:any)=>p.id);
    if(ids.length&&userId){
      const [{data:allLikes},{data:mine},{data:metrics},{data:savedMine}]=await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id",ids),
        supabase.from("post_likes").select("post_id").eq("user_id",userId).in("post_id",ids),
        supabase.rpc("get_post_metrics",{post_ids:ids}),
        supabase.from("post_saves").select("post_id").eq("user_id",userId).in("post_id",ids)
      ]);
      const map:Record<string,any>={};
      ids.forEach((postId:string)=>map[postId]={likes:(allLikes||[]).filter((x:any)=>x.post_id===postId).length});
      (metrics||[]).forEach((m:any)=>map[m.post_id]={...map[m.post_id],...m});
      setViewedPostMetrics(map);setViewedLikedPostIds((mine||[]).map((x:any)=>x.post_id));setViewedSavedPostIds((savedMine||[]).map((x:any)=>x.post_id));
    }else{setViewedPostMetrics({});setViewedLikedPostIds([]);setViewedSavedPostIds([]);}
    setViewedPostComments({});setCommentingViewedPost(null);setViewedCommentDraft("");
    setViewedProfile(data);setViewedPosts(postsResult.data||[]);
    setViewedStats({posts:postCountResult.count||0,followers:followersResult.count||0,following:followingResult.count||0});setBusy(false);
  };

  const toggleViewedPostLike=async(postId:string)=>{
    if(!supabase||!userId)return;
    const exists=viewedLikedPostIds.includes(postId);
    setViewedLikedPostIds(old=>exists?old.filter(x=>x!==postId):[...old,postId]);
    setViewedPostMetrics(old=>({...old,[postId]:{...old[postId],likes:Math.max(0,Number(old[postId]?.likes||0)+(exists?-1:1))}}));
    const {error}=exists?await supabase.from("post_likes").delete().eq("post_id",postId).eq("user_id",userId):await supabase.from("post_likes").insert({post_id:postId,user_id:userId});
    if(error){setViewedLikedPostIds(old=>exists?[...old,postId]:old.filter(x=>x!==postId));setViewedPostMetrics(old=>({...old,[postId]:{...old[postId],likes:Math.max(0,Number(old[postId]?.likes||0)+(exists?1:-1))}}));showNotice(error.message);}
  };

  const loadViewedPostComments=async(postId:string)=>{
    if(!supabase)return;
    const {data,error}=await supabase.from("comments").select("id,body,created_at,profiles(display_name,username)").eq("post_id",postId).order("created_at",{ascending:true}).limit(100);
    if(error){showNotice((ar?"تعذر تحميل التعليقات: ":"Could not load comments: ")+error.message);return;}
    setViewedPostComments(old=>({...old,[postId]:data||[]}));
  };
  const sendViewedPostComment=async(postId:string)=>{
    const body=viewedCommentDraft.trim();
    if(!supabase||!userId||!body)return;
    const {data,error}=await supabase.from("comments").insert({post_id:postId,author_id:userId,body}).select("id,body,created_at,profiles(display_name,username)").single();
    if(error){showNotice((ar?"تعذر إضافة التعليق: ":"Could not post comment: ")+error.message);return;}
    setViewedPostComments(old=>({...old,[postId]:[...(old[postId]||[]),data]}));
    setViewedPostMetrics(old=>({...old,[postId]:{...old[postId],comments:Number(old[postId]?.comments||0)+1}}));
    setViewedCommentDraft("");showNotice(ar?"تم نشر تعليقك.":"Comment posted.");
  };
  const toggleViewedPostSave=async(postId:string)=>{
    if(!supabase||!userId)return;
    const exists=viewedSavedPostIds.includes(postId);
    const result=exists?await supabase.from("post_saves").delete().eq("post_id",postId).eq("user_id",userId):await supabase.from("post_saves").insert({post_id:postId,user_id:userId});
    if(result.error){showNotice((ar?"تعذر تحديث المحفوظات: ":"Could not update saved posts: ")+result.error.message);return;}
    setViewedSavedPostIds(old=>exists?old.filter(x=>x!==postId):[...old,postId]);
    setViewedPostMetrics(old=>({...old,[postId]:{...old[postId],saves:Math.max(0,Number(old[postId]?.saves||0)+(exists?-1:1))}}));
    showNotice(exists?(ar?"أزيل من المحفوظات.":"Removed from saved posts."):(ar?"تم حفظ المنشور.":"Post saved."));
  };
  const shareViewedPost=async(post:any)=>{
    if(supabase&&userId){const {error}=await supabase.from("post_shares").insert({post_id:post.id,user_id:userId});if(error)showNotice((ar?"تعذر تسجيل المشاركة: ":"Could not record share: ")+error.message);else setViewedPostMetrics(old=>({...old,[post.id]:{...old[post.id],shares:Number(old[post.id]?.shares||0)+1}}));}
    await Share.share({message:(post.title||"")+"\\n\\n"+(post.body||"")});
  };
  const openViewedPostMenu=(post:any)=>{
    const saved=viewedSavedPostIds.includes(post.id);
    Alert.alert(ar?"خيارات المنشور":"Post options",undefined,[
      {text:ar?"التعليق":"Comment",onPress:()=>{setCommentingViewedPost(post.id);loadViewedPostComments(post.id);}},
      {text:saved?(ar?"إزالة من المحفوظات":"Remove saved"):(ar?"حفظ المنشور":"Save post"),onPress:()=>toggleViewedPostSave(post.id)},
      {text:ar?"مشاركة":"Share",onPress:()=>shareViewedPost(post)},
      {text:ar?"حظر صاحب المنشور":"Block author",style:"destructive",onPress:()=>Alert.alert(ar?"حظر الحساب":"Block account",ar?"لن تظهر منشورات هذا الحساب في موجزك.":"Posts from this account will be hidden from your feed.",[{text:ar?"إلغاء":"Cancel",style:"cancel"},{text:ar?"حظر":"Block",style:"destructive",onPress:async()=>{if(!supabase||!userId||post.author_id===userId)return;const {error}=await supabase.from("user_blocks").insert({blocker_id:userId,blocked_id:post.author_id});if(error){showNotice(error.message);return;}setViewedProfile(null);showNotice(ar?"تم حظر الحساب وإخفاء منشوراته من هذه الصفحة.":"Account blocked; its posts are hidden from this page.");}}])},
      {text:ar?"إبلاغ":"Report",onPress:()=>Alert.alert(ar?"الإبلاغ عن المنشور":"Report post",ar?"هل تريد إرسال بلاغ عن هذا المنشور؟":"Report this post?",[{text:ar?"إلغاء":"Cancel",style:"cancel"},{text:ar?"إبلاغ":"Report",style:"destructive",onPress:async()=>{const {error}=await supabase!.from("content_reports").insert({reporter_id:userId,post_id:post.id,reason:ar?"إبلاغ من الملف الشخصي":"Reported from profile"});showNotice(error?error.message:(ar?"تم إرسال البلاغ.":"Report submitted."));}}])},
      {text:ar?"إلغاء":"Cancel",style:"cancel"}
    ]);
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

  const toggleMyPostLike=async(postId:string)=>{
    if(!supabase||!userId)return;
    const exists=likedMyPosts.includes(postId);
    const {error}=exists?await supabase.from("post_likes").delete().eq("post_id",postId).eq("user_id",userId):await supabase.from("post_likes").insert({post_id:postId,user_id:userId});
    if(error){showNotice(error.message);return;}
    setLikedMyPosts(old=>exists?old.filter(x=>x!==postId):[...old,postId]);
  };
  const toggleMyPostSave=async(postId:string)=>{
    if(!supabase||!userId)return;
    const exists=savedMyPosts.includes(postId);
    const {error}=exists?await supabase.from("post_saves").delete().eq("post_id",postId).eq("user_id",userId):await supabase.from("post_saves").insert({post_id:postId,user_id:userId});
    if(error){showNotice(error.message);return;}
    setSavedMyPosts(old=>exists?old.filter(x=>x!==postId):[...old,postId]);
  };
  const sendMyPostComment=async(postId:string)=>{
    if(!supabase||!userId||!myPostComment.trim())return;
    const {error}=await supabase.from("comments").insert({post_id:postId,author_id:userId,body:myPostComment.trim()});
    if(error){showNotice(error.message);return;}
    setMyPostComment("");setCommentingMyPost(null);showNotice(ar?"تم نشر تعليقك.":"Comment posted.");
  };
  const deleteMyPost=async(postId:string)=>{
    Alert.alert(ar?"حذف المنشور":"Delete post",ar?"هل تريد حذف هذا المنشور نهائياً؟":"Delete this post permanently?",[
      {text:ar?"إلغاء":"Cancel",style:"cancel"},
      {text:ar?"حذف":"Delete",style:"destructive",onPress:async()=>{const {error}=await supabase!.from("posts").delete().eq("id",postId).eq("author_id",userId);if(error){showNotice(error.message);return;}setMyPosts(old=>old.filter(p=>p.id!==postId));setPostCount(n=>Math.max(0,n-1));}}
    ]);
  };

  const loadNotifications=async()=>{
    if(!supabase||!userId)return;
    const {data,error}=await supabase.from("notifications").select("id,kind,body,is_read,created_at,profiles:actor_id(display_name,username)").eq("recipient_id",userId).order("created_at",{ascending:false}).limit(50);
    if(error){showNotice(error.message);return;}setNotificationRows(data||[]);
  };
  useEffect(()=>{if(tab==="settings"&&initialSettingsSection==="notifications")loadNotifications();},[tab,initialSettingsSection]);

  const markNotificationRead=async(id:string)=>{
    const {error}=await supabase!.from("notifications").update({is_read:true}).eq("id",id).eq("recipient_id",userId);
    if(!error)setNotificationRows(old=>old.map(n=>n.id===id?{...n,is_read:true}:n));
  };
  const blockViewedProfile=async()=>{
    if(!supabase||!viewedProfile||!userId)return;
    const {error}=await supabase.from("user_blocks").insert({blocker_id:userId,blocked_id:viewedProfile.id});
    if(error){showNotice(error.message);return;}
    setViewedProfile(null);showNotice(ar?"تم حظر الحساب.":"Account blocked.");
  };
  const reportViewedProfile=()=>{
    if(!viewedProfile||!userId)return;
    Alert.alert(ar?"الإبلاغ عن الحساب":"Report account",ar?"اختر سبب الإبلاغ":"Choose a reason",[
      ...[ar?"محتوى مزعج":"Spam",ar?"انتحال شخصية":"Impersonation",ar?"إساءة أو مضايقة":"Abuse or harassment"].map(reason=>({text:reason,onPress:async()=>{const {error}=await supabase!.from("content_reports").insert({reporter_id:userId,reported_user_id:viewedProfile.id,reason});showNotice(error?error.message:(ar?"تم إرسال البلاغ للمراجعة.":"Report submitted for review."));}})),
      {text:ar?"إلغاء":"Cancel",style:"cancel"}
    ]);
  };

  const saveMyPostEdit=async(postId:string)=>{
    if(!editingMyPostBody.trim()){showNotice(ar?"لا يمكن حفظ منشور فارغ.":"Post cannot be empty.");return;}
    const {error}=await supabase!.from("posts").update({title:editingMyPostTitle.trim()||null,body:editingMyPostBody.trim()}).eq("id",postId).eq("author_id",userId);
    if(error){showNotice(error.message);return;}
    setMyPosts(old=>old.map(p=>p.id===postId?{...p,title:editingMyPostTitle.trim(),body:editingMyPostBody.trim()}:p));
    setEditingMyPost(null);showNotice(ar?"تم تعديل المنشور.":"Post updated.");
  };
  const togglePinMyPost=async(p:any)=>{
    const next=p.pinned_at?null:new Date().toISOString();
    const {error}=await supabase!.from("posts").update({pinned_at:next}).eq("id",p.id).eq("author_id",userId);
    if(error){showNotice(error.message);return;}
    setMyPosts(old=>old.map(x=>x.id===p.id?{...x,pinned_at:next}:x).sort((a,b)=>Number(!!b.pinned_at)-Number(!!a.pinned_at)));
  };
  const loadTrending=async()=>{if(!supabase)return;const {data,error}=await supabase.rpc("get_trending_posts");if(!error)setTrendingRows(data||[]);};
  const toggleMuteViewedProfile=async()=>{if(!supabase||!viewedProfile||!userId)return;const {error}=await supabase.from("user_mutes").insert({muter_id:userId,muted_id:viewedProfile.id});if(error){showNotice(error.message);return;}setViewedProfile(null);showNotice(ar?"تم كتم الحساب.":"Account muted.");};
  const loadTopics=async()=>{
    if(!supabase||!userId)return;
    const [{data:topics},{data:mine}]=await Promise.all([supabase.from("topics").select("id,name,category").order("name"),supabase.from("profile_topic_follows").select("topic_id").eq("user_id",userId)]);
    setTopicRows(topics||[]);setFollowedTopics((mine||[]).map((x:any)=>x.topic_id));
  };
  const toggleTopic=async(id:string)=>{
    const exists=followedTopics.includes(id);
    const {error}=exists?await supabase!.from("profile_topic_follows").delete().eq("topic_id",id).eq("user_id",userId):await supabase!.from("profile_topic_follows").insert({topic_id:id,user_id:userId});
    if(error){showNotice(error.message);return;}setFollowedTopics(old=>exists?old.filter(x=>x!==id):[...old,id]);
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
    const {data,error}=await supabase.from("messages").select("id,sender_id,body,image_url,created_at,read_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(100);
    if(error){showNotice(error.message);return;}setMessages(data||[]);if(userId)await supabase.rpc("mark_conversation_read",{conversation:id});
  };

  const sendMessage=async()=>{
    if(!supabase||!userId||!activeConversation||!messageDraft.trim())return;
    const body=messageDraft.trim();setBusy(true);
    const {error}=await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:userId,body});
    setBusy(false);if(error){showNotice(error.message);return;}setMessageDraft("");await loadConversationMessages(activeConversation);
  };

  const sendMessageImage=async()=>{
    if(!supabase||!userId||!activeConversation)return;
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){showNotice(ar?"اسمح للتطبيق بالوصول إلى الصور.":"Allow photo library access.");return;}
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:true,quality:0.85});
    if(picked.canceled||!picked.assets[0])return;
    setBusy(true);
    try{
      const asset=picked.assets[0];const response=await fetch(asset.uri);const bytes=await response.arrayBuffer();
      const ext=(asset.mimeType||"image/jpeg").split("/")[1]||"jpg";
      const path=userId+"/messages/"+activeConversation+"/"+Date.now()+"."+ext;
      const uploaded=await supabase.storage.from("post-images").upload(path,bytes,{contentType:asset.mimeType||"image/jpeg",upsert:false});
      if(uploaded.error)throw uploaded.error;
      const url=supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      const {error}=await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:userId,body:"صورة",image_url:url});
      if(error)throw error;
      await loadConversationMessages(activeConversation);
    }catch(e:any){showNotice((ar?"تعذر إرسال الصورة: ":"Could not send image: ")+(e?.message||""));}
    finally{setBusy(false);}
  };

  const title=tab==="features"?(ar?"الأدوات والميزات":"Features and tools"):tab==="settings"?(ar?"الإعدادات والخصوصية":"Settings and privacy"):tab==="explore"?(ar?"استكشف المجتمع":"Explore"):tab==="groups"?(ar?"المجتمعات التقنية":"Communities"):tab==="messages"?(ar?"الرسائل":"Messages"):(ar?"ملفي الشخصي":"My profile");
  const Field=({label,value,onChange,placeholder,multiline=false}:any)=><View style={{marginTop:12}}><Text style={[s.label,isDark&&{color:"#F2F6FA"}]}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9AA8B2" multiline={multiline} style={[s.input,multiline&&{height:90,textAlignVertical:"top",paddingTop:12},ar&&s.rtl]}/></View>;
  const Button=({label,onPress,disabled=false}:any)=><Pressable disabled={disabled||busy} onPress={onPress} style={[s.button,(disabled||busy)&&{opacity:.55}]}><Text style={s.buttonText}>{busy? (ar?"جارٍ التنفيذ...":"Please wait..."):label}</Text></Pressable>;

  return <View style={[s.wrap,isDark&&{backgroundColor:"#101820"}]}>
    <Pressable onPress={onBackHome} accessibilityRole="button" accessibilityLabel={ar?"رجوع":"Back"} style={{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:7,paddingVertical:9,paddingHorizontal:12,borderRadius:11,backgroundColor:C.pale,marginBottom:10}}>
      <MaterialCommunityIcons name="arrow-left" size={19} color={C.blue}/>
      <Text style={{color:C.blue,fontWeight:"800",fontSize:13}}>{ar?"رجوع":"Back"}</Text>
    </Pressable>
    <Text style={s.eyebrow}>{ar?"مساحتك التقنية":"YOUR TECH SPACE"}</Text>
    <Text style={[s.title,ar&&s.rtl,isDark&&{color:"#F2F6FA"}]}>{title}</Text>
    {!!notice&&<View style={[s.notice,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.noticeText,ar&&s.rtl]}>{notice}</Text><Pressable onPress={()=>setNotice("")}><MaterialCommunityIcons name="close" size={17} color={C.muted}/></Pressable></View>}

    {tab==="features"&&<FeatureHub isArabic={ar} userId={userId}/>}

    {tab==="settings"&&<>
      {!settingsSection?<>
        <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"حسابك":"Your account"}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{profile?.display_name||settingsEmail}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{profile?.username||""}</Text>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>setSettingsSection("account")}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"معلومات الحساب":"Account information"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>setSettingsSection("security")}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الأمان والوصول إلى الحساب":"Security and account access"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
        </View>
        <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"الخصوصية والأمان":"Privacy and safety"}</Text>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>setSettingsSection("privacy")}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"خصوصية الحساب والمتابعون":"Account privacy and followers"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>{setSettingsSection("notifications");loadNotifications();}}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الإشعارات":"Notifications"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>setSettingsSection("display")}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"إمكانية الوصول والعرض واللغات":"Accessibility, display and languages"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
          <Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={()=>setSettingsSection("personalization")}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الخصوصية والتخصيص":"Privacy and personalization"}</Text><MaterialCommunityIcons name="chevron-left" size={20} color={C.muted}/></Pressable>
        </View>
        <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"تبديل الحساب":"Switch account"}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"يمكنك الانتقال إلى تسجيل الدخول أو إنشاء حساب جديد. سيتم تسجيل خروج الحساب الحالي أولاً.":"Choose sign in or create a new account. The current account will be signed out first."}</Text>
          <Button label={ar?"تسجيل الدخول إلى حساب حالي":"Sign in to an existing account"} onPress={()=>requestAuthMode("login")}/>
          <Pressable onPress={()=>requestAuthMode("signup")} style={[s.button,{backgroundColor:C.white,borderWidth:1,borderColor:C.blue}]}><Text style={{color:C.blue,fontSize:12,fontWeight:"900"}}>{ar?"إنشاء حساب جديد":"Create a new account"}</Text></Pressable>
        </View>
      </>:<View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
        <Pressable onPress={()=>setSettingsSection(null)} style={[s.back,isDark&&{backgroundColor:"#172632"}]}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={[s.backText,isDark&&{color:"#61B8F2"}]}>{ar?"كل الإعدادات":"All settings"}</Text></Pressable>
        <Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{settingsSection==="account"?(ar?"معلومات الحساب":"Account information"):settingsSection==="security"?(ar?"الأمان والوصول":"Security and access"):settingsSection==="privacy"?(ar?"الخصوصية والأمان":"Privacy and safety"):settingsSection==="notifications"?(ar?"الإشعارات":"Notifications"):settingsSection==="display"?(ar?"العرض واللغات":"Display and languages"):(ar?"الخصوصية والتخصيص":"Privacy and personalization")}</Text>
        {settingsSection==="account"&&<><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"البريد الإلكتروني":"Email"}: {settingsEmail}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"اسم المستخدم":"Username"}: @{profile?.username||""}</Text></>}
        {settingsSection==="security"&&<><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"أرسل رابطاً آمناً إلى بريدك لتغيير كلمة المرور.":"Send a secure password-reset link to your email."}</Text><Button label={ar?"إرسال رابط تغيير كلمة المرور":"Send password reset link"} onPress={async()=>{if(!supabase||!settingsEmail){showNotice(ar?"تعذر تحديد البريد الإلكتروني.":"Email unavailable.");return;}setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(settingsEmail,{redirectTo:"techcommunity://reset-password"});setBusy(false);showNotice(error?(ar?"تعذر إرسال الرابط: ":"Could not send link: ")+error.message:(ar?"إذا كان البريد مسجلاً فسيصلك رابط الاستعادة.":"If registered, a reset link will arrive by email."));}}/></>}
        {settingsSection==="privacy"&&<><Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={async()=>{const next=!settingsPrivate;setSettingsPrivate(next);const {error}=await supabase!.from("profiles").update({is_private:next}).eq("id",userId);if(error){setSettingsPrivate(!next);showNotice(error.message);}else{setPrivateAccount(next);showNotice(ar?"تم تحديث خصوصية الحساب.":"Privacy updated.");}}}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الحساب الخاص":"Private account"}</Text><SettingSwitch value={settingsPrivate}/></Pressable><Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={async()=>{const next=!settingsHideFollowers;setSettingsHideFollowers(next);const {error}=await supabase!.from("profiles").update({hide_followers:next}).eq("id",userId);if(error){setSettingsHideFollowers(!next);showNotice(error.message);}else{setHideFollowers(next);showNotice(ar?"تم تحديث إعداد المتابعين.":"Followers setting updated.");}}}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"إخفاء قائمة المتابعين":"Hide followers list"}</Text><SettingSwitch value={settingsHideFollowers}/></Pressable></>}
        {settingsSection==="display"&&<><Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={onToggleTheme}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الوضع الداكن":"Dark mode"}</Text><SettingSwitch value={isDark}/></Pressable><Pressable style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]} onPress={onToggleSimpleMode}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"وضع الاستخدام المبسّط":"Simplified mode"}</Text><SettingSwitch value={simpleMode}/></Pressable><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"حجم النص":"Text size"}</Text><View style={{flexDirection:"row",gap:8,marginVertical:10}}>{[0.9,1,1.1,1.2].map(v=><Pressable key={v} onPress={()=>setFontScale(v)} style={{flex:1,padding:10,borderRadius:10,backgroundColor:fontScale===v?C.blue:C.pale,alignItems:"center"}}><Text style={{color:fontScale===v?"#fff":C.ink,fontWeight:"800"}}>{Math.round(v*100)}%</Text></Pressable>)}</View><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"معاينة النص بالحجم المحدد":"Preview at selected size"}</Text><Text style={{fontSize:16*fontScale,color:isDark?"#F2F6FA":C.ink,fontWeight:"700"}}>{ar?"هذا مثال على حجم الخط":"Sample text size preview"}</Text></>}{settingsSection==="notifications"&&<>{notificationRows.map(n=><Pressable key={n.id} onPress={()=>markNotificationRead(n.id)} style={[s.card,{backgroundColor:n.is_read?C.white:"#EAF5FC"}]}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{n.body}</Text><Text style={s.status}>{new Date(n.created_at).toLocaleString(ar?"ar":"en")}</Text></Pressable>)}{!notificationRows.length&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد إشعارات بعد. ستظهر هنا تفاعلات الإعجاب والتعليق والمتابعة.":"No notifications yet. Likes, comments and follows will appear here."}</Text>}</>}
        {settingsSection==="display"&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"يمكنك تغيير اللغة من زر اللغة أعلى التطبيق.":"Change the language using the language control in the app header."}</Text>}
        {settingsSection==="personalization"&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"خيارات التخصيص المتقدمة ستظهر بعد ربط مصادر البيانات اللازمة.":"Advanced personalization options will appear once their data sources are connected."}</Text>}
      </View>}
    </>}

    {showPeopleList&&<View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
      <Pressable onPress={()=>setShowPeopleList(null)} style={[s.back,isDark&&{backgroundColor:"#172632"}]}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={[s.backText,isDark&&{color:"#61B8F2"}]}>{ar?"رجوع للملف الشخصي":"Back to profile"}</Text></Pressable>
      <Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{showPeopleList==="followers"?(ar?"المتابعون":"Followers"):(ar?"يتابع":"Following")}</Text>
      {peopleList.map(p=><Pressable key={p.id} onPress={()=>openProfile(p.id)} style={[s.personCard,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{p.display_name||p.username}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{p.username}</Text></Pressable>)}
      {!peopleList.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد حسابات لعرضها.":"No accounts to show."}</Text>}
    </View>}

    {viewedProfile&&!showPeopleList&&<View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
      <Pressable onPress={()=>setViewedProfile(null)} style={[s.back,isDark&&{backgroundColor:"#172632"}]}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={[s.backText,isDark&&{color:"#61B8F2"}]}>{ar?"رجوع":"Back"}</Text></Pressable>
      {viewedProfile.cover_url?<Image source={{uri:viewedProfile.cover_url}} style={s.coverImage}/>:<View style={s.coverPlaceholder}/>}
      <View style={{flexDirection:"row",alignItems:"center",gap:8,marginTop:10}}>
        {viewedProfile.avatar_url?<Image source={{uri:viewedProfile.avatar_url}} style={s.personAvatar}/>:<View style={s.personAvatarFallback}><MaterialCommunityIcons name="account" size={22} color={C.blue}/></View>}
        <View style={{flex:1}}><Text style={[s.profileName,isDark&&{color:"#F2F6FA"}]}>{viewedProfile.display_name}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{viewedProfile.username}</Text></View>
        {viewedProfile.is_verified&&<Pressable onPress={()=>showVerificationInfo(viewedProfile.company_name)}><MaterialCommunityIcons name="check-decagram" size={20} color={viewedProfile.account_type==="company"?"#89939D":C.blue}/></Pressable>}
      </View>
      <Text style={[s.bio,isDark&&{color:"#C4D0DA"}]}>{viewedProfile.bio||""}</Text>
      {!!viewedProfile.specialty&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{viewedProfile.specialty}</Text>}
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{viewedStats.posts}</Text><Text style={s.statLabel}>{ar?"المنشورات":"Posts"}</Text></View>
        <View style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{viewedStats.followers}</Text><Text style={s.statLabel}>{ar?"المتابعون":"Followers"}</Text></View>
        <View style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{viewedStats.following}</Text><Text style={s.statLabel}>{ar?"يتابع":"Following"}</Text></View>
      </View>
      <View style={s.row}>
        <Pressable onPress={()=>toggleFollow(viewedProfile.id)} style={[s.button,{flex:1},followingIds.includes(viewedProfile.id)&&s.secondaryButton]}><Text style={[s.buttonText,followingIds.includes(viewedProfile.id)&&s.secondaryButtonText]}>{followingIds.includes(viewedProfile.id)?(ar?"إلغاء المتابعة":"Unfollow"):(ar?"متابعة":"Follow")}</Text></Pressable>
        <View style={{flexDirection:"row",gap:8,marginTop:12}}><Pressable onPress={reportViewedProfile} style={{padding:10,backgroundColor:"#FFF4E5",borderRadius:10}}><Text style={{color:"#A66A00",fontWeight:"700"}}>{ar?"إبلاغ":"Report"}</Text></Pressable><Pressable onPress={blockViewedProfile} style={{padding:10,backgroundColor:"#FCEBED",borderRadius:10}}><Text style={{color:C.red,fontWeight:"700"}}>{ar?"حظر الحساب":"Block account"}</Text></Pressable><Pressable onPress={toggleMuteViewedProfile} style={{padding:10,backgroundColor:C.pale,borderRadius:10}}><Text style={{color:C.ink,fontWeight:"700"}}>{ar?"كتم":"Mute"}</Text></Pressable></View>
  <Pressable onPress={()=>startConversationWith(viewedProfile)} style={[s.button,{flex:1,backgroundColor:C.ink}]}><Text style={s.buttonText}>{ar?"مراسلة":"Message"}</Text></Pressable>
      </View>
      {viewedProfile.is_private&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"هذا الحساب خاص.":"This account is private."}</Text>}
      {viewedPosts.map(p=><View key={p.id} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <View style={{flex:1}}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{p.title}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{new Date(p.created_at).toLocaleString()}</Text></View>
        <Pressable onPress={()=>openViewedPostMenu(p)} hitSlop={10} style={{padding:9,borderRadius:10,backgroundColor:C.pale}}><MaterialCommunityIcons name="dots-horizontal" size={21} color={C.ink}/></Pressable>
      </View>
      {editingMyPost===p.id?<View style={{gap:8}}><TextInput value={editingMyPostTitle} onChangeText={setEditingMyPostTitle} placeholder={ar?"عنوان المنشور":"Post title"} style={[s.input,isDark&&{backgroundColor:"#172632",borderColor:"#34495A",color:"#F2F6FA"}]}/><TextInput value={editingMyPostBody} onChangeText={setEditingMyPostBody} multiline placeholder={ar?"محتوى المنشور":"Post content"} style={[s.input,{minHeight:90,textAlignVertical:"top"}]}/><View style={{flexDirection:"row",gap:8}}><Pressable onPress={()=>saveMyPostEdit(p.id)} style={[s.button,{flex:1}]}><Text style={s.buttonText}>{ar?"حفظ التعديل":"Save edit"}</Text></Pressable><Pressable onPress={()=>setEditingMyPost(null)} style={[s.button,{flex:1,backgroundColor:C.muted}]}><Text style={s.buttonText}>{ar?"إلغاء":"Cancel"}</Text></Pressable></View></View>:<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{p.body}</Text>}
      {p.image_url&&<Image source={{uri:p.image_url}} style={s.coverImage}/>}
      <View style={{flexDirection:"row",justifyContent:"space-around",paddingVertical:9,backgroundColor:C.pale,borderRadius:10,marginTop:8}}>
        {[[viewedPostMetrics[p.id]?.views||0,ar?"مشاهدة":"Views","eye"],[viewedPostMetrics[p.id]?.likes||0,ar?"إعجاب":"Likes","heart"],[viewedPostMetrics[p.id]?.comments||0,ar?"تعليق":"Comments","comment-outline"],[viewedPostMetrics[p.id]?.reposts||0,ar?"إعادة نشر":"Reposts","repeat"],[viewedPostMetrics[p.id]?.saves||0,ar?"حفظ":"Saves","bookmark-outline"],[viewedPostMetrics[p.id]?.shares||0,ar?"مشاركة":"Shares","share-variant-outline"]].map(([n,label,ic]:any)=><View key={label} style={{alignItems:"center",gap:2}}><MaterialCommunityIcons name={ic} size={16} color={C.muted}/><Text style={{fontSize:12,fontWeight:"900",color:C.ink}}>{n}</Text><Text style={{fontSize:9,color:C.muted}}>{label}</Text></View>)}
      </View>
      <View style={{flexDirection:"row",justifyContent:"space-around",flexWrap:"wrap",gap:7,marginTop:10}}>
        <Pressable onPress={()=>toggleViewedPostLike(p.id)} style={{flexDirection:"row",alignItems:"center",gap:6,padding:9,backgroundColor:viewedLikedPostIds.includes(p.id)?"#FCE8EE":C.pale,borderRadius:10}}><MaterialCommunityIcons name={viewedLikedPostIds.includes(p.id)?"heart":"heart-outline"} size={18} color={viewedLikedPostIds.includes(p.id)?"#D83F69":C.muted}/><Text style={{color:C.ink,fontWeight:"800"}}>{ar?"إعجاب":"Like"}</Text></Pressable>
        <Pressable onPress={()=>{const open=commentingViewedPost!==p.id;setCommentingViewedPost(open?p.id:null);if(open)loadViewedPostComments(p.id);}} style={{flexDirection:"row",alignItems:"center",gap:6,padding:9,backgroundColor:commentingViewedPost===p.id?"#E8F5FD":C.pale,borderRadius:10}}><MaterialCommunityIcons name="comment-outline" size={18} color={C.blue}/><Text style={{color:C.ink,fontWeight:"800"}}>{ar?"تعليق":"Comment"}</Text></Pressable>
        <Pressable onPress={()=>shareViewedPost(p)} style={{flexDirection:"row",alignItems:"center",gap:6,padding:9,backgroundColor:C.pale,borderRadius:10}}><MaterialCommunityIcons name="share-variant-outline" size={18} color={C.muted}/><Text style={{color:C.ink,fontWeight:"800"}}>{ar?"مشاركة":"Share"}</Text></Pressable>
        <Pressable onPress={()=>toggleViewedPostSave(p.id)} style={{flexDirection:"row",alignItems:"center",gap:6,padding:9,backgroundColor:viewedSavedPostIds.includes(p.id)?"#E8F5FD":C.pale,borderRadius:10}}><MaterialCommunityIcons name={viewedSavedPostIds.includes(p.id)?"bookmark":"bookmark-outline"} size={18} color={C.blue}/><Text style={{color:C.ink,fontWeight:"800"}}>{ar?"حفظ":"Save"}</Text></Pressable>
      </View>
      {commentingViewedPost===p.id&&<View style={{marginTop:10,gap:8}}>
        {(viewedPostComments[p.id]||[]).map((comment:any)=><View key={comment.id} style={{padding:9,borderRadius:10,backgroundColor:C.pale}}><Text style={{fontWeight:"800",color:C.ink}}>{comment.profiles?.display_name||comment.profiles?.username|| (ar?"عضو":"Member")}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{comment.body}</Text></View>)}
        <View style={{flexDirection:"row",gap:7,alignItems:"center"}}><TextInput value={viewedCommentDraft} onChangeText={setViewedCommentDraft} placeholder={ar?"اكتب تعليقاً...":"Write a comment..."} placeholderTextColor={C.muted} style={[s.input,{flex:1,marginTop:0}]}/><Pressable onPress={()=>sendViewedPostComment(p.id)} style={[s.send,{marginTop:0}]}><MaterialCommunityIcons name="send" size={18} color="#FFFFFF"/></Pressable></View>
      </View>}
    </View>)}
      {!viewedPosts.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد منشورات بعد.":"No posts yet."}</Text>}
    </View>}

    {!viewedProfile&&tab==="explore"&&<>
      <TextInput value={query} onChangeText={setQuery} placeholder={ar?"ابحث عن مجتمعات وتخصصات...":"Search communities and topics..."} placeholderTextColor="#9AA8B2" style={[s.input,ar&&s.rtl]}/>
      <Text style={[s.section,ar&&s.rtl]}>{ar?"الرائج هذا الأسبوع":"Trending this week"}</Text>{trendingRows.map(p=><View key={p.id} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{p.title||p.body}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{p.author_name} · {p.category}</Text><Text style={s.status}>{ar?("تفاعل "+p.score+" · إعجابات "+p.likes+" · تعليقات "+p.comments):("Score "+p.score+" · Likes "+p.likes+" · Comments "+p.comments)}</Text></View>)}{!trendingRows.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد منشورات رائجة بعد.":"No trending posts yet."}</Text>}<Text style={[s.section,ar&&s.rtl]}>{ar?"الأشخاص":"People"}</Text>
      {people.map(person=><Pressable key={person.id} onPress={()=>openProfile(person.id)} style={[s.personCard,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
        {person.avatar_url?<Image source={{uri:person.avatar_url}} style={s.personAvatar}/>:<View style={s.personAvatarFallback}><MaterialCommunityIcons name={person.account_type==="company"?"domain":"account"} size={22} color={C.blue}/></View>}
        <View style={{flex:1}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:4}}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{person.display_name||person.username}</Text>{person.is_verified&&<MaterialCommunityIcons name="check-decagram" size={16} color={person.account_type==="company"?"#89939D":C.blue}/>}</View>
          <Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{person.username}</Text>
          {!!person.specialty&&<Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{person.specialty}</Text>}
        </View>
        <Pressable disabled={busy} onPress={()=>toggleFollow(person.id)} style={[s.smallButton,followingIds.includes(person.id)&&s.secondaryButton]}><Text style={[s.smallButtonText,followingIds.includes(person.id)&&s.secondaryButtonText]}>{followingIds.includes(person.id)?(ar?"تتابعه":"Following"):(ar?"متابعة":"Follow")}</Text></Pressable>
      </Pressable>)}
      {!people.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا يوجد أشخاص مطابقون حالياً.":"No people found."}</Text>}
      <Text style={[s.section,ar&&s.rtl]}>{ar?"مواضيع تتابعها":"Follow topics"}</Text><View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"اختر المجالات التي تريد ظهور منشوراتها في الاستكشاف.":"Choose topics to personalize discovery."}</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:10}}>{topicRows.map(t=><Pressable key={t.id} onPress={()=>toggleTopic(t.id)} style={{paddingVertical:9,paddingHorizontal:12,borderRadius:18,backgroundColor:followedTopics.includes(t.id)?C.blue:C.pale}}><Text style={{color:followedTopics.includes(t.id)?"#fff":C.ink,fontWeight:"700"}}>{followedTopics.includes(t.id)?"✓ ":""}{t.name}</Text></Pressable>)}</View></View><Text style={[s.section,ar&&s.rtl]}>{ar?"المجتمعات":"Communities"}</Text>
      {communities.filter(x=>(x.name+" "+x.description+" "+x.specialty).toLowerCase().includes(query.toLowerCase())).map(x=><View key={x.id} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{x.name}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{x.description}</Text><Text style={s.tag}>{x.specialty}</Text></View>)}
      <Button label={ar?"عرض المجتمعات":"View communities"} onPress={onBackHome}/>
    </>}

    {tab==="groups"&&<>
      <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"إنشاء مجتمع جديد":"Create a community"}</Text><Field label={ar?"اسم المجتمع":"Community name"} value={newCommunityName} onChange={setNewCommunityName}/><Field label={ar?"الوصف":"Description"} value={newCommunityDescription} onChange={setNewCommunityDescription} multiline/><Field label={ar?"التخصص":"Topic"} value={newCommunitySpecialty} onChange={setNewCommunitySpecialty} placeholder={ar?"مثلاً: الأمن السيبراني":"e.g. Cybersecurity"}/><Button label={ar?"إنشاء المجتمع":"Create community"} onPress={createCommunity}/></View>
      <Text style={[s.detail,ar&&s.rtl]}>{ar?"انضم إلى مجتمعك المفضل، وسيبقى انضمامك محفوظاً بحسابك.":"Join a community; your membership is saved to your account."}</Text>
      {communities.map(x=>{const yes=joined.includes(x.id);return <View key={x.id} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,ar&&s.rtl]}>{x.name}</Text><Text style={[s.detail,ar&&s.rtl]}>{x.description}</Text><View style={s.cardFoot}><Text style={s.tag}>{x.specialty}</Text><Pressable onPress={()=>toggleCommunity(x.id)} style={[s.smallButton,yes&&s.secondaryButton]}><Text style={[s.smallButtonText,yes&&s.secondaryButtonText]}>{yes?(ar?"مغادرة":"Leave"):(ar?"انضمام":"Join")}</Text></Pressable></View></View>})}
    </>}

    {!viewedProfile&&tab==="profile"&&<>
      {!profile?<ActivityIndicator color={C.blue}/>:<>
        <View style={[s.profileCard,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
          <Pressable onPress={chooseCover} style={{width:"100%"}}>{profile.cover_url?<Image source={{uri:profile.cover_url}} style={s.coverImage}/>:<View style={s.coverPlaceholder}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"إضافة صورة غلاف":"Add cover photo"}</Text></View>}</Pressable>
          <Pressable onPress={chooseAvatar} disabled={busy} style={s.avatarPress}>
            {profile.avatar_url?<Image source={{uri:profile.avatar_url}} style={s.avatarImage} />:<View style={s.avatar}><MaterialCommunityIcons name={profile.account_type==="company"?"domain":"account"} size={31} color={C.blue}/></View>}
            <View style={s.cameraBadge}><MaterialCommunityIcons name="camera" size={14} color="#FFFFFF"/></View>
          </Pressable>
          <Pressable onPress={chooseAvatar}><Text style={s.changePhoto}>{ar?"تغيير الصورة الشخصية":"Change profile photo"}</Text></Pressable>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Text style={[s.profileName,isDark&&{color:"#F2F6FA"}]}>{profile.display_name}</Text>{profile.is_verified&&<Pressable onPress={()=>showVerificationInfo(profile.company_name)}><MaterialCommunityIcons name="check-decagram" size={20} color={accountMode==="company"?"#89939D":C.blue}/></Pressable>}</View>
          <Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{profile.username}</Text>
          <View style={s.statsRow}><View style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{postCount}</Text><Text style={s.statLabel}>{ar?"المنشورات":"Posts"}</Text></View><Pressable onPress={()=>openPeopleList("followers")} style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{followersCount}</Text><Text style={s.statLabel}>{ar?"المتابعون":"Followers"}</Text></Pressable><Pressable onPress={()=>openPeopleList("following")} style={s.stat}><Text style={[s.statNum,isDark&&{color:"#F2F6FA"}]}>{followingCount}</Text><Text style={s.statLabel}>{ar?"يتابع":"Following"}</Text></Pressable></View>
          <Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{accountMode==="business"?(ar?"حساب أعمال":"Business account"):accountMode==="company"?(ar?"حساب شركة":"Company account"):(ar?"حساب شخصي":"Personal account")}</Text><View style={{marginTop:10,padding:12,borderRadius:12,backgroundColor:"#FFF7E6",flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><View style={{flexDirection:"row",alignItems:"center",gap:7}}><MaterialCommunityIcons name="trophy-outline" size={20} color="#C28A24"/><Text style={{color:"#8C641A",fontWeight:"800"}}>{ar?"نقاط المساهمات":"Contribution points"}</Text></View><Text style={{color:"#8C641A",fontSize:17,fontWeight:"900"}}>{profile.points||0}</Text></View>
          <Text style={[s.bio,isDark&&{color:"#C4D0DA"}]}>{profile.bio||""}</Text>
          <View style={s.tags}>{(profile.interests||[]).map(x=><Text key={x} style={s.tag}>{x}</Text>)}</View>
        </View>
        <Button label={edit?(ar?"إلغاء التعديل":"Cancel edit"):(ar?"تعديل الملف الشخصي":"Edit profile")} onPress={()=>setEdit(!edit)} disabled={busy}/>
        {edit&&<View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Field label={ar?"الاسم":"Display name"} value={displayName} onChange={setDisplayName}/><Field label={ar?"اسم المستخدم":"Username"} value={username} onChange={setUsername}/><Field label={ar?"نبذة":"Bio"} value={bio} onChange={setBio} multiline/>{accountMode==="business"?<><Text style={[s.label,isDark&&{color:"#F2F6FA"}]}>{ar?"فئة النشاط التجاري":"Business category"}</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:8}}>{["البرمجة","الأمن السيبراني","الذكاء الاصطناعي","التسويق","التصميم","تطوير التطبيقات","تحليل البيانات","الشبكات","التعليم التقني","أخرى"].map(v=><Pressable key={v} onPress={()=>setSpecialty(v)} style={{width:"48%",minHeight:48,paddingHorizontal:9,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:specialty===v?C.blue:C.line,backgroundColor:specialty===v?"#E8F5FD":"#FFFFFF",alignItems:"center",justifyContent:"center"}}><Text style={{color:specialty===v?C.blue:C.ink,fontSize:12,fontWeight:"800",textAlign:"center"}}>{v}</Text></Pressable>)}</View></>:<Field label={ar?"التخصص":"Specialty"} value={specialty} onChange={setSpecialty}/>} <Text style={[s.label,isDark&&{color:"#F2F6FA"}]}>{ar?"نوع الحساب":"Account type"}</Text><View style={s.row}>{(["personal","business","company"] as const).map(v=><Pressable key={v} onPress={()=>setAccountMode(v)} style={[s.choice,accountMode===v&&s.choiceOn]}><Text style={[s.choiceText,isDark&&{color:"#F2F6FA"}]}>{v==="personal"?(ar?"شخصي":"Personal"):v==="business"?(ar?"أعمال":"Business"):(ar?"شركة":"Company")}</Text></Pressable>)}</View><Text style={[s.label,isDark&&{color:"#F2F6FA"}]}>{ar?"خصوصية الحساب":"Account privacy"}</Text><View style={s.row}><Pressable onPress={()=>setPrivateAccount(false)} style={[s.choice,!privateAccount&&s.choiceOn]}><Text style={[s.choiceText,isDark&&{color:"#F2F6FA"}]}>{ar?"عام":"Public"}</Text></Pressable><Pressable onPress={()=>setPrivateAccount(true)} style={[s.choice,privateAccount&&s.choiceOn]}><Text style={[s.choiceText,isDark&&{color:"#F2F6FA"}]}>{ar?"خاص":"Private"}</Text></Pressable></View><Pressable onPress={()=>setHideFollowers(!hideFollowers)} style={[s.settingRow,isDark&&{borderBottomColor:"#34495A"}]}><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"إخفاء قائمة المتابعين":"Hide followers list"}</Text><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{hideFollowers?"●":"○"}</Text></Pressable><Button label={ar?"حفظ التعديلات":"Save changes"} onPress={saveProfile}/></View>}
        <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><View style={s.cardFoot}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"التوثيق":"Verification"}</Text><MaterialCommunityIcons name="check-decagram" size={24} color={profile.account_type==="company"?"#89939D":C.blue}/></View><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"فعّل الشارة الزرقاء للحساب الشخصي أو الفضية لحساب الشركة. يمكنك تشغيلها أو إيقافها مباشرة.":"Enable the blue personal or silver company badge. Toggle it whenever you like."}</Text><View style={s.verifyRow}><View style={{flexDirection:"row",alignItems:"center",gap:7}}><MaterialCommunityIcons name="check-decagram" size={22} color={profile.account_type==="company"?"#89939D":C.blue}/><Text style={[s.verifyText,isDark&&{color:"#F2F6FA"}]}>{profile.account_type==="company"?(ar?"شارة شركة فضية":"Silver company badge"):(ar?"شارة شخصية زرقاء":"Blue personal badge")}</Text></View><Pressable onPress={toggleVerified} disabled={busy} style={[s.toggle,profile.is_verified&&s.toggleOn]}><View style={[s.toggleKnob,profile.is_verified&&s.toggleKnobOn]}/></Pressable></View><Text style={s.status}>{profile.is_verified?(ar?"التوثيق مفعّل":"Verification enabled"):(ar?"التوثيق متوقف":"Verification off")}</Text></View>
        <View style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"الإعدادات العامة":"General settings"}</Text>
          <Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"إصدار التطبيق: 1.0.0":"App version: 1.0.0"}</Text>
          <Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"الخصوصية ونوع الحساب من زر تعديل الملف الشخصي.":"Privacy and account type are managed in Edit profile."}</Text>
        </View>
        <Button label={ar?"نشر منشور من حسابي":"Publish from profile"} onPress={onOpenComposer}/>
        <Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{ar?"منشوراتي":"My posts"}</Text>
        {myPosts.map(p=><View key={p.id} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}>
          <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <View style={{flex:1}}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{p.title}</Text><Text style={s.status}>{new Date(p.created_at).toLocaleString(ar?"ar":"en")}</Text></View>
            <Pressable onPress={()=>setMyPostMenuId(myPostMenuId===p.id?null:p.id)} hitSlop={12} accessibilityRole="button" accessibilityLabel={ar?"خيارات المنشور":"Post options"} style={{width:42,height:42,alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:C.pale,borderWidth:1,borderColor:C.line}}><MaterialCommunityIcons name="dots-vertical" size={23} color={C.ink}/></Pressable>
          </View>
          {myPostMenuId===p.id&&<View style={{marginTop:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.white,gap:3}}>
            <Pressable onPress={()=>{setEditingMyPost(p.id);setEditingMyPostTitle(p.title||"");setEditingMyPostBody(p.body||"");setMyPostMenuId(null);}} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:10}}><MaterialCommunityIcons name="pencil-outline" size={19} color={C.blue}/><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{ar?"تعديل المنشور":"Edit post"}</Text></Pressable>
            <Pressable onPress={()=>{togglePinMyPost(p);setMyPostMenuId(null);}} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:10}}><MaterialCommunityIcons name="pin-outline" size={19} color={C.blue}/><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>{p.pinned_at?(ar?"إلغاء التثبيت":"Unpin post"):(ar?"تثبيت المنشور":"Pin post")}</Text></Pressable>
            <Pressable onPress={()=>{setMyPostMenuId(null);deleteMyPost(p.id);}} style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:10}}><MaterialCommunityIcons name="trash-can-outline" size={19} color={C.red}/><Text style={{color:C.red,fontWeight:"800"}}>{ar?"حذف المنشور نهائياً":"Delete post permanently"}</Text></Pressable>
          </View>}
          {editingMyPost===p.id?<View style={{marginTop:10,gap:9}}>
            <TextInput value={editingMyPostTitle} onChangeText={setEditingMyPostTitle} placeholder={ar?"عنوان المنشور":"Post title"} placeholderTextColor={C.muted} style={[s.input,ar&&s.rtl]}/>
            <TextInput value={editingMyPostBody} onChangeText={setEditingMyPostBody} multiline placeholder={ar?"محتوى المنشور":"Post content"} placeholderTextColor={C.muted} style={[s.input,{minHeight:100,textAlignVertical:"top"},ar&&s.rtl]}/>
            <View style={{flexDirection:"row",gap:8}}><Pressable onPress={()=>saveMyPostEdit(p.id)} style={[s.button,{flex:1}]}><Text style={s.buttonText}>{ar?"حفظ التعديل":"Save edit"}</Text></Pressable><Pressable onPress={()=>setEditingMyPost(null)} style={[s.button,{flex:1,backgroundColor:C.muted}]}><Text style={s.buttonText}>{ar?"إلغاء":"Cancel"}</Text></Pressable></View>
          </View>:<Text style={[s.detail,{marginTop:8}]}>{p.body}</Text>}
          {p.image_url&&<Image source={{uri:p.image_url}} style={s.coverImage}/>}
          <View style={{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",gap:7,marginTop:12,borderTopWidth:1,borderTopColor:C.line,paddingTop:10}}>
            <Pressable onPress={()=>toggleMyPostLike(p.id)} style={{flexDirection:"row",alignItems:"center",gap:5,padding:9,backgroundColor:likedMyPosts.includes(p.id)?"#FCE8EE":C.pale,borderRadius:10}}><MaterialCommunityIcons name={likedMyPosts.includes(p.id)?"heart":"heart-outline"} size={19} color={likedMyPosts.includes(p.id)?"#D83F69":C.muted}/><Text style={{color:C.ink,fontWeight:"700",fontSize:12}}>{ar?"إعجاب":"Like"}</Text></Pressable>
            <Pressable onPress={()=>setCommentingMyPost(commentingMyPost===p.id?null:p.id)} style={{flexDirection:"row",alignItems:"center",gap:5,padding:9,backgroundColor:C.pale,borderRadius:10}}><MaterialCommunityIcons name="comment-outline" size={19} color={C.muted}/><Text style={{color:C.ink,fontWeight:"700",fontSize:12}}>{ar?"تعليق":"Comment"}</Text></Pressable>
            <Pressable onPress={()=>Share.share({message:(p.title||"")+"\n\n"+(p.body||"")})} style={{flexDirection:"row",alignItems:"center",gap:5,padding:9,backgroundColor:C.pale,borderRadius:10}}><MaterialCommunityIcons name="share-variant-outline" size={19} color={C.muted}/><Text style={{color:C.ink,fontWeight:"700",fontSize:12}}>{ar?"مشاركة":"Share"}</Text></Pressable>
            <Pressable onPress={()=>toggleMyPostSave(p.id)} style={{flexDirection:"row",alignItems:"center",gap:5,padding:9,backgroundColor:savedMyPosts.includes(p.id)?"#E8F5FD":C.pale,borderRadius:10}}><MaterialCommunityIcons name={savedMyPosts.includes(p.id)?"bookmark":"bookmark-outline"} size={19} color={C.blue}/><Text style={{color:C.ink,fontWeight:"700",fontSize:12}}>{ar?"حفظ":"Save"}</Text></Pressable>
          </View>
          {commentingMyPost===p.id&&<View style={{marginTop:10,gap:8}}><TextInput value={myPostComment} onChangeText={setMyPostComment} placeholder={ar?"اكتب تعليقك هنا...":"Write your comment..."} placeholderTextColor={C.muted} style={[s.input,{marginTop:0}]}/><Pressable onPress={()=>sendMyPostComment(p.id)} style={{backgroundColor:C.blue,borderRadius:10,padding:11,alignItems:"center"}}><Text style={{color:"#fff",fontWeight:"800"}}>{ar?"إرسال التعليق":"Post comment"}</Text></Pressable></View>}
        </View>)}
        {!myPosts.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد منشورات بعد. استخدم زر + في الرئيسية للنشر.":"No posts yet. Use the + button on Home to publish."}</Text>}
        <Pressable style={s.signout} onPress={async()=>{await supabase?.auth.signOut();}}><Text style={s.signoutText}>{ar?"تسجيل الخروج":"Sign out"}</Text></Pressable>
      </>}
    </>}

    {tab==="messages"&&<>
      {!activeConversation?<><Text style={[s.detail,ar&&s.rtl]}>{ar?"ابدأ محادثة جديدة باستخدام اسم المستخدم.":"Start a conversation using a member's username."}</Text><Text style={[s.label,isDark&&{color:"#F2F6FA"}]}>{ar?"اسم المستخدم":"Username"}</Text><View style={s.messageSearchRow}><TextInput value={targetUsername} onChangeText={setTargetUsername} placeholder="@username" placeholderTextColor="#9AA8B2" autoCapitalize="none" style={[s.input,{flex:1,marginTop:0}]}/><Pressable onPress={startConversation} disabled={busy||!targetUsername.trim()} style={[s.messageSearchButton,(busy||!targetUsername.trim())&&{opacity:.5}]} accessibilityRole="button" accessibilityLabel={ar?"البحث عن مستخدم":"Search for user"}><MaterialCommunityIcons name="magnify" size={21} color="#FFFFFF"/></Pressable></View><Text style={[s.section,ar&&s.rtl]}>{ar?"محادثاتك":"Your conversations"}</Text>
        {conversations.map(c=><Pressable key={c.id} onPress={()=>{setActiveConversation(c.id);setActivePeer(c.peerName);loadConversationMessages(c.id);}} style={[s.card,isDark&&{backgroundColor:"#172632",borderColor:"#34495A"}]}><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{c.peerName}</Text><Text style={[s.detail,isDark&&{color:"#C4D0DA"}]}>@{c.peerUsername}</Text></Pressable>)}
        {!conversations.length&&<Text style={[s.empty,isDark&&{color:"#C4D0DA"}]}>{ar?"لا توجد محادثات بعد.":"No conversations yet."}</Text>}
      </>:<><Pressable onPress={()=>setActiveConversation(null)} style={[s.back,isDark&&{backgroundColor:"#172632"}]}><MaterialCommunityIcons name="arrow-left" size={18} color={C.blue}/><Text style={[s.backText,isDark&&{color:"#61B8F2"}]}>{ar?"كل المحادثات":"All conversations"}</Text></Pressable><Text style={[s.cardTitle,isDark&&{color:"#F2F6FA"}]}>{activePeer}</Text><ScrollView style={s.messageList}>{messages.map(m=><View key={m.id} style={[s.bubble,m.sender_id===userId&&s.myBubble]}>{m.image_url?<Image source={{uri:m.image_url}} style={{width:210,height:180,borderRadius:12,marginBottom:5}} resizeMode="cover"/>:null}<Text style={[s.bubbleText,m.sender_id===userId&&s.myBubbleText]}>{m.body==="صورة"&&m.image_url?"":m.body}</Text><Text style={[s.time,m.sender_id===userId&&s.myBubbleText]}>{new Date(m.created_at).toLocaleString()}{m.sender_id===userId?(m.read_at?(ar?" · تمت القراءة":" · Read"):(ar?" · تم الإرسال":" · Sent")):""}</Text></View>)}</ScrollView><View style={s.compose}><Pressable onPress={sendMessageImage} disabled={busy} style={[s.send,{backgroundColor:C.pale,marginRight:7}]}><MaterialCommunityIcons name="image-plus" size={20} color={C.blue}/></Pressable><TextInput value={messageDraft} onChangeText={setMessageDraft} placeholder={ar?"اكتب رسالة...":"Write a message..."} placeholderTextColor="#9AA8B2" style={[s.composeInput,ar&&s.rtl]}/><Pressable onPress={sendMessage} style={s.send}><MaterialCommunityIcons name="send" size={19} color="#FFFFFF"/></Pressable></View></>}
    </>}

    <Pressable onPress={onBackHome} style={[s.back,isDark&&{backgroundColor:"#172632"}]}><MaterialCommunityIcons name="home-outline" size={18} color={C.blue}/><Text style={[s.backText,isDark&&{color:"#61B8F2"}]}>{ar?"العودة للرئيسية":"Back to Home"}</Text></Pressable>
  </View>;
}


function SettingSwitch({value}:{value:boolean}) { return <View accessibilityRole="text" style={{minWidth:76,paddingHorizontal:12,paddingVertical:7,borderRadius:18,backgroundColor:value?"#1D9BF0":"#CBD2D9",alignItems:"center"}}><Text style={{fontSize:12,fontWeight:"900",color:"#FFFFFF"}}>{value?"ON":"OFF"}</Text></View>; }

const s=StyleSheet.create({
 coverImage:{width:"100%",height:110,borderRadius:13,backgroundColor:C.pale,marginBottom:8},coverPlaceholder:{width:"100%",height:92,borderRadius:13,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center"},settingRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:14,borderBottomWidth:1,borderBottomColor:C.line},
 wrap:{paddingTop:12,paddingBottom:26},eyebrow:{color:C.blue,fontSize:9,fontWeight:"900",letterSpacing:1.4,marginBottom:7},title:{color:C.ink,fontSize:22,fontWeight:"900",marginBottom:16},
 card:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,marginTop:11},personCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:10,marginTop:9,flexDirection:"row",alignItems:"center",gap:10},personAvatar:{width:44,height:44,borderRadius:22,backgroundColor:C.pale},personAvatarFallback:{width:44,height:44,borderRadius:22,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center"},cardTitle:{color:C.ink,fontSize:16,fontWeight:"800"},detail:{color:C.muted,fontSize:13,lineHeight:21,marginTop:6},label:{color:C.ink,fontSize:13,fontWeight:"800",marginBottom:8,marginTop:14},
 input:{minHeight:45,backgroundColor:C.white,borderWidth:1,borderColor:"#CFD9DE",borderRadius:12,paddingHorizontal:12,color:C.ink,fontSize:12,marginTop:8},button:{height:44,backgroundColor:C.blue,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:13},buttonText:{color:C.white,fontSize:12,fontWeight:"900"},
 notice:{backgroundColor:"#EFF8FE",borderColor:"#C8E7FA",borderWidth:1,borderRadius:12,padding:11,marginBottom:10,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},noticeText:{color:C.ink,fontSize:11,flex:1,lineHeight:18},
 cardFoot:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},tag:{color:"#1876B8",backgroundColor:"#E8F5FD",overflow:"hidden",borderRadius:9,paddingHorizontal:9,paddingVertical:5,fontSize:10,alignSelf:"flex-start",marginTop:8},smallButton:{backgroundColor:C.blue,borderRadius:10,paddingHorizontal:15,paddingVertical:8},smallButtonText:{color:C.white,fontWeight:"800",fontSize:11},secondaryButton:{backgroundColor:C.pale,borderWidth:1,borderColor:C.line},secondaryButtonText:{color:C.muted},profileCard:{alignItems:"center",backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:18,padding:20,marginBottom:12},avatarPress:{position:"relative"},avatarImage:{width:82,height:82,borderRadius:41,backgroundColor:"#E8F5FD",overflow:"hidden"},cameraBadge:{position:"absolute",right:-2,bottom:4,width:25,height:25,borderRadius:13,backgroundColor:C.blue,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:C.white},changePhoto:{color:C.blue,fontSize:11,fontWeight:"800",marginTop:7,marginBottom:9},statsRow:{flexDirection:"row",justifyContent:"space-around",width:"100%",marginTop:17,paddingTop:13,borderTopWidth:1,borderBottomWidth:1,borderColor:C.line,paddingBottom:13},stat:{alignItems:"center",minWidth:70},statNum:{fontSize:17,fontWeight:"900",color:C.ink},statLabel:{fontSize:10,color:C.muted,marginTop:3},bio:{fontSize:12,color:C.ink,marginTop:8,textAlign:"center"},verifyRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:15},verifyText:{fontSize:12,color:C.ink,fontWeight:"800"},toggle:{width:48,height:28,borderRadius:14,backgroundColor:"#CBD2D9",padding:3,justifyContent:"center"},toggleOn:{backgroundColor:C.blue},toggleKnob:{width:22,height:22,borderRadius:11,backgroundColor:"#FFFFFF"},toggleKnobOn:{alignSelf:"flex-end"},avatar:{width:66,height:66,borderRadius:22,backgroundColor:"#E8F5FD",alignItems:"center",justifyContent:"center",marginBottom:10},profileName:{fontSize:17,color:C.ink,fontWeight:"900"},tags:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:10},status:{color:C.blue,fontWeight:"900",fontSize:12,marginTop:9},hint:{fontSize:10,color:C.muted,lineHeight:17,marginTop:12},row:{flexDirection:"row",gap:8},choice:{flex:1,borderWidth:1,borderColor:C.line,borderRadius:10,padding:10,alignItems:"center"},choiceOn:{borderColor:C.blue,backgroundColor:"#E8F5FD"},choiceText:{color:C.ink,fontWeight:"700",fontSize:11},signout:{backgroundColor:"#FCE8EA",borderRadius:11,padding:12,alignItems:"center",marginTop:12},signoutText:{color:C.red,fontWeight:"900",fontSize:12},section:{color:C.ink,fontSize:14,fontWeight:"900",marginTop:22,marginBottom:5},empty:{textAlign:"center",color:C.muted,padding:30},messageList:{maxHeight:390,marginTop:12},bubble:{alignSelf:"flex-start",maxWidth:"85%",backgroundColor:C.pale,borderRadius:14,padding:11,marginVertical:5},myBubble:{alignSelf:"flex-end",backgroundColor:"#DFF1FD"},bubbleText:{color:C.ink,fontSize:12,lineHeight:18},myBubbleText:{color:"#13527D"},time:{color:C.muted,fontSize:9,marginTop:5},messageSearchRow:{flexDirection:"row",alignItems:"center",gap:8},messageSearchButton:{width:45,height:45,borderRadius:12,backgroundColor:C.blue,alignItems:"center",justifyContent:"center",marginTop:8},compose:{flexDirection:"row",alignItems:"center",gap:8,marginTop:10},composeInput:{flex:1,minHeight:44,borderWidth:1,borderColor:C.line,borderRadius:12,paddingHorizontal:12,color:C.ink},send:{width:44,height:44,borderRadius:12,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},back:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,marginTop:18,padding:10},backText:{color:C.blue,fontSize:12,fontWeight:"800"},rtl:{textAlign:"right",writingDirection:"rtl"}
});

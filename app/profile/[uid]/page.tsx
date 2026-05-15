"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, collection } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { useRef } from "react";
import { MessageCircle, UserPlus, Check, UserMinus, User, Star, Clock, Briefcase, Info, MapPin, ExternalLink, Zap, Share2, Flag, Crown, Sparkles, Flame, Shield, Gem, ChevronRight, Coffee, Users, Heart, Award, Mail, Music, Camera, Sun, Globe, Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag, Mic, Bike, Palette, Beer, Map, PartyPopper, TrendingUp, ThumbsUp, BookOpen, Phone, ShieldCheck, Lock } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type PublicUser = {
  uid: string; name: string; userId: string; avatar: string; bio?: string; birthday?: string; phone?: string;
  title?: string; location?: string; online?: boolean; lastSeen?: Timestamp; emailVerified?: boolean;
  isVerifiedId?: boolean; skills?: string[]; portfolio?: { title: string; url: string }[];
  stats?: { completed: number; rating: number; totalReviews: number }; createdAt?: Timestamp;
};

export default function PublicProfile() {
const params = useParams();
const uid = Array.isArray(params.uid)
  ? params.uid[0]
  : params.uid;
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();
 const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {

  return () => {

    if (successTimeoutRef.current) {

      clearTimeout(successTimeoutRef.current);

    }

  };

}, []);
  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [showTrustInfo, setShowTrustInfo] = useState(false);
  const [showAchievementInfo, setShowAchievementInfo] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isOwnProfile = user?.uid === uid;

  // ===== STATS =====
  const completed = targetUser?.stats?.completed || 0;
  const reviews = targetUser?.stats?.totalReviews || 0;
  const rating = targetUser?.stats?.rating || 0;
  const xp = completed * 12 + reviews * 8 + Math.floor(rating * 20);
  const level = Math.max(1, Math.floor(xp / 300) + 1);
  const currentLevelXp = (level - 1) * 300;
const nextLevelXp = level * 300;
const progress = Math.min(
  100,
  ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
);
  const trustScore = Math.min(100, Math.floor(rating * 15 + completed * 1.2 + reviews));
  const joinedDays = targetUser?.createdAt?.seconds? Math.floor((Date.now() - targetUser.createdAt.seconds * 1000) / 86400000) : 999;
  const profileCompletion = Math.round(([targetUser?.avatar, targetUser?.bio, targetUser?.skills?.length, targetUser?.portfolio?.length, targetUser?.location, targetUser?.title, targetUser?.emailVerified, targetUser?.isVerifiedId].filter(Boolean).length / 8) * 100);

  const rank = useMemo(() => {
    if (level >= 50) return { name: "Huyền thoại", icon: <Crown className="w-3.5 h-3.5" />, gradient: "from-amber-400 to-orange-500" };
    if (level >= 35) return { name: "Chuyên gia", icon: <Gem className="w-3.5 h-3.5" />, gradient: "from-violet-500 to-fuchsia-500" };
    if (level >= 20) return { name: "Đối tác tin cậy", icon: <Shield className="w-3.5 h-3.5" />, gradient: "from-blue-500 to-sky-500" };
    if (level >= 8) return { name: "Thành viên tích cực", icon: <Flame className="w-3.5 h-3.5" />, gradient: "from-emerald-500 to-teal-500" };
    return { name: "Mới tham gia", icon: <Sparkles className="w-3.5 h-3.5" />, gradient: "from-sky-400 to-blue-600" };
  }, [level]);

  // ===== 40 ACHIEVEMENTS FULL =====
  const allAchievements = useMemo(() => [
    { id: 1, icon: <Users className="w-5 h-5" />, label: "Bạn bè khắp nơi", desc: "Kết nối 10+ người bạn", unlocked: friendCount >= 10, condition: "Có ≥ 10 bạn bè", color: "from-pink-400 to-rose-400", category: "profile" },
    { id: 2, icon: <Sparkles className="w-5 h-5" />, label: "Tân binh", desc: "Thành viên mới", unlocked: joinedDays <= 30, condition: "Tham gia < 30 ngày", color: "from-emerald-400 to-teal-400", category: "profile" },
    { id: 3, icon: <Star className="w-5 h-5" />, label: "5 sao lấp lánh", desc: "Được cho 5 sao", unlocked: rating >= 5.0 && reviews >= 1, condition: "Rating = 5.0", color: "from-yellow-400 to-amber-400", category: "profile" },
    { id: 4, icon: <Shield className="w-5 h-5" />, label: "Chính chủ 100%", desc: "Xác minh CCCD", unlocked: targetUser?.isVerifiedId || false, condition: "Xác minh CCCD", color: "from-blue-400 to-sky-400", category: "profile" },
    { id: 5, icon: <Briefcase className="w-5 h-5" />, label: "Thợ cày", desc: "Cày 50 job", unlocked: completed >= 50, condition: "Hoàn thành ≥ 50 job", color: "from-indigo-400 to-blue-400", category: "profile" },
    { id: 6, icon: <Flame className="w-5 h-5" />, label: "Streak 30 ngày", desc: "Online liên tục", unlocked: joinedDays >= 30, condition: "Tham gia ≥ 30 ngày", color: "from-orange-400 to-red-400", category: "profile" },
    { id: 7, icon: <Award className="w-5 h-5" />, label: "Profile xịn sò", desc: "Điền đủ 100%", unlocked: profileCompletion >= 100, condition: "Hồ sơ = 100%", color: "from-green-400 to-emerald-400", category: "profile" },
    { id: 8, icon: <Mail className="w-5 h-5" />, label: "Email real", desc: "Xác thực email", unlocked: targetUser?.emailVerified || false, condition: "Xác minh email", color: "from-sky-400 to-blue-400", category: "profile" },
    { id: 9, icon: <Camera className="w-5 h-5" />, label: "Nhiếp ảnh gia", desc: "5+ ảnh portfolio", unlocked: (targetUser?.portfolio?.length || 0) >= 5, condition: "Portfolio ≥ 5", color: "from-teal-400 to-cyan-400", category: "profile" },
    { id: 10, icon: <Crown className="w-5 h-5" />, label: "Đại gia", desc: "100 job", unlocked: completed >= 100, condition: "Hoàn thành ≥ 100 job", color: "from-yellow-500 to-amber-500", category: "profile" },
    { id: 11, icon: <Clock className="w-5 h-5" />, label: "Lão làng", desc: "Tham gia 365 ngày", unlocked: joinedDays >= 365, condition: "Tham gia ≥ 1 năm", color: "from-lime-400 to-green-400", category: "profile" },
    { id: 12, icon: <Globe className="w-5 h-5" />, label: "Quốc tế hóa", desc: "Đi chơi với bạn nước ngoài", unlocked: false, condition: "Có task với user nước ngoài", color: "from-indigo-400 to-purple-400", category: "profile" },
    { id: 13, icon: <Gem className="w-5 h-5" />, label: "Kim cương", desc: "Đạt level 50", unlocked: level >= 50, condition: "Đạt Lv.50", color: "from-cyan-400 to-blue-500", category: "profile" },
    { id: 14, icon: <ShieldCheck className="w-5 h-5" />, label: "Uy tín 100%", desc: "Tin được như vàng 9999", unlocked: trustScore >= 100, condition: "Độ uy tín = 100%", color: "from-blue-500 to-indigo-500", category: "profile" },
    { id: 15, icon: <Crown className="w-5 h-5" />, label: "Top 1%", desc: "Lọt top 1% người dùng", unlocked: trustScore >= 95, condition: "Độ uy tín ≥ 95%", color: "from-amber-400 to-yellow-500", category: "profile" },
    { id: 16, icon: <Heart className="w-5 h-5" />, label: "Bạn thân 50 người", desc: "Mở rộng vòng kết nối", unlocked: friendCount >= 50, condition: "Có ≥ 50 bạn bè", color: "from-rose-400 to-pink-500", category: "profile" },
    { id: 17, icon: <TrendingUp className="w-5 h-5" />, label: "Level 25+", desc: "Chăm cày lên level", unlocked: level >= 25, condition: "Đạt Lv.25", color: "from-purple-400 to-violet-400", category: "profile" },
    { id: 18, icon: <ThumbsUp className="w-5 h-5" />, label: "Được yêu thích", desc: "50+ đánh giá tích cực", unlocked: reviews >= 50, condition: "Reviews ≥ 50", color: "from-rose-400 to-pink-400", category: "profile" },
    { id: 19, icon: <BookOpen className="w-5 h-5" />, label: "Skill master", desc: "Thêm 10+ kỹ năng", unlocked: (targetUser?.skills?.length || 0) >= 10, condition: "Skills ≥ 10", color: "from-slate-400 to-gray-400", category: "profile" },
    { id: 20, icon: <MapPin className="w-5 h-5" />, label: "Dân chơi Sài Gòn", desc: "Check-in Ho Chi Minh City", unlocked: targetUser?.location?.includes("Hồ Chí Minh") || false, condition: "Location ở HCM", color: "from-emerald-400 to-green-500", category: "profile" },
    { id: 21, icon: <Coffee className="w-5 h-5" />, label: "Trùm cafe", desc: "Tạo 5 kèo đi cafe", unlocked: false, condition: "Tạo 5 task cafe", color: "from-amber-600 to-yellow-600", category: "task" },
    { id: 22, icon: <Heart className="w-5 h-5" />, label: "Ông mai bà mối", desc: "Tạo 10 kèo hẹn hò", unlocked: false, condition: "Tạo 10 task hẹn hò", color: "from-rose-400 to-pink-500", category: "task" },
    { id: 23, icon: <Music className="w-5 h-5" />, label: "Party king", desc: "Tổ chức 3 buổi nhậu", unlocked: false, condition: "Tạo 3 task nhậu/party", color: "from-purple-400 to-fuchsia-400", category: "task" },
    { id: 24, icon: <Sun className="w-5 h-5" />, label: "Dậy sớm", desc: "Tạo task buổi sáng 10 lần", unlocked: false, condition: "Tạo 10 task buổi sáng", color: "from-yellow-400 to-orange-400", category: "task" },
    { id: 25, icon: <Gamepad2 className="w-5 h-5" />, label: "Game thủ", desc: "Tạo 5 kèo chơi game", unlocked: false, condition: "Tạo 5 task game", color: "from-violet-400 to-purple-400", category: "task" },
    { id: 26, icon: <Utensils className="w-5 h-5" />, label: "Food reviewer", desc: "Tạo 10 kèo đi ăn", unlocked: false, condition: "Tạo 10 task ăn uống", color: "from-orange-400 to-red-400", category: "task" },
    { id: 27, icon: <Dumbbell className="w-5 h-5" />, label: "Gymer", desc: "Rủ 5 người đi tập gym", unlocked: false, condition: "Tạo 5 task gym", color: "from-red-400 to-rose-400", category: "task" },
    { id: 28, icon: <Film className="w-5 h-5" />, label: "Mọt phim", desc: "Tạo 5 kèo xem phim", unlocked: false, condition: "Tạo 5 task xem phim", color: "from-slate-400 to-zinc-400", category: "task" },
    { id: 29, icon: <Plane className="w-5 h-5" />, label: "Phượt thủ", desc: "Tổ chức 3 chuyến đi chơi xa", unlocked: false, condition: "Tạo 3 task du lịch", color: "from-sky-400 to-blue-500", category: "task" },
    { id: 30, icon: <Moon className="w-5 h-5" />, label: "Cú đêm", desc: "Tạo 10 task buổi tối", unlocked: false, condition: "Tạo 10 task tối", color: "from-indigo-500 to-purple-600", category: "task" },
    { id: 31, icon: <Gift className="w-5 h-5" />, label: "Người hào phóng", desc: "Tạo 5 task miễn phí", unlocked: false, condition: "Tạo 5 task free", color: "from-pink-400 to-rose-400", category: "task" },
    { id: 32, icon: <Users className="w-5 h-5" />, label: "Nhóm trưởng", desc: "Tạo task cho 10+ người", unlocked: false, condition: "Task có 10+ người join", color: "from-cyan-400 to-blue-400", category: "task" },
    { id: 33, icon: <Calendar className="w-5 h-5" />, label: "Siêu bận rộn", desc: "Có task 7 ngày liên tiếp", unlocked: false, condition: "Tạo task 7 ngày liên tục", color: "from-teal-400 to-green-400", category: "task" },
    { id: 34, icon: <ShoppingBag className="w-5 h-5" />, label: "Thánh shopping", desc: "Rủ 5 người đi mua sắm", unlocked: false, condition: "Tạo 5 task shopping", color: "from-fuchsia-400 to-pink-400", category: "task" },
    { id: 35, icon: <Mic className="w-5 h-5" />, label: "Ca sĩ phòng trà", desc: "Tổ chức 3 buổi karaoke", unlocked: false, condition: "Tạo 3 task karaoke", color: "from-purple-500 to-pink-500", category: "task" },
    { id: 36, icon: <Bike className="w-5 h-5" />, label: "Vận động viên", desc: "Rủ 5 người đi đạp xe/chạy bộ", unlocked: false, condition: "Tạo 5 task thể thao", color: "from-green-500 to-emerald-500", category: "task" },
    { id: 37, icon: <Palette className="w-5 h-5" />, label: "Nghệ sĩ", desc: "Tổ chức workshop vẽ/nhạc", unlocked: false, condition: "Tạo 3 task workshop", color: "from-rose-400 to-orange-400", category: "task" },
    { id: 38, icon: <Beer className="w-5 h-5" />, label: "Bợm nhậu", desc: "Tạo 10 kèo nhậu", unlocked: false, condition: "Tạo 10 task nhậu", color: "from-amber-500 to-yellow-600", category: "task" },
    { id: 39, icon: <Map className="w-5 h-5" />, label: "Hướng dẫn viên", desc: "Dẫn 20 người đi chơi", unlocked: false, condition: "20+ người join task", color: "from-blue-400 to-cyan-400", category: "task" },
    { id: 40, icon: <PartyPopper className="w-5 h-5" />, label: "Vua task", desc: "Tạo 100 task đi chơi", unlocked: false, condition: "Tạo 100 task", color: "from-yellow-400 via-orange-400 to-red-400", category: "task" },
  ], [friendCount, joinedDays, rating, reviews, targetUser, completed, profileCompletion, level, trustScore]);

  const fetchUser = useCallback(async () => {
    if (!uid ||!user || typeof uid!== 'string') return;
    try {
      const [userSnap, currentUserSnap] = await Promise.all([
        getDoc(doc(db, "users", uid as string)),
        getDoc(doc(db, "users", user.uid)),
      ]);
      if (!userSnap.exists()) { toast.error("Không tìm thấy người dùng"); router.replace("/404"); return; }
      setTargetUser({ uid: userSnap.id,...userSnap.data() } as PublicUser);
      if (currentUserSnap.exists()) setCurrentUserData(currentUserSnap.data());
      const friendSnap = await getDoc(doc(db, "users", user.uid, "friends", userSnap.id));
      setIsFriend(friendSnap.exists());
      if (!friendSnap.exists()) {
        const reqId = [user.uid, userSnap.id].sort().join('_');
        const reqSnap = await getDoc(doc(db, "friendRequests", reqId));
        if (reqSnap.exists() && reqSnap.data().from === user.uid) setHasSentRequest(true);
      }
      try { const friendsCol = await getDocs(collection(db, "users", uid as string, "friends")); setFriendCount(friendsCol.size); } catch { setFriendCount(0); }
    } catch (err) { console.error(err); toast.error("Có lỗi xảy ra"); } finally { setLoading(false); }
  }, [uid, user, db, router]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleConnect = async () => {
    if (!user ||!targetUser || actionLoading) return;
    setActionLoading(true);
    try {
      const reqId = [user.uid, targetUser.uid].sort().join('_');
      if (hasSentRequest) {
        await deleteDoc(doc(db, "friendRequests", reqId));
        setHasSentRequest(false);
        toast.success("Đã hủy lời mời");
      } else {
        await setDoc(doc(db, "friendRequests", reqId), {
          from: user.uid, to: targetUser.uid, status: "pending", createdAt: serverTimestamp(),
          fromName: currentUserData?.name || user.displayName, fromAvatar: currentUserData?.avatar || user.photoURL,
          toName: targetUser.name, toAvatar: targetUser.avatar,
        });
        setHasSentRequest(true);
        toast.success(`Đã gửi lời mời tới ${targetUser.name}`);
setShowSuccess(true);

if (successTimeoutRef.current) {
  clearTimeout(successTimeoutRef.current);
}

successTimeoutRef.current = setTimeout(() => {
  setShowSuccess(false);
}, 1200);
      }
      navigator.vibrate?.(8);
    } catch { toast.error("Thao tác thất bại"); } finally { setActionLoading(false); }
  };

  const handleUnfriend = async () => {
    if (!user ||!targetUser) return;
    setActionLoading(true);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid, "friends", targetUser.uid)),
        deleteDoc(doc(db, "users", targetUser.uid, "friends", user.uid)),
      ]);
      setIsFriend(false);
      toast.success("Đã hủy kết nối");
      navigator.vibrate?.(8);
    } catch { toast.error("Có lỗi xảy ra"); } finally { setActionLoading(false); }
  };

  const handleMessage = async () => {
    if (!user ||!targetUser) return;
    setActionLoading(true);
    try {
      const chatId = [user.uid, targetUser.uid].sort().join('_');
      await setDoc(doc(db, "chats", chatId), {
        members: [user.uid, targetUser.uid],
        membersInfo: {
          [user.uid]: { name: currentUserData?.name, avatar: currentUserData?.avatar },
          [targetUser.uid]: { name: targetUser.name, avatar: targetUser.avatar }
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      router.push(`/chat/${chatId}`);
    } catch { toast.error("Không thể mở chat"); } finally { setActionLoading(false); }
  };

 const handleShare = async () => {
  try {
    const url = `https://airanh.vercel.app/profile/${targetUser?.uid}`;

    if (navigator.share) {
      await navigator.share({
        title: targetUser?.name,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }

    navigator.vibrate?.(5);
  } catch {}
};

  const formatLastSeen = (timestamp?: Timestamp) => timestamp? formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi }) : "Lâu rồi";

  const levelTiers = [
    { range: "1 - 7", name: "Mới tham gia", icon: <Sparkles className="w-4 h-4" />, gradient: "from-sky-400 to-blue-600", xp: "0 - 2,100", perks: "Bắt đầu hành trình" },
    { range: "8 - 19", name: "Thành viên tích cực", icon: <Flame className="w-4 h-4" />, gradient: "from-emerald-500 to-teal-500", xp: "2,100 - 5,700", perks: "Hoạt động thường xuyên" },
    { range: "20 - 34", name: "Đối tác tin cậy", icon: <Shield className="w-4 h-4" />, gradient: "from-blue-500 to-sky-500", xp: "5,700 - 10,200", perks: "Được tin tưởng cao" },
    { range: "35 - 49", name: "Chuyên gia", icon: <Gem className="w-4 h-4" />, gradient: "from-violet-500 to-fuchsia-500", xp: "10,200 - 14,700", perks: "Kinh nghiệm dày dặn" },
    { range: "50+", name: "Huyền thoại", icon: <Crown className="w-4 h-4" />, gradient: "from-amber-400 to-orange-500", xp: "14,700+", perks: "Biểu tượng uy tín" },
  ];
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20" />
      </div>
    );
  }
  if (!targetUser) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* HEADER */}
        <div className="relative bg-white dark:bg-zinc-950 pt-6 pb-6 border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="px-6 max-w-md mx-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 p-1 shadow-xl">
                  <img src={targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name)}&size=200&background=0042B2&color=fff`} className="w-full h-full rounded-3xl object-cover" alt="" />
                </div>
                {targetUser.online && <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00C853] border-4 border-white dark:border-zinc-950 animate-pulse shadow-lg" />}
                {targetUser.emailVerified && <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0042B2] border-3 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-white stroke-[3]" /></div>}
              </div>

              {/* Name + Rank */}
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">{targetUser.name}</h1>
                </div>
                <p className="text-sm text-zinc-500 font-mono mt-0.5">@{targetUser.userId}</p>
              </motion.div>

              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="mt-3 relative">
                <div className={`px-4 py-2 rounded-2xl bg-gradient-to-r ${rank.gradient} text-white flex items-center gap-2 shadow-lg`}>
                  {rank.icon}
                  <span className="font-bold text-sm">{rank.name}</span>
                  <div className="px-2.5 py-1 rounded-xl bg-white/25 backdrop-blur-sm text-xs font-black">Lv.{level}</div>
                </div>
                <button onClick={() => setShowLevelInfo(true)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 shadow-md flex items-center justify-center border-zinc-200 dark:border-zinc-800">
                  <Info className="w-3 h-3 text-zinc-600" />
                </button>
              </motion.div>

              {/* Status */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900">
                  <div className={`w-2 h-2 rounded-full ${targetUser.online? 'bg-[#00C853] animate-pulse' : 'bg-zinc-400'}`} />
                  <span className="text-xs font-medium">{targetUser.online? "Đang hoạt động" : formatLastSeen(targetUser.lastSeen)}</span>
                </div>
                {targetUser.location && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <MapPin className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs font-medium">{targetUser.location}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isOwnProfile && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-2.5 mt-5">
                  {[
                    { icon: MessageCircle, label: "Nhắn tin", color: "bg-[#0042B2] text-white shadow-lg shadow-[#0042B2]/25", action: handleMessage },
                    { icon: isFriend? UserMinus : hasSentRequest? Clock : UserPlus, label: isFriend? "Hủy kết bạn" : hasSentRequest? "Đã gửi" : "Kết bạn", color: isFriend? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : hasSentRequest? "bg-zinc-200 dark:bg-zinc-800 text-zinc-600" : "bg-pink-500 text-white shadow-lg shadow-pink-500/25", action: isFriend? handleUnfriend : handleConnect },
                    { icon: Share2, label: "Chia sẻ", color: "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300", action: handleShare },
                  ].map((btn, i) => (
                    <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={btn.action} disabled={actionLoading} className={`h-11 px-5 rounded-2xl font-semibold text-sm flex items-center gap-2 ${btn.color} disabled:opacity-50 transition-all`}>
                      <btn.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{btn.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="px-4 pt-5 max-w-md mx-auto space-y-4">
          {/* THÔNG TIN CÁ NHÂN BUTTON */}
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowUserInfo(true)} className="w-full rounded-3xl border-2 border-[#0042B2]/20 bg-[#E8F1FF] dark:bg-[#0042B2]/10 p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0042B2] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-[#0042B2] uppercase tracking-wide">Thông tin cá nhân</p>
                  {isOwnProfile && <p className="text-xs text-[#0042B2]/70 mt-0.5">Hoàn thiện {profileCompletion}%</p>}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#0042B2] group-active:translate-x-0.5 transition-transform" />
            </div>
          </motion.button>

          {/* STATS GRID */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Uy tín", value: `${trustScore}%`, icon: Shield, color: "text-[#0042B2]", action: () => setShowTrustInfo(true) },
              { label: "Bạn bè", value: friendCount, icon: Users, color: "text-pink-500" },
              { label: "Xong", value: completed, icon: Briefcase, color: "text-sky-500" },
              { label: "Sao", value: reviews, icon: Star, color: "text-amber-500" },
            ].map((stat) => (
              <motion.div key={stat.label} whileTap={{ scale: 0.96 }} onClick={stat.action} className="relative rounded-3xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-800 p-3.5 text-center shadow-sm">
                {stat.action && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center"><Info className="w-2.5 h-2.5 text-zinc-500" /></div>}
                <div className={`flex items-center justify-center gap-1 ${stat.color} mb-1`}><stat.icon className="w-4 h-4" /><span className="text-lg font-black">{stat.value}</span></div>
                <p className="text-xs text-zinc-500 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* THÀNH TỰU */}
          <div className="rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" />Thành tựu</h3>
              <button onClick={() => setShowAchievementInfo(true)} className="text-xs font-semibold text-[#0042B2] hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-3 gap-3.5">
              {allAchievements.slice(0, 6).map((item) => (
  <motion.button
    key={item.id}
    whileTap={{ scale: 0.92 }}
    onClick={() => setSelectedAchievement(item)}
    className="flex flex-col items-center"
  >
                  <div className="relative w-16 h-16 mb-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <polygon
  points="50 1 95 25 95 75 50 99 5 75 5 25"
  fill={
    item.unlocked
      ? `url(#achievement-grad-${item.id})`
      : "none"
  }
  stroke={item.unlocked ? "none" : "#E4E4E7"}
  strokeWidth="2"
  strokeDasharray={item.unlocked ? "none" : "4 4"}
/>
                      <defs>
  {item.unlocked && (
    <linearGradient id={`achievement-grad-${item.id}`}>
      <stop offset="0%" stopColor="#60A5FA" />
      <stop offset="100%" stopColor="#3B82F6" />
    </linearGradient>
  )}
</defs>
                    </svg>
                    <div className={`absolute inset-0 flex items-center justify-center ${item.unlocked? "text-white" : "text-zinc-400"}`}>{item.unlocked? item.icon : <Lock className="w-5 h-5" />}</div>
                  </div>
                  <p className="text-xs font-bold text-center leading-tight">{item.label}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* SKILLS */}
          {targetUser.skills?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">Kỹ năng</h3>
              <div className="flex flex-wrap gap-2">
                {targetUser.skills.map((skill) => (
                  <span key={skill} className="px-4 py-2 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-800 text-sm font-medium shadow-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSuccess && <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"><LottiePlayer animationData={celebrate} autoplay loop={false} className="w-32 h-32" /></motion.div>}
        </AnimatePresence>
        {/* USER INFO DIALOG */}
        <Dialog.Root open={showUserInfo} onOpenChange={setShowUserInfo}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50" />
            <Dialog.Content className="fixed inset-0 z-50 bg-zinc-50 dark:bg-black overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
                  <Dialog.Close className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center active:scale-95">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </Dialog.Close>
                  <h2 className="font-bold">Thông tin cá nhân</h2>
                  <div className="w-9" />
                </div>
              </div>

              <div className="max-w-md mx-auto pb-10">
                {/* Header */}
                <div className="bg-white dark:bg-zinc-950 px-6 pt-8 pb-16 text-center">
                  <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-xl ring-4 ring-white dark:ring-zinc-950">
                   <img
  src={
    targetUser.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      targetUser.name
    )}&size=200&background=0042B2&color=fff`
  } className="w-full h-full object-cover" alt="" />
                  </div>
                  <h3 className="text-2xl font-black mt-4">{targetUser.name}</h3>
                  <p className="text-zinc-500 font-mono">@{targetUser.userId}</p>
                </div>

                {/* Progress */}
                {isOwnProfile && (
                  <div className="px-4 -mt-10 relative z-10">
                    <div className="bg-white dark:bg-zinc-950 rounded-3xl p-5 shadow-xl border border-zinc-200/60">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-bold">Hoàn thiện hồ sơ</span>
                        <span className="text-lg font-black text-[#0042B2]">{profileCompletion}%</span>
                      </div>
                      <div className="h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#0042B2] to-[#1A5FFF] rounded-full" style={{ width: `${profileCompletion}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bio */}
                <div className="px-4 mt-5">
                  <div className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border border-zinc-200/60 shadow-sm">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Giới thiệu</h4>
                    <p className="text-[15px] leading-relaxed">{targetUser.bio || "Chưa có giới thiệu"}</p>
                  </div>
                </div>

                {/* Info list */}
                <div className="px-4 mt-4 space-y-3">
                  {[
                    { label: "Email", value: targetUser.emailVerified? "Đã xác minh" : "Chưa xác minh", icon: Mail, verified: targetUser.emailVerified },
                    { label: "Điện thoại", value: targetUser.phone || "Chưa cập nhật", icon: Phone },
                    { label: "Ngày sinh", value: targetUser.birthday || "Chưa cập nhật", icon: Calendar },
                    { label: "Địa chỉ", value: targetUser.location || "Chưa cập nhật", icon: MapPin },
                    { label: "CCCD", value: targetUser.isVerifiedId? "Đã xác minh" : "Chưa xác minh", icon: ShieldCheck, verified: targetUser.isVerifiedId },
                  ].map((item) => (
                    <div key={item.label} className="bg-white dark:bg-zinc-950 rounded-3xl px-5 py-4 border border-zinc-200/60 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                          <item.icon className="w-4.5 h-4.5 text-zinc-600" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">{item.label}</p>
                          <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                        </div>
                      </div>
                      {item.verified && <div className="w-5 h-5 rounded-full bg-[#0042B2] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    </div>
                  ))}
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* LEVEL INFO */}
        <Dialog.Root open={showLevelInfo} onOpenChange={setShowLevelInfo}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
            <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-950 pt-3 pb-4 border-b border-zinc-200/50">
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
                <h3 className="text-center text-lg font-black">Hệ thống cấp độ</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-3xl bg-[#E8F1FF] dark:bg-[#0042B2]/10 p-4 border border-[#0042B2]/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-[#0042B2]/70">Level hiện tại</p>
                      <p className="text-2xl font-black text-[#0042B2]">Lv.{level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#0042B2]/70">XP</p>
                      <p className="text-xl font-bold text-[#0042B2]">{xp}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 bg-[#0042B2]/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0042B2] rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {levelTiers.map((tier) => (
                  <div key={tier.name} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${tier.gradient} flex items-center justify-center text-white`}>{tier.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{tier.name}</p>
                      <p className="text-xs text-zinc-500">Lv.{tier.range} • {tier.xp} XP</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 pt-0">
                <Dialog.Close className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold">Đóng</Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* TRUST INFO */}
        <Dialog.Root open={showTrustInfo} onOpenChange={setShowTrustInfo}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
            <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 rounded-t-3xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-950 pt-3 pb-4">
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
                <h3 className="text-center text-lg font-black flex items-center justify-center gap-2"><Shield className="w-5 h-5 text-[#0042B2]" />Độ uy tín</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="text-center py-4">
                  <div className="text-5xl font-black text-[#0042B2]">{trustScore}</div>
                  <div className="text-sm text-zinc-500">/ 100 điểm</div>
                </div>
                {[
                  { label: "Đánh giá", value: Math.min(Math.floor(rating * 15), 40), max: 40 },
                  { label: "Hoàn thành", value: Math.min(Math.floor(completed * 1.2), 30), max: 30 },
                  { label: "Số đánh giá", value: Math.min(reviews, 15), max: 15 },
                  { label: "Xác minh", value: (targetUser.emailVerified?5:0)+(targetUser.isVerifiedId?5:0), max: 10 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0042B2] rounded-full" style={{ width: `${(item.value/item.max)*100}%` }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-5 pt-0">
                <Dialog.Close className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold">Đóng</Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ACHIEVEMENTS */}
        <Dialog.Root open={showAchievementInfo} onOpenChange={setShowAchievementInfo}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
            <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-950 rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-zinc-950 pt-3 pb-4 border-b border-zinc-200/50">
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
                <h3 className="text-center text-lg font-black">Thành tựu</h3>
                <p className="text-center text-xs text-zinc-500 mt-1">{allAchievements.filter(a=>a.unlocked).length}/{allAchievements.length} đã mở</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  {allAchievements.map((item) => (
                    <button key={item.id} onClick={() => setSelectedAchievement(item)} className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${item.unlocked? 'bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-2 border-dashed border-zinc-300'}`}>
                        {item.unlocked? item.icon : <Lock className="w-5 h-5" />}
                      </div>
                      <p className="text-xs font-bold text-center leading-tight">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
{/* ACHIEVEMENT DETAIL */}
<AnimatePresence>
  {selectedAchievement && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center p-5"
      onClick={() => setSelectedAchievement(null)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{
  type: "spring",
  stiffness: 260,
  damping: 20,
}}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[2rem] bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 overflow-hidden shadow-2xl"
      >
        {/* TOP */}
        <div
          className={`relative p-7 bg-gradient-to-br ${selectedAchievement.color}`}
        >
          <button
            onClick={() => setSelectedAchievement(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white text-lg font-bold"
          >
            ×
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xl mb-4">
              <div className="scale-150">
                {selectedAchievement.unlocked ? (
                  selectedAchievement.icon
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </div>
            </div>

            <h3 className="text-2xl font-black text-white">
              {selectedAchievement.label}
            </h3>

            <p className="text-white/80 text-sm mt-2">
              {selectedAchievement.desc}
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">
              Điều kiện mở khóa
            </p>

            <p className="font-semibold">
              {selectedAchievement.condition}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-4 text-center">
              <p className="text-xs text-zinc-500 font-medium mb-1">
                Loại
              </p>

              <p className="font-bold capitalize">
                {selectedAchievement.category}
              </p>
            </div>

            <div className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-4 text-center">
              <p className="text-xs text-zinc-500 font-medium mb-1">
                Trạng thái
              </p>

              <p
                className={`font-bold ${
                  selectedAchievement.unlocked
                    ? "text-[#00C853]"
                    : "text-zinc-500"
                }`}
              >
                {selectedAchievement.unlocked
                  ? "Đã mở"
                  : "Chưa mở"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedAchievement(null)}
            className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-bold active:scale-[0.98] transition-all"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
      </div>
    </>
  );
}
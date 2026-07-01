"use client";


import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import {
  MessageCircle,
  UserPlus,
  Check,
  UserMinus,
  User,
  Star,
  Clock,
  Briefcase,
  Info,
  MapPin,
  ExternalLink,
  Share2,
  Crown,
  Sparkles,
  Flame,
  Shield,
  Gem,
  ChevronRight,
  ChevronLeft,
  Users,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Calendar,
  Globe,
  Ban,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { buildGamificationUser } from "@/lib/gamification";
import { evaluateAchievements, getAchievementColor } from "@/lib/achievements";
import { AchievementIcon } from "@/components/achievements/AchievementIcon";
import TrustScoreModal from "@/components/profile/TrustScoreModal";
import AchievementsModal from "@/components/profile/AchievementsModal";
import HuhaLevelModal from "@/components/profile/HuhaLevelModal";
import CompletedWorksModal from "@/components/profile/CompletedWorksModal";
import ReviewsModal from "@/components/profile/ReviewsModal";
import { getTierForLevel } from "@/lib/huhaLevel";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toTimestampDate } from "@/lib/notifications";
import VipDisplayName from "@/components/vip/VipDisplayName";
import type { VipInfo } from "@/lib/vip";


type PublicUser = {
  uid: string;
  name: string;
  userId: string;
  username?: string;
  avatar: string;
  bio?: string;
  birthday?: string;  
  phone?: string;
  title?: string;
  location?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  skills?: string[];
  portfolio?: {
    title: string;
    url: string;
  }[];
  stats?: {
    completed: number;
    rating: number;
    totalReviews: number;
    streakDays?: number;
    tasksCreated?: number;
    plansCreated?: number;
    taskCategories?: Record<string, number>;
  };
  huhaScore?: number;
  createdAt?: Timestamp;
  vip?: VipInfo | null;
};

type RankData = {
  name: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
};

export default function PublicProfile() {
  const { uid } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [profileReviews, setProfileReviews] = useState<
    { id: string; fromUserName: string; rating: number; feedback: string; taskTitle?: string; createdAt?: string | null }[]
  >([]);
  const [showTrustInfo, setShowTrustInfo] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const touchStartX = useRef(0);
const touchEndX = useRef(0);
  const [showAchievementInfo, setShowAchievementInfo] = useState(false);
  const [showCompletedInfo, setShowCompletedInfo] = useState(false);
// Component hàng thông tin
const InfoRow = ({
  icon,
  label,
  value,
  verified,
  empty
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verified?: boolean; // giữ nguyên
  empty?: boolean; // giữ nguyên
}) => (
  <div className="flex items-center justify-between px-4 py-4 active:bg-zinc-50 transition-colors">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`${empty? 'text-zinc-300' : 'text-zinc-400'}`}>
        {icon}
      </div>
      <span className="text- text-zinc-700">{label}</span>
    </div>
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className={`text- ${empty? 'text-zinc-400' : 'text-zinc-900 font-medium'}`}>
        {value}
      </span>
      {verified && (
        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
        </div>
      )}
    </div>
  </div>
);


const Divider = () => <div className="h-px bg-zinc-100 ml-[52px]" />;

  const gamUser = useMemo(
    () => buildGamificationUser((targetUser || {}) as Record<string, unknown>, targetUser?.uid, friendCount),
    [targetUser, friendCount]
  );

  const completed = gamUser.stats.completed || 0;
  const reviews = gamUser.stats.totalReviews || 0;
  const rating = gamUser.stats.rating || 0;
  const huhaScore = gamUser.huhaScore;
  const level = gamUser.level;
  const trustScore = gamUser.trustScore;
  const joinedDays = gamUser.joinedDays;
  const profileCompletion = gamUser.profileCompletion;

  const allAchievements = useMemo(() => evaluateAchievements(gamUser), [gamUser]);


  
  const isOwnProfile = user?.uid === uid;

const fetchUser = useCallback(async () => {
  if (!uid || typeof uid !== "string" || uid === "undefined") {
    setLoading(false);
    return;
  }

  if (!user) {
    setLoading(false);
    return;
  }

  setLoading(true);
  setNotFound(false);
  setTargetUser(null);

  try {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    const res = await fetch(`/api/users/${encodeURIComponent(uid)}/profile`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.status === 404) {
      toast.error("Không tìm thấy người dùng");
      setNotFound(true);
      return;
    }

    if (!res.ok) {
      throw new Error("Failed to load profile");
    }

    const body = await res.json();
    const u = body.user;
    const data = {
      uid: u.uid,
      ...u,
      name: u.name || "Unknown User",
      avatar: u.avatar || "",
    } as PublicUser;

    setTargetUser(data);
    setFriendCount(body.friendCount ?? 0);
    setIsFriend(!!body.isFriend);
    setHasSentRequest(!!body.hasSentRequest);
    setRequestId(body.requestId ?? null);

    try {
      const reviewsRes = await fetch(`/api/users/${u.uid}/reviews?limit=8`);
      if (reviewsRes.ok) {
        const reviewsBody = await reviewsRes.json();
        setProfileReviews(reviewsBody.reviews || []);
      }
    } catch {
      setProfileReviews([]);
    }

    const currentUserSnap = await getDoc(doc(db, "users", user.uid));
    if (currentUserSnap.exists()) {
      setCurrentUserData(currentUserSnap.data());
    }
  } catch (err) {
    console.error(err);
    toast.error("Không tải được hồ sơ");
    setNotFound(true);
  } finally {
    setLoading(false);
  }
}, [uid, user, db]);

  

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    fetchUser();
  }, [fetchUser, authLoading, user, router]);

  const handleConnect = async () => {
    if (!user || !targetUser || actionLoading) return;
    if (user.uid === targetUser.uid) return toast.error("Đây là bạn");
    if (isFriend) return toast.info("Các bạn đã là bạn bè");

    setActionLoading(true);
    try {
      if (hasSentRequest) {
        if (requestId) {
          await deleteDoc(doc(db, "friendRequests", requestId));
        } else {
          const pending = await getDocs(
            query(
              collection(db, "friendRequests"),
              where("fromUserId", "==", user.uid),
              where("toUserId", "==", targetUser.uid),
              where("status", "==", "pending"),
              limit(1)
            )
          );
          if (!pending.empty) await deleteDoc(pending.docs[0]!.ref);
        }
        setHasSentRequest(false);
        setRequestId(null);
        toast.success("Đã hủy lời mời kết bạn");
        if ("vibrate" in navigator) navigator.vibrate(8);
        return;
      }

      const functions = getFunctions(getApp(), "asia-southeast1");
      const sendRequest = httpsCallable(functions, "sendFriendRequest");
      await sendRequest({ toUid: targetUser.uid });

      const pending = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("fromUserId", "==", user.uid),
          where("toUserId", "==", targetUser.uid),
          where("status", "==", "pending"),
          limit(1)
        )
      );
      setHasSentRequest(true);
      setRequestId(pending.docs[0]?.id ?? null);
      toast.success(`Đã gửi lời mời tới ${targetUser.name}`);
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Thao tác thất bại";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user || !targetUser || actionLoading) return;
    if (!confirm(`Hủy kết bạn với ${targetUser.name}?`)) return;

    setActionLoading(true);
    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const unfriendFn = httpsCallable(functions, "unfriend");
      await unfriendFn({ friendUid: targetUser.uid });
      setIsFriend(false);
      toast.success("Đã hủy kết nối");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };
const handleBlock = async () => {
  if (!user?.uid) return toast.error("Bạn chưa đăng nhập");
  if (!targetUser?.uid) return toast.error("Đang tải dữ liệu...");
  if (user.uid === targetUser.uid) return toast.error("Không thể tự chặn mình");

  if (!confirm(`Chặn ${targetUser.name}?`)) return;

  setActionLoading(true);
  try {
    await setDoc(doc(db, "users", user.uid), {
      settings: {
        blockedUsers: arrayUnion({
          uid: targetUser.uid,
          blockedAt: Timestamp.now() // ĐỔI DÒNG NÀY
        })
      }
    }, { merge: true });
    
    toast.success(`Đã chặn ${targetUser.name}`);
    if ("vibrate" in navigator) navigator.vibrate(8);
    router.push("/settings/blocked");
  } catch (err: any) {
    console.error("Block error:", err);
    toast.error("Chặn thất bại");
  } finally {
    setActionLoading(false);
  }
};
const handleMessage = async () => {
  if (!user || !targetUser || actionLoading) return;
  if (user.uid === targetUser.uid) return toast.error("Không thể tự nhắn cho mình");
  
  setActionLoading(true);
  try {
    let currentUser = currentUserData;
    if (!currentUser) {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) {
        toast.error("Không tìm thấy thông tin của bạn");
        return;
      }
      currentUser = userSnap.data();
      setCurrentUserData(currentUser);
    }

    const chatId = [user.uid, targetUser.uid].sort().join('_');
    const chatRef = doc(db, "chats", chatId);
    
    await setDoc(chatRef, {
      members: [user.uid, targetUser.uid],
      membersInfo: {
        [user.uid]: {
          name: currentUser?.name || user.displayName || "User",
          avatar: currentUser?.avatar || user.photoURL || "",
          userId: currentUser?.userId || ""
        },
        [targetUser.uid]: {
          name: targetUser.name || "Unknown",
          avatar: targetUser.avatar || "",
          userId: targetUser.userId || ""
        }
      },
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedFor: [],
      status: 'active',
      blockedUsers: [] // ← THÊM DÒNG NÀY
    }, { merge: true });
    
    router.push(`/chat/${chatId}`);
  } catch (err: any) {
    console.error("Lỗi tạo chat:", err);
    toast.error(`Không thể mở cuộc trò chuyện: ${err.message}`);
  } finally {
    setActionLoading(false);
  }
};
  const handleShare = async () => {
    if (!targetUser) return;

    const url = `https://airanh.vercel.app/profile/${targetUser?.uid}`;

    if (navigator.share) {
      await navigator.share({
        title: targetUser?.name,
        text: `Xem hồ sơ ${targetUser?.name}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }
  };

  const formatLastSeen = (timestamp?: Timestamp | { seconds?: number }) => {
    const date = toTimestampDate(timestamp);
    if (!date) return "Lâu rồi";

    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: vi,
    });
  };

  const rank: RankData = useMemo(() => {
    const tier = getTierForLevel(level);
    const iconMap: Record<string, React.ReactNode> = {
      "Mới tham gia": <Sparkles className="w-3.5 h-3.5" />,
      "Thành viên tích cực": <Flame className="w-3.5 h-3.5" />,
      "Đối tác tin cậy": <Shield className="w-3.5 h-3.5" />,
      "Chuyên gia": <Gem className="w-3.5 h-3.5" />,
      "Huyền thoại": <Crown className="w-3.5 h-3.5" />,
    };
    return {
      name: tier.name,
      icon: iconMap[tier.name] ?? <Sparkles className="w-3.5 h-3.5" />,
      gradient: tier.gradient,
      glow: "shadow-blue-500/20",
    };
  }, [level]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const displayHandle = targetUser?.username || targetUser?.userId || targetUser?.uid?.slice(0, 8);





if (notFound) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
      <p className="text-lg font-bold text-zinc-900">Không tìm thấy người dùng</p>
      <button
        onClick={() => router.back()}
        className="mt-4 px-6 py-3 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-95"
      >
        Quay lại
      </button>
    </div>
  );
}

if (loading) {
  return (
    <div className="
      min-h-screen
      bg-[#020617]
      overflow-hidden
      relative
    ">
      <div className="
        absolute inset-0
        bg-[radial-gradient(circle_at_top,#2563EB,transparent_40%)]
        opacity-30
      " />
      <div className="
        relative z-10
        px-6 py-10
        max-w-md mx-auto
        animate-pulse
      ">
        <div className="
          w-32 h-32
          rounded-full
          bg-white/10
          mx-auto
        " />
        <div className="
          h-8
          rounded-2xl
          bg-white/10
          mt-6
          w-56
          mx-auto
        " />
        <div className="
          h-4
          rounded-xl
          bg-white/10
          mt-3
          w-40
          mx-auto
        " />
      </div>
    </div>
  );
}
if (!targetUser) return null;

return (
  <div className="min-h-screen bg-zinc-50 pb-10">
    <Toaster richColors position="top-center" />

    {/* Sticky header */}
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 h-12">
        <button
          type="button"
          onClick={handleBack}
          className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center active:bg-zinc-100 transition-colors"
          aria-label="Quay lại"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-800" />
        </button>
        <p className="text-sm font-bold text-zinc-900 truncate max-w-[50%]">{targetUser?.name}</p>
        <button
          type="button"
          onClick={handleShare}
          className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center active:bg-zinc-100 transition-colors"
          aria-label="Chia sẻ"
        >
          <Share2 className="w-4 h-4 text-zinc-700" />
        </button>
      </div>
    </div>

{/* HEADER - TRẮNG SẠCH */}
<div className="relative bg-white pt-2 pb-2">


  {/* AVATAR + INFO - GIẢM KHOẢNG CÁCH */}
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 p-0.5 shadow-lg">
        <div className="w-full h-full rounded-full bg-white p-0.5">
          <img
            src={
              targetUser?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                targetUser?.name || "User"
              )}&size=200&background=E5E5E5&color=525252`
            }
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      {targetUser?.online && (
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-[2.5px] border-white shadow-md animate-pulse" />
      )}
      {isOwnProfile && (
        <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-all border border-zinc-200">
          <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>

  <div className="flex items-center justify-center gap-1.5 mt-1.5">
  <VipDisplayName
    name={targetUser?.name || "Unknown User"}
    vip={targetUser?.vip ?? null}
    className="text-xl justify-center"
  />
  {targetUser?.emailVerified && (
    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
      <Check className="w-3 h-3 text-white stroke-[3]" />
    </div>
  )}
</div>

<p className="text-sm text-zinc-500 mt-0.5">@{displayHandle}</p>

{targetUser?.bio && (
  <p className="text-sm text-zinc-600 text-center mt-2 px-6 line-clamp-2 leading-relaxed">
    {targetUser.bio}
  </p>
)}

    {/* RANK BADGE - INFO NÚT NHỎ GÓC PHẢI */}
  <div className="mt-2.5 relative inline-block">
  <button
    type="button"
    onClick={() => setShowLevelInfo(true)}
    className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${rank.gradient} text-white flex items-center gap-1.5 shadow-lg active:scale-95`}
  >
    {rank.icon}
    <span className="font-bold text-xs">{rank.name}</span>
    <div className="px-2 py-0.5 rounded-full bg-white/30 text- font-black backdrop-blur-sm">
      Lv.{level}
    </div>
  </button>
  
  <button
    onClick={() => setShowLevelInfo(true)}
    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95 shadow-sm"
  >
    <Info className="w-2.5 h-2.5 text-zinc-500" />
  </button>
</div>

{/* HOẠT ĐỘNG + VỊ TRÍ */}
<div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100">
    <div className={`w-1.5 h-1.5 rounded-full ${targetUser?.online? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
    <span className="text-xs text-zinc-600 font-medium">
      {targetUser?.online
       ? "Online"
        : formatLastSeen(targetUser?.lastSeen)}
    </span>
  </div>

  {targetUser?.location && (
    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100">
      <MapPin className="w-3 h-3 text-zinc-500" />
      <span className="text-xs text-zinc-600 font-medium">
        {targetUser.location}
      </span>
    </div>
  )}
</div>
{/* 4 NÚT ICON - KHÔNG CHỮ */}
{!isOwnProfile && (
  <div className="flex items-center justify-center gap-3 mt-3">
    <button
      onClick={handleMessage}
      disabled={actionLoading}
      title="Nhắn tin"
      className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
    >
      <MessageCircle className="w-5 h-5 text-blue-600" />
    </button>

    <button
      onClick={isFriend ? handleUnfriend : handleConnect}
      disabled={actionLoading}
      title={isFriend ? "Hủy kết bạn" : hasSentRequest ? "Hủy lời mời" : "Kết bạn"}
      className={`w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 ${
        hasSentRequest ? "bg-zinc-200" : "bg-pink-50"
      }`}
    >
      {isFriend ? (
        <UserMinus className="w-5 h-5 text-pink-600" />
      ) : hasSentRequest ? (
        <Clock className="w-5 h-5 text-zinc-600" />
      ) : (
        <UserPlus className="w-5 h-5 text-pink-600" />
      )}
    </button>

    <button
      onClick={handleBlock}
      disabled={actionLoading}
      title="Chặn người dùng"
      className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
    >
      <Ban className="w-5 h-5 text-orange-600" />
    </button>
  </div>
)}

{isOwnProfile && (
  <button
    type="button"
    onClick={() => router.push("/settings/profile-edit")}
    className="mt-3 px-5 h-10 rounded-full bg-blue-500 text-white text-sm font-semibold active:scale-95 transition-transform"
  >
    Chỉnh sửa hồ sơ
  </button>
)}
  </div>
</div>

<div className="px-4 pt-3">
  <div className="max-w-md mx-auto space-y-3">

{/* THÔNG TIN CÁ NHÂN - CĂN GIỮA + HIỆU ỨNG */}
<div className="mb-3">
  <button
    onClick={() => setShowUserInfo(true)}
    className="w-full rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group"
  >
    {/* Hiệu ứng pulse gợi ý click */}
    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 animate-[shimmer_2s_infinite] -translate-x-full group-hover:animate-none" />
    
    <div className="flex items-center justify-center gap-2 relative">
      <User className="w-4 h-4 text-blue-600 animate-pulse" />
      <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">
        THÔNG TIN CÁ NHÂN
      </span>
      <ChevronRight className="w-4 h-4 text-blue-600 animate-pulse" />
    </div>
    
    {/* Chỉ hiện với chủ profile */}
    {isOwnProfile && (
      <div className="mt-1.5 text-xs text-blue-700 font-medium">
        Hoàn thiện {profileCompletion}%
      </div>
    )}
  </button>
</div>


{/* STATS */}
<div className="grid grid-cols-4 gap-2">
  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm relative">
    <button
      onClick={() => setShowTrustInfo(true)}
      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95"
    >
      <Info className="w-2.5 h-2.5 text-zinc-500" />
    </button>
    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
      <Shield className="w-4 h-4" />
      <span className="text-base font-bold">{trustScore}%</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Độ uy tín</p>
  </div>

  {/* THAY TỪ PHẢN HỒI -> BẠN BÈ */}
  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-pink-500 mb-1">
      <Users className="w-4 h-4" />
      <span className="text-base font-bold">{friendCount}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Bạn bè</p>
  </div>

  <button
    type="button"
    onClick={() => setShowCompletedInfo(true)}
    className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm active:scale-95 transition-transform w-full"
  >
    <div className="flex items-center justify-center gap-1 text-sky-500 mb-1">
      <Briefcase className="w-4 h-4" />
      <span className="text-base font-bold">{completed}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Hoàn thành</p>
  </button>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <button
      type="button"
      onClick={() => setShowReviewsModal(true)}
      className="w-full active:scale-95 transition-transform"
    >
      <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
        <Star className="w-4 h-4 fill-current" />
        <span className="text-base font-bold">{rating > 0 ? rating.toFixed(1) : "—"}</span>
      </div>
      <p className="text-xs text-zinc-500 leading-tight">Điểm đánh giá ({reviews})</p>
    </button>
  </div>
</div>

{profileReviews.length > 0 && (
  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-bold text-zinc-900 mb-3">Feedback từ cộng đồng</p>
    <div className="space-y-3">
      {profileReviews.map((rev) => (
        <div key={rev.id} className="rounded-xl bg-zinc-50 p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-zinc-900">{rev.fromUserName}</p>
            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              {rev.rating}
            </div>
          </div>
          {rev.taskTitle && (
            <p className="text-xs text-zinc-500 mb-1">Task: {rev.taskTitle}</p>
          )}
          <p className="text-sm text-zinc-700 leading-relaxed">{rev.feedback}</p>
        </div>
      ))}
    </div>
  </div>
)}
{/* THÀNH TỰU - THIẾT KẾ HEXAGON */}
<div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm font-bold text-zinc-900">Thành tựu</p>
    <button
      onClick={() => setShowAchievementInfo(true)}
      className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95"
    >
      <Info className="w-3 h-3 text-zinc-500" />
    </button>
  </div>
  
  <div className="grid grid-cols-3 gap-3">
    {allAchievements.slice(0, 6).map((item) => {
      const colors = getAchievementColor(item.id);
      return (
      <button
        key={item.id}
        onClick={() => setShowAchievementInfo(true)}
        className="flex flex-col items-center active:scale-95 transition-all"
      >
        <div className="relative w-16 h-16 mb-2">
          <div
            className={`w-full h-full rounded-2xl flex items-center justify-center ${
              item.unlocked ? `bg-gradient-to-br ${colors.gradient}` : "bg-zinc-100 border-2 border-dashed border-zinc-300"
            }`}
          >
            <div className={item.unlocked ? "text-white" : "text-zinc-400"}>
              {item.unlocked ? (
                <AchievementIcon name={item.iconName} className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>
        
        <p className="text-xs font-semibold text-zinc-900 text-center leading-tight">
          {item.label}
        </p>
        <p className="text-[10px] text-zinc-500 text-center leading-tight mt-0.5 line-clamp-2">
          {item.desc}
        </p>
      </button>
    );})}
  </div>

  {allAchievements.length > 6 && (
    <button
      onClick={() => setShowAchievementInfo(true)}
      className="w-full mt-3 py-2 rounded-xl bg-zinc-50 text-xs font-semibold text-zinc-600 active:bg-zinc-100"
    >
      Xem tất cả {allAchievements.length} thành tựu
    </button>
  )}
</div>



{/* SKILLS */}
{targetUser?.skills && targetUser?.skills.length > 0 && (
  <div className="mt-5">
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        Kỹ năng
      </p>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="flex flex-wrap gap-2">
      {targetUser?.skills.map((skill) => (
        <div
          key={skill}
          className="px-3.5 py-2 rounded-2xl border border-zinc-200/80 bg-white text-sm font-medium text-zinc-700 shadow-sm"
        >
          {skill}
        </div>
      ))}
    </div>
  </div>
)}

{/* PORTFOLIO */}
{targetUser?.portfolio && targetUser?.portfolio.length > 0 && (
  <div className="mt-6">
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        Portfolio
      </p>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="space-y-2.5">
      {targetUser?.portfolio.slice(0, 4).map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm active:scale-[0.98] transition-all"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {item.title}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Portfolio project</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-zinc-400" />
          </div>
        </a>
      ))}
    </div>
  </div>
)}




<HuhaLevelModal
  open={showLevelInfo}
  onOpenChange={setShowLevelInfo}
  huhaScore={huhaScore}
  isOwnProfile={isOwnProfile}
  onNavigate={(href) => router.push(href)}
/>
<TrustScoreModal
  open={showTrustInfo}
  onOpenChange={setShowTrustInfo}
  stats={gamUser.stats}
  emailVerified={!!targetUser?.emailVerified}
  isVerifiedId={!!targetUser?.isVerifiedId}
  joinedDays={joinedDays}
  isOwnProfile={isOwnProfile}
  onNavigate={(href) => router.push(href)}
/>
<AchievementsModal open={showAchievementInfo} onOpenChange={setShowAchievementInfo} gamUser={gamUser} />
<CompletedWorksModal
  open={showCompletedInfo}
  onOpenChange={setShowCompletedInfo}
  uid={targetUser?.uid ?? ""}
  count={completed}
/>
<ReviewsModal
  open={showReviewsModal}
  onOpenChange={setShowReviewsModal}
  uid={targetUser?.uid ?? ""}
  {...(user?.uid ? { currentUserId: user.uid } : {})}
/>
{/* MODAL THÔNG TIN CÁ NHÂN - THIẾT KẾ MỚI */}
<Dialog.Root open={showUserInfo} onOpenChange={setShowUserInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
   <Dialog.Content
  className="fixed inset-0 z-50 bg-zinc-50 overflow-y-auto"
  onTouchStart={(e) => {
    touchStartX.current = e.changedTouches[0]?.screenX?? 0;
  }}
  onTouchEnd={(e) => {
    touchEndX.current = e.changedTouches[0]?.screenX?? 0;
    if (touchEndX.current - touchStartX.current > 80) {
      setShowUserInfo(false);
    }
  }}
>
  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-zinc-100 px-4 h-12 flex items-center justify-between">
    <Dialog.Title className="text-sm font-bold text-zinc-900">Thông tin cá nhân</Dialog.Title>
    <Dialog.Close className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
      ✕
    </Dialog.Close>
  </div>

{/* PROFILE HEADER CARD - TRẮNG */}
<div
  className="bg-white px-5 pt-8 pb-20 border-b border-zinc-100"
  onTouchStart={(e) => {
    touchStartX.current = e.changedTouches[0]?.screenX?? 0;
  }}
  onTouchEnd={(e) => {
    touchEndX.current = e.changedTouches[0]?.screenX?? 0;
    if (touchEndX.current - touchStartX.current > 80) setShowUserInfo(false);
  }}
>
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-2xl">
              <img
                src={
                  targetUser?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser?.name || "User")}&size=200&background=3B82F6&color=fff`
                }
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {targetUser?.emailVerified && (
           <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 border-[3px] border-zinc-100 flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-zinc-900 mt-4">
            {targetUser?.name || "Unknown User"}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">@{displayHandle}</p>

          <div className="mt-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">
              {joinedDays >= 999
                ? "Thành viên lâu năm"
                : joinedDays === 0
                  ? "Tham gia hôm nay"
                  : `${joinedDays} ngày trên Airanh`}
            </span>
          </div>
        </div>
</div>

      {/* COMPLETION PROGRESS - CHỈ CHỦ PROFILE */}
      {isOwnProfile && (
        <div className="px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-zinc-900">Hoàn thiện hồ sơ</p>
                <p className="text-xs text-zinc-500 mt-0.5">Cập nhật để tăng độ uy tín</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-500">{profileCompletion}%</p>
              </div>
</div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>
      )}
{/* GIỚI THIỆU - PHẦN 1 */}
<div className="px-4 mt-3">
  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">
    GIỚI THIỆU
  </p>
 <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
  <div className="px-4 py-6 min-h-[120px]">
    <p className={`text-sm leading-relaxed ${targetUser?.bio? 'text-zinc-900' : 'text-zinc-400'}`}>
      {targetUser?.bio || "Chưa có giới thiệu"}
    </p>
  </div>
</div>
</div>
      {/* THÔNG TIN CƠ BẢN */}
      <div className="px-4 mt-2">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">
          Thông tin cơ bản
        </p>
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
   <InfoRow
  icon={<Mail className="w-5 h-5" />}
  label="Email"
  value={targetUser?.emailVerified? "••••••@gmail.com" : "Chưa xác minh"}
  verified={!!targetUser?.emailVerified} // THÊM!!
/>
          <Divider />
          <InfoRow
            icon={<User className="w-5 h-5" />}
            label="Họ và tên"
            value={targetUser?.name || "Chưa cập nhật"}
          />
          <Divider />
          <InfoRow
            icon={<Calendar className="w-5 h-5" />}
            label="Ngày sinh"
            value={targetUser?.birthday || "Chưa cập nhật"}
            empty={!targetUser?.birthday}
          />
          <Divider />
          <InfoRow
            icon={<Phone className="w-5 h-5" />}
            label="Số điện thoại"
            value={targetUser?.phone? "••••••" + targetUser.phone.slice(-3) : "Chưa cập nhật"}
            empty={!targetUser?.phone}
          />
        </div>
      </div>

      {/* THÔNG TIN KHÁC */}
      <div className="px-4 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">
          Thông tin khác
        </p>
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <InfoRow
            icon={<MapPin className="w-5 h-5" />}
            label="Địa chỉ"
            value={targetUser?.location || "Chưa cập nhật"}
            empty={!targetUser?.location}
          />
          <Divider />
          <InfoRow
            icon={<Globe className="w-5 h-5" />}
            label="Ngôn ngữ"
            value="Tiếng Việt"
          />
          <Divider />
  <InfoRow
  icon={<ShieldCheck className="w-5 h-5" />}
  label="Xác minh CCCD"
  value={targetUser?.isVerifiedId? "Đã xác minh" : "Chưa xác minh"}
  verified={!!targetUser?.isVerifiedId} // THÊM!!
  empty={!targetUser?.isVerifiedId}
/>
        </div>
      </div>

      {/* NÚT HÀNH ĐỘNG - CHỈ CHỦ PROFILE */}
      {isOwnProfile && (
        <div className="px-4 mt-4 mb-8">
          <button
            onClick={() => router.push('/settings/profile')}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold text-[15px] shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
          >
            Cập nhật thông tin
          </button>
        </div>
      )}

      {!isOwnProfile && <div className="h-8" />}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
        </div>
      </div>
    </div>
  );
}

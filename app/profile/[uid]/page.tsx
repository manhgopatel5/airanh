"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import {
  MessageCircle,
  UserPlus,
  Check,
  UserMinus,
  MoreVertical,
  Star,
  Briefcase,
  MapPin,
  Clock,
  ExternalLink,
  Zap,
  
  Share2,
  Flag,
  Crown,
  Sparkles,
  Flame,
  Shield,
  Activity,
  Gem,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type PublicUser = {
  uid: string;
  name: string;
  userId: string;
  avatar: string;
  bio?: string;
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
    responseRate?: number;
  };
  createdAt?: Timestamp;
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
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Fix 1: Dùng uid từ params thay vì targetUser?.uid vì lúc đầu targetUser = null
  const isOwnProfile = user?.uid === uid;

  // Fix 2: Mấy const này OK để ở đây vì có?. và default, nhưng đừng dùng để tính toán tiếp
  const completed = targetUser?.stats?.completed || 0;
  const reviews = targetUser?.stats?.totalReviews || 0;
  const rating = targetUser?.stats?.rating || 0;
  const responseRate = targetUser?.stats?.responseRate || 98;

  const fetchUser = useCallback(async () => {
    if (!uid ||!user) return;

    try {
      const [userSnap, currentUserSnap] = await Promise.all([
        getDoc(doc(db, "users", uid as string)),
        getDoc(doc(db, "users", user.uid)),
      ]);

      if (!userSnap.exists()) {
        toast.error("Không tìm thấy người dùng");
        router.replace("/404");
        return;
      }

      const data = {
        uid: userSnap.id,
       ...userSnap.data(),
      } as PublicUser;

      setTargetUser(data);

      if (currentUserSnap.exists()) {
        setCurrentUserData(currentUserSnap.data());
      }

      const friendSnap = await getDoc(
        doc(db, "users", user.uid, "friends", userSnap.id)
      );

      setIsFriend(friendSnap.exists());
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [uid, user, db, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  const handleConnect = async () => {

    if (
      !user ||
      !targetUser ||
      actionLoading
    ) return;

    if (user.uid === targetUser?.uid) {
      return toast.error("Đây là bạn");
    }

    setActionLoading(true);

    try {

      await Promise.all([

        setDoc(
          doc(
            db,
            "users",
            user.uid,
            "friends",
            targetUser?.uid
          ),
          {
            createdAt: serverTimestamp(),
            status: "accepted",

            name:
              targetUser?.name || "Unknown User",

            avatar:
              targetUser?.avatar || "",

            userId:
              targetUser?.userId || "",

            title:
              targetUser?.title || "",
          }
        ),

        setDoc(
          doc(
            db,
            "users",
            targetUser?.uid,
            "friends",
            user.uid
          ),
          {
            createdAt: serverTimestamp(),
            status: "accepted",

            name:
              currentUserData?.name ||
              user.displayName ||
              "User",

            avatar:
              currentUserData?.avatar ||
              user.photoURL ||
              "",

            userId:
              currentUserData?.userId || "",

            title:
              currentUserData?.title || "",
          }
        ),

      ]);

      setIsFriend(true);

      toast.success(
        `Đã kết nối với ${targetUser?.name}`
      );

      if ("vibrate" in navigator) {
        navigator.vibrate(8);
      }

    } catch (err) {

      console.error(err);

      toast.error("Kết nối thất bại");

    } finally {

      setActionLoading(false);

    }
  };

  const handleUnfriend = async () => {

    if (
      !user ||
      !targetUser ||
      actionLoading
    ) return;

    setActionLoading(true);

    try {

      await Promise.all([

        deleteDoc(
          doc(
            db,
            "users",
            user.uid,
            "friends",
           targetUser?.uid
          )
        ),

        deleteDoc(
          doc(
            db,
            "users",
            targetUser?.uid,
            "friends",
            user.uid
          )
        ),

      ]);

      setIsFriend(false);

      toast.success("Đã hủy kết nối");

    } catch {

      toast.error("Có lỗi xảy ra");

    } finally {

      setActionLoading(false);

    }
  };

  const handleShare = async () => {

    if (!targetUser) return;

    const url =
      `https://airanh.vercel.app/profile/${targetUser?.uid}`;

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

  const formatLastSeen = (
    timestamp?: Timestamp
  ) => {

    if (!timestamp) {
      return "Lâu rồi";
    }

    return formatDistanceToNow(
      timestamp.toDate(),
      {
        addSuffix: true,
        locale: vi,
      }
    );
  };

const xp =
    completed * 12 +
    reviews * 8 +
    Math.floor(rating * 20) +
    responseRate;

  const level =
    Math.max(
      1,
      Math.floor(xp / 140) + 1
    );

  const currentLevelXP =
    xp % 140;

  const progress =
    (currentLevelXP / 140) * 100;

  const trustScore = Math.min(
    100,
    Math.floor(
      rating * 15 +
      completed * 1.2 +
      reviews +
      responseRate * 0.35
    )
  );

  const joinedDays =
   targetUser?.createdAt?.seconds
      ? Math.floor(
          (
            Date.now() -
            targetUser?.createdAt.seconds * 1000
          ) / 86400000
        )
      : 999;

  const profileCompletion =
    Math.round(
      (
        [
         targetUser?.avatar,
         targetUser?.bio,
         targetUser?.skills?.length,
          targetUser?.portfolio?.length,
          targetUser?.location,
         targetUser?.title,
          targetUser?.emailVerified,
         targetUser?.isVerifiedId,
        ].filter(Boolean).length / 8
      ) * 100
    );

  
const rank: RankData = useMemo(() => {
  if (level >= 50) {
    return {
      name: "Huyền thoại",
      icon: <Crown className="w-3.5 h-3.5" />,
      gradient: "from-amber-400 to-orange-500",
      glow: "shadow-amber-500/20",
    };
  }
  if (level >= 35) {
    return {
      name: "Chuyên gia",
      icon: <Gem className="w-3.5 h-3.5" />,
      gradient: "from-violet-500 to-fuchsia-500",
      glow: "shadow-violet-500/20",
    };
  }
  if (level >= 20) {
    return {
      name: "Đối tác uy tín",
      icon: <Shield className="w-3.5 h-3.5" />,
      gradient: "from-blue-500 to-sky-500",
      glow: "shadow-blue-500/20",
    };
  }
  if (level >= 8) {
    return {
      name: "Đang phát triển",
      icon: <Flame className="w-3.5 h-3.5" />,
      gradient: "from-emerald-500 to-teal-500",
      glow: "shadow-emerald-500/20",
    };
  }
  return {
    name: "Mới tham gia",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    gradient: "from-zinc-400 to-zinc-500",
    glow: "shadow-zinc-500/10",
  };
}, [level]);

const achievements = useMemo<{ icon: string; label: string }[]>(() => {
  const arr: { icon: string; label: string }[] = [];

  if (rating >= 4.8) {
    arr.push({
      icon: "⭐",
      label: "Đánh giá xuất sắc",
    });
  }

  if (responseRate >= 95) {
    arr.push({
      icon: "⚡",
      label: "Phản hồi siêu nhanh",
    });
  }

  if (completed >= 25) {
    arr.push({
      icon: "🏆",
      label: "Hoàn thành chuyên nghiệp",
    });
  }

  if (trustScore >= 90) {
    arr.push({
      icon: "🛡",
      label: "Độ uy tín cao",
    });
  }

  if (joinedDays <= 7) {
    arr.push({
      icon: "🌱",
      label: "Mới tham gia",
    });
  }

  return arr;
}, [rating, responseRate, completed, trustScore, joinedDays]);

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
  <div className="min-h-screen bg-zinc-50 pb-28">
    <Toaster richColors position="top-center" />

    {/* HEADER */}
  

    <div className="px-4 py-5">
      <div className="max-w-md mx-auto space-y-4">
        {/* HERO CARD */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm"
        >
       {/* THÊM ĐOẠN NÀY */}
  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
  <button
    onClick={handleShare}
    className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center active:scale-95 transition-all shadow-sm"
  >
    <Share2 className="w-5 h-5 text-zinc-700" />
  </button>
  {!isOwnProfile && (
    <button
      onClick={() => setShowMore(!showMore)}
      className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center active:scale-95 transition-all shadow-sm"
    >
      <MoreVertical className="w-5 h-5 text-zinc-700" />
    </button>
  )}
</div>
  </div>

  

          {/* CONTENT */}
         // CŨ - DÒNG ~735
<div className="px-5 pt-14 pb-5">
  <div className="text-center">
    <div className="flex items-center justify-center gap-1.5">
      <h1 className="text-xl font-bold text-zinc-900">

// MỚI
<div className="px-5 pt-16 pb-5">
  <div className="flex flex-col items-center text-center">
    {/* AVATAR CHUYỂN XUỐNG ĐÂY */}
    <div className="relative mb-3">
      <img
        src={
          targetUser?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            targetUser?.name || "User"
          )}&size=200`
        }
        alt=""
        className="w-24 h-24 rounded-full object-cover border-4 border-zinc-100 shadow-sm"
      />
      {targetUser?.online && (
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white" />
      )}
    </div>

    <div className="flex items-center justify-center gap-1.5">
      <h1 className="text-xl font-bold text-zinc-900">
                  {targetUser?.name || "Unknown User"}
                </h1>
                {targetUser?.emailVerified && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
              </div>

              {targetUser?.title && (
                <p className="mt-1 text-sm text-zinc-600">
                  {targetUser?.title}
                </p>
              )}

              {/* LEVEL */}
              <div className="flex justify-center mt-3">
                <div
                  className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${rank.gradient} text-white flex items-center gap-1.5 shadow-sm ${rank.glow}`}
                >
                  {rank.icon}
                  <span className="font-semibold text-xs">{rank.name}</span>
                  <div className="px-1.5 py-0.5 rounded-full bg-white/25 text-xs font-bold">
                    Lv.{level}
                  </div>
                </div>
              </div>

              {/* USERNAME */}
              <div className="flex items-center justify-center gap-2 mt-3 text-sm text-zinc-500">
                <span>@{targetUser?.userId}</span>
                {targetUser?.location && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{targetUser?.location}</span>
                    </div>
                  </>
                )}
              </div>

              {/* STATUS */}
              <div className="mt-3 flex justify-center">
                {targetUser?.online? (
                  <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </div>
                ) : (
                  <div className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-medium flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Hoạt động {formatLastSeen(targetUser?.lastSeen)}
                  </div>
                )}
              </div>

              {/* BIO */}
              {targetUser?.bio && (
                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  {targetUser?.bio}
                </p>
              )}
            </div>

            {/* XP */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-500">
                  Tiến trình level
                </span>
                <span className="text-xs font-semibold text-zinc-700">
                  {currentLevelXP}/140 XP
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full bg-gradient-to-r ${rank.gradient}`}
                />
              </div>
            </div>
    {/* TRUST SCORE */}
<div className="mt-5 rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs text-zinc-500 font-medium">Độ uy tín</p>
      <div className="flex items-center gap-2 mt-1">
        <Shield className="w-5 h-5 text-blue-500" />
        <span className="text-2xl font-bold text-zinc-900">
          {trustScore}%
        </span>
      </div>
    </div>
    <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
      <span className="text-xs font-semibold text-blue-600">
        {trustScore >= 80
          ? "Đáng tin cậy cao"
          : trustScore >= 50
          ? "Khá tin cậy"
          : "Mới"}
      </span>
    </div>
  </div>
</div>

{/* ACHIEVEMENTS */}
{achievements.length > 0 && (
  <div className="mt-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5 px-1">
      Thành tựu
    </p>
    <div className="flex flex-wrap gap-2">
      {achievements.map((item, i) => (
        <div
          key={i}
          className="px-3 py-2 rounded-2xl bg-white border border-zinc-200/80 text-sm font-medium text-zinc-700 flex items-center gap-2 shadow-sm"
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  </div>
)}

</div>
</motion.div>

{/* STATS */}
<div className="grid grid-cols-3 gap-3 mt-5">
  <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
      <Star className="w-4 h-4 fill-current" />
      <span className="text-xl font-bold">{rating || 0}</span>
    </div>
    <p className="text-xs text-zinc-500">{reviews} đánh giá</p>
  </div>

  <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
      <Briefcase className="w-4 h-4" />
      <span className="text-xl font-bold">{completed}</span>
    </div>
    <p className="text-xs text-zinc-500">Hoàn thành</p>
  </div>

  <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
      <Zap className="w-4 h-4" />
      <span className="text-xl font-bold">{responseRate}%</span>
    </div>
    <p className="text-xs text-zinc-500">Phản hồi</p>
  </div>
</div>

{/* PROFILE COMPLETION */}
<div className="mt-5 rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Hồ sơ
      </p>
      <h3 className="mt-0.5 text-lg font-bold text-zinc-900">
        Hoàn thiện {profileCompletion}%
      </h3>
    </div>
    <Activity className="w-7 h-7 text-blue-500" />
  </div>
  <div className="mt-3 h-2 rounded-full overflow-hidden bg-zinc-100">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${profileCompletion}%` }}
      transition={{ duration: 0.8 }}
      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
    />
  </div>
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

{/* ACTIONS */}
{!isOwnProfile && (
  <div className="mt-6 space-y-2.5">
    {isFriend ? (
      <>
        <button
          onClick={() => router.push(`/chat/${targetUser?.uid}`)}
          className={`w-full h-12 rounded-2xl bg-gradient-to-r ${rank.gradient} text-white font-semibold shadow-sm ${rank.glow} flex items-center justify-center gap-2 active:scale-[0.98] transition-all`}
        >
          <MessageCircle size={18} />
          Nhắn tin
        </button>
        <button
          onClick={handleUnfriend}
          disabled={actionLoading}
          className="w-full h-12 rounded-2xl border border-zinc-200 bg-white text-zinc-700 font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <UserMinus size={18} />
          Hủy kết nối
        </button>
      </>
    ) : (
      <button
        onClick={handleConnect}
        disabled={actionLoading}
        className={`w-full h-12 rounded-2xl bg-gradient-to-r ${rank.gradient} text-white font-semibold shadow-sm ${rank.glow} flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50`}
      >
        <UserPlus size={18} />
        {actionLoading ? "Đang kết nối..." : "Mời nhận việc"}
      </button>
    )}
  </div>
)}

{/* REPORT */}
<AnimatePresence>
  {showMore && !isOwnProfile && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 rounded-3xl border border-red-200 bg-red-50 p-1.5"
    >
      <button className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-red-600 font-semibold text-sm">
        <Flag className="w-5 h-5" />
        Báo cáo người dùng
      </button>
    </motion.div>
  )}
</AnimatePresence>

        </div>
      </div>
    </div>
  );
}

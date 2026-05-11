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
  Info,
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
import * as Dialog from "@radix-ui/react-dialog";
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
  const [showTrustInfo, setShowTrustInfo] = useState(false);
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

  const [showLevelInfo, setShowLevelInfo] = useState(false);

const levelTiers = [
  {
    range: "1 - 7",
    name: "Mới tham gia",
    icon: <Sparkles className="w-4 h-4" />,
    gradient: "from-sky-400 to-blue-600",
    xp: "0 - 2,100",
    perks: "Bắt đầu hành trình trên Airanh",
  },
  {
    range: "8 - 19",
    name: "Thành viên tích cực",
    icon: <Flame className="w-4 h-4" />,
    gradient: "from-emerald-500 to-teal-500",
    xp: "2,100 - 5,700",
    perks: "Hoạt động thường xuyên, được đánh giá tốt",
  },
  {
    range: "20 - 34",
    name: "Đối tác tin cậy",
    icon: <Shield className="w-4 h-4" />,
    gradient: "from-blue-500 to-sky-500",
    xp: "5,700 - 10,200",
    perks: "Được cộng đồng tin tưởng cao",
  },
  {
    range: "35 - 49",
    name: "Chuyên gia",
    icon: <Gem className="w-4 h-4" />,
    gradient: "from-violet-500 to-fuchsia-500",
    xp: "10,200 - 14,700",
    perks: "Kinh nghiệm dày dặn, uy tín hàng đầu",
  },
  {
    range: "50+",
    name: "Huyền thoại",
    icon: <Crown className="w-4 h-4" />,
    gradient: "from-amber-400 to-orange-500",
    xp: "14,700+",
    perks: "Biểu tượng uy tín của cộng đồng",
  },
];
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
    Math.floor(xp / 300) + 1 
  );

const currentLevelXP =
  xp % 300; // ĐỔI

const progress =
  (currentLevelXP / 300) * 100; 

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
        (Date.now() - targetUser.createdAt.seconds * 1000) / 86400000
      )
    : 0; // ĐỔI 999 -> 0

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
      name: "Đối tác tin cậy",
      icon: <Shield className="w-3.5 h-3.5" />,
      gradient: "from-blue-500 to-sky-500",
      glow: "shadow-blue-500/20",
    };
  }
  if (level >= 8) {
    return {
      name: "Thành viên tích cực",
      icon: <Flame className="w-3.5 h-3.5" />,
      gradient: "from-emerald-500 to-teal-500",
      glow: "shadow-emerald-500/20",
    };
  }
  return {
    name: "Mới tham gia",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    gradient: "from-sky-400 to-blue-600",
    glow: "shadow-blue-500/20",
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

    {/* HEADER WAVE */}
<div className="relative bg-gradient-to-b from-sky-400 to-blue-500 pt-6 pb-20">
  <div className="absolute inset-x-0 bottom-0 h-16 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDE0NDAgNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0wIDMwQzI0MCAxMCA0ODAgNTAgNzIwIDMwQzk2MCAxMCAxMjAwIDUwIDE0NDAgMzBWNTBIMFYzMFoiIGZpbGw9IiNGOEZBRkMiLz4KPC9zdmc+')] bg-bottom bg-no-repeat bg-cover" />
  
  {/* TOP ACTIONS - BỎ NÚT BACK */}
  <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
    <button
      onClick={handleShare}
      className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all"
    >
      <Share2 className="w-5 h-5 text-white" />
    </button>
    {!isOwnProfile && (
      <button
        onClick={() => setShowMore(!showMore)}
        className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all"
      >
        <MoreVertical className="w-5 h-5 text-white" />
      </button>
    )}
  </div>

  {/* AVATAR + INFO CENTER */}
  <div className="relative z-10 flex flex-col items-center pt-8">
    <div className="relative">
      <img
        src={
          targetUser?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            targetUser?.name || "User"
          )}&size=200`
        }
        alt=""
        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
      />
      {targetUser?.online && (
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-[3px] border-white" />
      )}
    </div>

    <div className="flex items-center justify-center gap-1.5 mt-3">
      <h1 className="text-xl font-bold text-white">
        {targetUser?.name || "Unknown User"}
      </h1>
      {targetUser?.emailVerified && (
        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
          <Check className="w-3 h-3 text-blue-500 stroke-[3]" />
        </div>
      )}
    </div>

{/* RANK BADGE */}
<div className="flex justify-center mt-3 items-center gap-1.5">
  <div
    className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${rank.gradient} text-white flex items-center gap-1.5 shadow-md`}
  >
    {rank.icon}
    <span className="font-semibold text-xs">{rank.name}</span>
    <div className="px-1.5 py-0.5 rounded-full bg-white/25 text-xs font-bold">
      Lv.{level}
    </div>
  </div>

  <button
    onClick={() => setShowLevelInfo(true)}
    className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all"
  >
    <Info className="w-3.5 h-3.5 text-white" />
  </button>
</div>

    {/* HOẠT ĐỘNG */}
    <div className="mt-2.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-white" />
      <span className="text-xs text-white font-medium">
        {targetUser?.online
          ? "Đang hoạt động"
          : `Hoạt động ${formatLastSeen(targetUser?.lastSeen)}`}
      </span>
    </div>
  </div>
</div>

<div className="px-4 -mt-10 relative z-10">
  <div className="max-w-md mx-auto space-y-3">

    {/* STATS */}
<div className="grid grid-cols-4 gap-2">
  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
      <Shield className="w-4 h-4" />
      <span className="text-base font-bold">{trustScore}%</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Độ uy tín</p>
  </div>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
      <Zap className="w-4 h-4" />
      <span className="text-base font-bold">{responseRate}%</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Phản hồi</p>
  </div>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-sky-500 mb-1">
      <Briefcase className="w-4 h-4" />
      <span className="text-base font-bold">{completed}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Hoàn thành</p>
  </div>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
      <Star className="w-4 h-4 fill-current" />
      <span className="text-base font-bold">{reviews}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Đánh giá</p>
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
<Dialog.Root open={showLevelInfo} onOpenChange={setShowLevelInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-50 shadow-2xl">
      <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4">
        Hệ thống cấp độ Airanh
      </Dialog.Title>

      {/* CÔNG THỨC TÍNH XP */}
      <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
          <Zap className="w-4 h-4" />
          Công thức tính XP
        </p>
        <div className="space-y-1.5 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>Hoàn thành 1 job</span>
            <span className="font-semibold">+12 XP</span>
          </div>
          <div className="flex justify-between">
            <span>Nhận 1 đánh giá</span>
            <span className="font-semibold">+8 XP</span>
          </div>
          <div className="flex justify-between">
            <span>Rating trung bình</span>
            <span className="font-semibold">+Rating × 20 XP</span>
          </div>
          <div className="flex justify-between">
            <span>Tỷ lệ phản hồi</span>
            <span className="font-semibold">+{responseRate} XP</span>
          </div>
          <div className="pt-2 mt-2 border-t border-blue-300 flex justify-between font-bold">
            <span>Tổng XP hiện tại</span>
            <span>{xp} XP</span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Mỗi level cần 300 XP
          </div>
        </div>
      </div>

      {/* BẢNG RANK */}
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
        Các cấp độ
      </p>
      <div className="space-y-2.5">
        {levelTiers.map((tier, i) => (
 <div
  key={i}
  className={`p-3.5 rounded-2xl border ${
  level >= parseInt(tier.range.split(" - ")[0] || "0")
     ? "border-zinc-300 bg-zinc-50"
      : "border-zinc-200 bg-white opacity-60"
  }`}
>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-r ${tier.gradient} text-white flex items-center justify-center shadow-sm`}
                >
                  {tier.icon}
                </div>
                <div>
                  <p className="font-bold text-zinc-900 text-sm">{tier.name}</p>
                  <p className="text-xs text-zinc-500">Level {tier.range}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-zinc-700">{tier.xp}</p>
                <p className="text-xs text-zinc-500">XP</p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 leading-5">{tier.perks}</p>
          </div>
        ))}
      </div>

      {/* LEVEL HIỆN TẠI */}
      <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white">
        <p className="text-xs text-zinc-400 mb-1">Level hiện tại của bạn</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-r ${rank.gradient} flex items-center justify-center`}
            >
              {rank.icon}
            </div>
            <div>
              <p className="font-bold">{rank.name}</p>
              <p className="text-xs text-zinc-300">Lv.{level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{xp}</p>
            <p className="text-xs text-zinc-400">XP</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Tiến trình</span>
            <span className="text-zinc-300">{currentLevelXP}/300 XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${rank.gradient}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
        Đã hiểu
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
<Dialog.Root open={showTrustInfo} onOpenChange={setShowTrustInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-50 shadow-2xl">
      <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-500" />
        Độ uy tín được tính thế nào?
      </Dialog.Title>

      <p className="text-sm text-zinc-600 mb-4">
        Độ uy tín phản ánh mức độ tin cậy của bạn dựa trên hoạt động thực tế. Điểm càng cao càng được ưu tiên.
      </p>

      {/* BREAKDOWN CHI TIẾT */}
      <div className="space-y-3 mb-5">
        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-zinc-700">Đánh giá trung bình</span>
            <span className="text-sm font-bold text-blue-600">
              +{Math.min(Math.floor(rating * 8), 40)}/40
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {rating} sao × 8 điểm. Tối đa 40 điểm
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-zinc-700">Công việc hoàn thành</span>
            <span className="text-sm font-bold text-blue-600">
              +{Math.min(Math.floor(completed * 1.5), 30)}/30
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {completed} job × 1.5 điểm. Tối đa 30 điểm
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-zinc-700">Số lượng đánh giá</span>
            <span className="text-sm font-bold text-blue-600">
              +{Math.min(reviews, 15)}/15
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {reviews} đánh giá × 1 điểm. Tối đa 15 điểm
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-zinc-700">Xác minh tài khoản</span>
            <span className="text-sm font-bold text-blue-600">
              +{(targetUser?.emailVerified? 5 : 0) + (targetUser?.isVerifiedId? 5 : 0)}/10
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Email {targetUser?.emailVerified? '✓ +5' : '✗ 0'}, CCCD {targetUser?.isVerifiedId? '✓ +5' : '✗ 0'}
          </p>
        </div>

   <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
  <div className="flex justify-between items-center mb-1">
    <span className="text-sm font-semibold text-zinc-700">Thời gian tham gia</span>
    <span className="text-sm font-bold text-blue-600">
      +{Math.min(Math.floor(joinedDays / 30), 5)}/5
    </span>
  </div>
  <p className="text-xs text-zinc-500">
    {joinedDays > 0
      ? `${joinedDays} ngày = ${Math.floor(joinedDays / 30)} tháng. Tối đa 5 điểm`
      : "Chưa có dữ liệu. Tối đa 5 điểm"}
  </p>
</div>
      </div>

      {/* TỔNG ĐIỂM */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Tổng điểm uy tín</span>
          <span className="text-2xl font-bold">{trustScore}/100</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${trustScore}%` }}
          />
        </div>
      </div>

      <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
        Đã hiểu
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
        </div>
      </div>
    </div>
  );
}

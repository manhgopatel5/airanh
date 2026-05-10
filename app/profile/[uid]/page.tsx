"use client";

import { useParams, useRouter } from "next/navigation";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

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
  ArrowLeft,
  Star,
  Briefcase,
  MapPin,
  Clock,
  ExternalLink,
  Zap,
  Share2,
  MoreVertical,
  Flag,
  Crown,
  Sparkles,
  Flame,
  Shield,
  Activity,
  Gem,
  ChevronRight,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

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

  const [targetUser, setTargetUser] =
    useState<PublicUser | null>(null);

  const [currentUserData, setCurrentUserData] =
    useState<any>(null);

  const [isFriend, setIsFriend] =
    useState(false);

  const [loading, setLoading] =
    useState(true);
const isOwnProfile =
  user?.uid === targetUser?.uid;

const completed =
  targetUser?.stats?.completed || 0;

const reviews =
  targetUser?.stats?.totalReviews || 0;

const rating =
  targetUser?.stats?.rating || 0;

const responseRate =
  targetUser?.stats?.responseRate || 98;

  const [actionLoading, setActionLoading] =
    useState(false);

  const [showMore, setShowMore] =
    useState(false);

  const fetchUser = useCallback(async () => {

    if (!uid || !user) return;

    try {

      const [
        userSnap,
        currentUserSnap,
      ] = await Promise.all([
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
        doc(
          db,
          "users",
          user.uid,
          "friends",
          userSnap.id
        )
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

  const rank: RankData = (() => {

    if (level >= 50) {
      return {
        name: "Huyền thoại",
        icon: (
          <Crown className="w-4 h-4" />
        ),
        gradient:
          "from-yellow-400 via-orange-400 to-amber-500",
        glow:
          "shadow-yellow-500/40",
      };
    }

    if (level >= 35) {
      return {
        name: "Chuyên gia",
        icon: (
          <Gem className="w-4 h-4" />
        ),
        gradient:
          "from-violet-500 via-fuchsia-500 to-pink-500",
        glow:
          "shadow-fuchsia-500/30",
      };
    }

    if (level >= 20) {
      return {
        name: "Đối tác uy tín",
        icon: (
          <Shield className="w-4 h-4" />
        ),
        gradient:
          "from-sky-500 via-blue-500 to-indigo-600",
        glow:
          "shadow-blue-500/30",
      };
    }

    if (level >= 8) {
      return {
        name: "Đang phát triển",
        icon: (
          <Flame className="w-4 h-4" />
        ),
        gradient:
          "from-green-500 via-emerald-500 to-teal-500",
        glow:
          "shadow-green-500/30",
      };
    }

    return {
      name: "Mới tham gia",
      icon: (
        <Sparkles className="w-4 h-4" />
      ),
      gradient:
        "from-zinc-500 via-zinc-600 to-zinc-700",
      glow:
        "shadow-zinc-500/20",
    };

  })();

  const achievements = useMemo(() => {

    const arr = [];

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

 

 

    return arr;

  }, [
    rating,
    responseRate,
    completed,
    trustScore,
    joinedDays,
  ]);

  return (

    <div className="
      min-h-screen
      isolate
      bg-[#020617]
      text-white
      overflow-hidden
      pb-32
      relative
    ">

      <Toaster
        richColors
        position="top-center"
      />

      <div className="
        absolute inset-0
        overflow-hidden
        pointer-events-none
      ">

        <div className="
          absolute top-[-120px] left-[-80px]
          w-[320px] h-[320px]
          rounded-full
          bg-blue-500/20
          blur-3xl
        " />

        <div className="
          absolute top-[220px] right-[-120px]
          w-[320px] h-[320px]
          rounded-full
          bg-fuchsia-500/20
          blur-3xl
        " />

      </div>

      <div className="
        sticky top-0 z-40
        backdrop-blur-2xl
        bg-black/20
        border-b border-white/5
      ">

        <div className="
          px-4 py-3
          flex items-center justify-between
          max-w-md mx-auto
        ">
          <div className="flex items-center gap-3">

  <button
    onClick={() => router.back()}
    className="
      w-10 h-10
      rounded-2xl
      bg-white/[0.06]
      border border-white/10
      flex items-center justify-center
      active:scale-95
      transition-all
    "
  >
    <ArrowLeft className="
      w-5 h-5
      text-white
    " />
  </button>

  <h1 className="
    text-lg
    font-black
    tracking-[-0.03em]
    text-white
    truncate
  ">
    {targetUser?.name}
  </h1>

</div>

<div className="
  flex items-center gap-2
">

  <button
    onClick={handleShare}
    className="
      w-10 h-10
      rounded-2xl
      bg-white/[0.06]
      border border-white/10
      flex items-center justify-center
      active:scale-95
      transition-all
    "
  >
    <Share2 className="
      w-5 h-5
      text-white
    " />
  </button>

  {!isOwnProfile && (
    <button
      onClick={() =>
        setShowMore(!showMore)
      }
      className="
        w-10 h-10
        rounded-2xl
        bg-white/[0.06]
        border border-white/10
        flex items-center justify-center
        active:scale-95
        transition-all
      "
    >
      <MoreVertical className="
        w-5 h-5
        text-white
      " />
    </button>
  )}

</div>

</div>
        </div>
                <div className="px-5 py-6 relative z-10">
        <div className="max-w-md mx-auto">

          {/* HERO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="
              relative overflow-hidden
              rounded-[34px]
              border border-white/10
              bg-white/[0.06]
              backdrop-blur-2xl
              shadow-[0_20px_80px_rgba(0,0,0,0.45)]
            "
          >

            {/* glow */}
            <div className="
              absolute inset-0
              bg-[radial-gradient(circle_at_top,#60A5FA22,transparent_55%)]
            " />

            {/* cover */}
            <div className={`
              relative h-36 overflow-hidden
              bg-gradient-to-br ${rank.gradient}
            `}>

              <div className="
                absolute inset-0
                opacity-20
                bg-black
              " />

              <div className="
                absolute -bottom-16
                left-1/2
                -translate-x-1/2
              ">

                <div className="relative">

                  {/* avatar glow */}
                  <div className={`
                    absolute inset-0
                    rounded-full
                    blur-2xl
                    opacity-60
                    scale-125
                    bg-gradient-to-r ${rank.gradient}
                  `} />

                  <img
                    src={
                      targetUser.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        targetUser.name || "User"
                      )}&size=220`
                    }
                    alt=""
                    className="
                      relative
                      w-32 h-32
                      rounded-full
                      object-cover
                      border-[5px]
                      border-[#0B1120]
                      shadow-[0_10px_40px_rgba(0,0,0,0.45)]
                    "
                  />

                  {/* online */}
                  {targetUser.online && (
                    <div className="
                      absolute bottom-3 right-3
                      w-5 h-5
                      rounded-full
                      bg-green-500
                      border-[3px]
                      border-[#0B1120]
                    ">
                      <div className="
                        absolute inset-0
                        rounded-full
                        bg-green-400
                        animate-ping
                        opacity-50
                      " />
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-6 pt-20 pb-6">

              {/* NAME */}
              <div className="text-center">

                <div className="
                  flex items-center justify-center
                  gap-2
                ">
                  <h1 className="
                    text-[28px] sm:text-[30px]
                    break-words
                    leading-none
                    font-black
                    tracking-[-0.03em]
                    text-white
                  ">
                    {targetUser.name || "Unknown User"}
                  </h1>

                  {targetUser.emailVerified && (
                    <div className="
                      w-7 h-7
                      rounded-full
                      bg-gradient-to-br
                      from-sky-400
                      to-blue-600
                      flex items-center justify-center
                      shadow-lg shadow-blue-500/30
                    ">
                      <Check className="
                        w-4 h-4
                        text-white
                        stroke-[3]
                      " />
                    </div>
                  )}
                </div>

                {targetUser.title && (
                  <p className="
                    mt-2
                    text-sm
                    font-semibold
                    text-zinc-300
                  ">
                    {targetUser.title}
                  </p>
                )}

                {/* LEVEL */}
                <div className="
                  flex justify-center
                  mt-4
                ">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={`
                      px-4 py-2
                      rounded-full
                      bg-gradient-to-r ${rank.gradient}
                      text-white
                      flex items-center gap-2
                      shadow-2xl ${rank.glow}
                    `}
                  >
                    {rank.icon}

                    <span className="
                      font-bold
                      text-sm
                      tracking-[-0.01em]
                    ">
                      {rank.name}
                    </span>

                    <div className="
                      px-2 py-0.5
                      rounded-full
                      bg-white/20
                      text-xs
                      font-black
                    ">
                      Lv.{level}
                    </div>
                  </motion.div>
                </div>

                {/* USERNAME */}
                <div className="
                  flex items-center justify-center
                  gap-2 mt-4
                  text-sm text-zinc-400
                ">

                  <span>
                    @{targetUser.userId}
                  </span>

                  {targetUser.location && (
                    <>
                      <span>•</span>

                      <div className="
                        flex items-center gap-1
                      ">
                        <MapPin className="
                          w-3.5 h-3.5
                        " />

                        <span>
                          {targetUser.location}
                        </span>
                      </div>
                    </>
                  )}

                </div>

                {/* STATUS */}
                <div className="
                  mt-3
                  flex justify-center
                ">

                  {targetUser.online ? (

                    <div className="
                      px-3 py-1.5
                      rounded-full
                      bg-green-500/15
                      border border-green-500/20
                      text-green-400
                      text-xs
                      font-semibold
                      flex items-center gap-2
                    ">
                      <div className="
                        w-2 h-2
                        rounded-full
                        bg-green-400
                        animate-pulse
                      " />

                      Đang hoạt động
                    </div>

                  ) : (

                    <div className="
                      px-3 py-1.5
                      rounded-full
                      bg-white/5
                      border border-white/10
                      text-zinc-400
                      text-xs
                      font-semibold
                      flex items-center gap-2
                    ">
                      <Clock className="
                        w-3 h-3
                      " />

                      Hoạt động {formatLastSeen(targetUser.lastSeen)}
                    </div>

                  )}

                </div>

                {/* BIO */}
                {targetUser.bio && (
                  <p className="
                    mt-5
                    text-sm
                    leading-7
                    text-zinc-300
                    px-1
                  ">
                    {targetUser.bio}
                  </p>
                )}

              </div>

              {/* XP */}
              <div className="mt-6">

                <div className="
                  flex items-center justify-between
                  mb-2
                ">
                  <span className="
                    text-xs
                    font-semibold
                    text-zinc-400
                  ">
                    Tiến trình level
                  </span>

                  <span className="
                    text-xs
                    font-bold
                    text-zinc-300
                  ">
                    {currentLevelXP}/140 XP
                  </span>
                </div>

                <div className="
                  h-3 rounded-full
                  bg-white/5
                  overflow-hidden
                  border border-white/5
                ">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${progress}%`
                    }}
                    transition={{ duration: 1 }}
                    className={`
                      h-full rounded-full
                      bg-gradient-to-r ${rank.gradient}
                    `}
                  />
                </div>

              </div>
                            {/* TRUST SCORE */}
              <div className="
                mt-5
                rounded-3xl
                border border-white/10
                bg-white/[0.04]
                p-4
              ">

                <div className="
                  flex items-center justify-between
                ">

                  <div>
                    <p className="
                      text-xs
                      text-zinc-500
                      font-semibold
                    ">
                      Độ uy tín
                    </p>

                    <div className="
                      flex items-center gap-2
                      mt-1
                    ">
                      <Shield className="
                        w-5 h-5
                        text-sky-400
                      " />

                      <span className="
                        text-2xl
                        font-black
                        tracking-[-0.03em]
                      ">
                        {trustScore}%
                      </span>
                    </div>
                  </div>

                  <div className="
                    px-3 py-2
                    rounded-2xl
                    bg-sky-500/10
                    border border-sky-500/20
                  ">
                    <span className="
                      text-xs
                      font-bold
                      text-sky-300
                    ">
                      Đáng tin cậy cao
                    </span>
                  </div>

                </div>
              </div>

              {/* ACHIEVEMENTS */}
              {achievements.length > 0 && (

                <div className="mt-5">

                  <p className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-zinc-500
                    mb-3
                  ">
                    Thành tựu
                  </p>

                  <div className="
                    flex flex-wrap gap-2
                  ">

                    {achievements.map((item, i) => (

                      <motion.div
                        key={i}
                        whileHover={{ y: -2 }}
                        className="
                          px-3 py-2
                          rounded-2xl
                          bg-white/[0.05]
                          border border-white/10
                          text-sm
                          font-semibold
                          text-zinc-200
                          flex items-center gap-2
                        "
                      >
                        <span>{item.icon}</span>

                        <span>
                          {item.label}
                        </span>
                      </motion.div>

                    ))}

                  </div>
                </div>
              )}

            </div>
          </motion.div>

          {/* STATS */}
          <div className="
            grid grid-cols-3
            gap-3 mt-5
          ">

            <motion.div
              whileHover={{ y: -2 }}
              className="
                rounded-3xl
                border border-white/10
                bg-white/[0.06]
                backdrop-blur-xl
                p-4
                text-center
              "
            >

              <div className="
                flex items-center justify-center
                gap-1
                text-yellow-400 mb-2
              ">
                <Star className="
                  w-4 h-4 fill-current
                " />

                <span className="
                  text-2xl
                  font-black
                  tracking-[-0.03em]
                ">
                  {rating || 0}
                </span>
              </div>

              <p className="
                text-xs
                text-zinc-400
              ">
                {reviews} đánh giá
              </p>

            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="
                rounded-3xl
                border border-white/10
                bg-white/[0.06]
                backdrop-blur-xl
                p-4
                text-center
              "
            >

              <div className="
                flex items-center justify-center
                gap-1
                text-sky-400 mb-2
              ">
                <Briefcase className="
                  w-4 h-4
                " />

                <span className="
                  text-2xl
                  font-black
                  tracking-[-0.03em]
                ">
                  {completed}
                </span>
              </div>

              <p className="
                text-xs
                text-zinc-400
              ">
                Hoàn thành
              </p>

            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="
                rounded-3xl
                border border-white/10
                bg-white/[0.06]
                backdrop-blur-xl
                p-4
                text-center
              "
            >

              <div className="
                flex items-center justify-center
                gap-1
                text-emerald-400 mb-2
              ">
                <Zap className="
                  w-4 h-4
                " />

                <span className="
                  text-2xl
                  font-black
                  tracking-[-0.03em]
                ">
                  {responseRate}%
                </span>
              </div>

              <p className="
                text-xs
                text-zinc-400
              ">
                Phản hồi
              </p>

            </motion.div>

          </div>
                    {/* PROFILE COMPLETION */}
          <motion.div
            whileHover={{ y: -2 }}
            className="
              mt-5
              rounded-[30px]
              border border-white/10
              bg-white/[0.05]
              backdrop-blur-xl
              p-5
            "
          >

            <div className="
              flex items-center justify-between
            ">

              <div>

                <p className="
                  text-xs
                  font-semibold
                  text-zinc-500
                  uppercase
                  tracking-[0.14em]
                ">
                  Hồ sơ
                </p>

                <h3 className="
                  mt-1
                  text-xl
                  font-black
                  tracking-[-0.03em]
                ">
                  Hoàn thiện {profileCompletion}%
                </h3>

              </div>

              <Activity className="
                w-8 h-8
                text-sky-400
              " />

            </div>

            <div className="
              mt-4
              h-3
              rounded-full
              overflow-hidden
              bg-white/5
            ">

              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${profileCompletion}%`
                }}
                transition={{ duration: 1 }}
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-sky-400
                  via-blue-500
                  to-indigo-500
                "
              />

            </div>

          </motion.div>

          {/* SKILLS */}
          {targetUser.skills &&
            targetUser.skills.length > 0 && (

            <div className="mt-5">

              <div className="
                flex items-center justify-between
                mb-3
              ">

                <p className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-zinc-500
                ">
                  Kỹ năng
                </p>

                <ChevronRight className="
                  w-4 h-4
                  text-zinc-600
                " />

              </div>

              <div className="
                flex flex-wrap gap-2
              ">

                {targetUser.skills.map((skill) => (

                  <motion.div
                    key={skill}
                    whileHover={{
                      scale: 1.03,
                      y: -2,
                    }}
                    className="
                      px-4 py-2.5
                      rounded-2xl
                      border border-white/10
                      bg-white/[0.05]
                      backdrop-blur-xl
                      text-sm
                      font-semibold
                      text-zinc-200
                    "
                  >
                    {skill}
                  </motion.div>

                ))}

              </div>
            </div>
          )}

          {/* PORTFOLIO */}
          {targetUser.portfolio &&
            targetUser.portfolio.length > 0 && (

            <div className="mt-6">

              <div className="
                flex items-center justify-between
                mb-3
              ">

                <p className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-zinc-500
                ">
                  Portfolio
                </p>

                <ChevronRight className="
                  w-4 h-4
                  text-zinc-600
                " />

              </div>

              <div className="space-y-3">

                {targetUser.portfolio
                  .slice(0, 4)
                  .map((item, i) => (

                  <motion.a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"

                    whileHover={{ y: -2 }}

                    className="
                      group
                      flex items-center justify-between
                      rounded-[28px]
                      border border-white/10
                      bg-white/[0.05]
                      backdrop-blur-xl
                      p-5
                    "
                  >

                    <div>

                      <p className="
                        text-base
                        font-bold
                        text-white
                      ">
                        {item.title}
                      </p>

                      <p className="
                        text-xs
                        text-zinc-500
                        mt-1
                      ">
                        Portfolio project
                      </p>

                    </div>

                    <div className="
                      w-11 h-11
                      rounded-2xl
                      bg-white/5
                      border border-white/10
                      flex items-center justify-center
                    ">

                      <ExternalLink className="
                        w-4 h-4
                        text-zinc-400
                      " />

                    </div>

                  </motion.a>

                ))}

              </div>
            </div>
          )}

          {/* ACTIONS */}
          {!isOwnProfile && (

            <div className="
              mt-7
              space-y-3
            ">

              {isFriend ? (
                <>

                  <motion.button
                    whileTap={{
                      scale: 0.98
                    }}

                    onClick={() =>
                      router.push(`/chat/${targetUser.uid}`)
                    }

                    className={`
                      w-full h-14
                      rounded-[26px]
                      bg-gradient-to-r ${rank.gradient}
                      text-white
                      font-black
                      tracking-[-0.02em]
                      shadow-2xl ${rank.glow}
                      flex items-center justify-center
                      gap-2
                    `}
                  >

                    <MessageCircle size={20} />

                    Nhắn tin

                  </motion.button>

                  <motion.button
                    whileTap={{
                      scale: 0.98
                    }}

                    onClick={handleUnfriend}

                    disabled={actionLoading}

                    className="
                      w-full h-14
                      rounded-[26px]
                      border border-white/10
                      bg-white/[0.05]
                      backdrop-blur-xl
                      text-white
                      font-bold
                      flex items-center justify-center
                      gap-2
                    "
                  >

                    <UserMinus size={18} />

                    Hủy kết nối

                  </motion.button>

                </>
              ) : (

                <motion.button
                  whileTap={{
                    scale: 0.98
                  }}

                  onClick={handleConnect}

                  disabled={actionLoading}

                  className={`
                    w-full h-14
                    rounded-[26px]
                    bg-gradient-to-r ${rank.gradient}
                    text-white
                    font-black
                    tracking-[-0.02em]
                    shadow-2xl ${rank.glow}
                    flex items-center justify-center
                    gap-2
                  `}
                >

                  <UserPlus size={20} />

                  {actionLoading
                    ? "Đang kết nối..."
                    : "Mời nhận việc"}

                </motion.button>

              )}

            </div>
          )}

          {/* REPORT */}
          <AnimatePresence>
            {showMore && !isOwnProfile && (

              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                exit={{
                  opacity: 0,
                  y: 10,
                }}

                className="
                  mt-4
                  rounded-[28px]
                  border border-red-500/20
                  bg-red-500/10
                  backdrop-blur-xl
                  p-2
                "
              >

                <button
                  className="
                    w-full
                    flex items-center gap-3
                    px-4 py-4
                    rounded-2xl
                    text-red-400
                    font-bold
                  "
                >

                  <Flag className="
                    w-5 h-5
                  " />

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

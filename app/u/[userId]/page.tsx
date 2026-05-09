"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  doc, getDoc, setDoc, deleteDoc, collection, query, where,
  getDocs, serverTimestamp, Timestamp
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import {
  MessageCircle, UserPlus, Check, UserMinus, ArrowLeft,
  Star, Briefcase, MapPin, Clock, ExternalLink, ShieldCheck,
  Zap, Share2, MoreVertical, Flag
} from "lucide-react";
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
  portfolio?: { title: string; url: string }[];
  stats?: {
    completed: number;
    rating: number;
    totalReviews: number;
    responseRate?: number;
  };
  createdAt?: Timestamp;
};

export default function PublicProfile() {
  const { userId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!userId ||!user) return;

    try {
      // Chạy song song 2 query để nhanh hơn
      const [userSnap, currentUserSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("userId", "==", userId))),
        getDoc(doc(db, "users", user.uid))
      ]);

      if (userSnap.empty) {
        toast.error("Không tìm thấy người dùng");
        router.replace("/404");
        return;
      }

      const userDoc = userSnap.docs[0];

if (!userDoc) {
  toast.error("Không tìm thấy người dùng");
  router.replace("/404");
  return;
}

const data = { uid: userDoc.id,...userDoc.data() } as PublicUser;
      setTargetUser(data);

      if (currentUserSnap.exists()) {
        setCurrentUserData(currentUserSnap.data());
      }

      // Check friend status
      const friendSnap = await getDoc(doc(db, "users", user.uid, "friends", userDoc.id));
      setIsFriend(friendSnap.exists());

    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [userId, user, db, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleConnect = async () => {
    if (!user ||!targetUser || actionLoading) return;
    if (user.uid === targetUser.uid) return toast.error("Đây là bạn");

    setActionLoading(true);
    try {
      const batch = [
        setDoc(doc(db, "users", user.uid, "friends", targetUser.uid), {
          createdAt: serverTimestamp(),
          status: "accepted",
          name: targetUser.name,
          avatar: targetUser.avatar,
          userId: targetUser.userId,
          title: targetUser.title || ""
        }),
        setDoc(doc(db, "users", targetUser.uid, "friends", user.uid), {
          createdAt: serverTimestamp(),
          status: "accepted",
          name: currentUserData?.name || user.displayName || "User",
          avatar: currentUserData?.avatar || user.photoURL || "",
          userId: currentUserData?.userId || "",
          title: currentUserData?.title || ""
        })
      ];

      await Promise.all(batch);
      setIsFriend(true);
      toast.success(`Đã kết nối với ${targetUser.name}`);
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch (err) {
      console.error(err);
      toast.error("Kết nối thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user ||!targetUser || actionLoading) return;

    setActionLoading(true);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid, "friends", targetUser.uid)),
        deleteDoc(doc(db, "users", targetUser.uid, "friends", user.uid))
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
    const url = `https://airanh.vercel.app/u/${targetUser.userId}`;
    if (navigator.share) {
      await navigator.share({ title: targetUser.name, text: `Xem hồ sơ ${targetUser.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }
  };

  const formatLastSeen = (timestamp?: Timestamp) => {
    if (!timestamp) return "Lâu rồi";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="px-6 py-8 max-w-md mx-auto animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-zinc-800 mx-auto" />
          <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded mt-4 w-40 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded mt-2 w-24 mx-auto" />
        </div>
      </div>
    );
  }

  if (!targetUser) return null;
  const isOwnProfile = user?.uid === targetUser.uid;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-zinc-900"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {targetUser.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-zinc-900">
              <Share2 className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            {!isOwnProfile && (
              <button onClick={() => setShowMore(!showMore)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-zinc-900">
                <MoreVertical className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-md mx-auto">
          {/* Avatar + Name */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name)}&size=176&background=8B5E3C&color=fff`}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-black shadow-lg"
                alt=""
              />

              {/* Verified badges */}
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                {targetUser.emailVerified && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center border-2 border-white dark:border-black">
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                )}
                {targetUser.isVerifiedId && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center border-2 border-white dark:border-black">
                    <ShieldCheck className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Online status */}
              {targetUser.online? (
                <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-black" />
              ) : null}
            </div>

            <h1 className="text-3xl font-black mt-4 text-gray-900 dark:text-white tracking-tight">
              {targetUser.name}
            </h1>

            {targetUser.title && (
              <p className="text-base font-semibold text-gray-600 dark:text-zinc-400 mt-1">
                {targetUser.title}
              </p>
            )}

            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500 dark:text-zinc-400">
              <span>@{targetUser.userId}</span>
              {targetUser.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{targetUser.location}
                  </span>
                </>
              )}
            </div>

            {!targetUser.online && targetUser.lastSeen && (
              <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Hoạt động {formatLastSeen(targetUser.lastSeen)}
              </p>
            )}

            {targetUser.bio && (
              <p className="text-sm text-gray-700 dark:text-zinc-300 mt-4 px-2 leading-relaxed">
                {targetUser.bio}
              </p>
            )}
          </div>

          {/* Stats */}
          {targetUser.stats && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="py-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {targetUser.stats.rating || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{targetUser.stats.totalReviews || 0} đánh giá</p>
              </div>

              <div className="py-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {targetUser.stats.completed || 0}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Đã hoàn thành</p>
              </div>

              <div className="py-3 rounded-2xl bg-gray-50 dark:bg-zinc-900 text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {targetUser.stats.responseRate || 98}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Phản hồi</p>
              </div>
            </div>
          )}

          {/* Skills */}
          {targetUser.skills && targetUser.skills.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider mb-3">
                Kỹ năng
              </p>
              <div className="flex flex-wrap gap-2">
                {targetUser.skills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full text-sm font-medium text-gray-900 dark:text-white">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio */}
          {targetUser.portfolio && targetUser.portfolio.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider mb-3">
                Portfolio
              </p>
              <div className="space-y-2">
                {targetUser.portfolio.slice(0, 3).map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-2xl active:opacity-70"
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          {!isOwnProfile && (
            <div className="mt-8 space-y-3">
              {isFriend? (
                <>
                  <button
                    onClick={() => router.push(`/chat/${targetUser.uid}`)}
                    className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-blue-500/30"
                  >
                    <MessageCircle size={20} /> Nhắn tin
                  </button>
                  <button
                    onClick={handleUnfriend}
                    disabled={actionLoading}
                    className="w-full py-4 rounded-2xl font-semibold bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
                  >
                    <UserMinus size={20} /> Hủy kết nối
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  <UserPlus size={20} /> {actionLoading? "Đang kết nối..." : "Mời nhận việc"}
                </button>
              )}
            </div>
          )}

          {/* More menu */}
          {showMore &&!isOwnProfile && (
            <div className="mt-3 p-2 bg-gray-50 dark:bg-zinc-900 rounded-2xl">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-500 active:bg-gray-100 dark:active:bg-zinc-800 rounded-xl">
                <Flag className="w-5 h-5" />
                <span className="font-semibold">Báo cáo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
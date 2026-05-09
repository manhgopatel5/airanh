"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import {
  MessageCircle, UserPlus, Check, UserMinus, ArrowLeft,
  Star, Briefcase, MapPin, Clock, ExternalLink, ShieldCheck,
  Share2, MoreVertical, Flag, Phone, Award, TrendingUp,
  Calendar, FileText, ChevronRight, Zap, Settings, QrCode, ScanLine, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";

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
  phone?: string;
  skills?: string[];
  portfolio?: { title: string; url: string; image?: string }[];
  stats?: {
    completed: number;
    rating: number;
    totalReviews: number;
    responseRate?: number;
    joinedDate?: Timestamp;
  };
  createdAt?: Timestamp;
};

type TabType = "about" | "reviews" | "tasks";

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
  const [activeTab, setActiveTab] = useState<TabType>("about");
  const [showMore, setShowMore] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const fetchUser = useCallback(async () => {
    if (!uid ||!user) return;
    try {
      const [userSnap, currentUserSnap] = await Promise.all([
        getDoc(doc(db, "users", uid as string)),
        getDoc(doc(db, "users", user.uid))
      ]);

      if (!userSnap.exists()) {
        toast.error("Không tìm thấy người dùng");
        router.replace("/404");
        return;
      }

      const data = { uid: userSnap.id,...userSnap.data() } as PublicUser;
      setTargetUser(data);
      
      if (currentUserSnap.exists()) {
        setCurrentUserData(currentUserSnap.data());
      }

      const friendSnap = await getDoc(doc(db, "users", user.uid, "friends", userSnap.id));
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
    if (!user ||!targetUser || actionLoading) return;
    if (user.uid === targetUser.uid) return toast.error("Đây là bạn");

    setActionLoading(true);
    try {
      await Promise.all([
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
      ]);
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

  const handleChat = async () => {
    if (!user ||!targetUser) return;
    const chatId = [user.uid, targetUser.uid].sort().join("_");
    router.push(`/chat/${chatId}`);
  };

  const handleCall = () => {
    if (!targetUser?.phone) return toast.error("Người dùng chưa cập nhật số điện thoại");
    window.open(`tel:${targetUser.phone}`);
  };

  const handleShare = async () => {
    if (!targetUser) return;
    const url = `https://airanh.vercel.app/profile/${targetUser.uid}`;
    if (navigator.share) {
      await navigator.share({ title: targetUser.name, text: `Xem hồ sơ ${targetUser.name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }
  };

  const stopScan = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setShowScanQR(false);
  };

  useEffect(() => {
    if (!showScanQR) return;
    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            stopScan();
            if (decodedText.includes("/profile/")) {
              const targetUid = decodedText.split("/profile/")[1];
              if (targetUid === targetUser?.uid) {
                toast.error("Đây là mã của bạn");
                return;
              }
              router.push(`/profile/${targetUid}`);
            } else {
              toast.error("Mã QR không hợp lệ");
            }
          },
          () => {}
        );
      } catch {
        toast.error("Không mở được camera");
        setShowScanQR(false);
      }
    };
    startScan();
    return () => stopScan();
  }, [showScanQR, targetUser?.uid, router]);

  const formatLastSeen = (timestamp?: Timestamp) => {
    if (!timestamp) return "Lâu rồi";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black">
        <div className="px-4 py-8 max-w-md mx-auto animate-pulse">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-zinc-800 mx-auto" />
          <div className="h-7 bg-gray-200 dark:bg-zinc-800 rounded mt-4 w-48 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded mt-2 w-32 mx-auto" />
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!targetUser) return null;
  const isOwnProfile = user?.uid === targetUser.uid;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black pb-24">
      <Toaster richColors position="top-center" />

      {/* Header - đồng bộ size với Task */}
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800 z-10">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#E5E5EA] dark:active:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-5 h-5 text-[#1C1C1E] dark:text-white" />
            </button>
            <h1 className="text- font-semibold text-[#1C1C1E] dark:text-white truncate">
              {targetUser.name}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#E5E5EA] dark:active:bg-zinc-800">
              <Share2 className="w-5 h-5 text-[#1C1C1E] dark:text-white" />
            </button>
            {!isOwnProfile && (
              <button onClick={() => setShowMore(!showMore)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#E5E5EA] dark:active:bg-zinc-800">
                <MoreVertical className="w-5 h-5 text-[#1C1C1E] dark:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Avatar + Info - size chuẩn như Tin nhắn */}
        <div className="text-center">
          <div className="relative inline-block">
            <img
              src={targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name)}&size=176&background=8B5E3C&color=fff`}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-black shadow-xl"
              alt=""
            />
            
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              {targetUser.emailVerified && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#007AFF] flex items-center justify-center border-2 border-white dark:border-black shadow-lg">
                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              )}
              {targetUser.isVerifiedId && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#30D158] to-[#00C851] flex items-center justify-center border-2 border-white dark:border-black shadow-lg">
                  <ShieldCheck className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              )}
            </div>

            {targetUser.online && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#30D158] rounded-full border-2 border-white dark:border-black" />
            )}
          </div>

          <h1 className="text- font-bold mt-4 text-[#1C1C1E] dark:text-white tracking-[-0.5px] leading-tight">
            {targetUser.name}
          </h1>

          {targetUser.title && (
            <p className="text- font-medium text-[#8E8E93] dark:text-zinc-400 mt-1">
              {targetUser.title}
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mt-2 text- text-[#8E8E93] dark:text-zinc-500">
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
            <p className="text- text-[#8E8E93] dark:text-zinc-500 mt-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Hoạt động {formatLastSeen(targetUser.lastSeen)}
            </p>
          )}

          {targetUser.bio && (
            <p className="text- text-[#3C3C43] dark:text-zinc-300 mt-4 px-4 leading-[1.4]">
              {targetUser.bio}
            </p>
          )}
        </div>

        {/* Stats Cards - giống card Task */}
        {targetUser.stats && (
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="py-3 px-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800">
              <div className="flex items-center justify-center gap-1 text-[#FFB800] mb-1">
                <Star className="w-4 h-4 fill-current" />
                <span className="text- font-bold text-[#1C1C1E] dark:text-white">
                  {targetUser.stats.rating || 0}
                </span>
              </div>
              <p className="text- text-[#8E8E93] dark:text-zinc-500 font-medium">
                {targetUser.stats.totalReviews || 0} đánh giá
              </p>
            </div>

            <div className="py-3 px-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800">
              <div className="flex items-center justify-center gap-1 text-[#0A84FF] mb-1">
                <Briefcase className="w-4 h-4" />
                <span className="text- font-bold text-[#1C1C1E] dark:text-white">
                  {targetUser.stats.completed || 0}
                </span>
              </div>
              <p className="text- text-[#8E8E93] dark:text-zinc-500 font-medium">
                Đã hoàn thành
              </p>
            </div>

            <div className="py-3 px-3 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800">
              <div className="flex items-center justify-center gap-1 text-[#30D158] mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text- font-bold text-[#1C1C1E] dark:text-white">
                  {targetUser.stats.responseRate || 98}%
                </span>
              </div>
              <p className="text- text-[#8E8E93] dark:text-zinc-500 font-medium">
                Phản hồi
              </p>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        {!isOwnProfile && (
          <div className="mt-6 space-y-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleChat}
              className="w-full py-4 rounded-2xl font-semibold text- bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg shadow-blue-500/30"
            >
              <MessageCircle size={20} /> Nhắn tin
            </motion.button>
            
            <div className="grid grid-cols-2 gap-3">
              {targetUser.phone && (
                <button
                  onClick={handleCall}
                  className="py-3.5 rounded-2xl font-semibold text- bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800 text-[#1C1C1E] dark:text-white flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <Phone size={18} /> Gọi điện
                </button>
              )}
              {isFriend? (
                <button
                  onClick={handleUnfriend}
                  disabled={actionLoading}
                  className="py-3.5 rounded-2xl font-semibold text- bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800 text-[#1C1C1E] dark:text-white flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
                >
                  <UserMinus size={18} /> Hủy kết nối
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="py-3.5 rounded-2xl font-semibold text- bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-800 text-[#1C1C1E] dark:text-white flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
                >
                  <UserPlus size={18} /> {actionLoading? "Đang kết nối..." : "Kết nối"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 -mx-4 px-4">
          <div className="flex gap-1 bg-[#F2F2F7] dark:bg-zinc-900 p-1 rounded-xl">
            {[
              { id: "about", label: "Giới thiệu", icon: FileText },
              { id: "reviews", label: "Đánh giá", icon: Star },
              { id: "tasks", label: "Công việc", icon: Briefcase }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 py-2.5 rounded-lg text- font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id
                  ? "bg-white dark:bg-black text-[#1C1C1E] dark:text-white shadow-sm"
                    : "text-[#8E8E93] dark:text-zinc-500"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {activeTab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {targetUser.skills && targetUser.skills.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
                    <p className="text- font-bold text-[#8E8E93] dark:text-zinc-500 uppercase tracking-wider mb-3">
                      Kỹ năng
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {targetUser.skills.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-[#F2F2F7] dark:bg-zinc-800 rounded-full text- font-medium text-[#1C1C1E] dark:text-white">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {targetUser.portfolio && targetUser.portfolio.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
                    <p className="text- font-bold text-[#8E8E93] dark:text-zinc-500 uppercase tracking-wider mb-3">
                      Portfolio
                    </p>
                    <div className="space-y-2">
                      {targetUser.portfolio.slice(0, 3).map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl active:opacity-70 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {item.image && (
                              <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            )}
                            <span className="text- font-semibold text-[#1C1C1E] dark:text-white truncate">
                              {item.title}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-[#C7C7CC] dark:text-zinc-600 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {targetUser.stats?.joinedDate && (
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3 text- text-[#3C3C43] dark:text-zinc-300">
                      <Calendar className="w-5 h-5 text-[#8E8E93]" />
                      <span>Tham gia từ {new Date(targetUser.stats.joinedDate.seconds * 1000).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-8 text-center"
              >
                <Award className="w-12 h-12 text-[#C7C7CC] dark:text-zinc-700 mx-auto mb-3" />
                <p className="text- text-[#8E8E93] dark:text-zinc-500">Chưa có đánh giá nào</p>
              </motion.div>
            )}

            {activeTab === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-8 text-center"
              >
                <Briefcase className="w-12 h-12 text-[#C7C7CC] dark:text-zinc-700 mx-auto mb-3" />
                <p className="text- text-[#8E8E93] dark:text-zinc-500">Chưa có công việc nào</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showMore &&!isOwnProfile && (
          <div className="mt-3 p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#FF3B30] active:bg-[#F2F2F7] dark:active:bg-zinc-800 rounded-xl">
              <Flag className="w-5 h-5" />
              <span className="font-semibold text-">Báo cáo</span>
            </button>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && targetUser.userId && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text- font-bold text-center mb-1 text-[#1C1C1E] dark:text-white">
              @{targetUser.userId}
            </h3>
            <p className="text- text-center text-[#8E8E93] mb-4">
              Quét để kết nối với {targetUser.name}
            </p>

            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCodeSVG
                value={`https://airanh.vercel.app/profile/${targetUser.uid}`}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={handleShare}
                className="py-3 rounded-2xl font-semibold text- bg-[#F2F2F7] dark:bg-zinc-800 text-[#1C1C1E] dark:text-white flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Share2 size={18} /> Chia sẻ
              </button>
              <button
                onClick={() => { setShowQR(false); setShowScanQR(true); }}
                className="py-3 rounded-2xl font-semibold text- bg-gradient-to-r from-[#0A84FF] to-[#007AFF] text-white flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <ScanLine size={18} /> Quét mã
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan QR fullscreen */}
      {showScanQR && (
        <div className="fixed inset-0 bg-black z-50">
          <div id="qr-reader" className="w-full h-full" />
          <button
            onClick={stopScan}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold text-">Đưa mã QR vào khung</p>
            <p className="text- opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}
    </div>
  );
}
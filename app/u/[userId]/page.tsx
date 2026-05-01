"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import { MessageCircle, UserPlus, Check, UserMinus, ArrowLeft } from "lucide-react";

type PublicUser = {
  uid: string;
  name: string;
  userId: string;
  avatar: string;
  bio?: string;
  online?: boolean;
  emailVerified?: boolean;
};

export default function PublicProfile() {
  const { userId } = useParams(); // AIR123456
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId ||!user) return;

    const fetchUser = async () => {
      try {
        // 1. Tìm uid từ userId
        const q = query(collection(db, "users"), where("userId", "==", userId));
        const snap = await getDocs(q);

        if (snap.empty) {
          toast.error("Không tìm thấy người dùng");
          router.back();
          return;
        }

        const userDoc = snap.docs[0];
        const data = { uid: userDoc.id,...userDoc.data() } as PublicUser;
        setTargetUser(data);

        // 2. Check đã kết bạn chưa
        const friendSnap = await getDoc(doc(db, "users", user.uid, "friends", userDoc.id));
        setIsFriend(friendSnap.exists());
      } catch (err) {
        toast.error("Có lỗi xảy ra");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, user, db, router]);

  const handleConnect = async () => {
    if (!user ||!targetUser) return;
    if (user.uid === targetUser.uid) {
      toast.error("Đây là bạn");
      return;
    }

    try {
      // Tạo friend 2 chiều
      await Promise.all([
        setDoc(doc(db, "users", user.uid, "friends", targetUser.uid), {
          createdAt: new Date(),
          status: "accepted",
          name: targetUser.name,
          avatar: targetUser.avatar,
          userId: targetUser.userId
        }),
        setDoc(doc(db, "users", targetUser.uid, "friends", user.uid), {
          createdAt: new Date(),
          status: "accepted",
          name: user.displayName || "User",
          avatar: user.photoURL || "",
          userId: userData?.userId || ""
        })
      ]);

      setIsFriend(true);
      toast.success(`Đã kết nối với ${targetUser.name}`);
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch (err) {
      console.error(err);
      toast.error("Kết nối thất bại");
    }
  };

  const handleUnfriend = async () => {
    if (!user ||!targetUser) return;

    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid, "friends", targetUser.uid)),
        deleteDoc(doc(db, "users", targetUser.uid, "friends", user.uid))
      ]);
      setIsFriend(false);
      toast.success("Đã hủy kết nối");
    } catch {
      toast.error("Có lỗi xảy ra");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!targetUser) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-zinc-900"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Hồ sơ</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={targetUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.name)}&size=176`}
                className="w-24 h-24 rounded-full"
                alt=""
              />
              {targetUser.emailVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center border-2 border-white dark:border-black">
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                </div>
              )}
              {targetUser.online && (
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-black" />
              )}
            </div>

            <h1 className="text-2xl font-black mt-4 text-gray-900 dark:text-white">{targetUser.name}</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">@{targetUser.userId}</p>

            {targetUser.bio && (
              <p className="text-sm text-gray-600 dark:text-zinc-300 mt-3 px-4">{targetUser.bio}</p>
            )}
          </div>

          <div className="mt-8 space-y-3">
            {isFriend? (
              <>
                <button
                  onClick={() => router.push(`/chat/${targetUser.uid}`)}
                  className="w-full py-3.5 rounded-2xl font-bold bg-blue-500 text-white flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <MessageCircle size={20} /> Nhắn tin
                </button>
                <button
                  onClick={handleUnfriend}
                  className="w-full py-3.5 rounded-2xl font-semibold bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white flex items-center justify-center gap-2 active:scale-[0.98] transition"
                >
                  <UserMinus size={20} /> Hủy kết nối
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full py-3.5 rounded-2xl font-bold bg-blue-500 text-white flex items-center justify-center gap-2 active:scale-[0.98] transition"
              >
                <UserPlus size={20} /> Kết nối
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
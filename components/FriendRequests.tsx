"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  listenFriendRequests,
  acceptRequest,
  rejectRequest,
} from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, documentId } from "firebase/firestore";
import { FiUserPlus, FiCheck, FiX, FiClock } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";

type FriendRequest = {
  id: string;
  from: string;
  to: string;
  createdAt?: { seconds: number };
};

type UserData = {
  uid: string;
  name?: string;
  avatar?: string;
  mutualFriends?: number;
};

export default function FriendRequests() {
  const { user } = useAuth();
  const [list, setList] = useState<FriendRequest[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const userMapRef = useRef<Record<string, UserData>>({}); // ✅ FIX 1: Cache bằng ref

  /* ================= LOAD REQUEST + BATCH USERS ✅ FIX 1 + 2 ================= */
  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      setLoading(false);
      return;
    }

    const unsub = listenFriendRequests(user.uid, async (data: FriendRequest[]) => {
      setList(data);
      setLoading(false);

      // Lấy userId chưa có trong cache
      const newIds = [...new Set(data.map((r) => r.from))].filter(
        (id) =>!userMapRef.current[id]
      );

      if (newIds.length === 0) return;

      // ✅ FIX 2: Batch get tối đa 10 id/lần
      const batches = [];
      for (let i = 0; i < newIds.length; i += 10) {
        batches.push(newIds.slice(i, i + 10));
      }

      const newUsers: Record<string, UserData> = {};
      await Promise.all(
        batches.map(async (batch) => {
          const snap = await getDocs(
            query(collection(db, "users"), where(documentId(), "in", batch))
          );
          snap.forEach((doc) => {
            newUsers[doc.id] = { uid: doc.id,...doc.data() } as UserData;
          });
        })
      );

      userMapRef.current = {...userMapRef.current,...newUsers };
      setUserMap({...userMapRef.current }); // Trigger re-render
    });

    return () => unsub();
  }, [user?.uid]); // ✅ FIX 1: Bỏ userMap khỏi deps

  /* ================= ACCEPT - OPTIMISTIC ✅ FIX 5 ================= */
  const handleAccept = useCallback(async (req: FriendRequest) => {
    if (processing) return;
    setProcessing(req.id);
    setList((prev) => prev.filter((r) => r.id!== req.id)); // Xóa ngay

    try {
      await acceptRequest(req);
    } catch (err) {
      console.error("❌ lỗi accept:", err);
      setList((prev) => [...prev, req]); // Rollback
    } finally {
      setProcessing(null);
    }
  }, [processing]);

  /* ================= REJECT - OPTIMISTIC ✅ FIX 5 ================= */
  const handleReject = useCallback(async (id: string) => {
    if (processing) return;
    setProcessing(id);
    const req = list.find((r) => r.id === id);
    setList((prev) => prev.filter((r) => r.id!== id));

    try {
      await rejectRequest(id);
    } catch (err) {
      console.error("❌ lỗi reject:", err);
      if (req) setList((prev) => [...prev, req]); // Rollback
    } finally {
      setProcessing(null);
    }
  }, [processing, list]);

  /* ================= TIME AGO ================= */
  const timeAgo = (seconds?: number) => {
    if (!seconds) return "";
    const diff = Date.now() / 1000 - seconds;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return `${Math.floor(diff / 86400)} ngày`;
  };

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm shadow-gray-100/50 dark:shadow-black/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FiUserPlus className="text-blue-600 dark:text-blue-400" size={20} />
        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
          Lời mời kết bạn
        </h3>
        {list.length > 0 && (
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg">
            {list.length}
          </span>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
                <div className="w-16 h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-zinc-500">
          <HiSparkles size={40} className="mb-2" />
          <p className="font-semibold text-sm">Không có lời mời nào</p>
          <p className="text-xs mt-1">Khi có người gửi kết bạn sẽ hiện ở đây</p>
        </div>
      )}

      {/* LIST */}
      <div className="space-y-2">
        {list.map((req) => {
          const u = userMap[req.from];
          const isProcessing = processing === req.id;

          return (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={u?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || "U")}&background=random`}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {u?.name || "Đang tải..."}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
                    <FiClock size={12} />
                    {timeAgo(req.createdAt?.seconds)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isProcessing? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FiCheck size={16} />
                  )}
                  Đồng ý
                </button>

                <button
                  onClick={() => handleReject(req.id)}
                  disabled={isProcessing}
                  className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  listenFriendRequests,
  acceptRequest,
  rejectRequest,
  type FriendRequest,
} from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { FiUserPlus, FiCheck, FiX, FiClock } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";

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

  const userMapRef = useRef<Record<string, UserData>>({});

  /* ================= LOAD REQUEST + USERS ================= */
  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      setLoading(false);
      return;
    }

    const unsub = listenFriendRequests(user.uid, async (data: FriendRequest[]) => {
      setList(data);
      setLoading(false);

      // ✅ FIX: dùng fromUserId
      const newIds = [...new Set(data.map((r) => r.fromUserId))].filter(
        (id) => !userMapRef.current[id]
      );

      if (newIds.length === 0) return;

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
            newUsers[doc.id] = {
              uid: doc.id,
              ...(doc.data() as any),
            };
          });
        })
      );

      userMapRef.current = { ...userMapRef.current, ...newUsers };
      setUserMap({ ...userMapRef.current });
    });

    return () => unsub();
  }, [user?.uid]);

  /* ================= ACCEPT ================= */
  const handleAccept = useCallback(
    async (req: FriendRequest) => {
      if (processing) return;

      setProcessing(req.id);
      setList((prev) => prev.filter((r) => r.id !== req.id));

      try {
        await acceptRequest(req);
      } catch (err) {
        console.error("❌ lỗi accept:", err);
        setList((prev) => [...prev, req]);
      } finally {
        setProcessing(null);
      }
    },
    [processing]
  );

  /* ================= REJECT ================= */
  const handleReject = useCallback(
    async (id: string) => {
      if (processing || !user?.uid) return;

      setProcessing(id);

      const req = list.find((r) => r.id === id);
      setList((prev) => prev.filter((r) => r.id !== id));

      try {
        // ✅ FIX: truyền userId
        await rejectRequest(id, user.uid);
      } catch (err) {
        console.error("❌ lỗi reject:", err);
        if (req) setList((prev) => [...prev, req]);
      } finally {
        setProcessing(null);
      }
    },
    [processing, list, user?.uid]
  );

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
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FiUserPlus className="text-blue-600 dark:text-blue-400" size={20} />
        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
          Lời mời kết bạn
        </h3>
        {list.length > 0 && (
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
            {list.length}
          </span>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && list.length === 0 && (
        <div className="flex flex-col items-center py-8 text-gray-400">
          <HiSparkles size={40} className="mb-2" />
          <p className="font-semibold text-sm">Không có lời mời nào</p>
        </div>
      )}

      {/* LIST */}
      <div className="space-y-2">
        {list.map((req) => {
          // ✅ FIX CHÍNH
          const u = userMap[req.fromUserId];
          const isProcessing = processing === req.id;

          return (
            <div
              key={req.id}
              className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={
                    u?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      u?.name || "U"
                    )}`
                  }
                  className="w-12 h-12 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {u?.name || "Đang tải..."}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FiClock size={12} />
                    {timeAgo(req.createdAt?.seconds)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(req)}
                  disabled={isProcessing}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-sm"
                >
                  {isProcessing ? "..." : <FiCheck />}
                </button>

                <button
                  onClick={() => handleReject(req.id)}
                  disabled={isProcessing}
                  className="bg-gray-200 px-3 py-1.5 rounded-xl text-sm"
                >
                  <FiX />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
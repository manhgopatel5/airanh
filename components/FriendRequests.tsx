"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  listenFriendRequests,
  acceptRequest,
  rejectRequest,
  type FriendRequest,
} from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { FiUserPlus, FiCheck, FiX, FiClock } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [acceptedId, setAcceptedId] = useState<string | null>(null);

  const userMapRef = useRef<Record<string, UserData>>({});

  // ✅ LOTTIE
  const acceptLottie = "/lotties/huha-celebrate-full.lottie";
  const emptyLottie = "/lotties/huha-celebrate-full.lottie";

  /* ================= LOAD REQUEST + USERS ================= */
  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      setLoading(false);
      return;
    }

    const db = getFirebaseDB();

    const unsub = listenFriendRequests(user.uid, async (data: FriendRequest[]) => {
      setList(data);
      setLoading(false);

      const newIds = [...new Set(data.map((r) => r.fromUserId))].filter(
        (id) =>!userMapRef.current[id]
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

      userMapRef.current = {...userMapRef.current,...newUsers };
      setUserMap({...userMapRef.current });
    });

    return () => unsub();
  }, [user?.uid]);

  /* ================= ACCEPT ================= */
  const handleAccept = useCallback(
    async (req: FriendRequest) => {
      if (processing) return;

      setProcessing(req.id);
      navigator.vibrate?.([10,20,10]);
      setAcceptedId(req.id);
      setTimeout(() => setAcceptedId(null), 1200);

      setList((prev) => prev.filter((r) => r.id!== req.id));

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
      if (processing ||!user?.uid) return;

      setProcessing(id);
      navigator.vibrate?.(5);

      const req = list.find((r) => r.id === id);
      setList((prev) => prev.filter((r) => r.id!== id));

      try {
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
    <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:'rgba(0,66,178,0.1)'}}>
          <FiUserPlus className="text-[#0042B2]" size={18} />
        </div>
        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
          Lời mời kết bạn
        </h3>
        {list.length > 0 && (
          <span className="text-xs font-bold text-white px-2 py-0.5 rounded-lg" style={{background:'#0042B2'}}>
            {list.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="flex flex-col items-center py-8 text-zinc-400">
          <div className="w-16 h-16 opacity-60">
            <DotLottieReact src={emptyLottie} autoplay loop style={{width:64,height:64}} />
          </div>
          <p className="font-semibold text-sm mt-2">Không có lời mời nào</p>
        </div>
      )}

      <div className="space-y-2">
        <AnimatePresence>
        {list.map((req) => {
          const u = userMap[req.fromUserId];
          const isProcessing = processing === req.id;
          const isAccepted = acceptedId === req.id;

          return (
            <motion.div
              key={req.id}
              initial={{opacity:0,x:-20}}
              animate={{opacity:1,x:0}}
              exit={{opacity:0,x:20,scale:0.9}}
              className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition relative overflow-hidden"
            >
              {isAccepted && (
                <div className="absolute inset-0 pointer-events-none">
                  <DotLottieReact src={acceptLottie} autoplay style={{width:'100%',height:'100%'}} />
                </div>
              )}
              <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
                <img
                  src={
                    u?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      u?.name || "U"
                    )}&background=0042B2&color=fff`
                  }
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {u?.name || "Đang tải..."}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <FiClock size={12} />
                    {timeAgo(req.createdAt?.seconds)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 relative z-10">
                <motion.button
                  whileTap={{scale:0.9}}
                  onClick={() => handleAccept(req)}
                  disabled={isProcessing}
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md disabled:opacity-50"
                  style={{background:'linear-gradient(135deg,#0042B2,#0066FF)'}}
                >
                  <FiCheck size={16} />
                </motion.button>

                <motion.button
                  whileTap={{scale:0.9}}
                  onClick={() => handleReject(req.id)}
                  disabled={isProcessing}
                  className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700"
                >
                  <FiX size={16} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
}
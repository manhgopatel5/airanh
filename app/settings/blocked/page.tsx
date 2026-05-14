"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, UserX, Search, ShieldOff } from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import { celebrate } from "@/components/illustrations";
import { UserAvatar } from "@/components/ui/UserAvatar";

type BlockedUser = { uid: string; name: string; avatar: string; blockedAt: any; };

export default function BlockedPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [search, setSearch] = useState("");
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const uids = snap.data().settings?.blockedUsers || [];
        const users = await Promise.all(uids.map(async (uid: string) => {
          const us = await getDoc(doc(db, "users", uid));
          return { uid, ...us.data(), blockedAt: new Date() } as BlockedUser;
        }));
        setBlocked(users);
      }
    });
    return () => unsub();
  }, [user?.uid, db]);

  const unblock = async (uid: string) => {
    if (!user) return;
    setUnblocking(uid);
    setTimeout(async () => {
      await updateDoc(doc(db, "users", user.uid), { "settings.blockedUsers": arrayRemove(uid) });
      setBlocked(prev => prev.filter(u => u.uid !== uid));
      setUnblocking(null);
      toast.success("Đã bỏ chặn");
      navigator.vibrate?.(10);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    }, 400);
  };

  const filtered = blocked.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <ShieldOff className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Đã chặn ({blocked.length})</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 mb-4 shadow-sm">
            <Search className="w-5 h-5 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." className="flex-1 bg-transparent outline-none placeholder:text-zinc-400" />
          </div>

          <AnimatePresence mode="popLayout">
            {filtered.length === 0? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-12 text-center">
                <UserX className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">{search? "Không tìm thấy" : "Chưa chặn ai"}</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filtered.map((u, idx) => (
                  <motion.div key={u.uid} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: unblocking === u.uid? 0.5 : 1, y: 0, scale: unblocking === u.uid? 0.98 : 1 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: idx * 0.03 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <UserAvatar src={u.avatar} name={u.name} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{u.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Chặn từ {new Date(u.blockedAt).toLocaleDateString("vi-VN")}</p>
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => unblock(u.uid)} disabled={!!unblocking} className="px-4 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 font-semibold text-sm active:scale-95 disabled:opacity-50 shrink-0">
                        Bỏ chặn
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
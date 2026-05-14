"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc, arrayRemove } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Smartphone, Monitor, Laptop, Trash2, MapPin, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import { celebrate } from "@/components/illustrations";

type Session = {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: any;
  current: boolean;
};

export default function SessionsPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data().sessions || [];
        // Mock data nếu trống
        if (data.length === 0) {
          setSessions([
            { id: "1", device: "iPhone 15 Pro", browser: "Safari", os: "iOS 18", ip: "192.168.1", location: "Hồ Chí Minh, VN", lastActive: new Date(), current: true },
            { id: "2", device: "MacBook Pro", browser: "Chrome", os: "macOS", ip: "118.70.1.5", location: "Hà Nội, VN", lastActive: new Date(Date.now() - 3600000), current: false },
          ]);
        } else {
          setSessions(data);
        }
      }
    });
    return () => unsub();
  }, [user?.uid, db]);

  const removeSession = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (session?.current) {
      toast.error("Không thể xóa phiên hiện tại");
      return;
    }
    setRemoving(sessionId);
    setTimeout(async () => {
      await updateDoc(doc(db, "users", user.uid), { sessions: arrayRemove(session) });
      setSessions(prev => prev.filter(s => s.id!== sessionId));
      setRemoving(null);
      toast.success("Đã đăng xuất thiết bị");
      navigator.vibrate?.(10);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1200);
    }, 600);
  };

  const logoutAll = async () => {
    if (!user) return;
    if (!confirm("Đăng xuất tất cả thiết bị khác?")) return;
    const current = sessions.find((s) => s.current);
    await updateDoc(doc(db, "users", user.uid), { sessions: current? [current] : [] });
    setSessions(current? [current] : []);
    toast.success("Đã đăng xuất tất cả");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1200);
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes("iPhone") || device.includes("Android")) return Smartphone;
    if (device.includes("Mac") || device.includes("Windows")) return Laptop;
    return Monitor;
  };

  const formatTime = (date: any) => {
    const d = date?.toDate? date.toDate() : new Date(date);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Vừa xong";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Phiên đăng nhập</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          <AnimatePresence mode="popLayout">
            {sessions.map((session, idx) => {
              const Icon = getDeviceIcon(session.device);
              const isRemoving = removing === session.id;
              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: isRemoving? 0.5 : 1, y: 0, scale: isRemoving? 0.98 : 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${session.current? "bg-[#E8F5E9] dark:bg-green-950/40" : "bg-zinc-100 dark:bg-zinc-900"}`}>
                        <Icon className={`w-5 h-5 ${session.current? "text-[#00C853]" : "text-zinc-600 dark:text-zinc-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text- truncate">{session.device}</p>
                          {session.current && (
                            <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] dark:bg-green-950/40 text-[#00C853] text- font-bold">Hiện tại</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{session.browser} · {session.os}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <p className="text-xs text-zinc-500 truncate">{session.location} · {session.ip}</p>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1.5">Hoạt động: {formatTime(session.lastActive)}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeSession(session.id)} disabled={!!removing} className="p-2.5 -mr-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90 transition disabled:opacity-50">
                        <Trash2 className="w-4.5 h-4.5 text-red-500" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sessions.length > 1 && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={logoutAll} className="w-full h-12 rounded-2xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/20 active:scale-95">
              Đăng xuất tất cả thiết bị khác
            </motion.button>
          )}

          {sessions.length === 0 && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-12 text-center">
              <p className="text-zinc-500">Không có phiên nào</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-32 h-32" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, memo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";

import {
  ChevronLeft, Smartphone, Monitor, Laptop, Trash2, MapPin, ShieldCheck, AlertTriangle
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import * as L from "@/components/illustrations";

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

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

export default function SessionsPage() {
  const db = getFirebaseDB();

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    title: string;
    desc: string;
    onConfirm: () => void;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data().sessions || [];
        // Mock data nếu trống - chỉ để demo
        if (data.length === 0) {
          setSessions([
            { id: "1", device: "iPhone 15 Pro", browser: "Safari", os: "iOS 18", ip: "192.168.1", location: "Hồ Chí Minh, VN", lastActive: new Date(), current: true },
            { id: "2", device: "MacBook Pro", browser: "Chrome", os: "macOS", ip: "118.70.1.5", location: "Hà Nội, VN", lastActive: new Date(Date.now() - 3600000), current: false },
          ]);
        } else {
          setSessions(data);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Không tải được phiên đăng nhập");
      setLoading(false);
    });
    return () => unsub();
  }, [user, authLoading, db, router]);

  const removeSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session?.current) {
      toast.error("Không thể xóa phiên hiện tại");
      return;
    }
    setShowConfirmModal({
      title: "Đăng xuất thiết bị?",
      desc: `${session?.device} sẽ bị đăng xuất ngay lập tức.`,
      onConfirm: async () => {
        setRemoving(sessionId);
        setShowConfirmModal(null);
        try {
          // Filter đúng theo id, không dùng arrayRemove
          const newSessions = sessions.filter((s) => s.id !== sessionId);
          await updateDoc(doc(db, "users", user!.uid), { sessions: newSessions });
          setSessions(newSessions);
          toast.success("Đã đăng xuất thiết bị");
          vibrate(10);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1200);
        } catch (err) {
          console.error(err);
          toast.error("Xóa thất bại");
        } finally {
          setRemoving(null);
        }
      }
    });
  };

  const logoutAll = () => {
    setShowConfirmModal({
      title: "Đăng xuất tất cả?",
      desc: "Tất cả thiết bị khác sẽ bị đăng xuất. Bạn vẫn giữ phiên hiện tại.",
      onConfirm: async () => {
        setShowConfirmModal(null);
        const current = sessions.find((s) => s.current);
        try {
          await updateDoc(doc(db, "users", user!.uid), { sessions: current ? [current] : [] });
          setSessions(current ? [current] : []);
          toast.success("Đã đăng xuất tất cả");
          vibrate(10);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1200);
        } catch (err) {
          console.error(err);
          toast.error("Thao tác thất bại");
        }
      }
    });
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes("iPhone") || device.includes("Android")) return Smartphone;
    if (device.includes("Mac") || device.includes("Windows")) return Laptop;
    return Monitor;
  };

  const formatTime = (date: any) => {
    if (!date) return "Không rõ";
    const d = date?.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return "Không rõ";
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Vừa xong";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="w-32 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="w-24 h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="w-40 h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-background pb-28">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onTouchStart={() => vibrate(5)}
              onClick={() => router.back()}
              type="button"
              className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label="Quay lại"
            >
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
                  animate={{ opacity: isRemoving ? 0.5 : 1, y: 0, scale: isRemoving ? 0.98 : 1 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${session.current ? "bg-[#E8F5E9] dark:bg-green-950/40" : "bg-zinc-100 dark:bg-zinc-900"}`}>
                        <Icon className={`w-5 h-5 ${session.current ? "text-[#00C853]" : "text-zinc-600 dark:text-zinc-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base truncate">{session.device}</p>
                          {session.current && (
                            <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] dark:bg-green-950/40 text-[#00C853] text-xs font-bold">Hiện tại</span>
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
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onTouchStart={() => vibrate(5)}
                        onClick={() => removeSession(session.id)}
                        disabled={!!removing}
                        type="button"
                        className="p-2.5 -mr-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-90 transition disabled:opacity-50"
                        aria-label="Xóa phiên"
                      >
                        {isRemoving ? (
                          <LottiePlayer animationData={L.loadingPull} loop className="w-4.5 h-4.5" />
                        ) : (
                          <Trash2 className="w-4.5 h-4.5 text-red-500" />
                        )}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {sessions.length > 1 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onTouchStart={() => vibrate(5)}
              onClick={logoutAll}
              type="button"
              className="w-full h-12 rounded-2xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/20 active:scale-95"
            >
              Đăng xuất tất cả thiết bị khác
            </motion.button>
          )}

          {sessions.length === 0 && (
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-12 text-center">
              <p className="text-zinc-500">Không có phiên nào</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <LottiePlayer animationData={L.celebrate} autoplay loop={false} className="w-32 h-32" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showConfirmModal && (
            <Modal
              title={showConfirmModal.title}
              desc={showConfirmModal.desc}
              onClose={() => setShowConfirmModal(null)}
              onConfirm={showConfirmModal.onConfirm}
              confirmText="Xác nhận"
              danger
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

interface ModalProps {
  title: string;
  desc: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  danger?: boolean;
}

const Modal = memo(({ title, desc, onClose, onConfirm, confirmText, danger }: ModalProps) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-t-3xl p-6">
      <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${danger ? "bg-red-100 dark:bg-red-950/40" : "bg-blue-100 dark:bg-blue-950/40"}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-500" : "text-blue-500"}`} />
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500 mb-6 ml-13">{desc}</p>
      <button
        type="button"
        onTouchStart={() => vibrate(5)}
        onClick={() => { vibrate(5); onConfirm(); }}
        className={`w-full h-12 rounded-2xl font-semibold mb-3 active:scale-95 transition ${danger ? "bg-red-500 text-white" : "bg-[#0042B2] text-white"}`}
      >
        {confirmText}
      </button>
      <button
        type="button"
        onTouchStart={() => vibrate(5)}
        onClick={onClose}
        className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold active:scale-95 transition"
      >
        Hủy
      </button>
    </motion.div>
  </motion.div>
));
Modal.displayName = "Modal";
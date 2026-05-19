"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, memo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, updateDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  ChevronLeft, Trash2, Image as ImageIcon, MessageSquare, FileText, HardDrive
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import * as L from "@/components/illustrations";

type StorageData = {
  total: number;
  used: number;
  images: number;
  messages: number;
  docs: number;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

export default function StoragePage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [storage, setStorage] = useState<StorageData>({
    total: 100,
    used: 23.5,
    images: 15.2,
    messages: 6.8,
    docs: 1.5,
  });
  const [clearing, setClearing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    title: string;
    desc: string;
    onConfirm: () => void;
  } | null>(null);

  const percent = Math.round((storage.used / storage.total) * 100);

  // Load storage từ Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStorage(data.storage || { total: 100, used: 23.5, images: 15.2, messages: 6.8, docs: 1.5 });
      }
    });
    return () => unsub();
  }, [user, db]);

  const updateStorageFirestore = useCallback(async (newStorage: StorageData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { storage: newStorage }, { merge: true });
    } catch (err) {
      console.error("Update storage failed:", err);
    }
  }, [user, db]);

  const clearCache = () => {
    setShowConfirmModal({
      title: "Xóa tất cả cache?",
      desc: "Hành động này sẽ đăng xuất bạn và xóa toàn bộ dữ liệu tạm. Tiếp tục?",
      onConfirm: async () => {
        setClearing("all");
        setShowConfirmModal(null);
        try {
          if ("caches" in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
          localStorage.clear();
          sessionStorage.clear();
          await updateDoc(doc(db, "users", user!.uid), { online: false, lastSeen: serverTimestamp() });
          await signOut(auth);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            router.push("/login");
          }, 1500);
        } catch {
          toast.error("Xóa cache thất bại");
          setClearing(null);
        }
      }
    });
  };

  const clearImages = () => {
    setShowConfirmModal({
      title: "Xóa ảnh đã cache?",
      desc: "Tất cả ảnh và video đã tải về sẽ bị xóa khỏi thiết bị.",
      onConfirm: () => {
        setClearing("images");
        setShowConfirmModal(null);
        setTimeout(() => {
          const newStorage = { ...storage, images: 0, used: storage.used - storage.images };
          setStorage(newStorage);
          updateStorageFirestore(newStorage);
          setClearing(null);
          toast.success("Đã xóa ảnh");
          vibrate(10);
        }, 800);
      }
    });
  };

  const clearMessages = () => {
    setShowConfirmModal({
      title: "Xóa tin nhắn cũ?",
      desc: "Tin nhắn cũ hơn 90 ngày sẽ bị xóa vĩnh viễn khỏi thiết bị.",
      onConfirm: () => {
        setClearing("messages");
        setShowConfirmModal(null);
        setTimeout(() => {
          const newStorage = { ...storage, messages: 0, used: storage.used - storage.messages };
          setStorage(newStorage);
          updateStorageFirestore(newStorage);
          setClearing(null);
          toast.success("Đã xóa tin nhắn cũ");
          vibrate(10);
        }, 800);
      }
    });
  };

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
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">Dung lượng</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm">
            <div className="flex items-end justify-between mb-5">
              <div>
                <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl font-black tracking-tight">
                  {storage.used.toFixed(1)}<span className="text-2xl text-zinc-500 ml-1">MB</span>
                </motion.p>
                <p className="text-sm text-zinc-500 mt-1">Đã dùng / {storage.total} MB</p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="url(#grad)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: percent / 100 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ strokeDasharray: 201, strokeDashoffset: 0 }}
                  />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0042B2" />
                      <stop offset="100%" stopColor="#1A5FFF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#0042B2]">{percent}%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 h-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${(storage.images / storage.total) * 100}%` }} className="bg-[#0042B2] rounded-full" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${(storage.messages / storage.total) * 100}%` }} className="bg-[#00C853] rounded-full" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${(storage.docs / storage.total) * 100}%` }} className="bg-[#FFB800] rounded-full" />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0042B2]" /><span className="text-zinc-600 dark:text-zinc-400">Ảnh</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#00C853]" /><span className="text-zinc-600 dark:text-zinc-400">Chat</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#FFB800]" /><span className="text-zinc-600 dark:text-zinc-400">Tài liệu</span></div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">CHI TIẾT</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <StorageItem label="Ảnh & Video" icon={ImageIcon} size={storage.images} color="#0042B2" onClear={clearImages} loading={clearing === "images"} />
              <StorageItem label="Tin nhắn" icon={MessageSquare} size={storage.messages} color="#00C853" onClear={clearMessages} loading={clearing === "messages"} />
              <StorageItem label="Tài liệu" icon={FileText} size={storage.docs} color="#FFB800" />
            </div>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onTouchStart={() => vibrate(5)}
            onClick={clearCache}
            disabled={!!clearing}
            type="button"
            className="w-full h-12 rounded-2xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-red-500/20"
          >
            {clearing === "all" ? <LottiePlayer animationData={L.loadingPull} loop autoplay className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            {clearing === "all" ? "Đang xóa..." : "Xóa tất cả cache"}
          </motion.button>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <LottiePlayer animationData={L.celebrate} autoplay loop={false} className="w-40 h-40" />
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
              confirmText="Xóa"
              danger
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function StorageItem({
  label,
  icon: Icon,
  size,
  color,
  onClear,
  loading,
}: any) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-zinc-500">{size.toFixed(1)} MB</p>
        </div>
      </div>
      {onClear && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onTouchStart={() => vibrate(5)}
          onClick={onClear}
          disabled={loading}
          type="button"
          className="px-4 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-sm font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? <LottiePlayer animationData={L.loadingPull} loop className="w-4 h-4" /> : "Xóa"}
        </motion.button>
      )}
    </div>
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
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 mb-6">{desc}</p>
      <button
        type="button"
        onTouchStart={() => vibrate(5)}
        onClick={() => { vibrate(5); onConfirm(); }}
        className={`w-full h-12 rounded-2xl font-semibold mb-3 active:scale-95 transition ${danger? "bg-red-500 text-white" : "bg-[#0042B2] text-white"}`}
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
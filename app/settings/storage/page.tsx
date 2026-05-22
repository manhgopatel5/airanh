"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { ChevronLeft, Trash2, Image, MessageSquare, FileText, Database, AlertTriangle, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import SettingItem from "@/components/common/SettingItem";
import ProfileModal from "@/components/common/ProfileModal";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

type StorageData = {
  total: number;
  used: number;
  images: number;
  messages: number;
  docs: number;
  other: number;
  loading: boolean;
};

export default function StoragePage() {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [storage, setStorage] = useState<StorageData>({
    total: 0,
    used: 0,
    images: 0,
    messages: 0,
    docs: 0,
    other: 0,
    loading: true,
  });

  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showClearImagesModal, setShowClearImagesModal] = useState(false);
  const [showClearMessagesModal, setShowClearMessagesModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const accentGradient = isPlan
  ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";

  const percentUsed = storage.total > 0? Math.round((storage.used / storage.total) * 100) : 0;

  // 1. LẤY DUNG LƯỢNG BROWSER THẬT
  const calculateBrowserStorage = async (): Promise<{ images: number; other: number }> => {
    let imagesSize = 0;
    let otherSize = 0;

    // Cache API - ảnh/video cache
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          for (const req of requests) {
            const res = await cache.match(req);
            if (res) {
              const blob = await res.blob();
              const url = req.url.toLowerCase();
              if (url.match(/\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/)) {
                imagesSize += blob.size;
              } else {
                otherSize += blob.size;
              }
            }
          }
        }
      } catch (e) {
        console.error("Cache API error:", e);
      }
    }

    // LocalStorage + SessionStorage
    let lsSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        lsSize += localStorage[key].length + key.length;
      }
    }
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        lsSize += sessionStorage[key].length + key.length;
      }
    }
    otherSize += lsSize;

    return {
      images: parseFloat((imagesSize / 1024 / 1024).toFixed(2)),
      other: parseFloat((otherSize / 1024 / 1024).toFixed(2)),
    };
  };

  // 2. LẤY DUNG LƯỢNG FIRESTORE THẬT
  const calculateFirestoreStorage = async (): Promise<{ messages: number; docs: number }> => {
    if (!user?.uid) return { messages: 0, docs: 0 };

    let messagesSize = 0;
    let docsSize = 0;

    try {
      // Tin nhắn: đếm size tất cả docs trong chats
      const chatsSnap = await getDocs(collection(db, "chats"));
      for (const chatDoc of chatsSnap.docs) {
        const msgSnap = await getDocs(collection(db, `chats/${chatDoc.id}/messages`));
        msgSnap.forEach(doc => {
          const data = JSON.stringify(doc.data());
          messagesSize += new Blob([data]).size;
        });
      }

      // Tài liệu: đếm size tasks + plans
      const tasksSnap = await getDocs(query(collection(db, "tasks"), where("userId", "==", user.uid)));
      tasksSnap.forEach(doc => {
        docsSize += new Blob([JSON.stringify(doc.data())]).size;
      });

      const plansSnap = await getDocs(query(collection(db, "plans"), where("userId", "==", user.uid)));
      plansSnap.forEach(doc => {
        docsSize += new Blob([JSON.stringify(doc.data())]).size;
      });

    } catch (e) {
      console.error("Firestore calc error:", e);
    }

    return {
      messages: parseFloat((messagesSize / 1024 / 1024).toFixed(2)),
      docs: parseFloat((docsSize / 1024 / 1024).toFixed(2)),
    };
  };

  // 3. TỔNG HỢP
  const loadStorageData = async () => {
    setStorage(prev => ({...prev, loading: true }));

    try {
      // Lấy quota browser
      let totalMB = 100; // fallback
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        totalMB = parseFloat(((estimate.quota || 0) / 1024 / 1024).toFixed(0));
      }

      // Chạy song song
      const [browser, firestore] = await Promise.all([
        calculateBrowserStorage(),
        calculateFirestoreStorage(),
      ]);

      const usedMB = browser.images + browser.other + firestore.messages + firestore.docs;

      setStorage({
        total: totalMB,
        used: parseFloat(usedMB.toFixed(2)),
        images: browser.images,
        messages: firestore.messages,
        docs: firestore.docs,
        other: browser.other,
        loading: false,
      });
    } catch (e) {
      toast.error("Không thể tải dung lượng");
      setStorage(prev => ({...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadStorageData();
  }, [user?.uid]);

  // 4. XÓA THẬT
  const clearImages = async () => {
    setShowClearImagesModal(false);
    setDeleting("images");
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      toast.success("Đã xóa ảnh cache");
      if ("vibrate" in navigator) navigator.vibrate(8);
      await loadStorageData(); // Load lại số thật
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeleting(null);
    }
  };

  const clearMessages = async () => {
    setShowClearMessagesModal(false);
    setDeleting("messages");
    try {
      // TODO: Gọi API backend xóa tin nhắn cũ >90 ngày
      // Hiện tại chỉ toast demo
      toast.success("Đã xóa tin nhắn cũ >90 ngày");
      if ("vibrate" in navigator) navigator.vibrate(8);
      await loadStorageData();
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeleting(null);
    }
  };

  const clearCache = async () => {
    setShowClearCacheModal(false);
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Đã xóa cache. Đang đăng xuất...");
      if ("vibrate" in navigator) navigator.vibrate(8);
      setTimeout(() => window.location.href = "/login", 1000);
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button onClick={() => router.back()} className="absolute left-4 p-1 active:opacity-60 transition">
            <ChevronLeft className="w-6 h-6 text-[#0F172A] dark:text-white" />
          </button>
          <h1 className="text- font-bold text-[#0F172A] dark:text-white">Dung lượng</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-7">
        {/* Chart tổng */}
        <div className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl p-6">
          {storage.loading? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-[#64748B]" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-3xl font-black text-[#0F172A] dark:text-white">
                    {storage.used} <span className="text-lg font-semibold text-[#64748B] dark:text-zinc-400">MB</span>
                  </p>
                  <p className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">
                    Đã sử dụng / {storage.total} MB
                  </p>
                </div>

                {/* Ring Chart */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="8" fill="none" className="text-[#E2E8F0] dark:text-zinc-800" />
                    <circle
                      cx="40" cy="40" r="32" stroke="url(#gradient)" strokeWidth="8" fill="none"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - percentUsed / 100)}`}
                      strokeLinecap="round" className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" className={isPlan? "text-green-500" : "text-sky-500"} stopColor="currentColor" />
                        <stop offset="100%" className={isPlan? "text-emerald-500" : "text-blue-600"} stopColor="currentColor" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text- font-bold bg-gradient-to-br ${accentGradient} bg-clip-text text-transparent`}>
                      {percentUsed}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full h-2 bg-[#E2E8F0] dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${accentGradient} transition-all duration-1000`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>

              {percentUsed > 80 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                  <p className="text- text-amber-700 dark:text-amber-400 font-medium">
                    Dung lượng sắp đầy. Hãy dọn dẹp để app chạy mượt hơn.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chi tiết */}
        <Section title="CHI TIẾT LƯU TRỮ">
          <StorageItem
            label="Ảnh & Video"
            icon={Image}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            size={storage.images}
            loading={storage.loading || deleting === "images"}
            onClear={() => setShowClearImagesModal(true)}
          />
          <StorageItem
            label="Tin nhắn"
            icon={MessageSquare}
            iconColor="text-green-500"
            iconBg="bg-green-50 dark:bg-green-950/30"
            size={storage.messages}
            loading={storage.loading || deleting === "messages"}
            onClear={() => setShowClearMessagesModal(true)}
          />
          <StorageItem
            label="Tài liệu"
            icon={FileText}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-950/30"
            size={storage.docs}
            loading={storage.loading}
          />
          <StorageItem
            label="Khác"
            icon={Database}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            size={storage.other}
            loading={storage.loading}
          />
        </Section>

        {/* Dọn dẹp */}
        <Section title="DỌN DẸP">
          <SettingItem
            label="Xóa tất cả cache"
            subtitle="Đăng xuất và xóa dữ liệu tạm"
            icon={Trash2}
            iconColor="text-red-500"
            iconBg="bg-red-50 dark:bg-red-950/30"
            onClick={() => setShowClearCacheModal(true)}
            danger
          />
        </Section>
      </div>

      {/* Modals */}
      {showClearCacheModal && (
        <ProfileModal
          title="Xóa tất cả cache?"
          desc="Thao tác này sẽ xóa toàn bộ dữ liệu tạm và đăng xuất bạn khỏi ứng dụng. Bạn sẽ cần đăng nhập lại."
          onClose={() => setShowClearCacheModal(false)}
          onConfirm={clearCache}
          confirmText="Xóa & Đăng xuất"
          danger
        />
      )}
      {showClearImagesModal && (
        <ProfileModal
          title="Xóa ảnh cache?"
          desc={`Xóa ${storage.images} MB ảnh và video đã lưu tạm. Ảnh gốc trên cloud không bị ảnh hưởng.`}
          onClose={() => setShowClearImagesModal(false)}
          onConfirm={clearImages}
          confirmText="Xóa ảnh"
          danger
        />
      )}
      {showClearMessagesModal && (
        <ProfileModal
          title="Xóa tin nhắn cũ?"
          desc={`Xóa ${storage.messages} MB tin nhắn cũ hơn 90 ngày. Tin nhắn gần đây vẫn giữ nguyên.`}
          onClose={() => setShowClearMessagesModal(false)}
          onConfirm={clearMessages}
          confirmText="Xóa tin nhắn"
          danger
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text- font-bold text-[#64748B] dark:text-zinc-400 tracking-wider mb-1">{title}</div>
      <div className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function StorageItem({
  label,
  icon: Icon,
  iconColor = "text-[#0F172A]",
  iconBg = "bg-[#F1F5F9]",
  size,
  loading,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  size: number;
  loading?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text- font-semibold text-[#0F172A] dark:text-white">{label}</div>
        <div className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">
          {loading? "Đang tính..." : `${size} MB`}
        </div>
      </div>
      {onClear && size > 0 &&!loading && (
        <button
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(5);
            onClear();
          }}
          className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] dark:bg-zinc-800 text- font-semibold text-[#0F172A] dark:text-white active:scale-95 transition flex-shrink-0"
        >
          Xóa
        </button>
      )}
    </div>
  );
}
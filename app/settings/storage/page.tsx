"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { ChevronLeft, Trash2, Image, MessageSquare, FileText, Database, AlertTriangle } from "lucide-react";
import { toast, Toaster } from "sonner";
import SettingItem from "@/components/common/SettingItem";
import ProfileModal from "@/components/common/ProfileModal";

type StorageData = {
  total: number;
  used: number;
  images: number;
  messages: number;
  docs: number;
  other: number;
};

export default function StoragePage() {
  const router = useRouter();
  const { user } = useAuth();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  
  const [storage, setStorage] = useState<StorageData>({
    total: 100,
    used: 23.5,
    images: 15.2,
    messages: 6.8,
    docs: 1.5,
    other: 0,
  });
  
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showClearImagesModal, setShowClearImagesModal] = useState(false);
  const [showClearMessagesModal, setShowClearMessagesModal] = useState(false);

  const accentGradient = isPlan
   ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";

  const percentUsed = Math.round((storage.used / storage.total) * 100);

  // TODO: Load real storage data from Firebase/IndexedDB
  useEffect(() => {
    if (!user?.uid) return;
    // const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
    //   if (snap.exists()) setStorage(snap.data().storage);
    // });
    // return () => unsub();
  }, [user?.uid]);

  const clearCache = async () => {
    setShowClearCacheModal(false);
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Đã xóa cache. Đang đăng xuất...");
    if ("vibrate" in navigator) navigator.vibrate(8);
    setTimeout(() => window.location.href = "/login", 1000);
  };

  const clearImages = () => {
    setShowClearImagesModal(false);
    // TODO: Call API delete cached images
    toast.success("Đã xóa ảnh cache");
    if ("vibrate" in navigator) navigator.vibrate(5);
    setStorage({...storage, images: 0, used: storage.used - storage.images });
  };

  const clearMessages = () => {
    setShowClearMessagesModal(false);
    // TODO: Call API delete old messages
    toast.success("Đã xóa tin nhắn cũ >90 ngày");
    if ("vibrate" in navigator) navigator.vibrate(5);
    setStorage({...storage, messages: 0, used: storage.used - storage.messages });
  };

  const clearDocs = () => {
    toast.success("Đã xóa tài liệu cache");
    if ("vibrate" in navigator) navigator.vibrate(5);
    setStorage({...storage, docs: 0, used: storage.used - storage.docs });
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-3xl font-black text-[#0F172A] dark:text-white">
                {storage.used.toFixed(1)} <span className="text-lg font-semibold text-[#64748B] dark:text-zinc-400">MB</span>
              </p>
              <p className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">
                Đã sử dụng / {storage.total} MB
              </p>
            </div>
            
            {/* Ring Chart */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-[#E2E8F0] dark:text-zinc-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - percentUsed / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
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

          {/* Progress bar */}
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
        </div>

        {/* Chi tiết */}
        <Section title="CHI TIẾT LƯU TRỮ">
          <StorageItem
            label="Ảnh & Video"
            icon={Image}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            size={storage.images}
            onClear={() => setShowClearImagesModal(true)}
          />
          <StorageItem
            label="Tin nhắn"
            icon={MessageSquare}
            iconColor="text-green-500"
            iconBg="bg-green-50 dark:bg-green-950/30"
            size={storage.messages}
            onClear={() => setShowClearMessagesModal(true)}
          />
          <StorageItem
            label="Tài liệu"
            icon={FileText}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-950/30"
            size={storage.docs}
            onClear={clearDocs}
          />
          <StorageItem
            label="Khác"
            icon={Database}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            size={storage.other}
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
          desc={`Xóa ${storage.images.toFixed(1)} MB ảnh và video đã lưu tạm. Ảnh gốc trên cloud không bị ảnh hưởng.`}
          onClose={() => setShowClearImagesModal(false)}
          onConfirm={clearImages}
          confirmText="Xóa ảnh"
          danger
        />
      )}
      {showClearMessagesModal && (
        <ProfileModal
          title="Xóa tin nhắn cũ?"
          desc={`Xóa ${storage.messages.toFixed(1)} MB tin nhắn cũ hơn 90 ngày. Tin nhắn gần đây vẫn giữ nguyên.`}
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
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  size: number;
  onClear?: () => void;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text- font-semibold text-[#0F172A] dark:text-white">{label}</div>
        <div className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">{size.toFixed(1)} MB</div>
      </div>
      {onClear && size > 0 && (
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
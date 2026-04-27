"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronLeft, Database, Trash2, Image, MessageSquare, FileText } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function StoragePage() {
  const router = useRouter();
  const [storage, setStorage] = useState({
    total: 100,
    used: 23.5,
    images: 15.2,
    messages: 6.8,
    docs: 1.5,
  });

  const clearCache = async () => {
    if (!confirm("Xóa cache sẽ đăng xuất bạn. Tiếp tục?")) return;
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Đã xóa cache");
    setTimeout(() => window.location.href = "/login", 1000);
  };

  const clearImages = () => {
    if (!confirm("Xóa tất cả ảnh đã cache?")) return;
    toast.success("Đã xóa ảnh");
    setStorage({...storage, images: 0, used: storage.used - storage.images });
  };

  const clearMessages = () => {
    if (!confirm("Xóa tin nhắn cũ >90 ngày?")) return;
    toast.success("Đã xóa tin nhắn cũ");
    setStorage({...storage, messages: 0, used: storage.used - storage.messages });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dung lượng</h1>
      </div>

      <div className="px-6 space-y-5">
        {/* Chart */}
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-3xl p-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{storage.used.toFixed(1)} MB</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Đã sử dụng / {storage.total} MB</p>
            </div>
            <div className="w-16 h-16 rounded-full border-8 border-sky-500 flex items-center justify-center">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                {Math.round((storage.used / storage.total) * 100)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-blue-500"
              style={{ width: `${(storage.used / storage.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Chi tiết */}
        <div className="space-y-3">
          <StorageItem label="Ảnh & Video" icon={Image} size={storage.images} onClear={clearImages} />
          <StorageItem label="Tin nhắn" icon={MessageSquare} size={storage.messages} onClear={clearMessages} />
          <StorageItem label="Tài liệu" icon={FileText} size={storage.docs} />
        </div>

        <button
          onClick={clearCache}
          className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          Xóa tất cả cache
        </button>
      </div>
    </div>
  );
}

function StorageItem({
  label,
  icon: Icon,
  size,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  size: number;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">{size.toFixed(1)} MB</p>
        </div>
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800 text-sm font-semibold text-gray-900 dark:text-white active:scale-95 transition"
        >
          Xóa
        </button>
      )}
    </div>
  );
}
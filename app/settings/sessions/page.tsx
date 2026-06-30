"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext"; // Bỏ trackCurrentSession
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  deleteDoc, 
  doc, 
  getDocs 
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiLoader, FiArrowLeft } from "react-icons/fi";
import { Smartphone, Monitor, Laptop, Trash2, MapPin, Shield, LogOut } from "lucide-react";
import { toast, Toaster } from "sonner";
import { SESSION_KEY } from "@/lib/sessionTracking";

type Session = {
  id: string;
  uid: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: any;
  createdAt: any;
  current: boolean;
  userAgent: string;
};

export default function SessionsPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // XÓA: useEffect tạo session. Session giờ tạo ở API route /api/user/session
  // Client chỉ đọc, không write để tiết kiệm quota

  // LISTEN SESSIONS REALTIME - Chỉ đọc, 0 write
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setLoading(false);
      setSessions([]);
      return;
    }

    const q = query(
      collection(db, "sessions"),
      where("uid", "==", user.uid),
      orderBy("lastActive", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data() 
      } as Session));
      
      const sorted = [...data].sort((a, b) => {
        if (a.current && !b.current) return -1;
        if (!a.current && b.current) return 1;
        const aTime = a.lastActive?.toMillis?.() || 0;
        const bTime = b.lastActive?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setSessions(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Sessions listen error:", err);
      toast.error("Không tải được danh sách phiên");
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  const removeSession = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (session?.current) {
      toast.error("Không thể xóa phiên hiện tại. Hãy đăng xuất.");
      return;
    }

    if (!confirm("Đăng xuất thiết bị này?")) return;

    setRemovingId(sessionId);
    try {
      await deleteDoc(doc(db, "sessions", sessionId));
      toast.success("Đã đăng xuất thiết bị");
    } catch (err) {
      console.error(err);
      toast.error("Đăng xuất thất bại");
    } finally {
      setRemovingId(null);
    }
  };

  const logoutAll = async () => {
    if (!user) return;
    if (!confirm("Đăng xuất tất cả thiết bị khác? Thiết bị này vẫn giữ đăng nhập.")) return;

    setLoading(true);
    try {
      const currentSessionId = localStorage.getItem(SESSION_KEY);
      const q = query(
        collection(db, "sessions"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      const batch = snap.docs
        .filter((d) => d.id !== currentSessionId)
        .map((d) => deleteDoc(d.ref));
      
      await Promise.all(batch);
      toast.success("Đã đăng xuất tất cả thiết bị khác");
    } catch (err) {
      console.error(err);
      toast.error("Thất bại");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes("iphone") || d.includes("android") || d.includes("mobile")) return Smartphone;
    if (d.includes("mac") || d.includes("windows") || d.includes("linux")) return Laptop;
    return Monitor;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Không rõ";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  if (authLoading || (loading && !sessions.length)) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <FiLoader className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Phiên đăng nhập</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex-1 px-4 mt-6 pb-6">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Chưa có phiên đăng nhập
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-500 text-center">
              Các thiết bị đã đăng nhập sẽ hiển thị ở đây
            </p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl px-4 py-3.5 mb-6 flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-900 dark:text-blue-200 font-semibold uppercase">
                  Bảo mật
                </div>
                <div className="text-base font-medium text-blue-900 dark:text-blue-100">
                  {sessions.length} thiết bị đang đăng nhập
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {sessions.map((session) => {
                const Icon = getDeviceIcon(session.device);
                return (
                  <div key={session.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className="w-5 h-5 text-gray-900 dark:text-white flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                              {session.device || "Thiết bị không rõ"}
                            </p>
                            {session.current && (
                              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold flex-shrink-0">
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-zinc-400">
                            {session.browser} · {session.os}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                              {session.location || "Không rõ"} · {session.ip || "Ẩn"}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                            Hoạt động: {formatTime(session.lastActive)}
                          </p>
                        </div>
                      </div>
                      {!session.current && (
                        <button
                          onClick={() => removeSession(session.id)}
                          disabled={removingId === session.id}
                          className="p-2 -mr-2 active:opacity-50 disabled:opacity-50"
                          aria-label="Xóa phiên"
                        >
                          {removingId === session.id ? (
                            <FiLoader className="animate-spin w-4 h-4 text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {sessions.length > 1 && !loading && (
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black pt-8">
          <button
            onClick={logoutAll}
            disabled={loading}
            className="w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 bg-red-500 text-white shadow-lg shadow-red-500/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang xử lý...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Đăng xuất tất cả thiết bị khác
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
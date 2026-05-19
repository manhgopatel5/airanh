"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getFirebaseDB, getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
  Timestamp,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import TaskFeed from "@/components/TaskFeed";
import ShareTaskModal from "@/components/ShareTaskModal";
import { useAppStore } from "@/store/app";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";
import { nanoid } from "nanoid";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "sonner";

// Icons
import { FiMapPin } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import {
  Home as HomeIcon,
  MessageSquare,
  ClipboardList,
  User,
  Plus,
  Sparkles as SparklesIcon,
  CalendarRange,
  HelpCircle,
  LogOut,
  Trash2,
  Shield,
  Lock,
  Camera,
  Check,
  QrCode,
  Share2,
  ChevronRight,
  Settings,
  Circle,
  Zap,
  Star,
  ScanLine,
  X
} from "lucide-react";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";
type MainTab = "home" | "messages" | "tasks" | "profile";

type UserData = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  userId: string;
  avatar: string;
  bio?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  emailVerified?: boolean;
  hidePhone?: boolean;
  stats?: { tasks: number; plans: number; completed: number; rating: number };
};

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 animate-in fade-in duration-300">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-3/4 animate-pulse" />
            <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppContainer() {
  const { user } = useAuth();
  const [db, setDb] = useState<any>(null);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  
  const [currentMainTab, setCurrentMainTab] = useState<MainTab>("home");
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  
  const [allItems, setAllItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareTask, setShareTask] = useState<Task | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
    } catch (err) {
      console.error("Firebase init error:", err);
      setError("Không thể kết nối database");
      setLoading(false);
    }
  }, [db]);

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const now = Timestamp.now();
      const constraints: any[] = [
        where("type", "==", mode),
        where("visibility", "==", "public"),
        where("status", "in", ["open", "full", "doing"]),
        where("deadline", ">", now),
        orderBy("deadline", "asc"),
        limit(PAGE_SIZE),
      ];
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"), ...constraints);
    },
    [db, mode]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!db) return;
      
      if (allItems.length > 0) {
        setRefreshing(true);
      } else {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }

      const q = buildQuery();
      if (!q) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        
        setAllItems(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err: any) {
        console.error("Firestore error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setAllItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, buildQuery, allItems.length]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMore = useCallback(async () => {
    if (!db || !lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      if (!q) return;
      const snap = await getDocs(q);
      const newItems = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setAllItems((prev) => [...prev, ...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (mode === "task") {
      result = result.filter((t) => isTask(t)) as TaskItem[];
    } else {
      result = result.filter((t) => isPlan(t)) as PlanItem[];
    }
    result = result.filter((t) => t.banned !== true && t.hidden !== true);
    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return result as Task[];
  }, [allItems, mode, activeTab]);

  const mainNavItems = [
    { id: "home" as MainTab, label: "Home", Icon: HomeIcon },
    { id: "messages" as MainTab, label: "Messages", Icon: MessageSquare },
    { id: "tasks" as MainTab, label: "Tasks", Icon: ClipboardList },
    { id: "profile" as MainTab, label: "Profile", Icon: User },
  ];

  const subTabs = [
    { id: "hot" as TabId, label: "Hot", icon: HiFire, color: "orange" },
    { id: "near" as TabId, label: "Gần bạn", icon: FiMapPin, color: "emerald" },
    { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers, color: "blue" },
    { id: "new" as TabId, label: "Mới", icon: HiSparkles, color: "purple" },
  ];

  const activeColorClass = mode === "plan" ? "text-emerald-500" : "text-blue-600";
  const activeBgClass = mode === "plan" ? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = mode === "plan" ? "shadow-emerald-500/20" : "shadow-blue-600/20";

  const renderTabContent = () => {
    switch (currentMainTab) {
      case "messages":
        return (
          <div className="flex flex-col items-center justify-center pt-32 text-zinc-400 animate-in fade-in duration-300">
            <MessageSquare size={48} className="mb-2 opacity-40" />
            <p className="font-medium text-sm">Trang Tin Nhắn (Đang phát triển)</p>
          </div>
        );
      case "tasks":
        return (
          <div className="flex flex-col items-center justify-center pt-32 text-zinc-400 animate-in fade-in duration-300">
            <ClipboardList size={48} className="mb-2 opacity-40" />
            <p className="font-medium text-sm">Trang Quản Lý Nhiệm Vụ</p>
          </div>
        );
      case "profile":
        return <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />;
      default:
        return (
          <>
            {/* THANH CHỌN MODE CHỈ HIỆN TRÊN TRANG CHỦ */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-gray-100 dark:border-zinc-900">
              <div className="max-w-md mx-auto bg-gray-100 dark:bg-zinc-900 rounded-2xl p-1 flex relative">
                <button
                  onClick={() => { setMode("task"); if ("vibrate" in navigator) navigator.vibrate(5); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
                    mode === "task" ? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
                  }`}
                >
                  <SparklesIcon size={16} /> Task
                  {mode === "task" && (
                    <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl -z-10" />
                  )}
                </button>
                <button
                  onClick={() => { setMode("plan"); if ("vibrate" in navigator) navigator.vibrate(5); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
                    mode === "plan" ? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
                  }`}
                >
                  <CalendarRange size={16} /> Plan
                  {mode === "plan" && (
                    <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl -z-10" />
                  )}
                </button>
              </div>
            </div>

            {/* THANH SUB-TABS (HOT, GẦN BẠN...) CHỈ HIỆN TRÊN TRANG CHỦ */}
            <div className="sticky top-[64px] z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
              <div className="max-w-2xl mx-auto px-4">
                <div className="flex justify-around">
                  {subTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if ("vibrate" in navigator) navigator.vibrate(5);
                        }}
                        className={`flex flex-col items-center py-3 px-2 flex-1 transition-all active:scale-95 ${
                          active ? `text-${tab.color}-600 dark:text-${tab.color}-400` : "text-gray-400 dark:text-zinc-500"
                        }`}
                      >
                        <Icon size={20} className={active ? "scale-110" : ""} />
                        <span className="text-xs font-bold mt-1">{tab.label}</span>
                        <div className={`mt-1 h-0.5 rounded-full transition-all duration-300 ${active ? `w-6 bg-${tab.color}-500` : "w-0"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FEED CHÍNH */}
            <div className="pt-4">
              {loading ? (
                <SkeletonList />
              ) : (
                <div className={`transition-all duration-200 ${refreshing ? "opacity-50 scale-[0.99]" : "opacity-100"}`}>
                  <TaskFeed
                    tasks={filteredItems}
                    mode={mode}
                    activeTab={activeTab}
                    onShare={(t) => { setShareTask(t); setShowShareModal(true); }}
                    onTaskUpdate={(id, up) => setAllItems(prev => prev.map(t => t.id === id ? { ...t, ...up } as Task : t))}
                  />
                </div>
              )}
              
              {!loading && hasMore && allItems.length > 0 && (
                <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
                  {loadingMore && (
                    <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <LayoutGroup id="app-global-navigation-flow">
      <div className="min-h-screen pb-28 font-sans bg-white dark:bg-zinc-950 select-none relative">
        <Toaster richColors position="top-center" />

        {refreshing && (
          <div className="fixed top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 animate-pulse z-50" />
        )}

        <div className="w-full max-w-2xl mx-auto">
          {renderTabContent()}
        </div>

        {/* BOTTOM NAVIGATION CHẠY BẰNG STATE */}
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center justify-end">
          <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
            
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="w-full bg-white/90 backdrop-blur-2xl rounded-[28px] p-2.5 border border-zinc-200/40 shadow-xl pointer-events-auto flex flex-col gap-1"
                >
                  <button onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><SparklesIcon size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Nhiệm vụ mới</h4><p className="text-xs text-zinc-400">Xử lý ngay đầu việc nhỏ</p></div>
                  </button>
                  <button onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarRange size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Kế hoạch dài hạn</h4><p className="text-xs text-zinc-400">Lên kế hoạch tuần, tháng chỉn chu</p></div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full pointer-events-auto relative rounded-[26px] border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between h-[64px] px-2 relative">
                
                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(0, 2).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="w-[64px] flex justify-center h-full items-center relative">
                  <button onClick={() => { setIsMenuOpen(!isMenuOpen); if ("vibrate" in navigator) navigator.vibrate(8); }} className="outline-none z-10 p-2">
                    <motion.div
                      animate={{ rotate: isMenuOpen ? 135 : 0 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${isMenuOpen ? "bg-zinc-900" : activeBgClass} ${dynamicGlow}`}
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </motion.div>
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(2, 4).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {showShareModal && shareTask && (
        <ShareTaskModal task={shareTask} onClose={() => setShowShareModal(false)} />
      )}

      {error && <span className="hidden">{error}</span>}
    </LayoutGroup>
  );
}

// ─── COMPONENT HỒ SƠ CÁ NHÂN (TÍCH HỢP TỪ PROFILE) ───────────────────
function ProfileTabContent({ onNavigateTab }: { onNavigateTab: (tab: MainTab) => void }) {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const { user } = useAuth();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [userData, setUserData] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const verifiedRef = useRef(false);

  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const accentGradient = isPlan ? "from-green-500 to-emerald-500" : "from-sky-500 to-blue-600";

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id, ...snap.data() } as UserData;
        setUserData(data);
        setName(data.name || "");
        if (user && !user.emailVerified && !data.emailVerified && !verifiedRef.current) {
          verifiedRef.current = true;
          window.location.href = "/verify-email";
        }
      }
    });
    return () => unsub();
  }, [user?.uid, db, user]);

  useEffect(() => {
    if (!user || !userData || hasCheckedId.current) return;
    if (userData.userId) {
      hasCheckedId.current = true;
      return;
    }
    const createId = async () => {
      hasCheckedId.current = true;
      let newId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", newId));
        if (!snap.exists()) break;
        newId = `AIR${nanoid(6).toUpperCase()}`;
        attempts++;
      }
      await Promise.all([
        updateDoc(doc(db, "users", user.uid), { userId: newId }),
        setDoc(doc(db, "usernames", newId), { uid: user.uid }),
      ]);
    };
    createId().catch(() => {});
  }, [user, userData, db]);

  const handleUpdateName = async () => {
    if (!user || !name.trim() || name.length < 2) {
      toast.error("Tên tối thiểu 2 ký tự");
      return;
    }
    if (name === userData?.name) {
      setEditingName(false);
      return;
    }
    const oldName = userData?.name;
    setEditingName(false);
    setUserData((prev) => prev ? { ...prev, name: name.trim() } : null);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast.success("Cập nhật tên thành công");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev ? { ...prev, name: oldName || "" } : null);
      setName(oldName || "");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận file ảnh");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 5MB");
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, file);
      uploadTaskRef.current.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (err) => {
          if (err.code !== "storage/canceled") toast.error("Upload thất bại");
        },
        async () => {
          const task = uploadTaskRef.current;
          if (!task) return;
          const url = await getDownloadURL(task.snapshot.ref);
          await updateDoc(doc(db, "users", user.uid), { avatar: url });
          toast.success("Cập nhật avatar thành công");
          if ("vibrate" in navigator) navigator.vibrate(8);
          setUploading(false);
        }
      );
    } catch {
      toast.error("Upload lỗi");
      setUploading(false);
    } finally {
      e.target.value = "";
    }
  };

  const handleShare = async () => {
    if (!userData) return;
    const url = `https://airanh.vercel.app/u/${userData.userId}`;
    if (navigator.share) {
      await navigator.share({ title: userData.name || "Người dùng AIR", text: `Kết nối với tôi`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link hồ sơ");
    }
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid)),
        deleteDoc(doc(db, "usernames", userData?.userId || "")),
      ]);
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại để xóa tài khoản");
        await signOut(auth);
        window.location.href = "/login";
      } else {
        toast.error("Xóa thất bại");
      }
    }
  };

  const stopScan = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setShowScanQR(false);
  };

  useEffect(() => {
    if (!showScanQR) return;
    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            stopScan();
            if (decodedText.includes("/u/")) {
              const targetUserId = decodedText.split("/u/")[1];
              if (targetUserId === userData?.userId) {
                toast.error("Đây là mã của bạn");
                return;
              }
              window.location.href = `/u/${targetUserId}`;
            } else {
              toast.error("Mã QR không hợp lệ");
            }
          },
          () => {}
        );
      } catch {
        toast.error("Không mở được camera");
        setShowScanQR(false);
      }
    };
    startScan();
    return () => stopScan();
  }, [showScanQR, userData?.userId]);

  if (!userData) return null;

  return (
    <div className="pt-6 pb-12 animate-in fade-in duration-300 bg-white dark:bg-zinc-950">
      {/* Avatar + name + status */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <img
              src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176&background=8B5E3C&color=fff`}
              className="w-16 h-16 rounded-full object-cover"
              alt="Avatar"
            />
            {userData.emailVerified && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-2 border-white dark:border-zinc-950`}>
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs font-bold">{uploadProgress}%</span>
              </div>
            )}
          </label>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                  autoFocus
                  className="text-2xl font-extrabold border-b-2 border-gray-300 dark:border-zinc-700 outline-none bg-transparent text-gray-900 dark:text-white flex-1 tracking-tight"
                />
                <button onClick={handleUpdateName} className={`p-1.5 bg-gradient-to-br ${accentGradient} rounded-full`}>
                  <Check size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <h1 onClick={() => setEditingName(true)} className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight cursor-pointer leading-tight">
                {userData.name}
              </h1>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Circle className={`w-2 h-2 fill-current ${userData.online ? "text-green-500" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
                {userData.online ? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2 mt-5">
          <button onClick={() => onNavigateTab("tasks")} className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition">
            <ClipboardList className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.tasks ?? 0}</span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">Task</span>
          </button>
          <button onClick={() => onNavigateTab("home")} className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition">
            <Zap className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.plans ?? 0}</span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">Plan</span>
          </button>
          <button className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.rating ?? 0}</span>
          </button>
        </div>
      </div>

      {/* Menu sections */}
      <div className="px-6 mt-2 space-y-6">
        <div>
          <SectionLabel>HỒ SƠ</SectionLabel>
          <Item label="Thông tin cá nhân" icon={User} onClick={() => window.location.href = "/profile/edit"} />
          <Item label="Mã QR của tôi" icon={QrCode} onClick={() => setShowQR(true)} />
          <Item label="Quét mã QR" icon={ScanLine} onClick={() => setShowScanQR(true)} />
          <Item label="Chia sẻ hồ sơ" icon={Share2} onClick={handleShare} />
        </div>
        <div>
          <SectionLabel>BẢO MẬT</SectionLabel>
          <Item label="Xác thực CCCD" icon={Shield} />
          <Item label="Đổi mật khẩu" icon={Lock} onClick={() => window.location.href = "/settings/change-password"} />
        </div>
        <div>
          <SectionLabel>HỖ TRỢ</SectionLabel>
          <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
          <Item label="Cài đặt" icon={Settings} onClick={() => window.location.href = "/settings"} />
          <Item label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
          <Item label="Xoá tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
        </div>
      </div>

      {/* QR Modal */}
      {showQR && userData.userId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-1 text-gray-900 dark:text-white">@{userData.userId}</h3>
            <p className="text-sm text-center text-gray-500 mb-4">Quét để kết nối với {userData.name}</p>
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCodeSVG value={`https://airanh.vercel.app/u/${userData.userId}`} size={200} level="H" includeMargin />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={handleShare} className="py-3 rounded-2xl font-bold bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white flex items-center justify-center gap-2 active:scale-95 transition">
                <Share2 size={18} /> Chia sẻ
              </button>
              <button onClick={() => { setShowQR(false); setShowScanQR(true); }} className={`py-3 rounded-2xl font-bold bg-gradient-to-r ${accentGradient} text-white flex items-center justify-center gap-2 active:scale-95 transition`}>
                <ScanLine size={18} /> Quét mã
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan QR fullscreen */}
      {showScanQR && (
        <div className="fixed inset-0 bg-black z-50">
          <div id="qr-reader" className="w-full h-full" />
          <button onClick={stopScan} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold">Đưa mã QR vào khung</p>
            <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}

      {/* Modals xác nhận */}
      {showLogoutModal && (
        <ProfileModal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}
      {showDeleteModal && (
        <ProfileModal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1 uppercase mt-2">{children}</p>;
}

function Item({ label, icon: Icon, onClick, danger }: { label: string; icon: React.ElementType; onClick?: () => void; danger?: boolean; }) {
  return (
    <button onClick={() => { if ("vibrate" in navigator) navigator.vibrate(5); onClick?.(); }} className="w-full flex items-center justify-between py-3.5 active:opacity-50 transition-opacity border-b border-gray-50 dark:border-zinc-900 text-left">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? "text-red-500" : "text-gray-700 dark:text-zinc-300"}`} />
        <span className={`text-base font-semibold ${danger ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}

function ProfileModal({ title, desc, onClose, onConfirm, confirmText, danger }: { title: string; desc: string; onClose: () => void; onConfirm: () => void; confirmText: string; danger?: boolean; }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-t-3xl p-6 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-2xl font-semibold mb-3 active:scale-[0.98] transition ${danger ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full py-3.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl font-semibold">Hủy</button>
      </div>
    </div>
  );
}

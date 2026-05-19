"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { getFirebaseDB } from "@/lib/firebase";
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
} from "firebase/firestore";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import TaskFeed from "@/components/TaskFeed";
import ModeToggle from "@/components/ModeToggle";
import ShareTaskModal from "@/components/ShareTaskModal";
import { useAppStore } from "@/store/app";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";
import { FiMapPin, FiRefreshCw } from "react-icons/fi";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import { 
  Home as HomeIcon, 
  MessageSquare, 
  ClipboardList, 
  User, 
  Plus, 
  Sparkles as SparklesIcon, 
  CalendarRange 
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";
type MainTab = "home" | "messages" | "tasks" | "profile";

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
  const [db, setDb] = useState<any>(null);
  const mode = useAppStore((s) => s.mode);
  
  // NÂNG CẤP LỚN: Quản lý Tab bằng State nội bộ (Giống 100% cơ chế Native App)
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

  // Khởi tạo Firebase
  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
      setError(null);
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
      setError(null);
      
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
        setError(null);
      } catch (err: any) {
        console.error("Firestore error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setAllItems([]);
          setHasMore(false);
          setError(null);
        } else {
          setError("Lỗi tải dữ liệu");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, buildQuery]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Các Tab điều hướng chính phía bên dưới
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

  // Hàm render nội dung tương ứng cho từng Tab (Không swap URL, không chớp)
  const renderTabContent = () => {
    switch (currentMainTab) {
      case "messages":
        return (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MessageSquare size={48} className="mb-2 opacity-50" />
            <p className="font-medium text-sm">Trang Tin Nhắn (Đang phát triển)</p>
          </div>
        );
      case "tasks":
        return (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ClipboardList size={48} className="mb-2 opacity-50" />
            <p className="font-medium text-sm">Trang Quản Lý Nhiệm Vụ</p>
          </div>
        );
      case "profile":
        return (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <User size={48} className="mb-2 opacity-50" />
            <p className="font-medium text-sm">Trang Cá Nhân công khai</p>
          </div>
        );
      default: // Tab "home" mặc định
        return (
          <>
            {/* Header Sub-tabs của Home */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
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

            {/* Khung chứa Feed dữ liệu */}
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
            </div>
          </>
        );
    }
  };

  return (
    <LayoutGroup id="app-global-navigation-flow">
      <div className="min-h-screen pb-28 font-sans bg-gray-50 dark:bg-black select-none relative">
        <ModeToggle />

        {/* Thanh bar loading ngầm siêu mỏng */}
        {refreshing && (
          <div className="fixed top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 animate-pulse z-50" />
        )}

        {/* NỘI DUNG CHÍNH: Thay đổi tức thì không qua cơ chế load file vật lý của Next.js */}
        <div className="w-full max-w-2xl mx-auto">
          {renderTabContent()}
        </div>

        {/* ==========================================================================
           CỤM BOTTOM NAVIGATION KHÔNG BAO GIỜ BỊ RE-RENDER HOẶC CHỚP NHÁY
           ========================================================================== */}
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center justify-end">
          <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
            
            {/* Menu nổi khi bấm nút cộng */}
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

            {/* Khung Navigation chính */}
            <div className="w-full pointer-events-auto relative rounded-[26px] border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between h-[64px] px-2 relative">
                
                {/* Render 2 nút bên trái (Home, Messages) */}
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

                {/* Nút Cộng Trung Tâm */}
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

                {/* Render 2 nút bên phải (Tasks, Profile) */}
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
    </LayoutGroup>
  );
}

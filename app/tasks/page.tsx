"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiRefreshCw, FiX } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2";
import { useRouter } from "next/navigation";
import ShareTaskModal from "@/components/ShareTaskModal";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  Query,
} from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast, Toaster } from "sonner";
import { useAppStore } from "@/store/app";
import LottiePlayer from "@/components/ui/LottiePlayer";
import taskAnim from "@/public/lotties/huha-task.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type SubTab = "mine" | "saved" | "doing" | "applied" | "expired" | "completed" | "cancelled";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "mine", label: "Của tôi" },
  { key: "saved", label: "Đã lưu" },
  { key: "doing", label: "Đang nhận" },
  { key: "applied", label: "Đã ứng tuyển" },
  { key: "completed", label: "Hoàn thành" },
  { key: "expired", label: "Đã hết hạn" },
  { key: "cancelled", label: "Đã hủy" },
];

const PAGE_SIZE = 10;

export default function TasksPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { mode = "task", setMode } = useAppStore();
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [shareTask, setShareTask] = useState<Task | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const theme = {
    task: { primary: "#0042B2", gradient: "from-[#0042B2] to-[#1A5FFF]", text: "text-[#0042B2]", shadow: "shadow- shadow-[0_8px_28px_rgba(0,66,178,0.35)]" },
    plan: { primary: "#00C853", gradient: "from-[#00C853] to-[#00E676]", text: "text-[#00C853]", shadow: "shadow- shadow-[0_8px_28px_rgba(0,200,83,0.35)]" }
  };

  const vibrate = (ms = 8) => { if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(ms); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, [auth, router]);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!currentUser) { setLoading(false); setTasks([]); return; }
    if (isRefresh) { setRefreshing(true); setTasks([]); setLastDoc(null); setHasMore(true); } else { setLoadingMore(true); }

    try {
      const base = collection(db, "tasks");
     let q: Query<DocumentData>;

      switch (subTab) {
        case "mine": q = query(base, where("userId","==",currentUser.uid), where("type","==",mode), orderBy("createdAt","desc"), limit(PAGE_SIZE)); break;
        case "expired": const now = Timestamp.now(); const week = Timestamp.fromDate(new Date(Date.now()-7*86400000)); q = query(base, where("userId","==",currentUser.uid), where("type","==","task"), where("deadline","<",now), where("deadline",">",week), orderBy("deadline","desc"), limit(PAGE_SIZE)); break;
        case "saved": q = query(base, where("savedBy","array-contains",currentUser.uid), where("type","==",mode), orderBy("createdAt","desc"), limit(PAGE_SIZE)); break;
        case "doing": q = query(base, where("assignees","array-contains",currentUser.uid), where("type","==",mode), where("status","==","doing"), limit(PAGE_SIZE)); break;
        case "applied": q = query(base, where("applicants","array-contains",currentUser.uid), where("type","==",mode), limit(PAGE_SIZE)); break;
        case "completed": q = query(base, where("assignees","array-contains",currentUser.uid), where("type","==",mode), where("status","==","completed"), limit(PAGE_SIZE)); break;
        case "cancelled": q = query(base, where("userId","==",currentUser.uid), where("type","==",mode), where("status","==","cancelled"), limit(PAGE_SIZE)); break;
        default: q = query(base, where("type","==",mode), limit(PAGE_SIZE));
      }

      if (lastDoc &&!isRefresh) q = query(q, startAfter(lastDoc));

     const snap = await getDocs(q);
      let data = snap.docs.map(d => {
  const docData = d.data() as Omit<Task, 'id'>;
  return { id: d.id, ...docData } as Task;
}).filter(t => t.id && t.title);

      if (searchQuery) data = data.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
      data.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

      setTasks(prev => isRefresh? data : [...prev,...data]);
    const lastVisible = snap.docs.at(-1) ?? null;

setLastDoc(lastVisible);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) { console.error(err); toast.error("Tải dữ liệu thất bại"); }
    finally { setLoading(false); setLoadingMore(false); setRefreshing(false); }
  }, [currentUser, mode, subTab, searchQuery, db, lastDoc]);

  useEffect(() => { if (currentUser) fetchTasks(true); }, [currentUser, mode, subTab]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && hasMore &&!loading &&!loadingMore) fetchTasks(false); }, { threshold: 0.1 });
    obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, fetchTasks]);

  const handleRefresh = async () => { if (refreshing) return; setRefreshing(true); await fetchTasks(true); vibrate(10); setTimeout(()=>setRefreshing(false),600); };
  const handleTabChange = (t:SubTab)=>{ vibrate(); setSubTab(t); };
  const handleModeChange = (m:"task"|"plan")=>{ vibrate(); setMode(m); };

  const handleTouchStart = (e:React.TouchEvent)=>{ if(window.scrollY===0) pullStartY.current = e.touches[0]?.clientY??0; };
  const handleTouchMove = (e:React.TouchEvent)=>{ if(pullStartY.current>0 && window.scrollY===0){ const d=(e.touches[0]?.clientY??0)-pullStartY.current; if(d>0) setPullDistance(Math.min(d,80)); } };
  const handleTouchEnd = ()=>{ if(pullDistance>60) handleRefresh(); pullStartY.current=0; setPullDistance(0); };

  const filteredTasks = tasks.filter(t=>!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentTheme = theme[mode];

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 select-none pb-28" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {pullDistance>0 && (
          <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl" style={{height:`${pullDistance}px`}}>
            <LottiePlayer animationData={loadingPull} loop autoplay className="w-6 h-6" />
          </div>
        )}

        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              {(["task","plan"] as const).map(m=>(
                <button key={m} onClick={()=>handleModeChange(m)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${mode===m?"bg-white dark:bg-zinc-950 shadow-sm":"text-zinc-500"}`}>
                  {m==="task"?<HiBolt className="w-4 h-4"/>:<HiCalendarDays className="w-4 h-4"/>}{m==="task"?"Task":"Plan"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                {SUB_TABS.map(tab=>(
                  <motion.button key={tab.key} whileTap={{scale:0.95}} onClick={()=>handleTabChange(tab.key)} className={`px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${subTab===tab.key?`bg-gradient-to-r ${currentTheme.gradient} text-white ${currentTheme.shadow}`:"bg-zinc-100 dark:bg-zinc-900 text-zinc-600"}`}>
                    {tab.label}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{vibrate();setShowSearch(!showSearch);}} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 active:scale-90"><FiSearch size={18}/></button>
                <motion.button whileTap={{scale:0.92}} onClick={handleRefresh} disabled={refreshing} className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 disabled:opacity-50"><FiRefreshCw size={18} className={refreshing?"animate-spin":""}/></motion.button>
              </div>
            </div>

            <AnimatePresence>
              {showSearch && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="relative">
                    <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={`Tìm ${mode}...`} className="w-full px-4 py-3 pr-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 outline-none text-sm focus:ring-2 focus:ring-[#0042B2]/30"/>
                    {searchQuery && <button onClick={()=>setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-200"><FiX size={16}/></button>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="max-w- mx-auto p-4">
          {loading? (
            <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl border p-4 animate-pulse"><div className="flex gap-3"><div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-900 rounded-2xl"/><div className="flex-1 space-y-2"><div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-900 rounded-lg"/><div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-900 rounded-lg"/></div></div></div>)}</div>
          ) : filteredTasks.length===0? (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white dark:bg-zinc-950 rounded-3xl border p-12 text-center">
              <LottiePlayer animationData={taskAnim} loop className="w-24 h-24 mx-auto mb-4" aria-label="Trống"/>
              <p className="text-base font-bold mb-1">Chưa có {mode==="task"?"task":"plan"} nào</p>
              <p className="text-sm text-zinc-500 mb-6">{subTab==="mine"&&`Tạo ${mode} đầu tiên`}{subTab==="saved"&&"Lưu để xem sau"}</p>
              {subTab==="mine" && <button onClick={()=>{vibrate(10);router.push(mode==="task"?"/create/task":"/create/plan");}} className={`px-6 h-12 rounded-2xl bg-gradient-to-r ${currentTheme.gradient} text-white text-sm font-bold active:scale-95 ${currentTheme.shadow}`}>Tạo ngay</button>}
            </motion.div>
          ) : (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-3">
              {filteredTasks.map((task,idx)=>(
                <motion.div key={task.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:idx*0.04}}>
                  <TaskCard task={task} theme={mode} mode={mode} onDelete={id=>setTasks(p=>p.filter(t=>t.id!==id))} onShare={t=>setShareTask(t)}/>
                </motion.div>
              ))}
            </motion.div>
          )}

          {loadingMore && <div className="flex justify-center py-6"><LottiePlayer animationData={loadingPull} loop className="w-8 h-8"/></div>}
          {shareTask && <ShareTaskModal task={shareTask} onClose={()=>setShareTask(null)}/>}
          <div ref={loadMoreRef} className="h-4"/>
        </div>
      </div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </>
  );
}
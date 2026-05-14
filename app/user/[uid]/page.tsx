"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { TaskListItem, formatTaskPrice } from "@/types/task";
import { FiChevronLeft, FiMapPin, FiCalendar } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import LottiePlayer from "@/components/LottiePlayer";
import taskAnim from "@/public/lotties/huha-task.json";
import { motion } from "framer-motion";

type UserProfile = {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  joinedAt?: any;
  rating?: number;
};

export default function UserProfilePage() {
  const { uid } = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "completed">("open");

  useEffect(() => {
    if (!uid || typeof uid!== "string") return;
    const loadData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) { router.replace("/404"); return; }
        setUser({ uid,...userSnap.data() } as UserProfile);

        const q = query(
          collection(db, "tasks"),
          where("userId", "==", uid),
          where("visibility", "==", "public"),
          where("banned", "==", false),
          where("status", "in", ["open", "full", "completed"]),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const taskSnap = await getDocs(q);
        setTasks(taskSnap.docs.map((d) => ({ id: d.id,...d.data() } as TaskListItem)));
      } finally { setLoading(false); }
    };
    loadData();
  }, [uid, router, db]);

  const filteredTasks = tasks.filter((t) => tab === "open"? ["open","full"].includes(t.status) : t.status === "completed");

  if (loading) return <div className="max-w-xl mx-auto p-4 animate-pulse"><div className="h-40 bg-zinc-200 dark:bg-zinc-900 rounded-3xl"/></div>;
  if (!user) return <div className="flex flex-col items-center justify-center min-h-screen text-zinc-400"><div className="text-6xl mb-4">😢</div><p>Không tìm thấy người dùng</p></div>;

  return (
    <div className="max-w-xl mx-auto bg-zinc-50 dark:bg-black min-h-screen pb-20">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"><FiChevronLeft size={24}/></button>
        <h1 className="font-bold text-lg truncate">{user.displayName || "User"}</h1>
      </div>

      <div className="bg-white dark:bg-zinc-950 p-6 border-b">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Image src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName||"U")}&background=0042B2&color=fff`} alt="avatar" width={80} height={80} className="w-20 h-20 rounded-full object-cover ring-4 ring-zinc-100 dark:ring-zinc-900"/>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00C853] rounded-full border-3 border-white dark:border-zinc-950"/>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user.displayName || "Ẩn danh"}</h2>
            {user.bio && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 line-clamp-2">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
              {user.location && <div className="flex items-center gap-1"><FiMapPin size={14}/><span>{user.location}</span></div>}
              {user.joinedAt && <div className="flex items-center gap-1"><FiCalendar size={14}/><span>Tham gia {new Date(user.joinedAt.seconds*1000).getFullYear()}</span></div>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            {label:"Công việc", val:tasks.length},
            {label:"Hoàn thành", val:tasks.filter(t=>t.status==="completed").length},
            {label:"Đánh giá", val:user.rating?.toFixed(1) || "—"},
          ].map(s=>(
            <div key={s.label} className="text-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
              <div className="text-2xl font-black text-[#0042B2]">{s.val}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 px-4 border-b flex gap-6 sticky top- z-20">
        {(["open","completed"] as const).map(k=>(
          <button key={k} onClick={()=>setTab(k)} className={`py-3.5 text-sm font-bold border-b-2 transition relative ${tab===k?"text-[#0042B2] border-[#0042B2]":"border-transparent text-zinc-500"}`}>
            {k==="open"?"Đang mở":"Đã xong"}
            {tab===k && <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0042B2]"/>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {filteredTasks.length===0 && (
          <div className="text-center py-16">
            <LottiePlayer animationData={taskAnim} loop className="w-20 h-20 mx-auto mb-3 opacity-80" aria-label="Trống" />
            <p className="text-zinc-500 text-sm font-medium">Chưa có công việc nào</p>
          </div>
        )}
        {filteredTasks.map((task,i)=>(
          <motion.div key={task.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
            <Link href={`/task/${task.slug}`} className="block bg-white dark:bg-zinc-950 rounded-3xl p-4 border active:scale-[0.98] transition">
              <div className="flex gap-3.5">
                {task.images?.[0] && <Image src={task.images[0]} alt={task.title} width={68} height={68} className="w- h- rounded-2xl object-cover bg-zinc-100"/>}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold line-clamp-1">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className="font-bold text-[#00C853]">{task.type==="task"? formatTaskPrice((task as any).price) : "Miễn phí"}</span>
                    <span className="text-zinc-300">•</span>
                    <span className="text-zinc-500">{task.type==="task"? `${(task as any).joined}/${(task as any).totalSlots}` : "Kế hoạch"}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
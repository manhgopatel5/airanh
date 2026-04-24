"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { TaskListItem } from "@/types/task";
import { FiChevronLeft, FiMapPin, FiCalendar, FiBriefcase } from "react-icons/fi";
import { formatTaskPrice } from "@/types/task";
import Link from "next/link";
import Image from "next/image";

type UserProfile = {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
  bio?: string;
  location?: string;
  joinedAt?: any;
  tasksCount?: number;
  completedCount?: number;
  rating?: number;
};

export default function UserProfilePage() {
  const { uid } = useParams();
  const router = useRouter();
  const db = getFirebaseDB(); // ✅ Dùng db ở đây
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"open" | "completed">("open");

  useEffect(() => {
    if (!uid || typeof uid !== "string") return;

    const loadData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) {
          router.replace("/404");
          return;
        }
        setUser({ uid, ...userSnap.data() } as UserProfile);

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
        setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskListItem)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [uid, router, db]);

  const filteredTasks = tasks.filter((t) =>
    tab === "open" ? ["open", "full"].includes(t.status) : t.status === "completed"
  );

  if (loading) return <div className="max-w-xl mx-auto p-4 space-y-4 animate-pulse"><div className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl" /></div>;
  if (!user) return <div className="flex flex-col items-center justify-center min-h-screen text-gray-400"><div className="text-6xl mb-4">😢</div><p>Không tìm thấy người dùng</p></div>;

  return (
    <div className="max-w-xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen pb-20">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90"><FiChevronLeft size={24} /></button>
        <h1 className="font-bold text-lg truncate">{user.displayName || "User"}</h1>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white dark:bg-zinc-900 p-6 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          <Image
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&size=128`}
            alt={user.displayName || "User avatar"}
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-50 dark:ring-zinc-800"
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.displayName || "Ẩn danh"}</h2>
            {user.bio && <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1 line-clamp-2">{user.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-zinc-400">
              {user.location && (
                <div className="flex items-center gap-1">
                  <FiMapPin size={14} />
                  <span>{user.location}</span>
                </div>
              )}
              {user.joinedAt && (
                <div className="flex items-center gap-1">
                  <FiCalendar size={14} />
                  <span>Tham gia {new Date(user.joinedAt.seconds * 1000).getFullYear()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tasks.length}</div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">Công việc</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {tasks.filter((t) => t.status === "completed").length}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">Hoàn thành</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {user.rating?.toFixed(1) || "—"}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400">Đánh giá</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white dark:bg-zinc-900 px-4 border-b border-gray-100 dark:border-zinc-800 flex gap-6">
        {[
          { key: "open", label: "Đang mở" },
          { key: "completed", label: "Đã xong" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`py-3 text-sm font-semibold border-b-2 transition ${
              tab === t.key
             ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-500 dark:text-zinc-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TASK LIST */}
      <div className="p-4 space-y-3">
        {filteredTasks.length === 0 && (
          <div className="text-center text-gray-400 dark:text-zinc-500 text-sm py-12">
            <FiBriefcase size={40} className="mx-auto mb-3 opacity-50" />
            Chưa có công việc nào
          </div>
        )}
        {filteredTasks.map((task) => (
          <Link
            key={task.id}
            href={`/task/${task.slug}`}
            className="block bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 active:scale-[0.98] transition"
          >
            <div className="flex gap-3">
              {task.images?.[0] && (
                <Image 
                  src={task.images[0]} 
                  alt={task.title || "Task image"}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0" 
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{task.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  <span className="font-bold text-emerald-600">
                    {formatTaskPrice(task.price)}
                  </span>
                  <span>•</span>
                  <span>{task.joined}/{task.totalSlots} người</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${
                    task.status === "open" ? "bg-green-100 text-green-700" :
                    task.status === "full" ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {task.status === "open" ? "Đang mở" : task.status === "full" ? "Đã đủ" : "Hoàn thành"}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
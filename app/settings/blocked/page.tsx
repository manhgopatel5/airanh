"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, UserX, Search } from "lucide-react";
import { toast, Toaster } from "sonner";

type BlockedUser = {
  uid: string;
  name: string;
  avatar: string;
  blockedAt: Date;
};

export default function BlockedPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const uids = snap.data().settings?.blockedUsers || [];
        const users = await Promise.all(
          uids.map(async (uid: string) => {
            const userSnap = await getDoc(doc(db, "users", uid));
            return { uid,...userSnap.data() } as BlockedUser;
          })
        );
        setBlocked(users);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const unblock = async (uid: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      "settings.blockedUsers": arrayRemove(uid)
    });
    toast.success("Đã bỏ chặn");
  };

  const filtered = blocked.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Đã chặn</h1>
      </div>

      <div className="px-6">
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-900 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {filtered.length === 0? (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-zinc-400">
              {search? "Không tìm thấy" : "Chưa chặn ai"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div key={u.uid} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <img src={u.avatar} className="w-12 h-12 rounded-full" alt="" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      Chặn từ {new Date(u.blockedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => unblock(u.uid)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-zinc-800 text-sm font-semibold text-gray-900 dark:text-white active:scale-95 transition"
                >
                  Bỏ chặn
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, addDoc, serverTimestamp, setDoc, doc, where, getDoc } from "firebase/firestore";
import { Search, X, Send, Check, Loader2 } from "lucide-react";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Friend = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean;
};

type TaskData = {
  id: string;
  title: string;
  price: number; // = 0 nếu là PlanItem
};

export default function ShareTaskModal({
  task,
  onClose,
}: {
  task: TaskData;
  onClose: () => void;
}) {
  const db = getFirebaseDB();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const isPlan = task.price === 0;

  useEffect(() => {
    console.log('SHARE MODAL MOUNTED:', task); // ← DEBUG
    if (!user?.uid) return;
    const loadFriends = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "chats"),
          where("members", "array-contains", user.uid)
        );
        const snap = await getDocs(q);

        const friendIds: string[] = [];
        snap.docs.forEach((d) => {
          const members = d.data().members as string[];
          const otherId = members.find((id) => id!== user.uid);
          if (otherId && members.length === 2) friendIds.push(otherId);
        });

        if (friendIds.length > 0) {
          const usersSnap = await Promise.all(
            friendIds.map((id) => getDoc(doc(db, "users", id)))
          );
          const friendsList = usersSnap
           .filter(s => s.exists())
           .map((s) => ({
              uid: s.id,
              name: s.data().name || "User",
              avatar: s.data().avatar || "",
              online: s.data().online || false,
            } as Friend));
          setFriends(friendsList);
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi tải danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, [user?.uid, task]);

  const toggleSelect = (uid: string) => {
    setSelected((prev) =>
      prev.includes(uid)? prev.filter((id) => id!== uid) : [...prev, uid]
    );
    if ("vibrate" in navigator) navigator.vibrate(5);
  };

  const handleSend = async () => {
    if (!user || selected.length === 0) return;
    setSending(true);
    try {
      await Promise.all(
        selected.map(async (friendId) => {
          const chatId = [user.uid, friendId].sort().join("_");
          const chatRef = doc(db, "chats", chatId);

          await setDoc(
            chatRef,
            {
              members: [user.uid, friendId],
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          const msgRef = collection(db, "chats", chatId, "messages");
          await addDoc(msgRef, {
            type: "task_share",
            senderId: user.uid,
            taskId: task.id,
            taskTitle: task.title,
            taskPrice: task.price,
            createdAt: serverTimestamp(),
            readBy: [user.uid],
          });

          await setDoc(
            chatRef,
            {
              lastMessage: isPlan? `Đã chia sẻ kế hoạch: ${task.title}` : `Đã chia sẻ: ${task.title}`,
              lastSenderId: user.uid,
              lastSenderName: user.displayName || user.email?.split('@')[0] || "User",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        })
      );
      toast.success(`Đã gửi cho ${selected.length} người`);
      if ("vibrate" in navigator) navigator.vibrate(8);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] pointer-events-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute top-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-b-3xl max-h-[85vh] flex flex-col shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 pt-safe pb-3 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-3 pt-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Chia sẻ cho</h3>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-90 transition-all touch-manipulation">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl mb-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                📋 {isPlan? 'Kế hoạch cá nhân' : 'Công việc'}
              </p>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5 text-base">{task.title}</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                {task.price > 0? `${task.price.toLocaleString()}đ` : 'Miễn phí'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {showSearch? (
                  <motion.div
                    key="search"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="relative flex-1"
                  >
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm bạn bè..."
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm outline-none text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearch("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 touch-manipulation"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSearch(true)}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm text-gray-500 dark:text-gray-400 active:scale-[0.98] transition touch-manipulation"
                  >
                    <Search className="w-4 h-4" />
                    <span>Tìm bạn bè...</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {selected.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-3 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold shrink-0"
                >
                  {selected.length}
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {loading? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : filtered.length === 0? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">
                  {search? "Không tìm thấy bạn bè" : "Chưa có bạn bè nào"}
                </p>
              </div>
            ) : (
              filtered.map((f) => (
                <motion.button
                  key={f.uid}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleSelect(f.uid)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-gray-100 dark:active:bg-zinc-800 touch-manipulation"
                >
                  <div className="relative">
                    <img
                      src={f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=0A84FF&color=fff`}
                      className="w-12 h-12 rounded-full object-cover"
                      alt={f.name}
                    />
                    {f.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">{f.name}</p>
                    <p className="text-xs text-gray-400">
                      {f.online? "Đang hoạt động" : "Ngoại tuyến"}
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selected.includes(f.uid)
                      ? "bg-blue-500 border-blue-500 scale-110"
                        : "border-gray-300 dark:border-zinc-600"
                    }`}
                  >
                    {selected.includes(f.uid) && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                </motion.button>
              ))
            )}
          </div>

          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              >
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-bold active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
                >
                  <Send size={18} />
                  {sending? "Đang gửi..." : `Gửi cho ${selected.length} người`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-2" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
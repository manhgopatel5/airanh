"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import { TaskListItem, PlanListItem } from "@/types/task";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { toast } from "sonner";

type Props = {
  task: TaskListItem | PlanListItem;
  onClose: () => void;
};

type Friend = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
};

export default function ShareTaskModal({ task, onClose }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
      try {
        const db = getFirebaseDB();
        // TODO: Thay bằng query thật của bạn - lấy danh sách bạn bè
        const q = query(
          collection(db, "users"),
          where("followers", "array-contains", user.uid),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().displayName || doc.data().name || "User",
          username: doc.data().username || "",
          avatar: doc.data().photoURL || doc.data().avatar || "",
          online: doc.data().online || false,
        }));
        setFriends(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [user]);

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    setSelected((prev) =>
      prev.includes(id)? prev.filter((i) => i!== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selected.length === 0) {
      toast.error("Chọn ít nhất 1 người bạn");
      return;
    }

    // TODO: Gọi API gửi task cho bạn bè
    // await sendTaskToFriends(task.id, selected);

    toast.success(`Đã chia sẻ cho ${selected.length} người`);
    if ("vibrate" in navigator) navigator.vibrate(10);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 rounded-t-3xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-5 pb-3">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              Chia sẻ cho
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <FiX size={22} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Task preview */}
          <div className="mx-6 mb-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <span>📋</span>
              <span className="font-semibold">
                {task.type === "task"? "Công việc" : "Kế hoạch"}
              </span>
            </div>
            <p className="font-bold text-base text-zinc-900 dark:text-white line-clamp-1 mb-1">
              {task.title}
            </p>
            {task.type === "task" && task.price > 0 && (
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {task.price.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>

          {/* Search */}
          <div className="px-6 mb-3">
            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bạn bè..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Friends list */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {loading? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                      <div className="h-3 w-1/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0? (
              <div className="text-center py-12 text-zinc-400 text-sm">
                {search? "Không tìm thấy bạn bè" : "Chưa có bạn bè nào"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => {
                  const isSelected = selected.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleSelect(friend.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all"
                    >
                      <div className="relative">
                        {friend.avatar? (
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {friend.online && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {friend.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {friend.online? "Đang hoạt động" : "Ngoại tuyến"}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                           ? "bg-blue-500 border-blue-500"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        {isSelected && (
                          <FiCheck size={14} className="text-white" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Send button */}
          {selected.length > 0 && (
            <div className="px-6 pb-6 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleSend}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-blue-500/30"
              >
                Gửi cho {selected.length} người
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
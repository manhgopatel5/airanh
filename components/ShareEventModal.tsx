"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import type { EventItem } from "@/data/events";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { toast } from "sonner";
import { sendEventShareToChat } from "@/lib/eventChat";

type Props = {
  event: EventItem;
  onClose: () => void;
};

type Friend = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  online: boolean;
};

export default function ShareEventModal({ event, onClose }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setFriends([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const db = getFirebaseDB();
        const friendsSnap = await getDocs(collection(db, "users", user.uid, "friends"));
        const friendIds = friendsSnap.docs.map((d) => d.id);

        if (friendIds.length === 0) {
          if (mounted) {
            setFriends([]);
            setLoading(false);
          }
          return;
        }

        const allFriends: Friend[] = [];
        for (let i = 0; i < friendIds.length; i += 10) {
          const chunk = friendIds.slice(i, i + 10);
          const snap = await getDocs(
            query(collection(db, "users"), where(documentId(), "in", chunk))
          );
          allFriends.push(
            ...snap.docs.map((docSnap) => ({
              id: docSnap.id,
              name:
                docSnap.data().displayName ||
                docSnap.data().name ||
                docSnap.data().username ||
                "User",
              username: docSnap.data().username || "",
              avatar: docSnap.data().avatar || docSnap.data().photoURL || "",
              online: docSnap.data().online || false,
            }))
          );
        }

        if (mounted) {
          setFriends(allFriends);
          setLoading(false);
        }
      } catch {
        toast.error("Không tải được danh sách bạn bè");
        if (mounted) {
          setFriends([]);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const filtered = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!user?.uid) {
      toast.error("Bạn cần đăng nhập để chia sẻ");
      return;
    }
    if (selected.length === 0) {
      toast.error("Chọn ít nhất 1 người bạn");
      return;
    }

    setSending(true);
    try {
      await Promise.all(
        selected.map((friendId) =>
          sendEventShareToChat({
            event,
            senderId: user.uid,
            senderName: user.displayName || user.email || "User",
            senderAvatar: user.photoURL || "",
            recipientId: friendId,
          })
        )
      );
      toast.success(`Đã gửi sự kiện cho ${selected.length} người`);
      if ("vibrate" in navigator) navigator.vibrate(10);
      onClose();
    } catch {
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="fixed inset-x-0 bottom-0 bg-white dark:bg-zinc-950 rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          <div className="flex justify-between items-center px-5 pb-3">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Chia sẻ sự kiện</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <FiX size={22} className="text-zinc-500" />
            </button>
          </div>

          <div className="mx-5 mb-4 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/30 border border-blue-100 dark:border-blue-900/40 flex gap-3">
            <img
              src={event.image}
              alt={event.title}
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                {event.tag}
              </p>
              <p className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-2">
                {event.title}
              </p>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{event.address}</p>
            </div>
          </div>

          <div className="px-5 mb-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bạn bè..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {loading ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-zinc-400 py-10">
                {search ? "Không tìm thấy bạn bè" : "Chưa có bạn bè để chia sẻ"}
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((friend) => {
                  const isSelected = selected.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggle(friend.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {friend.avatar ? (
                        <img src={friend.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-sm truncate">{friend.name}</p>
                        <p className="text-xs text-zinc-500">
                          {friend.online ? "Đang hoạt động" : "Ngoại tuyến"}
                        </p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "bg-blue-500 border-blue-500" : "border-zinc-300"
                        }`}
                      >
                        {isSelected && <FiCheck size={14} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 pb-6 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleSend}
              disabled={selected.length === 0 || sending}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold disabled:opacity-40"
            >
              {sending
                ? "Đang gửi..."
                : selected.length > 0
                  ? `Gửi cho ${selected.length} người`
                  : "Chọn bạn bè để gửi"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

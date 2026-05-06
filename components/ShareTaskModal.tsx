"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Search, X, Send, Check } from "lucide-react";
import { toast } from "sonner";

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

  const isPlan = task.price === 0;

  useEffect(() => {
    if (!user?.uid) return;
    const loadFriends = async () => {
      const q = query(collection(db, "users", user.uid, "friends"), orderBy("name"));
      const snap = await getDocs(q);
      setFriends(snap.docs.map((d) => d.data() as Friend));
    };
    loadFriends();
  }, [user?.uid]);

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
            taskPrice: task.price, // = 0 nếu là PlanItem
            createdAt: serverTimestamp(),
            readBy: [user.uid],
          });

          await setDoc(
            chatRef,
            {
              lastMessage: {
                text: isPlan? `Đã chia sẻ kế hoạch: ${task.title}` : `Đã chia sẻ: ${task.title}`,
                senderId: user.uid,
              },
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
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chia sẻ cho</h3>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Preview task */}
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
              📋 {isPlan? 'Kế hoạch cá nhân' : 'Công việc'}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{task.title}</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
              {task.price > 0? `${task.price.toLocaleString()}đ` : 'Miễn phí'}
            </p>
          </div>

          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm outline-none text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0? (
            <p className="text-center text-sm text-gray-400 py-8">Chưa có bạn bè nào</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.uid}
                onClick={() => toggleSelect(f.uid)}
                className="w-full flex items-center gap-3 py-3 active:opacity-50"
              >
                <img
                  src={f.avatar || `https://ui-avatars.com/api/?name=${f.name}&background=8B5E3C&color=fff`}
                  className="w-11 h-11 rounded-full object-cover"
                  alt={f.name}
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {f.online? "Đang hoạt động" : "Ngoại tuyến"}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected.includes(f.uid)
                     ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 dark:border-zinc-600"
                  }`}
                >
                  {selected.includes(f.uid) && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
              </button>
            ))
          )}
        </div>

        {selected.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-semibold active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              {sending? "Đang gửi..." : `Gửi cho ${selected.length} người`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
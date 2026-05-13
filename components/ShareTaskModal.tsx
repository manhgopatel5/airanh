"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiCheck } from "react-icons/fi";
import { Task } from "@/types/task";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, documentId, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type Props = { task: Task; onClose: () => void; };
type Friend = { id: string; name: string; username: string; avatar: string; online: boolean; };

export default function ShareTaskModal({ task, onClose }: Props) {
  if (!task?.id) return null;

  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadingLottie = "/lotties/huha-loading-pull-full.lottie";
  const emptyLottie = "/lotties/huha-searching-full.lottie";
  const celebrateLottie = "/lotties/huha-celebrate-full.lottie";

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    let mounted = true;
    const fetchFriends = async () => {
      try {
        const db = getFirebaseDB();
        const snap = await getDocs(collection(db, "users", user.uid, "friends"));
        const ids = snap.docs.map(d => d.id);
        if (ids.length === 0) { if (mounted) { setFriends([]); setLoading(false); } return; }

        const all: Friend[] = [];
        for (let i = 0; i < ids.length; i += 10) {
          const chunk = ids.slice(i, i + 10);
          const q = query(collection(db, "users"), where(documentId(), "in", chunk));
          const res = await getDocs(q);
          all.push(...res.docs.map(d => ({
            id: d.id,
            name: d.data().displayName || d.data().name || "User",
            username: d.data().username || "",
            avatar: d.data().avatar || d.data().photoURL || "",
            online: d.data().online || false,
          })));
        }
        if (mounted) { setFriends(all); setLoading(false); }
      } catch (e) {
        console.error(e);
        toast.error("Không tải được bạn bè");
        if (mounted) { setLoading(false); }
      }
    };
    fetchFriends();
    return () => { mounted = false; };
  }, [user?.uid]);

  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    navigator.vibrate?.(5);
    setSelected(p => p.includes(id)? p.filter(i => i!== id) : [...p, id]);
  };

  const handleSend = async () => {
    if (selected.length === 0 ||!user?.uid) return;
    setSending(true);
    try {
      const db = getFirebaseDB();
      await Promise.all(selected.map(async fid => {
        const roomId = [user.uid, fid].sort().join("_");
        await setDoc(doc(db, "chats", roomId), {
          participants: [user.uid, fid],
          lastMessage: `Đã chia sẻ: ${task.title}`,
          lastMessageAt: serverTimestamp(),
          lastSenderId: user.uid,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        await addDoc(collection(db, "chats", roomId, "messages"), {
          type: "task_share", taskId: task.id, taskTitle: task.title, taskType: task.type,
          price: 'price' in task? (task as any).price : 0,
          senderId: user.uid, senderName: user.displayName || "User",
          senderAvatar: user.photoURL || "", receiverId: fid,
          createdAt: serverTimestamp(), read: false,
        });
      }));
      setShowSuccess(true);
      navigator.vibrate?.([10,20,10]);
      setTimeout(() => { onClose(); }, 1200);
    } catch {
      toast.error("Gửi thất bại");
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md" onClick={onClose}>

        {/* Success overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <DotLottieReact src={celebrateLottie} autoplay style={{width:280,height:280}} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
          transition={{type:"spring",damping:28,stiffness:320}}
          className="fixed inset-x-0 bottom-0 max-h-[88vh] bg-white dark:bg-zinc-950 rounded-t-[28px] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8">
                <DotLottieReact src={celebrateLottie} autoplay loop style={{width:32,height:32}} />
              </div>
              <h3 className="text-[22px] font-extrabold tracking-tight">Chia sẻ</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95">
              <FiX size={20} className="text-zinc-500" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 pb-3">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm bạn bè..."
                className="w-full h-12 pl-10 pr-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-[15px] font-medium outline-none focus:ring-2 focus:ring-[#0042B2]/30 border-transparent focus:border-[#0042B2]/20" />
            </div>
          </div>

          {/* Task preview - HUHA style */}
          <div className="mx-5 mb-3 p-3.5 rounded-2xl border" style={{background:'rgba(0,66,178,0.06)',borderColor:'rgba(0,66,178,0.15)'}}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg text-white" style={{background:'#0042B2'}}>
                {task.type === "task"? "TASK" : "PLAN"}
              </span>
              <p className="font-bold text-[15px] line-clamp-1 flex-1">{task.title}</p>
            </div>
            {'price' in task && (task as any).price > 0 && (
              <p className="text-[13px] font-extrabold mt-1" style={{color:'#00C853'}}>
                {((task as any).price).toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>

          {/* Friends */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading? (
              <div className="flex flex-col items-center justify-center py-16">
                <DotLottieReact src={loadingLottie} autoplay loop style={{width:80,height:80}} />
                <p className="text-sm text-zinc-500 mt-2">Đang tải bạn bè...</p>
              </div>
            ) : filtered.length === 0? (
              <div className="flex flex-col items-center justify-center py-12">
                <DotLottieReact src={emptyLottie} autoplay loop style={{width:140,height:140}} />
                <p className="text-[15px] font-medium text-zinc-500 mt-2">
                  {search? "Không tìm thấy" : "Chưa có bạn bè"}
                </p>
              </div>
            ) : (
              <motion.div initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:0.04}}}}>
                {filtered.map(f => {
                  const sel = selected.includes(f.id);
                  return (
                    <motion.button key={f.id} variants={{hidden:{opacity:0,y:8},show:{opacity:1,y:0}}}
                      onClick={() => toggle(f.id)}
                      className="w-full flex items-center gap-3 p-3 mx-3 mb-1.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.99] transition">
                      <div className="relative">
                        {f.avatar? <img src={f.avatar} className="w-12 h-12 rounded-full object-cover" alt="" /> :
                          <div className="w-12 h-12 rounded-full grid place-items-center text-white font-bold" style={{background:'linear-gradient(135deg,#0042B2,#0066FF)'}}>
                            {f.name[0]}
                          </div>}
                        {f.online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00C853] rounded-full border-2 border-white dark:border-zinc-950" />}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-[15px] truncate">{f.name}</p>
                        <p className="text-xs text-zinc-500">{f.online? "Đang hoạt động" : "Ngoại tuyến"}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full grid place-items-center border-2 transition-all ${sel? 'bg-[#0042B2] border-[#0042B2] scale-110' : 'border-zinc-300 dark:border-zinc-700'}`}>
                        {sel && <FiCheck size={14} className="text-white" />}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Send */}
          <AnimatePresence>
            {selected.length > 0 && (
              <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
                className="p-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
                <button onClick={handleSend} disabled={sending}
                  className="w-full h-[52px] rounded-2xl font-extrabold text-[16px] text-white active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{background:'linear-gradient(135deg,#0042B2,#0066FF)', boxShadow:'0 10px 24px -8px rgba(0,66,178,0.4)'}}>
                  {sending? (
                    <DotLottieReact src={loadingLottie} autoplay loop style={{width:28,height:28}} />
                  ) : (
                    <>Gửi cho {selected.length} người</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiZap, FiUserX, FiStar, FiLoader, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "moi-quan-he-khong-rang-buoc", label: "Mối quan hệ không ràng buộc", icon: "💖", count: 43 },
  { id: "nguoi-yeu", label: "Người yêu", icon: "🌹", count: 117 },
  { id: "moi-quan-he-nghiem-tuc", label: "Mối quan hệ nghiêm túc", icon: "💍", count: 72 },
  { id: "ranh-toi-nay", label: "Rảnh tối nay", icon: "🌙", count: 38 },
  { id: "nhung-nguoi-ban-moi", label: "Những người bạn mới", icon: "👋", count: 34 },
  { id: "hay-xac-minh-anh", label: "Hãy Xác Minh Ảnh", icon: "✅", count: 93 },
  { id: "muon-co-con", label: "Muốn có con", icon: "👶", count: 13 },
  { id: "du-lich", label: "Du lịch", icon: "✈️", count: 96 },
  { id: "hoi-me-phim", label: "Hội mê Phim", icon: "📺", count: 31 },
  { id: "yeu-the-thao", label: "Yêu thể thao", icon: "💧", count: 47 },
  { id: "hen-di-cafe", label: "Hẹn đi cafe", icon: "☕", count: 21 },
  { id: "thich-di-nhau", label: "Thích đi nhậu", icon: "🍷", count: 16 },
  { id: "me-mao-hiem", label: "Mê mạo hiểm", icon: "🎲", count: 30 },
  { id: "hoi-yeu-sang-tao", label: "Hội yêu Sáng tạo", icon: "🎨", count: 45 },
  { id: "dam-me-am-thuc", label: "Đam mê ẩm thực", icon: "🍑", count: 81 },
  { id: "yeu-thien-nhien", label: "Yêu thiên nhiên", icon: "🌱", count: 75 },
  { id: "yeu-am-nhac", label: "Yêu âm nhạc", icon: "🎧", count: 23 },
  { id: "cham-soc-ban-than", label: "Chăm sóc bản thân", icon: "🦆", count: 107 },
];

const GENDERS = [
  { value: "all", label: "Tất cả" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
] as const;

export default function StrangerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const db = getFirebaseDB();

  const [userKarma, setUserKarma] = useState(100);
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Độ tuổi: 2 input từ - đến
  const [ageFrom, setAgeFrom] = useState<number>(18);
  const [ageTo, setAgeTo] = useState<number>(25);
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");

  // Load user karma
  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setUserKarma(snap.data()?.karma || 100);
    });

    const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
      const data = snap.data();
      if (data?.matchedChatId) {
        router.push(`/stranger/${data.matchedChatId}`);
        setInQueue(false);
        setFindingStranger(false);
        setSelectedCat(null);
      } else if (data &&!data?.matchedChatId) {
        setInQueue(true);
        setFindingStranger(true);
      } else {
        setInQueue(false);
        setFindingStranger(false);
      }
    });

    return () => {
      unsubUser();
      unsubQueue();
    };
  }, [user?.uid, db, router]);

  const handleFindStranger = async (categoryId: string) => {
    if (!user?.uid) return;
    if (userKarma < 50) return toast.error("Huha dưới 50, không thể chat người lạ");
    if (ageFrom < 18 || ageTo > 99 || ageFrom > ageTo) {
      return toast.error("Độ tuổi không hợp lệ");
    }

    setSelectedCat(categoryId);
    setFindingStranger(true);
    setInQueue(true);

    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const findFn = httpsCallable(functions, 'findStranger');

      const result = await findFn({
        category: categoryId,
        ageRange: `${ageFrom}-${ageTo}`,
        wantGender: selectedGender,
      });

      const data = result.data as { chatId: string, matched: boolean };

      if (data.matched) {
        router.push(`/stranger/${data.chatId}`);
      } else {
        toast.success("Đã vào hàng đợi. Đang tìm bạn phù hợp...", { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi tìm kiếm");
      setInQueue(false);
      setSelectedCat(null);
    } finally {
      setFindingStranger(false);
    }
  };

  const handleCancelQueue = async () => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "stranger_queue", user.uid));
      setInQueue(false);
      setFindingStranger(false);
      setSelectedCat(null);
      toast.info("Đã hủy tìm kiếm");
    } catch {
      toast.error("Lỗi hủy hàng đợi");
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-24">

        {/* Card Karma */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30">
              <FiZap className="text-white" size={28} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-500 mb-0.5">Điểm uy tín</p>
              <div className="flex items-center gap-2">
                <FiStar className="text-amber-500" size={18} fill="currentColor" />
                <span className="text-2xl font-[800]">{userKarma}</span>
                <span className="text-sm text-zinc-500">/ 100</span>
              </div>
            </div>
          </div>
          {userKarma < 70 && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400 font-[500]">
              ⚠️ Huha thấp! Chat tử tế để không bị cấm
            </div>
          )}
          {userKarma < 50 && (
            <div className="mt-2 bg-red-500/10 border-red-500/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 font-[600] flex items-center gap-2">
              <FiUserX size={16} />
              Bạn đã bị cấm chat người lạ
            </div>
          )}
        </div>

        {/* Bộ lọc: Tuổi + Giới tính */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 space-y-4">
          <div>
            <label className="text-sm font-[700] mb-2 block">Độ tuổi</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1">Từ</p>
                <input
                  type="number"
                  value={ageFrom}
                  onChange={(e) => setAgeFrom(Math.max(18, Math.min(99, Number(e.target.value))))}
                  className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  min={18}
                  max={99}
                />
              </div>
              <div className="pt-5 text-zinc-400">—</div>
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1">Đến</p>
                <input
                  type="number"
                  value={ageTo}
                  onChange={(e) => setAgeTo(Math.max(18, Math.min(99, Number(e.target.value))))}
                  className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                  min={18}
                  max={99}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-[700] mb-2 block">Giới tính</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setSelectedGender(g.value)}
                  className={cn(
                    "h-11 rounded-xl text-sm font-[600] transition-all active:scale-95 border",
                    selectedGender === g.value
                     ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg shadow-zinc-900/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {inQueue && selectedCat? (
            <motion.div
              key="queue"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-pink-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-pink-500/30">
                <FiLoader className="text-white animate-spin" size={36} />
              </div>
              <h3 className="text-lg font-[800] mb-2">Đang tìm bạn phù hợp...</h3>
              <p className="text-sm text-zinc-500 mb-6">
                {CATEGORIES.find(c => c.id === selectedCat)?.label}
              </p>
              <button
                onClick={handleCancelQueue}
                className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-[700] active:scale-95 transition-all"
              >
                Hủy tìm kiếm
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-xl font-[800] mb-3">Khám Phá</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleFindStranger(cat.id)}
                    disabled={userKarma < 50 || findingStranger}
                    className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 active:scale-95 transition-all disabled:opacity-40 text-left h-40 flex flex-col justify-between"
                  >
                    <div className="text-4xl">{cat.icon}</div>
                    <div className="flex items-end justify-between">
                      <p className="text-sm font-[700] leading-tight pr-2">{cat.label}</p>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <FiUsers size={12} />
                        <span>{cat.count}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
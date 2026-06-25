"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, deleteDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiZap, FiStar, FiLoader, FiChevronLeft, FiAlertTriangle, FiSettings, FiCheck } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const INTEREST_TAGS = ["🎮 Game", "🎵 Nhạc", "📚 Học", "💼 Việc làm", "🎬 Phim", "✈️ Du lịch", "💪 Gym", "🍜 Ăn uống", "💕 Hẹn hò", "😂 Hài", "🎨 Vẽ", "📱 Tech"];

type StrangerPref = {
  interests: string[];
  ageRange: "18-22" | "23-27" | "28+";
  wantGender: "all" | "male" | "female";
};

export default function StrangerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const db = getFirebaseDB();
  
  const [prefs, setPrefs] = useState<StrangerPref | null>(null);
  const [userKarma, setUserKarma] = useState(100);
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state cho lần đầu setup
  const [tempInterests, setTempInterests] = useState<string[]>([]);
  const [tempAge, setTempAge] = useState<"18-22" | "23-27" | "28+">("18-22");
  const [tempGender, setTempGender] = useState<"all" | "male" | "female">("all");

  // Load user data + prefs
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubUser = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      const data = snap.data();
      setUserKarma(data?.karma || 100);
      
      // Check đã setup chưa
      const strangerPrefs = data?.strangerPrefs as StrangerPref | undefined;
      if (strangerPrefs?.interests?.length >= 3) {
        setPrefs(strangerPrefs);
        setIsSetup(true);
      } else {
        setIsSetup(false);
      }
      setLoading(false);
    });

    // Listen queue để auto vào khi match
    const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
      const data = snap.data();
      if (data?.matchedChatId) {
        router.push(`/stranger/${data.matchedChatId}`);
        setInQueue(false);
        setFindingStranger(false);
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

  const handleSavePrefs = async () => {
    if (!user?.uid) return;
    if (tempInterests.length < 3) return toast.error("Chọn ít nhất 3 sở thích");

    const newPrefs: StrangerPref = {
      interests: tempInterests,
      ageRange: tempAge,
      wantGender: tempGender,
    };

    try {
      await updateDoc(doc(db, "users", user.uid), {
        strangerPrefs: newPrefs,
        updatedAt: serverTimestamp(),
      });
      setPrefs(newPrefs);
      setIsSetup(true);
      toast.success("Đã lưu sở thích! Giờ bạn có thể tìm bạn");
    } catch {
      toast.error("Lỗi lưu cài đặt");
    }
  };

  const handleFindStranger = async () => {
    if (!user?.uid ||!prefs) return;
    if (userKarma < 50) return toast.error("Karma dưới 50, không thể chat người lạ");

    setFindingStranger(true);
    setInQueue(true);
    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const findFn = httpsCallable(functions, 'findStranger');

      const result = await findFn({
        interests: prefs.interests,
        ageRange: prefs.ageRange,
        wantGender: prefs.wantGender,
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
      toast.info("Đã hủy tìm kiếm");
    } catch {
      toast.error("Lỗi hủy hàng đợi");
    }
  };

  const handleResetPrefs = () => {
    setIsSetup(false);
    setTempInterests(prefs?.interests || []);
    setTempAge(prefs?.ageRange || "18-22");
    setTempGender(prefs?.wantGender || "all");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
        <FiLoader className="animate-spin text-pink-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] text-zinc-950 dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A] dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition-all">
            <FiChevronLeft size={20} />
          </button>
          <h1 className="text-base font-[700]">Chat Người Lạ</h1>
          {isSetup &&!inQueue && (
            <button onClick={handleResetPrefs} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition-all">
              <FiSettings size={18} />
            </button>
          )}
          {(!isSetup || inQueue) && <div className="w-9" />}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-24">
        {/* Card Karma */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/40">
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
              ⚠️ Karma thấp! Chat tử tế để không bị cấm
            </div>
          )}
          {userKarma < 50 && (
            <div className="mt-2 bg-red-500/10 border-red-500/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 font-[600] flex items-center gap-2">
              <FiUserX size={16} />
              Bạn đã bị cấm chat người lạ
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!isSetup? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-700 dark:text-blue-400">
                <p className="font-[700] mb-1">Thiết lập lần đầu</p>
                <p>Chọn sở thích để hệ thống match bạn với người phù hợp. Chỉ cần làm 1 lần.</p>
              </div>

              {/* Card Sở thích */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20">
                <label className="text-sm font-[700] mb-3 block">Sở thích <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {INTEREST_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTempInterests(prev =>
                        prev.includes(tag)? prev.filter(t => t!== tag) : [...prev, tag].slice(0, 5)
                      )}
                      className={cn(
                        "h-11 rounded-xl text-sm font-[600] transition-all active:scale-95",
                        tempInterests.includes(tag)
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">Chọn 3-5 sở thích • Đã chọn: {tempInterests.length}/5</p>
              </div>

              {/* Card Độ tuổi */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20">
                <label className="text-sm font-[700] mb-3 block">Độ tuổi</label>
                <div className="grid grid-cols-3 gap-2">
                  {["18-22", "23-27", "28+"].map(age => (
                    <button
                      key={age}
                      onClick={() => setTempAge(age as any)}
                      className={cn(
                        "h-11 rounded-xl text-sm font-[600] transition-all active:scale-95",
                        tempAge === age
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      )}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Giới tính */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20">
                <label className="text-sm font-[700] mb-3 block">Giới tính muốn chat</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "all", label: "Tất cả" },
                    { value: "male", label: "Nam" },
                    { value: "female", label: "Nữ" }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTempGender(opt.value as any)}
                      className={cn(
                        "h-11 rounded-xl text-sm font-[600] transition-all active:scale-95",
                        tempGender === opt.value
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSavePrefs}
                disabled={tempInterests.length < 3}
                className="w-full h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white rounded-2xl text-base font-[700] disabled:opacity-40 shadow-2xl shadow-pink-500/40 hover:shadow-pink-500/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <FiCheck size={20} />
                Lưu & Bắt đầu
              </button>
            </motion.div>
          ) : inQueue? (
            <motion.div
              key="queue"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-pink-500/50">
                <FiLoader className="text-white animate-spin" size={36} />
              </div>
              <h3 className="text-lg font-[800] mb-2">Đang tìm bạn phù hợp...</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Hệ thống đang match dựa trên sở thích của bạn
              </p>
              <div className="flex gap-2 justify-center flex-wrap mb-6">
                {prefs.interests.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full text-xs font-[600]">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={handleCancelQueue}
                className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-[700] active:scale-95 transition-all"
              >
                Hủy tìm kiếm
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 dark:shadow-black/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-[700]">Sở thích của bạn</h3>
                  <button onClick={handleResetPrefs} className="text-xs font-[600] text-pink-500 active:opacity-60">
                    Chỉnh sửa
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {prefs.interests.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-gradient-to-br from-pink-500/10 to-purple-500/10 text-pink-600 dark:text-pink-400 rounded-xl text-sm font-[600]">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                  <span>Độ tuổi: <b className="text-zinc-900 dark:text-white">{prefs.ageRange}</b></span>
                  <span>Giới tính: <b className="text-zinc-900 dark:text-white">{prefs.wantGender === "all"? "Tất cả" : prefs.wantGender === "male"? "Nam" : "Nữ"}</b></span>
                </div>
              </div>

              <button
                onClick={handleFindStranger}
                disabled={findingStranger || userKarma < 50}
                className="w-full h-16 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white rounded-2xl text-lg font-[800] disabled:opacity-40 shadow-2xl shadow-pink-500/40 hover:shadow-pink-500/60 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {findingStranger? (
                  <>
                    <FiLoader className="animate-spin" size={24} />
                    Đang tìm...
                  </>
                ) : (
                  <>
                    <FiZap size={24} strokeWidth={2.5} />
                    Tìm bạn ngay
                  </>
                )}
              </button>

              <p className="text-xs text-center text-zinc-500 leading-relaxed">
                Karma dưới 50 sẽ bị cấm chat người lạ
                <br />
                <span className="font-[600] text-zinc-900 dark:text-white">Chat văn minh • Không spam • Không 18+</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
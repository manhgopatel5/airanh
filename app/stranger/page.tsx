"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiUserX, FiStar, FiLoader, FiUsers, FiSettings, FiInfo, FiX, FiCheck, FiChevronRight } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "tat-ca", label: "Tất cả", icon: "🌟", count: 0 },
  { id: "hay-xac-minh-anh", label: "Hãy Xác Minh Ảnh", icon: "✅", count: 93 },
  { id: "nguoi-yeu", label: "Người yêu", icon: "🌹", count: 117 },
  { id: "moi-quan-he-nghiem-tuc", label: "Mối quan hệ nghiêm túc", icon: "💍", count: 72 },
  { id: "ranh-toi-nay", label: "Rảnh tối nay", icon: "🌙", count: 38 },
  { id: "nhung-nguoi-ban-moi", label: "Những người bạn mới", icon: "👋", count: 34 },
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

const PROVINCES = [
  "Toàn quốc", "Hà Nội", "TP. Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh",
  "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
  "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang",
  "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam",
  "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh",
  "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

export default function StrangerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const db = getFirebaseDB();

  const [userKarma, setUserKarma] = useState(100);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);

  // Multi select categories
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false);

  // Step flow: 1=chọn category, 2=chọn filter, 3=confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Filter modal
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Filter state
  const [ageFrom, setAgeFrom] = useState<number>(18);
  const [ageTo, setAgeTo] = useState<number>(30);
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");
  const [selectedProvince, setSelectedProvince] = useState("Toàn quốc");

  // Temp filter state
  const [tempAgeFrom, setTempAgeFrom] = useState(18);
  const [tempAgeTo, setTempAgeTo] = useState(30);
  const [tempGender, setTempGender] = useState<"all" | "male" | "female">("all");
  const [tempProvince, setTempProvince] = useState("Toàn quốc");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setUserKarma(data?.karma || 100);
      setUserName(data?.displayName || "Bạn");
      setUserAvatar(data?.photoURL || "");
    });

    const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
      const data = snap.data();
      if (data?.matchedChatId) {
        router.push(`/stranger/${data.matchedChatId}`);
        setInQueue(false);
        setFindingStranger(false);
        setSelectedCats([]);
        setCurrentStep(1);
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

  const toggleCategory = (catId: string) => {
    if (catId === "tat-ca") {
      if (selectAllMode) {
        setSelectAllMode(false);
        setSelectedCats([]);
      } else {
        setSelectAllMode(true);
        setSelectedCats(["tat-ca"]);
      }
      return;
    }

    if (selectAllMode) return; // Đang chọn tất cả thì disable các card khác

    setSelectedCats(prev => {
      if (prev.includes(catId)) return prev.filter(c => c!== catId);
      if (prev.length >= 3) {
        toast.error("Chỉ được chọn tối đa 3 mục");
        return prev;
      }
      return [...prev, catId];
    });
  };

  const openFilterModal = () => {
    setTempAgeFrom(ageFrom);
    setTempAgeTo(ageTo);
    setTempGender(selectedGender);
    setTempProvince(selectedProvince);
    setShowFilterModal(true);
  };

  const saveFilters = () => {
    if (tempAgeFrom > tempAgeTo) {
      return toast.error("Độ tuổi không hợp lệ");
    }
    if (tempAgeFrom < 18) {
      return toast.error("Độ tuổi tối thiểu là 18");
    }
    if (tempAgeTo > 100) {
      return toast.error("Độ tuổi tối đa là 100");
    }

    setAgeFrom(tempAgeFrom);
    setAgeTo(tempAgeTo);
    setSelectedGender(tempGender);
    setSelectedProvince(tempProvince);
    setShowFilterModal(false);
    toast.success("Đã lưu bộ lọc");
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (selectedCats.length === 0) return toast.error("Chọn ít nhất 1 mục");
      setCurrentStep(2);
      openFilterModal();
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleFindStranger();
    }
  };

  const handleFindStranger = async () => {
    if (!user?.uid) return;
    if (userKarma < 50) return toast.error("Huha dưới 50, không thể chat người lạ");
    if (selectedCats.length === 0) return toast.error("Chọn ít nhất 1 mục");
    if (ageFrom < 18) return toast.error("Độ tuổi tối thiểu là 18");

    setFindingStranger(true);
    setInQueue(true);

    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const findFn = httpsCallable(functions, 'findStranger');

      const result = await findFn({
        categories: selectAllMode? CATEGORIES.filter(c => c.id!== "tat-ca").map(c => c.id) : selectedCats,
        ageRange: `${ageFrom}-${ageTo}`,
        wantGender: selectedGender,
        province: selectedProvince,
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
      setSelectedCats([]);
      setCurrentStep(1);
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
      setSelectedCats([]);
      setSelectAllMode(false);
      setCurrentStep(1);
      toast.info("Đã hủy tìm kiếm");
    } catch {
      toast.error("Lỗi hủy hàng đợi");
    }
  };

  const canGoNext = () => {
    if (currentStep === 1) return selectedCats.length > 0;
    if (currentStep === 2) return ageFrom >= 18 && ageFrom <= ageTo;
    return true;
  };

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-24">

        {/* Card User Info */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20">
          <div className="flex items-center gap-3">
            <img
              src={userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`}
              alt={userName}
              className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-zinc-900/10"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-base font-[800]">{userName}</p>
              </div>
              <div className="flex items-end gap-2 mt-0.5">
                <div className="flex items-center gap-2">
                  <FiStar className="text-amber-500" size={16} fill="currentColor" />
                  <span className="text-xl font-[800] leading-none">{userKarma}</span>
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center active:scale-90 -mt-2"
                  >
                    <FiInfo size={10} className="text-white" />
                  </button>
                </div>
              </div>
              <span className="text-xs text-zinc-500">Huha</span>
            </div>
            <button
              onClick={openFilterModal}
              className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 shadow-lg shadow-zinc-900/5"
            >
              <FiSettings size={20} className="text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
          {userKarma < 50 && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 font-[600] flex items-center gap-2">
              <FiUserX size={16} />
              Bạn đã bị cấm chat người lạ
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {inQueue? (
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
                {selectAllMode? "Tất cả mục" : `${selectedCats.length} mục đã chọn`}
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
              className="space-y-4"
            >
              {/* Step buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2",
                    currentStep === 1
                     ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white animate-pulse"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  Bước 1
                  {currentStep === 1 && selectedCats.length > 0 && <FiChevronRight size={16} className="animate-pulse" />}
                </button>
                <button
                  onClick={() => selectedCats.length > 0 && setCurrentStep(2)}
                  disabled={selectedCats.length === 0}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2 disabled:opacity-40",
                    currentStep === 2
                     ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white animate-pulse"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  Bước 2
                  {currentStep === 2 && <FiChevronRight size={16} className="animate-pulse" />}
                </button>
                <button
                  onClick={() => selectedCats.length > 0 && setCurrentStep(3)}
                  disabled={selectedCats.length === 0}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2 disabled:opacity-40",
                    currentStep === 3
                     ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white animate-pulse"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  Bước 3
                </button>
              </div>

              {/* Grid categories */}
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCats.includes(cat.id) || (selectAllMode && cat.id === "tat-ca");
                  const isDisabled = selectAllMode && cat.id!== "tat-ca";

                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      disabled={userKarma < 50 || findingStranger || isDisabled}
                      className={cn(
                        "rounded-3xl p-4 border-2 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 active:scale-95 transition-all disabled:opacity-40 h-44 flex flex-col items-center justify-center gap-3",
                        isSelected
                         ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                          : isDisabled
                         ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="text-5xl">{cat.icon}</div>
                      <div className="text-center">
                        <p className="text-sm font-[700] leading-tight">{cat.label}</p>
                        {cat.count > 0 && (
                          <div className="flex items-center justify-center gap-1 text-xs mt-1 opacity-60">
                            <FiUsers size={12} />
                            <span>{cat.count}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Nút Next Step */}
              {canGoNext() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-4 pt-4"
                >
                  <button
                    onClick={handleNextStep}
                    disabled={findingStranger || userKarma < 50}
                    className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-base font-[800] disabled:opacity-40 shadow-xl shadow-zinc-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {findingStranger? (
                      <>
                        <FiLoader className="animate-spin" size={20} />
                        Đang tìm...
                      </>
                    ) : currentStep === 3? (
                      <>
                        <FiCheck size={20} />
                        Bắt đầu tìm
                      </>
                    ) : (
                      <>
                        Tiếp tục bước {currentStep + 1}
                        <FiChevronRight size={20} />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Info Huha */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-[800]">Điểm Huha là gì?</h3>
                <button onClick={() => setShowInfoModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FiX size={18} />
                </button>
              </div>
              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <p><b className="text-zinc-900 dark:text-white">Huha</b> là điểm uy tín của bạn khi chat với người lạ.</p>
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 space-y-2">
                  <p className="font-[700] text-zinc-900 dark:text-white">Cách tính điểm:</p>
                  <p>• Bắt đầu: 100 điểm</p>
                  <p>• Bị report: -10 điểm</p>
                  <p>• Chat lịch sự 7 ngày: +5 điểm</p>
                  <p>• Dưới 50 điểm: Bị cấm chat</p>
                </div>
                <p className="text-xs">Hãy trò chuyện văn minh, tôn trọng người khác để giữ điểm Huha cao!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Filter Setting */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-[800]">Bộ lọc tìm kiếm</h3>
                <button onClick={() => setShowFilterModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Độ tuổi */}
                <div>
                  <label className="text-sm font-[700] mb-2 block">Độ tuổi</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">Từ</p>
                      <input
                        type="number"
                        value={tempAgeFrom}
                        onChange={(e) => setTempAgeFrom(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="pt-5 text-zinc-400">—</div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">Đến</p>
                      <input
                        type="number"
                        value={tempAgeTo}
                        onChange={(e) => setTempAgeTo(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                        min={0}
                        max={100}
                      />
                    </div>
                  </div>
                  {tempAgeFrom < 18 && (
                    <p className="text-xs text-red-500 mt-2 font-[600]">Độ tuổi tối thiểu là 18</p>
                  )}
                </div>

                {/* Giới tính */}
                <div>
                  <label className="text-sm font-[700] mb-2 block">Giới tính</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map(g => (
                      <button
                        key={g.value}
                        onClick={() => setTempGender(g.value)}
                        className={cn(
                          "h-12 rounded-xl text-sm font-[600] transition-all active:scale-95 border",
                          tempGender === g.value
                           ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tỉnh/TP */}
                <div>
                  <label className="text-sm font-[700] mb-2 block">Tỉnh/Thành phố</label>
                  <select
                    value={tempProvince}
                    onChange={(e) => setTempProvince(e.target.value)}
                    className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white border border-zinc-200 dark:border-zinc-700"
                  >
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    saveFilters();
                    if (currentStep === 2) setCurrentStep(3);
                  }}
                  className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-base font-[800] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <FiCheck size={20} />
                  Lưu bộ lọc
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
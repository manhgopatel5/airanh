"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiUserX, FiStar, FiEdit2, FiGrid, FiCalendar, FiUsers, FiMapPin, FiLoader, FiEdit, FiUsers, FiSettings, FiInfo, FiX, FiCheck, FiChevronRight, FiShield, FiTrendingUp, FiAlertTriangle } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "tat-ca", label: "Tất cả", icon: "🌟", count: 0 },
  { id: "thich-di-phuot", label: "Thích đi phượt", icon: "🏍️", count: 93 },
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
  const [userTier, setUserTier] = useState<"user" | "vip" | "elite">("user");
  const [accountStatus, setAccountStatus] = useState<"tich-cuc" | "canh-bao" | "cam">("tich-cuc");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [ageFrom, setAgeFrom] = useState<number>(18);
  const [ageTo, setAgeTo] = useState<number>(30);
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");
  const [selectedProvince, setSelectedProvince] = useState("Toàn quốc");

  const [tempAgeFrom, setTempAgeFrom] = useState<number | string>(18);
  const [tempAgeTo, setTempAgeTo] = useState<number | string>(30);
  const [tempGender, setTempGender] = useState<"all" | "male" | "female">("all");
  const [tempProvince, setTempProvince] = useState("Toàn quốc");

  useEffect(() => {
    if (!user?.uid) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setUserKarma(data?.karma || 100);
      setUserName(data?.displayName || "Bạn");
      setUserAvatar(data?.photoURL || "");
      setUserTier(data?.tier || "user");
      setAccountStatus(data?.status || "tich-cuc");
    });

    const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
      const data = snap.data();
      if (data?.matchedChatId) {
        router.push(`/stranger/${data.matchedChatId}`);
        setInQueue(false);
        setFindingStranger(false);
        setSelectedCats([]);
        setSelectAllMode(false);
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

  const isDisabled = accountStatus === "cam";

  const toggleCategory = (catId: string) => {
    if (isDisabled) return;

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

    if (selectAllMode) return;

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
    if (isDisabled) return;
    setTempAgeFrom(ageFrom);
    setTempAgeTo(ageTo);
    setTempGender(selectedGender);
    setTempProvince(selectedProvince);
    setShowFilterModal(true);
  };

  const saveFilters = () => {
    const from = Number(tempAgeFrom);
    const to = Number(tempAgeTo);

    if (from > to) {
      return toast.error("Độ tuổi không hợp lệ");
    }
    if (from < 18) {
      return toast.error("Độ tuổi tối thiểu là 18");
    }
    if (to > 100) {
      return toast.error("Độ tuổi tối đa là 100");
    }

    setAgeFrom(from);
    setAgeTo(to);
    setSelectedGender(tempGender);
    setSelectedProvince(tempProvince);
    setShowFilterModal(false);
    toast.success("Đã lưu bộ lọc");

    if (currentStep === 2) setCurrentStep(3);
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
  if (isDisabled) return;
  
  if (step === 1) {
    setCurrentStep(1);
  }
  
  if (step === 2 && selectedCats.length > 0) {
    setCurrentStep(2);
    // Đã bỏ openFilterModal() - chỉ chuyển tab thôi
  }
  
  if (step === 3 && selectedCats.length > 0) {
    if (ageFrom < 18) {
      toast.error("Vui lòng chỉnh độ tuổi tối thiểu từ 18");
      setCurrentStep(2);
      openFilterModal(); // Vẫn giữ ở đây để ép user sửa tuổi
      return;
    }
    setCurrentStep(3);
    handleFindStranger();
  }
};

  const handleFindStranger = async () => {
    if (!user?.uid) return;
    if (isDisabled) return toast.error("Tài khoản bị cấm");

    const maxKarma = userTier === "elite" ? 400 : userTier === "vip" ? 200 : 100;
    
    if (userKarma < 10) return toast.error("Cần ít nhất 10 điểm để tìm kiếm");
    if (userKarma > maxKarma) {
      return toast.error(`Điểm vượt giới hạn ${maxKarma}. Vui lòng liên hệ admin`);
    }
    if (selectedCats.length === 0) return toast.error("Chọn ít nhất 1 mục");
    if (ageFrom < 18) return toast.error("Độ tuổi tối thiểu là 18");

    setFindingStranger(true);
    setInQueue(true);

    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const findFn = httpsCallable(functions, 'findStranger');

      const result = await findFn({
        categories: selectAllMode ? CATEGORIES.filter(c => c.id !== "tat-ca").map(c => c.id) : selectedCats,
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
      setSelectAllMode(false);
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
              <p className="text-base font-[800]">{userName}</p>
              <button
                onClick={() => setShowInfoModal(true)}
                className="flex items-center gap-2 mt-0.5 active:scale-95 transition-all"
              >
                <FiStar className="text-amber-500" size={16} fill="currentColor" />
                <span className="text-xl font-[800] leading-none">{userKarma}</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStatusModal(true)}
                className={cn(
                  "h-11 px-3 rounded-2xl flex items-center gap-2 active:scale-90 transition-all border-2",
                  (accountStatus || "tich-cuc") === "tich-cuc" && "bg-green-50 dark:bg-green-900/20 border-green-500/30 text-green-700 dark:text-green-400",
                  accountStatus === "canh-bao" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
                  accountStatus === "cam" && "bg-red-50 dark:bg-red-900/20 border-red-500/30 text-red-700 dark:text-red-400"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  (accountStatus || "tich-cuc") === "tich-cuc" && "bg-green-500",
                  accountStatus === "canh-bao" && "bg-yellow-500",
                  accountStatus === "cam" && "bg-red-500"
                )} />
                <span className="text-xs font-[700]">
                  {(accountStatus || "tich-cuc") === "tich-cuc"? "Tích cực" : accountStatus === "canh-bao"? "Cảnh báo" : "Bị cấm"}
                </span>
              </button>
              <button
                onClick={openFilterModal}
                disabled={isDisabled}
                className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 shadow-lg shadow-zinc-900/5 disabled:opacity-40"
              >
                <FiSettings size={20} className="text-zinc-700 dark:text-zinc-300" />
              </button>
            </div>
          </div>
          {accountStatus === "cam" && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 font-[600] flex items-center gap-2">
              <FiUserX size={16} />
              Tài khoản bị cấm chat người lạ
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
              <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-blue-600/30">
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
                  onClick={() => handleStepClick(1)}
                  disabled={isDisabled}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2 disabled:opacity-40",
                    currentStep === 1
                   ? "bg-blue-600 text-white border-blue-600 animate-pulse"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  Bước 1
                  {currentStep === 1 && selectedCats.length > 0 && <FiChevronRight size={16} className="animate-pulse" />}
                </button>
                <button
                  onClick={() => handleStepClick(2)}
                  disabled={selectedCats.length === 0 || isDisabled}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2 disabled:opacity-40",
                    currentStep === 2
                   ? "bg-blue-600 text-white border-blue-600 animate-pulse"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  Bước 2
                  {currentStep === 2 && <FiChevronRight size={16} className="animate-pulse" />}
                </button>
                <button
                  onClick={() => handleStepClick(3)}
                  disabled={selectedCats.length === 0 || isDisabled || findingStranger}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-[700] transition-all active:scale-95 border-2 flex items-center justify-center gap-2 disabled:opacity-40",
                    currentStep === 3
                   ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  {findingStranger? <FiLoader className="animate-spin" size={16} /> : "Bước 3"}
                </button>
              </div>

              {/* Grid categories - chỉ hiện ở step 1 */}
              {currentStep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => {
                    const isSelected = selectedCats.includes(cat.id) || (selectAllMode && cat.id === "tat-ca");
                    const isDisabledCard = selectAllMode && cat.id!== "tat-ca";

                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        disabled={isDisabled || findingStranger || isDisabledCard}
                        className={cn(
                          "rounded-3xl p-4 border-2 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 active:scale-95 transition-all disabled:opacity-40 h-44 flex flex-col items-center justify-center gap-3",
                          isSelected
                         ? "bg-blue-600 text-white border-blue-600"
                            : isDisabledCard
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
              )}

                                  {/* Step 2: Filter preview - Premium UI */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-[800]">Bộ lọc đã chọn</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Xem lại trước khi tìm kiếm</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <FiFilter size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FiGrid size={16} className="text-purple-500" />
                          <span className="text-xs font-[600] text-zinc-500">Danh mục</span>
                        </div>
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white line-clamp-2">
                          {selectAllMode? "Tất cả" : selectedCats.map(id => CATEGORIES.find(c => c.id === id)?.label).join(", ")}
                        </p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FiCalendar size={16} className="text-orange-500" />
                          <span className="text-xs font-[600] text-zinc-500">Độ tuổi</span>
                        </div>
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white">{ageFrom} - {ageTo} tuổi</p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FiUsers size={16} className="text-pink-500" />
                          <span className="text-xs font-[600] text-zinc-500">Giới tính</span>
                        </div>
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white">{GENDERS.find(g => g.value === selectedGender)?.label}</p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FiMapPin size={16} className="text-emerald-500" />
                          <span className="text-xs font-[600] text-zinc-500">Khu vực</span>
                        </div>
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white line-clamp-2">{selectedProvince}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={openFilterModal}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-[700] active:scale-95 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <FiEdit2 size={18} />
                    Chỉnh sửa bộ lọc
                  </button>
                </div>
              )}

              {/* Step 3: Confirm */}
              {currentStep === 3 && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <h3 className="text-lg font-[800]">Xác nhận tìm kiếm</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-zinc-500">Danh mục: <span className="font-[700] text-zinc-900 dark:text-white">
                      {selectAllMode? "Tất cả" : selectedCats.map(id => CATEGORIES.find(c => c.id === id)?.label).join(", ")}
                    </span></p>
                    <p className="text-zinc-500">Độ tuổi: <span className="font-[700] text-zinc-900 dark:text-white">{ageFrom}-{ageTo}</span></p>
                    <p className="text-zinc-500">Giới tính: <span className="font-[700] text-zinc-900 dark:text-white">{GENDERS.find(g => g.value === selectedGender)?.label}</span></p>
                    <p className="text-zinc-500">Khu vực: <span className="font-[700] text-zinc-900 dark:text-white">{selectedProvince}</span></p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
                    <FiInfo className="inline mr-1" /> Mỗi lần tìm kiếm sẽ trừ 10 điểm
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Info Huha - Nâng cấp */}
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
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-[800] flex items-center gap-2">
                  <FiShield className="text-blue-600" />
                  Điểm Huha
                </h3>
                <button onClick={() => setShowInfoModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FiX size={18} />
                </button>
              </div>
              <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                <p><b className="text-zinc-900 dark:text-white">Huha</b> là điểm dùng để tìm kiếm bạn chat. Mỗi lần tìm -10 điểm.</p>

                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                  <p className="font-[700] text-zinc-900 dark:text-white flex items-center gap-2">
                    <FiTrendingUp className="text-green-500" /> Cách kiếm điểm:
                  </p>
                  <p>• Mỗi ngày đăng nhập: +10 điểm</p>
                  <p>• Chat lịch sự 7 ngày liên tiếp: +5 điểm</p>
                  <p>• Được người khác đánh giá tốt: +2 điểm/lượt</p>
                </div>

                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 space-y-2">
                  <p className="font-[700] text-zinc-900 dark:text-white flex items-center gap-2">
                    <FiAlertTriangle className="text-red-500" /> Trừ điểm:
                  </p>
                  <p>• Mỗi lần tìm kiếm: -10 điểm</p>
                  <p>• Bị report: -10 điểm</p>
                  <p>• Vi phạm quy tắc: -20 điểm</p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                  <p className="font-[700] text-blue-700 dark:text-blue-400">Hạng tài khoản:</p>
                  <p className="text-blue-600 dark:text-blue-300">• User: Tối đa 100 điểm</p>
                  <p className="text-blue-600 dark:text-blue-300">• VIP: Tối đa 200 điểm</p>
                  <p className="text-blue-600 dark:text-blue-300">• Elite: Tối đa 400 điểm</p>
                </div>

                <p className="text-xs text-center">Điểm của bạn: <b className="text-zinc-900 dark:text-white">{userKarma}/{userTier === "elite"? 400 : userTier === "vip"? 200 : 100}</b></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Status Account */}
      <AnimatePresence>
        {showStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-[800]">Trạng thái tài khoản</h3>
                <button onClick={() => setShowStatusModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <FiX size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border-2",
                  accountStatus === "tich-cuc" && "bg-green-50 dark:bg-green-900/20 border-green-500",
                  accountStatus === "canh-bao" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
                  accountStatus === "cam" && "bg-red-50 dark:bg-red-900/20 border-red-500"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      accountStatus === "tich-cuc" && "bg-green-500",
                      accountStatus === "canh-bao" && "bg-yellow-500",
                      accountStatus === "cam" && "bg-red-500"
                    )} />
                    <p className="font-[800] text-zinc-900 dark:text-white">
                      {accountStatus === "tich-cuc" && "Tích cực"}
                      {accountStatus === "canh-bao" && "Bị cảnh báo"}
                      {accountStatus === "cam" && "Bị cấm"}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {accountStatus === "tich-cuc" && "Tài khoản hoạt động bình thường. Hãy tiếp tục trò chuyện văn minh để giữ trạng thái này!"}
                    {accountStatus === "canh-bao" && "Bạn đã vi phạm quy tắc cộng đồng. Nếu tiếp tục vi phạm, tài khoản sẽ bị cấm. Hãy cẩn thận hơn!"}
                    {accountStatus === "cam" && "Tài khoản bị khóa do vi phạm nghiêm trọng. Bạn không thể sử dụng tính năng chat người lạ. Liên hệ hỗ trợ để kháng cáo."}
                  </p>
                </div>
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
                <div>
                  <label className="text-sm font-[700] mb-2 block">Độ tuổi</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">Từ</p>
                      <input
                        type="number"
                        value={tempAgeFrom}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") setTempAgeFrom("");
                          else setTempAgeFrom(Math.max(0, Math.min(100, Number(val))));
                        }}
                        className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min={0}
                        max={100}
                        placeholder="0"
                      />
                    </div>
                    <div className="pt-5 text-zinc-400">—</div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">Đến</p>
                      <input
                        type="number"
                        value={tempAgeTo}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") setTempAgeTo("");
                          else setTempAgeTo(Math.max(0, Math.min(100, Number(val))));
                        }}
                        className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] text-center focus:outline-none focus:ring-2 focus:ring-blue-600"
                        min={0}
                        max={100}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {Number(tempAgeFrom) < 18 && tempAgeFrom!== "" && (
                    <p className="text-xs text-red-500 mt-2 font-[600]">Độ tuổi tối thiểu là 18</p>
                  )}
                </div>

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
                         ? "bg-blue-600 text-white border-blue-600"
                            : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-[700] mb-2 block">Tỉnh/Thành phố</label>
                  <select
                    value={tempProvince}
                    onChange={(e) => setTempProvince(e.target.value)}
                    className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-[600] focus:outline-none focus:ring-2 focus:ring-blue-600 border border-zinc-200 dark:border-zinc-700"
                  >
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={saveFilters}
                  className="w-full h-12 bg-blue-600 text-white rounded-xl text-base font-[800] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
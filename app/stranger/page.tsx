"use client";

import { useState, useEffect } from "react";

import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiUserX, FiSearch, FiStar, FiAward, FiFilter, FiEdit2, FiGrid, FiCalendar, FiMapPin, FiLoader, FiUsers, FiSettings, FiInfo, FiX, FiCheck, FiCheckCircle, FiChevronRight, FiTrendingUp, FiAlertTriangle } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ChatButton from "@/components/stranger/ChatButton";
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

  const db = getFirebaseDB();

  const [userKarma, setUserKarma] = useState(100);
  const [userTier, setUserTier] = useState<"user" | "vip" | "elite">("user");
  const [accountStatus, setAccountStatus] = useState<"active" | "warning" | "banned">("active");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null); // THÊM DÒNG NÀY

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
    setAccountStatus(data?.status || "active");
    setCurrentChatId(data?.currentChatId || null); // THÊM DÒNG NÀY
  });

  const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
    const data = snap.data();
    if (data?.matchedChatId) {
      // XÓA: router.push(`/stranger/${data.matchedChatId}`);
      // XÓA: setSelectedCats([]);
      // XÓA: setSelectAllMode(false);
      // XÓA: setCurrentStep(1);
      
      // THAY BẰNG:
      toast.success("Đã tìm thấy bạn phù hợp! Bấm 'Trò chuyện' để bắt đầu", { duration: 5000 });
      setInQueue(false);
      setFindingStranger(false);
    } else if (data && !data?.matchedChatId) {
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
}, [user?.uid, db]); // XÓA router khỏi deps

const isDisabled = accountStatus === "banned";

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
  
  // Xóa dòng này: if (currentStep === 2) setCurrentStep(3);
};

  const handleStepClick = (step: 1 | 2 | 3) => {
  if (isDisabled) return;
  
  if (step === 1) {
    setCurrentStep(1);
    return;
  }
  
  if (step === 2) {
    if (selectedCats.length === 0) {
      toast.error("Chọn ít nhất 1 mục trước");
      return;
    }
    setCurrentStep(2);
    return;
  }
  
  if (step === 3) {
    if (selectedCats.length === 0) {
      toast.error("Chọn ít nhất 1 mục trước");
      return;
    }

    // Validate + lưu filter trước khi qua bước 3
    const from = Number(tempAgeFrom);
    const to = Number(tempAgeTo);

    if (from > to) {
      toast.error("Độ tuổi không hợp lệ");
      setCurrentStep(2);
      openFilterModal();
      return;
    }
    if (from < 18) {
      toast.error("Độ tuổi tối thiểu là 18");
      setCurrentStep(2);
      openFilterModal();
      return;
    }
    if (to > 100) {
      toast.error("Độ tuổi tối đa là 100");
      setCurrentStep(2);
      openFilterModal();
      return;
    }

    // Lưu để UI bước 3 hiển thị đúng
    setAgeFrom(from);
    setAgeTo(to);
    setSelectedGender(tempGender);
    setSelectedProvince(tempProvince);
    
    setCurrentStep(3);
    // Không gọi handleFindStranger() ở đây
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
  
  const finalCats = selectAllMode 
    ? CATEGORIES.filter(c => c.id !== "tat-ca").map(c => c.id) 
    : selectedCats;

  if (finalCats.length < 3) return toast.error("Chọn ít nhất 3 sở thích"); // Đổi text
  if (ageFrom < 18) return toast.error("Độ tuổi tối thiểu là 18");
  
 

  setFindingStranger(true);
  setInQueue(true);

  try {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const findFn = httpsCallable(functions, 'findStranger');

    const result = await findFn({
      interests: finalCats, // Đổi từ categories -> interests
      ageRange: `${ageFrom}-${ageTo}`,
      wantGender: selectedGender,
     
      province: selectedProvince, // Field này Function chưa dùng, bỏ cũng được
    });

    const data = result.data as { chatId: string, matched: boolean };

    if (data.matched) {
      toast.success("Đã tìm thấy bạn phù hợp! Bấm 'Trò chuyện' để bắt đầu", { duration: 5000 });
      setInQueue(false);
    } else {
      toast.success("Đã vào hàng đợi. Hệ thống sẽ thông báo khi có người match", { duration: 4000 });
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
    // XÓA 3 DÒNG NÀY - không reset về bước 1 nữa
    // setSelectedCats([]);
    // setSelectAllMode(false);
    // setCurrentStep(1);
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
  <ChatButton chatId={currentChatId} variant="default" showDetails />

  <button
    onClick={() => setShowStatusModal(true)}
    className={cn(
      "h-11 px-3 rounded-2xl flex items-center gap-2 active:scale-90 transition-all border-2",
      accountStatus === "active" && "bg-green-50 dark:bg-green-900/20 border-green-500/30 text-green-700 dark:text-green-400",
      accountStatus === "warning" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
      accountStatus === "banned" && "bg-red-50 dark:bg-red-900/20 border-red-500/30 text-red-700 dark:text-red-400"
    )}
  >
    <div className={cn(
      "w-2 h-2 rounded-full",
      accountStatus === "active" && "bg-green-500",
      accountStatus === "warning" && "bg-yellow-500",
      accountStatus === "banned" && "bg-red-500"
    )} />
    <span className="text-xs font-[700]">
      {accountStatus === "active"? "Tích cực" : accountStatus === "warning"? "Cảnh báo" : "Bị cấm"}
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
{accountStatus === "banned" && (
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
    <p className="text-sm text-zinc-500 mb-2">
      {selectAllMode? "Tất cả mục" : `${selectedCats.length} mục đã chọn`}
    </p>
    <p className="text-xs text-zinc-400 mb-6">
      Bạn có thể thoát ra, hệ thống sẽ tự thông báo khi có người match
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

                        {/* Step 3: Confirm search - Premium UI */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-zinc-900/5 dark:shadow-black/20">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-lg font-[800]">Xác nhận tìm kiếm</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Kiểm tra lại thông tin</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                        <FiCheckCircle size={18} className="text-green-600 dark:text-green-400" />
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

                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 flex items-center gap-2">
                      <FiInfo size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm font-[600] text-blue-700 dark:text-blue-300">
                        Mỗi lần tìm kiếm sẽ trừ 10 điểm
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleFindStranger}
                    disabled={isDisabled}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-[800] active:scale-95 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-40"
                  >
                    <FiSearch size={18} />
                    Bắt đầu tìm kiếm
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Info Huha - Premium UI */}
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
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <FiStar className="text-blue-600 dark:text-blue-400" size={22} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-lg font-[800]">Điểm Huha</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {userKarma}/{userTier === "elite"? 400 : userTier === "vip"? 200 : 100} điểm
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInfoModal(false)} 
                    className="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-[600]">
                    <b>Huha</b> là điểm dùng để tìm kiếm bạn chat. Mỗi lần tìm -10 điểm.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Cách kiếm điểm */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                        <FiTrendingUp className="text-green-600 dark:text-green-400" size={16} />
                      </div>
                      <span className="text-sm font-[800] text-zinc-900 dark:text-white">Cách kiếm điểm</span>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>Đăng nhập mỗi ngày</span>
                        <span className="font-[700] text-green-600 dark:text-green-400">+10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Chat lịch sự 7 ngày</span>
                        <span className="font-[700] text-green-600 dark:text-green-400">+5</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Được đánh giá tốt</span>
                        <span className="font-[700] text-green-600 dark:text-green-400">+2/lượt</span>
                      </div>
                    </div>
                  </div>

                  {/* Trừ điểm */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                        <FiAlertTriangle className="text-red-600 dark:text-red-400" size={16} />
                      </div>
                      <span className="text-sm font-[800] text-zinc-900 dark:text-white">Trừ điểm</span>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>Mỗi lần tìm kiếm</span>
                        <span className="font-[700] text-red-600 dark:text-red-400">-10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bị report</span>
                        <span className="font-[700] text-red-600 dark:text-red-400">-10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Vi phạm quy tắc</span>
                        <span className="font-[700] text-red-600 dark:text-red-400">-20</span>
                      </div>
                    </div>
                  </div>

                  {/* Hạng tài khoản */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                        <FiAward className="text-purple-600 dark:text-purple-400" size={16} />
                      </div>
                      <span className="text-sm font-[800] text-zinc-900 dark:text-white">Hạng tài khoản</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded-xl",
                        userTier === "user" && "bg-blue-50 dark:bg-blue-900/20"
                      )}>
                        <span className={cn(
                          "font-[600]",
                          userTier === "user"? "text-blue-700 dark:text-blue-300" : "text-zinc-500"
                        )}>
                          User {userTier === "user" && "• Hiện tại"}
                        </span>
                        <span className="font-[700] text-zinc-900 dark:text-white">100</span>
                      </div>
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded-xl",
                        userTier === "vip" && "bg-purple-50 dark:bg-purple-900/20"
                      )}>
                        <span className={cn(
                          "font-[600]",
                          userTier === "vip"? "text-purple-700 dark:text-purple-300" : "text-zinc-500"
                        )}>
                          VIP {userTier === "vip" && "• Hiện tại"}
                        </span>
                        <span className="font-[700] text-zinc-900 dark:text-white">200</span>
                      </div>
                      <div className={cn(
                        "flex items-center justify-between p-2 rounded-xl",
                        userTier === "elite" && "bg-amber-50 dark:bg-amber-900/20"
                      )}>
                        <span className={cn(
                          "font-[600]",
                          userTier === "elite"? "text-amber-700 dark:text-amber-300" : "text-zinc-500"
                        )}>
                          Elite {userTier === "elite" && "• Hiện tại"}
                        </span>
                        <span className="font-[700] text-zinc-900 dark:text-white">400</span>
                      </div>
                    </div>
                  </div>
                </div>
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
  accountStatus === "active" && "bg-green-50 dark:bg-green-900/20 border-green-500",
  accountStatus === "warning" && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500",
  accountStatus === "banned" && "bg-red-50 dark:bg-red-900/20 border-red-500"
)}>
  <div className="flex items-center gap-3 mb-2">
    <div className={cn(
      "w-3 h-3 rounded-full",
      accountStatus === "active" && "bg-green-500",
      accountStatus === "warning" && "bg-yellow-500",
      accountStatus === "banned" && "bg-red-500"
    )} />
    <p className="font-[800] text-zinc-900 dark:text-white">
      {accountStatus === "active" && "Tích cực"}
      {accountStatus === "warning" && "Bị cảnh báo"}
      {accountStatus === "banned" && "Bị cấm"}
    </p>
  </div>
  <p className="text-sm text-zinc-600 dark:text-zinc-400">
    {accountStatus === "active" && "Tài khoản hoạt động bình thường. Hãy tiếp tục trò chuyện văn minh để giữ trạng thái này!"}
    {accountStatus === "warning" && "Bạn đã vi phạm quy tắc cộng đồng. Nếu tiếp tục vi phạm, tài khoản sẽ bị cấm. Hãy cẩn thận hơn!"}
    {accountStatus === "banned" && "Tài khoản bị khóa do vi phạm nghiêm trọng. Bạn không thể sử dụng tính năng chat người lạ. Liên hệ hỗ trợ để kháng cáo."}
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
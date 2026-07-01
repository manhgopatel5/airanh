"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { doc, onSnapshot, getDoc, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { FiUserX, FiSearch, FiStar, FiAward, FiFilter, FiEdit2, FiGrid, FiCalendar, FiMapPin, FiLoader, FiUsers, FiSettings, FiInfo, FiX, FiCheck, FiCheckCircle, FiChevronRight, FiTrendingUp, FiAlertTriangle } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ChatButton from "@/components/stranger/ChatButton";
import RegionPicker from "@/components/stranger/RegionPicker";
import { useRouter } from "next/navigation";
import { useActiveStrangerChatId } from "@/hooks/useActiveStrangerChat";
import {
  defaultStrangerRegion,
  isStrangerRegionValid,
  type StrangerRegion,
} from "@/lib/strangerLocation";
import { canUseStrangerChat, getPrivacySettings } from "@/lib/privacy";
import CategoryIcon from "@/components/stranger/CategoryIcon";
import {
  STRANGER_CATEGORIES,
  STRANGER_CATEGORY_COUNT,
} from "@/lib/strangerCategories";

const GENDERS = [
  { value: "all", label: "Tất cả" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
] as const;

export default function StrangerPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const activeStrangerChatId = useActiveStrangerChatId();
  const [userKarma, setUserKarma] = useState<number | null>(null);
  const [userTier, setUserTier] = useState<"user" | "vip" | "elite">("user");
  const [accountStatus, setAccountStatus] = useState<"active" | "warning" | "banned">("active");
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [findingStranger, setFindingStranger] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [matchedChatId, setMatchedChatId] = useState<string | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [ageFrom, setAgeFrom] = useState<number>(18);
  const [ageTo, setAgeTo] = useState<number>(30);
  const [selectedGender, setSelectedGender] = useState<"all" | "male" | "female">("all");
  const [region, setRegion] = useState<StrangerRegion>(() => defaultStrangerRegion());

  const [tempAgeFrom, setTempAgeFrom] = useState<number | string>(18);
  const [tempAgeTo, setTempAgeTo] = useState<number | string>(30);
  const [tempGender, setTempGender] = useState<"all" | "male" | "female">("all");
  const [tempRegion, setTempRegion] = useState<StrangerRegion>(() => defaultStrangerRegion());
  const [allowStrangers, setAllowStrangers] = useState<"everyone" | "contacts" | "none">("everyone");
  const [queueData, setQueueData] = useState<{ interests?: string[] } | null>(null);

useEffect(() => {
  if (!user?.uid) return;

  const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
    const data = snap.data();
    setUserKarma(data?.karma ?? 0);
    setUserName(data?.displayName || "Bạn");
    setUserAvatar(data?.photoURL || "");
    setUserTier(data?.tier || "user");
    setAccountStatus(data?.status || "active");
    setCurrentChatId(data?.currentChatId || null);
    setAllowStrangers(getPrivacySettings(data).allowStrangers);
  });

  const unsubQueue = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
    const data = snap.data();
    if (data?.matchedChatId) {
      setMatchedChatId(data.matchedChatId);
      setInQueue(false);
      setFindingStranger(false);
      setQueueData(null);
    } else if (data?.status === "waiting") {
      setInQueue(true);
      setFindingStranger(true);
      setQueueData(data);
      setMatchedChatId(null); // RESET KHI CHƯA MATCH
    } else {
      setInQueue(false);
      setFindingStranger(false);
      setQueueData(null);
      setMatchedChatId(null); // RESET KHI THOÁT QUEUE
    }
  });

  return () => {
    unsubUser();
    unsubQueue();
  };
}, [user?.uid, db]);

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
    setTempRegion(region);
    setShowFilterModal(true);
  };

  const saveFilters = () => {
    const from = Number(tempAgeFrom);
    const to = Number(tempAgeTo);

    if (from > to) return toast.error("Độ tuổi không hợp lệ");
    if (from < 18) return toast.error("Độ tuổi tối thiểu là 18");
    if (to > 100) return toast.error("Độ tuổi tối đa là 100");
    if (!isStrangerRegionValid(tempRegion)) return toast.error("Chọn khu vực bằng GPS hoặc nhập địa chỉ");

    setAgeFrom(from);
    setAgeTo(to);
    setSelectedGender(tempGender);
    setRegion(tempRegion);
    setShowFilterModal(false);
    toast.success("Đã lưu bộ lọc");
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

      if (!isStrangerRegionValid(tempRegion)) {
        toast.error("Chọn khu vực bằng GPS hoặc nhập địa chỉ");
        setCurrentStep(2);
        openFilterModal();
        return;
      }

      setAgeFrom(from);
      setAgeTo(to);
      setSelectedGender(tempGender);
      setRegion(tempRegion);
      setCurrentStep(3);
    }
  };

  const handleFindStranger = async () => {
  if (!user?.uid) return;
  if (isDisabled) return toast.error("Tài khoản bị cấm");
  if (!canUseStrangerChat({ allowStrangers, hideOnline: false, hideLastSeen: false, hidePhone: false, hideEmail: false, language: "vi" })) {
    return toast.error("Bạn đã tắt nhắn tin với người lạ trong Cài đặt chung");
  }
  
  const finalCats = selectAllMode 
   ? STRANGER_CATEGORIES.filter(c => c.id !== "tat-ca").map(c => c.id) 
    : selectedCats;

  if (finalCats.length < 3) return toast.error("Chọn ít nhất 3 sở thích");
  if (ageFrom < 18) return toast.error("Độ tuổi tối thiểu là 18");
  if (!isStrangerRegionValid(region)) return toast.error("Chọn khu vực bằng GPS hoặc nhập địa chỉ");

  setFindingStranger(true);
  setInQueue(true);

  try {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const findFn = httpsCallable(functions, 'findStranger');

    const result = await findFn({
      interests: finalCats,
      ageRange: `${ageFrom}-${ageTo}`,
      wantGender: selectedGender,
      province: region.province,
      ...(region.lat != null && region.lng != null
        ? { locationLat: region.lat, locationLng: region.lng }
        : {}),
    });

    const data = result.data as { chatId: string, matched: boolean };

    if (data.matched) {
      toast.success("Đã tìm thấy bạn phù hợp! Bấm 'Trò chuyện' để bắt đầu", { duration: 5000 });
      setInQueue(false);
    } else {
      toast.success("Đã vào hàng đợi. Hệ thống sẽ thông báo khi có người match", { duration: 4000 });
    }
  } catch (e: any) {
    // Backend trả lỗi nếu < 50 điểm hoặc lỗi khác
    const msg = e.message || "Lỗi tìm kiếm";
    toast.error(msg);
    setInQueue(false);
    console.error("findStranger error:", e);
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

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-24">
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
                <span className="text-xl font-[800] leading-none">
                  {userKarma === null? "..." : userKarma}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ChatButton chatId={activeStrangerChatId || currentChatId} variant="default" showDetails />
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

        {matchedChatId && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-600/30">
              <FiCheck className="text-white" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-[800] text-green-800 dark:text-green-300">Đã tìm thấy bạn!</p>
              <p className="text-xs text-green-600 dark:text-green-400">Bấm để bắt đầu trò chuyện</p>
            </div>
            <button
              onClick={async () => {
                if (!matchedChatId || !user?.uid) return;
                try {
                  const chatSnap = await getDoc(doc(db, "stranger_chats", matchedChatId));
                  if (chatSnap.exists()) {
                    router.push(`/stranger/${matchedChatId}`);
                    deleteDoc(doc(db, "stranger_queue", user.uid)).catch(() => {});
                  } else {
                    toast.error("Phòng chat chưa sẵn sàng, thử lại sau");
                  }
                } catch {
                  toast.error("Không thể vào phòng chat");
                }
              }}
              className="h-10 px-4 bg-green-600 text-white rounded-xl text-sm font-[700] active:scale-95 shrink-0"
            >
              Vào chat
            </button>
          </div>
        )}

        {inQueue && !matchedChatId && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
              <FiLoader className="text-white animate-spin" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-[800] text-blue-800 dark:text-blue-300">Đang tìm bạn phù hợp...</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {queueData?.interests
                  ? queueData.interests.length === STRANGER_CATEGORY_COUNT
                    ? "Tất cả mục"
                    : `${queueData.interests.length} mục đã chọn`
                  : selectAllMode
                    ? "Tất cả mục"
                    : `${selectedCats.length} mục đã chọn`}
                {" · "}Bạn có thể thoát trang, sẽ nhận thông báo khi match
              </p>
            </div>
            <button
              onClick={handleCancelQueue}
              className="h-10 px-3 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-[700] border border-zinc-200 dark:border-zinc-700 active:scale-95 shrink-0"
            >
              Hủy
            </button>
          </div>
        )}

        <div className="space-y-4">
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

              {currentStep === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  {STRANGER_CATEGORIES.map(cat => {
                    const isSelected = selectedCats.includes(cat.id) || (selectAllMode && cat.id === "tat-ca");
                    const isDisabledCard = selectAllMode && cat.id !== "tat-ca";

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
                        <CategoryIcon
                          icon={cat.icon}
                          gradient={cat.gradient}
                          ring={cat.ring}
                          selected={isSelected}
                          size="lg"
                        />
                        <div className="text-center">
                          <p className="text-sm font-[700] leading-tight">{cat.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

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
                          {selectAllMode ? "Tất cả" : selectedCats.map(id => STRANGER_CATEGORIES.find(c => c.id === id)?.label).join(", ")}
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
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white line-clamp-2">
                          {isStrangerRegionValid(region) ? region.displayLabel : "Chưa chọn — dùng GPS hoặc nhập địa chỉ"}
                        </p>
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
                          {selectAllMode ? "Tất cả" : selectedCats.map(id => STRANGER_CATEGORIES.find(c => c.id === id)?.label).join(", ")}
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
                        <p className="text-sm font-[700] text-zinc-900 dark:text-white line-clamp-2">
                          {isStrangerRegionValid(region) ? region.displayLabel : "Chưa chọn — dùng GPS hoặc nhập địa chỉ"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-3 flex items-center gap-2">
                      <FiInfo size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-sm font-[600] text-blue-700 dark:text-blue-300">
                        Cần tối thiểu 50 điểm để tìm kiếm
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
        </div>
      </div>

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

              <div className="p-6 overflow-y-auto space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-[600]">
                                     <b>Huha</b> là điểm dùng để tìm kiếm bạn chat. Cần tối thiểu 50 điểm.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
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

                  <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                        <FiAlertTriangle className="text-red-600 dark:text-red-400" size={16} />
                      </div>
                      <span className="text-sm font-[800] text-zinc-900 dark:text-white">Trừ điểm</span>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
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
                  <label className="text-sm font-[700] mb-2 block">Khu vực</label>
                  <RegionPicker value={tempRegion} onChange={setTempRegion} />
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
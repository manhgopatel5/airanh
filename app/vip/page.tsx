"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLoader, FiCheck, FiShield, FiGift, FiCreditCard,
  FiChevronDown, FiLock, FiStar, FiZap, FiCheckCircle,
  FiX, FiUsers, FiCalendar, FiMessageCircle, FiMapPin,
  FiGlobe, FiTrendingUp, FiRefreshCw, FiHeadphones,
  FiCpu, FiAward, FiUserPlus, FiBell
} from "react-icons/fi";
import { cn } from "@/lib/utils";


type VipTier = {
  id: 'pro' | 'elite';
  name: string;
  price: number;
  priceText: string;
  duration: string;
  features: { text: string; icon: any; highlight?: boolean }[];
  badge: string;
  popular?: boolean;
  savePercent?: number;
};

const VIP_TIERS: VipTier[] = [
  {
    id: 'pro',
    name: 'VIP Pro',
    price: 49000,
    priceText: '49.000',
    duration: 'đ/tháng',
    badge: '⚡',
    popular: true,
    features: [
      { text: 'Huy hiệu VIP cạnh tên', icon: FiAward, highlight: true },
      { text: 'Tạo nhóm tối đa 50 thành viên', icon: FiUsers },
      { text: 'Tạo tối đa 5 sự kiện/công việc mỗi ngày', icon: FiCalendar },
      { text: 'Chat với người lạ không giới hạn', icon: FiMessageCircle },
      { text: 'Mở khoá tìm xung quanh', icon: FiMapPin, highlight: true },
      { text: 'Tham gia tất cả phòng chat công cộng', icon: FiGlobe },
      { text: 'Ưu tiên hiển thị sự kiện/công việc', icon: FiTrendingUp },
      { text: 'Ưu tiên trải nghiệm tính năng mới', icon: FiZap }
    ]
  },
  {
    id: 'elite',
    name: 'VIP Elite',
    price: 149000,
    priceText: '149.000',
    duration: 'đ/tháng',
    badge: '👑',
    popular: false,
    savePercent: 67,
    features: [
      { text: 'Huy hiệu VIP Elite + hiệu ứng động', icon: FiAward, highlight: true },
      { text: 'Tạo nhóm không giới hạn thành viên', icon: FiUsers, highlight: true },
      { text: 'Mời bạn không giới hạn', icon: FiUserPlus },
      { text: 'Thông báo khi vào phòng chat công cộng', icon: FiBell },
      { text: 'Ưu tiên hiển thị sự kiện/công việc', icon: FiTrendingUp, highlight: true },
      { text: 'Màu vàng độc quyền', icon: FiStar },
      { text: 'Thu hồi tin nhắn không giới hạn', icon: FiRefreshCw },
      { text: 'Hỗ trợ 24/7', icon: FiHeadphones, highlight: true },
      { text: 'Booster tốc độ truy cập', icon: FiCpu },
      { text: 'Nhiều tính năng độc quyền', icon: FiZap }
    ]
  }
];

const COMPARE_DATA = [
  { name: 'Huy hiệu', free: 'Không', pro: 'Xanh', elite: 'Vàng động' },
  { name: 'Tạo nhóm', free: '10 thành viên', pro: '50 thành viên', elite: 'Không giới hạn' },
  { name: 'Sự kiện/ngày', free: '1', pro: '5', elite: 'Không giới hạn' },
  { name: 'Chat người lạ', free: 'Giới hạn', pro: 'Không giới hạn', elite: 'Không giới hạn' },
  { name: 'Tìm xung quanh', free: 'Không', pro: 'Có', elite: 'Có' },
  { name: 'Phòng chat công cộng', free: 'Giới hạn', pro: 'Tất cả', elite: 'Tất cả + Thông báo' },
  { name: 'Ưu tiên hiển thị', free: 'Không', pro: 'Có', elite: 'Ưu tiên cao' },
  { name: 'Thu hồi tin nhắn', free: 'Giới hạn', pro: 'Giới hạn', elite: 'Không giới hạn' },
  { name: 'Màu độc quyền', free: 'Không', pro: 'Không', elite: 'Vàng' },
  { name: 'Booster tốc độ', free: 'Không', pro: 'Không', elite: 'Có' },
  { name: 'Hỗ trợ', free: 'Email', pro: 'Ưu tiên', elite: '24/7' },
  { name: 'Tính năng mới', free: 'Chờ', pro: 'Ưu tiên', elite: 'Độc quyền' },
];

type Tab = 'plans' | 'compare' | 'faq';

export default function VipPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [userVip, setUserVip] = useState<{tier: 'free' | 'pro' | 'elite', expiresAt?: Timestamp} | null>(null);
  const [purchasingVip, setPurchasingVip] = useState<'pro' | 'elite' | null>(null);
  const [showFAQ, setShowFAQ] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{code: string, discount: number} | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [selectedTierId, setSelectedTierId] = useState<'pro' | 'elite'>('pro');

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserVip(data.vip || { tier: 'free' });
      }
    });
    return () => unsub();
  }, [user?.uid, db]);

  const handlePurchaseVip = async (tierId: 'pro' | 'elite') => {
  if (!user?.uid) return toast.error("Vui lòng đăng nhập");
  const tier = VIP_TIERS.find(t => t.id === tierId);
  if (!tier) return;

  setPurchasingVip(tierId);
  try {
    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        planId: tierId,
        // Bỏ amount, BE tự tính
        promoCode: appliedPromo?.code || null,
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tạo đơn');
    if (!data.orderId) throw new Error('Không nhận được mã đơn');

    router.push(`/vip/payment/${data.orderId}`);
  } catch (error: any) {
    toast.error("Lỗi: " + error.message);
  } finally {
    setPurchasingVip(null);
  }
};

  const applyPromoCode = async () => {
    if (!promoCode) return toast.error("Nhập mã giảm giá");

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode })
      });

      const data = await res.json();

      if (!data.valid) {
        return toast.error(data.message);
      }

      setAppliedPromo({ code: data.code, discount: data.discount });
      toast.success(`Áp dụng mã ${data.code} - Giảm ${data.discount}%`);
      setPromoCode("");
    } catch (error: any) {
      toast.error("Lỗi khi kiểm tra mã");
    }
  };

  const daysLeft = userVip?.expiresAt
   ? Math.max(0, differenceInDays(userVip.expiresAt.toDate(), new Date()))
    : 0;

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
          

          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
            {(['plans', 'compare', 'faq'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  activeTab === tab
                   ? "bg-[#0a84ff] text-white shadow-sm shadow-blue-500/30"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {tab === 'plans' && 'Gói VIP'}
                {tab === 'compare' && 'So sánh'}
                {tab === 'faq' && 'FAQ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {userVip && userVip.tier!== 'free' && (
                <div className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs opacity-70 mb-1">Gói hiện tại</p>
                      <p className="text-2xl font-black flex items-center gap-2">
                        {VIP_TIERS.find(t => t.id === userVip?.tier)?.badge}
                        {VIP_TIERS.find(t => t.id === userVip?.tier)?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black">{daysLeft}</p>
                      <p className="text-xs opacity-70">ngày còn lại</p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/20 dark:bg-zinc-900/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((daysLeft / 30) * 100, 100)}%` }}
                      className="h-full bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>
              )}
{userVip?.tier === 'pro' && selectedTierId === 'elite' && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <FiZap className="text-amber-500" size={20} />
      <p className="text-sm font-bold text-amber-600 dark:text-amber-500">
        Nâng cấp lên Elite
      </p>
    </div>
    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Bạn đang dùng Pro còn {daysLeft} ngày. Khi nâng cấp, hệ thống tự tính tiền chênh lệch cho {daysLeft} ngày còn lại thay vì trả full 149.000đ.
    </p>
  </div>
)}

              {!appliedPromo? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <FiGift className="text-amber-500" size={20} />
                    <p className="text-base font-bold">Mã giảm giá</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Nhập mã giảm giá"
                      className="flex-1 h-12 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0a84ff]/30"
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={!promoCode}
                      className="px-6 h-12 bg-[#0a84ff] text-white rounded-2xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <FiCheck className="text-emerald-500" size={20} strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Mã {appliedPromo.code}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Giảm {appliedPromo.discount}%</p>
                    </div>
                  </div>
                  <button onClick={() => setAppliedPromo(null)} className="text-sm text-red-500 font-semibold">Xóa</button>
                </div>
              )}

              <div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-800">
                {(() => {
                  const tier = VIP_TIERS.find(t => t.id === selectedTierId)!;
                  const isActive = userVip?.tier === tier.id;
                  const finalPrice = appliedPromo? Math.round(tier.price * (1 - appliedPromo.discount / 100)) : tier.price;

                  return (
                    <>
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-5">
  {VIP_TIERS.map((t) => {
    const isDisabled = t.id === 'pro' && userVip?.tier === 'elite';
    const isSelected = selectedTierId === t.id;
    
    return (
      <button
        key={t.id}
        onClick={() => !isDisabled && setSelectedTierId(t.id)}
        disabled={isDisabled}
        className={cn(
          "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5",
          isSelected
           ? t.id === 'elite'
             ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
              : "bg-[#0a84ff] text-white shadow-sm shadow-blue-500/30"
            : "text-zinc-500 dark:text-zinc-400",
          !isDisabled && !isSelected && "hover:text-zinc-900 dark:hover:text-zinc-100",
          isDisabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <span className="text-lg">{t.badge}</span>
        {t.name}
        {t.popular && !isSelected && !isDisabled && (
          <FiStar size={12} className="text-amber-500" />
        )}
        {isDisabled && <FiLock size={12} />}
      </button>
    );
  })}
</div>

{tier.id === 'pro' && (
                        <div className="absolute -top-3 left-6 px-3 py-1 bg-[#0a84ff] rounded-full">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <FiStar size={12} /> PHỔ BIẾN
                          </span>
                        </div>
                      )}

                      {tier.id === 'elite' && (
                        <div className="absolute -top-3 left-6 px-3 py-1 bg-amber-500 rounded-full">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <FiZap size={12} /> CAO CẤP
                          </span>
                        </div>
                      )}

                      <div className="mb-5">
                        <div className="flex flex-col gap-1">
                          {appliedPromo && (
                            <div className="flex items-center gap-2">
                              <span className="text-xl line-through text-zinc-400 font-semibold">
                                {tier.price.toLocaleString('vi-VN')}
                              </span>
                              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-md">
                                -{appliedPromo.discount}%
                              </span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-2">
                            <span className={cn(
                              "text-4xl font-black",
                              tier.id === 'elite'? 'text-amber-500' : 'text-[#0a84ff]'
                            )}>
                              {finalPrice.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-base text-zinc-500 font-semibold">{tier.duration}</span>
                          </div>
                          {appliedPromo && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              Tiết kiệm {(tier.price - finalPrice).toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-5 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                        {tier.features.map((feat, i) => {
                          const Icon = feat.icon;
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                tier.id === 'elite'? 'bg-amber-500/10' : 'bg-[#0a84ff]/10'
                              )}>
                                <Icon
                                  className={cn(
                                    tier.id === 'elite'? 'text-amber-500' : 'text-[#0a84ff]'
                                  )}
                                  size={14}
                                  strokeWidth={2.5}
                                />
                              </div>
                              <span className={cn(
                                "text-sm leading-6",
                                feat.highlight
                                 ? tier.id === 'elite'
                                   ? 'text-amber-600 dark:text-amber-500 font-semibold'
                                    : 'text-[#0a84ff] font-semibold'
                                  : 'text-zinc-700 dark:text-zinc-300 font-medium'
                              )}>
                                {feat.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePurchaseVip(tier.id)}
                        disabled={!!purchasingVip || isActive}
                        className={cn(
                          "group relative w-full h-14 rounded-2xl font-bold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] overflow-hidden",
                          isActive
                           ? 'bg-emerald-500 text-white'
                            : tier.id === 'elite'
                             ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]'
                              : 'bg-[#0a84ff] text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02]'
                        )}
                      >
                        {!isActive && (
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        )}

              <span className="relative z-10 flex items-center gap-2">
  {purchasingVip === tier.id? (
    <FiLoader className="animate-spin" size={22} />
  ) : isActive ? (
    <>
      <FiCheck size={20} strokeWidth={3} /> Đang sử dụng
    </>
  ) : userVip?.tier === 'pro' && tier.id === 'elite' ? (
    <>
      <FiTrendingUp size={20} className="group-hover:scale-110 transition-transform" />
      Nâng cấp lên Elite
      <FiZap size={18} className="group-hover:rotate-12 transition-transform" />
    </>
  ) : (
    <>
      <FiCreditCard size={20} className="group-hover:scale-110 transition-transform" />
      Nâng cấp ngay
      <FiZap size={18} className="group-hover:rotate-12 transition-transform" />
    </>
  )}
</span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-black mb-5">So sánh chi tiết</h3>
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left py-3 font-bold text-zinc-900 dark:text-zinc-100">Tính năng</th>
                        <th className="text-center py-3 font-bold text-zinc-400 w-24">Free</th>
                        <th className="text-center py-3 font-bold text-blue-500 w-24">Pro</th>
                        <th className="text-center py-3 font-bold text-amber-500 w-24">Elite</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {COMPARE_DATA.map((feat, i) => (
                        <tr key={i}>
                          <td className="py-4 text-zinc-700 dark:text-zinc-300 font-medium">{feat.name}</td>
                          <td className="text-center">
                            {feat.free === 'Có'? (
                              <FiCheck className="mx-auto text-emerald-500" size={18} strokeWidth={3} />
                            ) : feat.free === 'Không'? (
                              <FiX className="mx-auto text-zinc-300" size={18} />
                            ) : (
                              <span className="text-zinc-500 text-xs font-medium">{feat.free}</span>
                            )}
                          </td>
                          <td className="text-center">
                            {feat.pro === 'Có'? (
                              <FiCheck className="mx-auto text-blue-500" size={18} strokeWidth={3} />
                            ) : feat.pro === 'Không'? (
                              <FiX className="mx-auto text-zinc-300" size={18} />
                            ) : (
                              <span className="text-blue-500 font-semibold text-xs">{feat.pro}</span>
                            )}
                          </td>
                          <td className="text-center">
                            {feat.elite === 'Có'? (
                              <FiCheck className="mx-auto text-amber-500" size={18} strokeWidth={3} />
                            ) : feat.elite === 'Không'? (
                              <FiX className="mx-auto text-zinc-300" size={18} />
                            ) : (
                              <span className="text-amber-500 font-semibold text-xs">{feat.elite}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                      <FiLock className="text-blue-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Bảo mật</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">PCI DSS</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                      <FiShield className="text-emerald-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">An toàn</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">SSL 256-bit</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                      <FiZap className="text-purple-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Tức thì</p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Kích hoạt</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-black mb-4">Câu hỏi thường gặp</h3>
                <div className="space-y-2">
                  {[
                    {
                      q: "VIP có tự động gia hạn không?",
                      a: "Không . Không tự động gia hạn, cần đăng kí thủ công . Bạn có thể gia hạn hoặc huỷ bất cứ lúc nào trong VIP > Cài đặt. Hủy xong vẫn dùng đến hết chu kỳ đã trả, không mất ngày."
                    },
                    {
                      q: "Nâng cấp từ Pro lên Elite được không?",
                      a: "Được. Hệ thống tự tính tiền chênh lệch dựa trên số ngày Pro còn lại và trừ vào gói Elite. Ví dụ: Còn 15 ngày Pro = 24.500đ sẽ được trừ khi nâng cấp Elite."
                    },
                    {
                      q: "Hủy VIP thì mất gì?",
                      a: "Giữ toàn bộ quyền đến ngày hết hạn. Sau đó về Free: mất huy hiệu VIP và toàn bộ quyền lợi VIP."
                    },
                    {
                      q: "Thanh toán có an toàn không?",
                      a: "Có. Hiện Huha đang hỗ trợ thanh toán qua VNPay QR. Cổng thanh toán VNPay/PayOS chuẩn PCI DSS Level 1, mã hóa SSL 256-bit. Không lưu thông tin. Hóa đơn gửi email tự động."
                    },
                    {
                      q: "Mua nhầm gói có hoàn tiền không?",
                      a: "Có hoàn tiền trong 7 ngày nếu chưa sử dụng tính năng VIP . Liên hệ admin@huha.online với mã đơn để được xử lý trong 24h."
                    },
                    {
                      q: "VIP Pro và Elite khác nhau gì?",
                      a: "Elite hơn Pro: nhóm không giới hạn vs 50 thành viên, sự kiện không giới hạn vs 5/ngày, xem ai đã đọc tin nhắn, thu hồi tin không giới hạn, hỗ trợ 24/7, huy hiệu động và nhiều tính năng độc quyền khác ."
                    },
                    {
                      q: "Mã giảm giá dùng được mấy lần?",
                      a: "Tùy mã. Có mã dùng 1 lần/user, có mã giới hạn tổng lượt dùng. Hết lượt hoặc hết hạn sẽ báo lỗi. Mỗi đơn chỉ áp dụng 1 mã."
                    },
                    {
                      q: "Đổi điện thoại có mất VIP không?",
                      a: "Không. VIP gắn với tài khoản, không gắn với thiết bị. Đăng nhập tài khoản trên máy mới là tự có VIP. Đồng bộ trên iOS/Android/Web."
                    },
                    {
                      q: "Quên gia hạn VIP có sao không?",
                      a: "Hết hạn sẽ tự về Free. Bạn có thể đăng kí lại bất kì lúc nào."
                    },
                    {
                      q: "Doanh nghiệp mua VIP cho nhân viên được không?",
                      a: "Được. Gói Enterprise: mua từ 10 user trở lên giảm 20%, quản lý tập trung, hỗ trợ riêng. Liên hệ admin@huha.online."
                    }
                  ].map((item, i) => (
                    <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <button
                        onClick={() => setShowFAQ(showFAQ === i? null : i)}
                        className="w-full py-4 flex items-center justify-between text-left"
                      >
                        <span className="text-sm font-semibold pr-3">{item.q}</span>
                        <motion.div animate={{ rotate: showFAQ === i? 180 : 0 }}>
                          <FiChevronDown size={20} className="text-zinc-400 flex-shrink-0" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {showFAQ === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 pb-4 leading-relaxed">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                      <FiLock className="text-blue-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Bảo mật</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">PCI DSS</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                      <FiShield className="text-emerald-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">An toàn</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">SSL 256-bit</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10">
                    <div className="w-12 h-12 mx-auto mb-2 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                      <FiZap className="text-purple-500" size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Tức thì</p>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Kích hoạt</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4">
          <p className="text-xs text-center text-zinc-500 leading-relaxed">
            Không tự động gia hạn. Hủy bất cứ lúc nào.
            <br />
            <button onClick={() => router.push('/vip/terms')} className="font-semibold text-zinc-900 dark:text-white active:opacity-60">
              Điều khoản
            </button>{" "}•{" "}
            <button onClick={() => router.push('/privacy')} className="font-semibold text-zinc-900 dark:text-white active:opacity-60">
              Bảo mật
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
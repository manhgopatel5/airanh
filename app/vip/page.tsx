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
  FiX, FiTrendingUp
} from "react-icons/fi";
import { cn } from "@/lib/utils";

type VipTier = {
  id: 'pro' | 'elite';
  name: string;
  price: number;
  priceText: string;
  duration: string;
  features: { text: string; highlight?: boolean }[];
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
    popular: true, // Pro mới là phổ biến
    features: [
      { text: 'Huy hiệu VIP cạnh tên', highlight: true },
      { text: 'Tạo nhóm tối đa 50 thành viên' },
      { text: 'Tạo tối đa 5 sự kiện/công việc mỗi ngày' },
      { text: 'Chat với người lạ không giới hạn' },
      { text: 'Mở khoá tìm xung quanh', highlight: true },
      { text: 'Tham gia tất cả phòng chat công cộng' },
      { text: 'Ưu tiên hiển thị sự kiện/công việc' },
      { text: 'Ưu tiên trải nghiệm tính năng mới' }
    ]
  },
  {
    id: 'elite',
    name: 'VIP Elite',
    price: 149000,
    priceText: '149.000',
    duration: 'đ/tháng',
    badge: '👑',
    popular: false, // Bỏ popular ở Elite
    savePercent: 67,
    features: [
      { text: 'Huy hiệu VIP Elite + hiệu ứng động', highlight: true },
      { text: 'Tạo nhóm không giới hạn thành viên', highlight: true },
      { text: 'Mời bạn không giới hạn' },
      { text: 'Tất cả theme + avatar động' },
      { text: 'Tải file 500MB', highlight: true },
      { text: 'Xem ai đã đọc tin nhắn' },
      { text: 'Thu hồi tin không giới hạn' },
      { text: 'Hỗ trợ 24/7', highlight: true },
      { text: 'Booster tốc độ chat' },
      { text: 'Badge độc quyền' }
    ]
  }
];

const COMPARE_DATA = [
  { name: 'Tạo nhóm', free: '10', pro: '200', elite: '500' },
  { name: 'Ghim chat', free: '3', pro: '10', elite: '∞' },
  { name: 'Tải file', free: '10MB', pro: '100MB', elite: '500MB' },
  { name: 'Theme', free: 'Cơ bản', pro: 'Độc quyền', elite: 'Tất cả' },
  { name: 'Quảng cáo', free: 'Có', pro: 'Không', elite: 'Không' },
  { name: 'Huy hiệu', free: 'Không', pro: 'Xanh', elite: 'Vàng động' },
  { name: 'Xem người đọc', free: 'Không', pro: 'Không', elite: 'Có' },
  { name: 'Hỗ trợ', free: 'Email', pro: 'Ưu tiên', elite: '24/7' },
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
const [selectedTierId, setSelectedTierId] = useState<'pro' | 'elite'>('elite');
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
    const finalPrice = appliedPromo
      ? Math.round(tier.price * (1 - appliedPromo.discount / 100))
      : tier.price;

    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        planId: tierId,
        amount: finalPrice,
        promoCode: appliedPromo?.code || null, // Thêm dòng này
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
      {/* Header cố định */}
<div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3">
 <div className="flex items-center justify-between mb-3">
  {userVip && userVip.tier!== 'free' && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full">
                <FiCheckCircle className="text-emerald-500" size={16} />
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {VIP_TIERS.find(t => t.id === userVip.tier)?.name}
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
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
          {/* TAB: PLANS */}
          {activeTab === 'plans' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Current Plan Banner */}
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

              {/* Promo */}
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

            {/* VIP Cards - Chung 1 khung */}
<div className="relative bg-white dark:bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-800">
  {(() => {
    const tier = VIP_TIERS.find(t => t.id === selectedTierId)!;
    const isActive = userVip?.tier === tier.id;
    const finalPrice = appliedPromo ? Math.round(tier.price * (1 - appliedPromo.discount / 100)) : tier.price;
    
    return (
      <>
        {/* Toggle chọn gói */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl mb-5">
          {VIP_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTierId(t.id)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                selectedTierId === t.id
                  ? "bg-[#0a84ff] text-white shadow-sm shadow-blue-500/30"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <span className="text-lg">{t.badge}</span>
              {t.name}
              {t.popular && selectedTierId !== t.id && (
                <FiStar size={12} className="text-amber-500" />
              )}
            </button>
          ))}
        </div>

     {/* Badge PHỔ BIẾN / CAO CẤP */}
{tier.id === 'pro' && (
  <div className="absolute -top-3 left-6 px-3 py-1 bg-[#0a84ff] rounded-full">
    <span className="text-xs font-bold text-white flex items-center gap-1">
      <FiStar size={12} /> PHỔ BIẾN
    </span>
  </div>
)}

{tier.id === 'elite' && (
  <div className="absolute -top-3 left-6 px-3 py-1 bg-[#0a84ff] rounded-full">
    <span className="text-xs font-bold text-white flex items-center gap-1">
      <FiZap size={12} /> CAO CẤP
    </span>
  </div>
)}

<div className="mb-5">
  <div className="flex items-start justify-between mb-3">
    <div>

    </div>
  </div>

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
              <span className="text-4xl font-black text-[#0a84ff]">
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

          {tier.savePercent && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FiTrendingUp size={14} />
              <span className="text-xs font-bold">Tiết kiệm {tier.savePercent}%</span>
            </div>
          )}
        </div>

     <div className="space-y-3 mb-5 pb-5 border-b border-zinc-100 dark:border-zinc-800">
  {tier.features.map((feat, i) => (
    <div key={i} className="flex items-start gap-3">
      <div className={cn(
        "w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        feat.highlight
          ? tier.id === 'pro' 
            ? 'bg-[#0a84ff]' 
            : 'bg-amber-500'
          : 'bg-zinc-100 dark:bg-zinc-800'
      )}>
        <FiCheck className={cn(
          feat.highlight
            ? 'text-white'
            : 'text-zinc-400'
        )} size={13} strokeWidth={3} />
      </div>
      <span className={cn(
        "text-sm leading-6",
        feat.highlight 
          ? tier.id === 'pro'
            ? 'font-semibold text-[#0a84ff]'
            : 'font-semibold text-amber-600 dark:text-amber-500'
          : 'text-zinc-600 dark:text-zinc-400'
      )}>
        {feat.text}
      </span>
    </div>
  ))}
</div>

        <button
          onClick={() => handlePurchaseVip(tier.id)}
          disabled={!!purchasingVip || isActive}
          className={cn(
            "w-full h-14 rounded-2xl font-bold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]",
            isActive
              ? 'bg-emerald-500 text-white'
              : 'bg-[#0a84ff] text-white shadow-lg shadow-blue-500/30'
          )}
        >
          {purchasingVip === tier.id ? (
            <FiLoader className="animate-spin" size={22} />
          ) : isActive ? (
            <>
              <FiCheck size={20} strokeWidth={3} /> Đang sử dụng
            </>
          ) : (
            <>
              <FiCreditCard size={20} /> Nâng cấp ngay
            </>
          )}
        </button>
      </>
    );
  })()}
</div>

            
            </motion.div>
          )}

          {/* TAB: COMPARE */}
          {activeTab === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="text-xl font-black mb-5">So sánh chi tiết</h3>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 font-bold text-zinc-900 dark:text-zinc-100">Tính năng</th>
                      <th className="text-center py-3 font-bold text-zinc-400 w-20">Free</th>
                      <th className="text-center py-3 font-bold text-blue-500 w-20">Pro</th>
                      <th className="text-center py-3 font-bold text-amber-500 w-20">Elite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {COMPARE_DATA.map((feat, i) => (
                      <tr key={i}>
                        <td className="py-4 text-zinc-700 dark:text-zinc-300 font-medium">{feat.name}</td>
                        <td className="text-center">
                          {feat.free === 'Có' || feat.free === 'Không'? (
                            feat.free === 'Có'? <FiCheck className="mx-auto text-emerald-500" size={18} /> : <FiX className="mx-auto text-zinc-300" size={18} />
                          ) : (
                            <span className="text-zinc-500 text-xs">{feat.free}</span>
                          )}
                        </td>
                        <td className="text-center">
                          {feat.pro === 'Có' || feat.pro === 'Không'? (
                            feat.pro === 'Có'? <FiCheck className="mx-auto text-blue-500" size={18} /> : <FiX className="mx-auto text-zinc-300" size={18} />
                          ) : (
                            <span className="text-blue-500 font-semibold text-xs">{feat.pro}</span>
                          )}
                        </td>
                        <td className="text-center">
                          {feat.elite === 'Có' || feat.elite === 'Không'? (
                            feat.elite === 'Có'? <FiCheck className="mx-auto text-amber-500" size={18} /> : <FiX className="mx-auto text-zinc-300" size={18} />
                          ) : (
                            <span className="text-amber-500 font-semibold text-xs">{feat.elite}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
{/* Trust */}
<div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 mt-5">
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <FiLock className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
      <p className="text-xs font-semibold">Bảo mật</p>
      <p className="text-[10px] text-zinc-500">PCI DSS</p>
    </div>
    <div>
      <FiShield className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
      <p className="text-xs font-semibold">An toàn</p>
      <p className="text-[10px] text-zinc-500">SSL 256-bit</p>
    </div>
    <div>
      <FiZap className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
      <p className="text-xs font-semibold">Tức thì</p>
      <p className="text-[10px] text-zinc-500">Kích hoạt</p>
    </div>
  </div>
</div>
            </motion.div>
          )}

       {/* TAB: FAQ */}
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
            a: "Có. Tự động gia hạn mỗi 30 ngày qua VNPay/Momo. Hủy bất cứ lúc nào trong Cài đặt > VIP. Hủy xong vẫn dùng đến hết chu kỳ đã trả, không mất ngày."
          },
          {
            q: "Nâng cấp từ Pro lên Elite được không?",
            a: "Được. Hệ thống tự tính tiền chênh lệch dựa trên số ngày Pro còn lại và trừ vào gói Elite. Ví dụ: Còn 15 ngày Pro = 24.500đ sẽ được trừ khi nâng cấp Elite."
          },
          {
            q: "Hủy VIP thì mất gì?",
            a: "Giữ toàn bộ quyền đến ngày hết hạn. Sau đó về Free: mất huy hiệu VIP, nhóm >10 thành viên không thêm người mới, ghim >3 tự bỏ bớt, file >10MB không tải mới. Tin nhắn và nhóm cũ không xóa."
          },
          {
            q: "Thanh toán có an toàn không?",
            a: "Có. Hỗ trợ Momo, ZaloPay, VNPay QR, thẻ ATM/Visa. Cổng thanh toán VNPay/PayOS chuẩn PCI DSS Level 1, mã hóa SSL 256-bit. Không lưu thông tin thẻ. Hóa đơn gửi email tự động."
          },
          {
            q: "Mua nhầm gói có hoàn tiền không?",
            a: "Có hoàn tiền trong 7 ngày nếu chưa sử dụng tính năng VIP như tải file >10MB, tạo nhóm >10 người. Liên hệ admin@huha.online với mã đơn để được xử lý trong 24h."
          },
          {
            q: "VIP Pro và Elite khác nhau gì?",
            a: "Elite hơn Pro: nhóm 500 vs 200 thành viên, ghim không giới hạn vs 10, file 500MB vs 100MB, xem ai đã đọc tin nhắn, thu hồi tin không giới hạn, hỗ trợ 24/7, huy hiệu động."
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
            a: "Hết hạn sẽ tự về Free sau 3 ngày grace period. Trong 3 ngày đó vẫn dùng VIP bình thường. Gia hạn trong 3 ngày này không mất dữ liệu nhóm/ghimb."
          },
          {
            q: "Doanh nghiệp mua VIP cho nhân viên được không?",
            a: "Được. Gói Enterprise: mua từ 10 user trở lên giảm 20%, xuất hóa đơn VAT, quản lý tập trung, hỗ trợ riêng. Liên hệ admin@huha.online."
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

    {/* Trust */}
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <FiLock className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
          <p className="text-xs font-semibold">Bảo mật</p>
          <p className="text- text-zinc-500">PCI DSS</p>
        </div>
        <div>
          <FiShield className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
          <p className="text-xs font-semibold">An toàn</p>
          <p className="text- text-zinc-500">SSL 256-bit</p>
        </div>
        <div>
          <FiZap className="mx-auto mb-2 text-zinc-900 dark:text-white" size={24} />
          <p className="text-xs font-semibold">Tức thì</p>
          <p className="text- text-zinc-500">Kích hoạt</p>
        </div>
      </div>
    </div>
  </motion.div>
)}
        </AnimatePresence>

        {/* Footer */}
        <div className="pt-4">
          <p className="text-xs text-center text-zinc-500 leading-relaxed">
            Tự động gia hạn. Hủy bất cứ lúc nào.
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
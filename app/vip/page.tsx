"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiLoader, FiZap, FiCheck, FiShield, FiGift, FiCreditCard,
  FiChevronDown, FiChevronUp, FiLock, FiStar, FiUsers, FiTrendingUp
} from "react-icons/fi";
import { cn } from "@/lib/utils";

type VipTier = {
  id: 'pro' | 'elite';
  name: string;
  price: number;
  priceText: string;
  duration: string;
  features: { text: string; highlight?: boolean }[];
  color: string;
  badge: string;
  popular?: boolean;
  savePercent?: number;
  tagline: string;
};

const VIP_TIERS: VipTier[] = [
  {
    id: 'pro',
    name: 'VIP Pro',
    price: 49000,
    priceText: '49K',
    duration: '/tháng',
    color: 'from-blue-500 via-blue-600 to-cyan-500',
    badge: '⚡',
    tagline: 'Dành cho người dùng tích cực',
    features: [
      { text: 'Huy hiệu VIP xanh cạnh tên', highlight: true },
      { text: 'Tạo nhóm 200 thành viên' },
      { text: 'Ghim 10 cuộc trò chuyện' },
      { text: 'Theme độc quyền + hiệu ứng' },
      { text: 'Tải file 100MB', highlight: true },
      { text: 'Không quảng cáo' },
      { text: 'Xem trước tin nhắn' },
      { text: 'Thống kê chi tiết' }
    ]
  },
  {
    id: 'elite',
    name: 'VIP Elite',
    price: 149000,
    priceText: '149K',
    duration: '/tháng',
    color: 'from-amber-400 via-orange-500 to-pink-500',
    badge: '👑',
    popular: true,
    savePercent: 67,
    tagline: 'Tối đa quyền lực & đẳng cấp',
    features: [
      { text: 'Huy hiệu VIP vàng + hiệu ứng động', highlight: true },
      { text: 'Tạo nhóm 500 thành viên', highlight: true },
      { text: 'Ghim không giới hạn' },
      { text: 'Tất cả theme + avatar động' },
      { text: 'Tải file 500MB', highlight: true },
      { text: 'Xem ai đã đọc tin nhắn' },
      { text: 'Thu hồi tin nhắn không giới hạn' },
      { text: 'Ưu tiên hỗ trợ 24/7', highlight: true },
      { text: 'Booster tốc độ chat' },
      { text: 'Badge độc quyền sự kiện' }
    ]
  }
];

const FAQ_ITEMS = [
  {
    q: "VIP có tự động gia hạn không?",
    a: "Có. VIP tự động gia hạn mỗi 30 ngày. Trước khi gia hạn 3 ngày sẽ có thông báo. Bạn có thể hủy bất cứ lúc nào trong Cài đặt > VIP. Hủy xong vẫn dùng VIP đến hết chu kỳ đã trả."
  },
  {
    q: "Nâng cấp từ Pro lên Elite được không?",
    a: "Được. Hệ thống tự tính tiền chênh lệch dựa trên số ngày Pro còn lại. Ví dụ: Còn 15 ngày Pro thì chỉ trả thêm phần chênh cho Elite. Không mất ngày nào."
  },
  {
    q: "Hủy VIP thì mất gì?",
    a: "Bạn giữ toàn bộ quyền VIP đến đúng ngày hết hạn. Sau đó về Free: mất huy hiệu, nhóm >10 vẫn hoạt động nhưng không thêm người mới, ghim >3 tự bỏ, file >10MB vẫn xem được nhưng không tải lên mới. Dữ liệu không bị xóa."
  },
  {
    q: "Thanh toán có an toàn không?",
    a: "Hỗ trợ Momo, ZaloPay, VNPay QR, thẻ ATM/Visa. Thanh toán qua cổng VNPay/PayOS đạt chuẩn PCI DSS, không lưu thông tin thẻ. Hóa đơn gửi về email."
  },
];

export default function VipPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [userVip, setUserVip] = useState<{tier: 'free' | 'pro' | 'elite', expiresAt?: Timestamp} | null>(null);
  const [purchasingVip, setPurchasingVip] = useState<'pro' | 'elite' | null>(null);
  const [showFAQ, setShowFAQ] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{code: string, discount: number} | null>(null);

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

  const applyPromoCode = () => {
    const validCodes: Record<string, number> = {
      'VIP10': 10, 'WELCOME20': 20, 'NEWUSER30': 30
    };
    const code = promoCode.toUpperCase();
    const discount = validCodes[code];
    if (discount) {
      setAppliedPromo({ code, discount });
      toast.success(`Áp dụng mã ${code} - Giảm ${discount}%`);
      setPromoCode("");
    } else {
      toast.error("Mã không hợp lệ");
    }
  };

  const daysLeft = userVip?.expiresAt
  ? Math.max(0, differenceInDays(userVip.expiresAt.toDate(), new Date()))
    : 0;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <div className="px-4 pt-6 pb-24 space-y-5 max-w-2xl mx-auto">

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-[32px] p-8 text-center shadow-2xl shadow-orange-500/30 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"
          />
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-4 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center shadow-xl"
            >
              <Crown className="text-white" size={48} strokeWidth={2.5} />
            </motion.div>
            <h2 className="text-3xl font-black text-white mb-2">AirAnh VIP</h2>
            <p className="text-base text-white/90 font-medium">
              Mở khóa toàn bộ tính năng cao cấp
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-white/80 text-sm">
              <div className="flex items-center gap-1">
                <FiUsers size={16} /> 50K+ thành viên
              </div>
              <div className="flex items-center gap-1">
                <FiStar size={16} /> 4.9/5 đánh giá
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current Plan */}
        <AnimatePresence>
          {userVip && userVip.tier!== 'free' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-3xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wide">
                    Gói hiện tại
                  </p>
                  <p className="text-2xl font-black flex items-center gap-2">
                    {VIP_TIERS.find(t => t.id === userVip?.tier)?.badge}
                    {VIP_TIERS.find(t => t.id === userVip?.tier)?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#8e8e93] mb-1">Còn lại</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {daysLeft}
                  </p>
                  <p className="text-xs text-[#8e8e93]">ngày</p>
                </div>
              </div>
              <div className="h-3 bg-emerald-500/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((daysLeft / 30) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promo Code */}
        {!appliedPromo? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-lg shadow-black/[0.03]"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <FiGift className="text-amber-500" size={18} />
              </div>
              <p className="text-base font-bold">Mã giảm giá</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="VIP10, WELCOME20..."
                className="flex-1 h-12 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={applyPromoCode}
                disabled={!promoCode}
                className="px-6 h-12 bg-[#0a84ff] text-white rounded-2xl text-sm font-bold disabled:opacity-40 transition-all shadow-lg shadow-blue-500/20"
              >
                Áp dụng
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-3xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FiCheck className="text-green-500" size={20} strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-bold">Mã {appliedPromo.code}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Giảm {appliedPromo.discount}%</p>
              </div>
            </div>
            <button onClick={() => setAppliedPromo(null)} className="text-sm text-red-500 font-semibold">Xóa</button>
          </motion.div>
        )}

        {/* VIP Tiers */}
        <div className="space-y-4">
          {VIP_TIERS.map((tier, idx) => {
            const isActive = userVip?.tier === tier.id;
            const finalPrice = appliedPromo? Math.round(tier.price * (1 - appliedPromo.discount / 100)) : tier.price;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative bg-white dark:bg-zinc-900 rounded-[28px] p-6 border-2 transition-all",
                  isActive
                 ? 'border-emerald-500 shadow-xl shadow-emerald-500/20'
                    : tier.popular
                   ? 'border-amber-500/50 shadow-xl shadow-amber-500/10 scale-[1.02]'
                    : 'border-zinc-200/60 dark:border-zinc-800/60 shadow-lg shadow-black/[0.04]'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full shadow-xl">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <FiZap size={14} /> PHỔ BIẾN NHẤT
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{tier.badge}</span>
                    <div>
                      <h3 className="text-2xl font-black">{tier.name}</h3>
                      <p className="text-xs text-[#8e8e93] font-medium">{tier.tagline}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mt-3">
                    {appliedPromo && (
                      <span className="text-xl line-through text-[#8e8e93]">{tier.priceText}</span>
                    )}
                    <span className={cn("text-5xl font-black bg-gradient-to-r bg-clip-text text-transparent", tier.color)}>
                      {finalPrice.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-base text-[#8e8e93] font-semibold">{tier.duration}</span>
                  </div>

                  {tier.savePercent && (
                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
                      <FiTrendingUp size={14} />
                      <span className="text-xs font-bold">Tiết kiệm {tier.savePercent}%</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-5">
                  {tier.features.map((feat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 + i * 0.03 }}
                      className="flex items-start gap-3"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                        feat.highlight
                       ? tier.id === 'elite'? 'bg-amber-500/20' : 'bg-blue-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      )}>
                        <FiCheck className={cn(
                          feat.highlight
                         ? tier.id === 'elite'? 'text-amber-500' : 'text-blue-500'
                            : 'text-zinc-400'
                        )} size={14} strokeWidth={3} />
                      </div>
                      <span className={cn(
                        "text-[15px] leading-6",
                        feat.highlight? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'
                      )}>
                        {feat.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePurchaseVip(tier.id)}
                  disabled={!!purchasingVip || isActive}
                  className={cn(
                    "w-full h-14 rounded-2xl font-black text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2",
                    isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : `bg-gradient-to-r ${tier.color} text-white shadow-xl`
                  )}
                >
                  {purchasingVip === tier.id? (
                    <FiLoader className="animate-spin" size={22} />
                  ) : isActive? (
                    <>
                      <FiCheck size={20} strokeWidth={3} /> Đang sử dụng
                    </>
                  ) : (
                    <>
                      <FiCreditCard size={20} /> Nâng cấp ngay
                    </>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <FiLock className="text-blue-500" size={20} />
              </div>
              <p className="text-xs font-semibold">Bảo mật</p>
              <p className="text-[10px] text-[#8e8e93]">PCI DSS</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <FiShield className="text-green-500" size={20} />
              </div>
              <p className="text-xs font-semibold">An toàn</p>
              <p className="text-[10px] text-[#8e8e93]">SSL 256-bit</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <FiZap className="text-amber-500" size={20} />
              </div>
              <p className="text-xs font-semibold">Kích hoạt</p>
              <p className="text-[10px] text-[#8e8e93]">Tức thì</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60">
          <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <FiShield className="text-[#0a84ff]" size={22} />
            Câu hỏi thường gặp
          </h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowFAQ(showFAQ === i? null : i)}
                  className="w-full py-4 flex items-center justify-between text-left"
                >
                  <span className="text-[15px] font-semibold pr-3">{item.q}</span>
                  <motion.div animate={{ rotate: showFAQ === i? 180 : 0 }}>
                    <FiChevronDown size={20} className="text-[#8e8e93]" />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {showFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[15px] text-[#8e8e93] pb-4 leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 pb-4">
          <p className="text-[13px] text-center text-[#8e8e93] leading-relaxed">
            Tự động gia hạn hàng tháng. Hủy bất cứ lúc nào trong Cài đặt.
            <br />Bằng việc mua, bạn đồng ý với{" "}
            <button onClick={() => router.push('/vip/terms')} className="text-[#0a84ff] font-semibold active:opacity-60">
              Điều khoản VIP
            </button>{" "}và{" "}
            <button onClick={() => router.push('/privacy')} className="text-[#0a84ff] font-semibold active:opacity-60">
              Chính sách bảo mật
            </button>.
          </p>
        </div>
      </div>
    </div>
  );
}
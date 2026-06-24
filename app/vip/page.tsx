"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import {  differenceInDays } from "date-fns";
import { FiLoader, FiZap, FiCheck, FiShield, FiGift, FiCreditCard, FiChevronDown, FiChevronUp } from "react-icons/fi";


type VipTier = {
  id: 'pro' | 'elite';
  name: string;
  price: number;
  priceText: string;
  duration: string;
  features: string[];
  color: string;
  badge: string;
  popular?: boolean;
  savePercent?: number;
};



const VIP_TIERS: VipTier[] = [
  {
    id: 'pro',
    name: 'VIP Pro',
    price: 49000,
    priceText: '49,000',
    duration: '/tháng',
    color: 'from-blue-500 to-cyan-500',
    badge: '🔥',
    features: [
      'Huy hiệu VIP xanh cạnh tên',
      'Tạo nhóm 200 thành viên',
      'Ghim 10 cuộc trò chuyện',
      'Theme độc quyền + hiệu ứng',
      'Tải file 100MB',
      'Không quảng cáo',
      'Xem trước tin nhắn',
      'Thống kê chi tiết'
    ]
  },
  {
    id: 'elite',
    name: 'VIP Elite',
    price: 149000,
    priceText: '149,000',
    duration: '/tháng',
    color: 'from-amber-400 via-orange-500 to-pink-500',
    badge: '👑',
    popular: true,
    savePercent: 67,
    features: [
      'Huy hiệu VIP vàng + hiệu ứng động',
      'Tạo nhóm 500 thành viên',
      'Ghim không giới hạn',
      'Tất cả theme + avatar động',
      'Tải file 500MB',
      'Xem ai đã đọc tin nhắn',
      'Thu hồi tin nhắn không giới hạn',
      'Ưu tiên hỗ trợ 24/7',
      'Booster tốc độ chat',
      'Badge độc quyền sự kiện'
    ]
  }
];

const FAQ_ITEMS = [
  { 
    q: "VIP có tự động gia hạn không?", 
    a: "Có. VIP tự động gia hạn mỗi 30 ngày qua cổng thanh toán bạn chọn. Trước khi gia hạn 3 ngày sẽ có thông báo qua app + email. Bạn có thể hủy bất cứ lúc nào trong Cài đặt > VIP > Quản lý gói. Hủy xong vẫn dùng VIP đến hết chu kỳ đã trả." 
  },
  { 
    q: "Tôi có thể nâng cấp từ Pro lên Elite?", 
    a: "Được. Vào trang VIP > Chọn Elite > Thanh toán phần chênh lệch. Ví dụ: Bạn còn 15 ngày Pro thì hệ thống tự tính tiền Elite trừ đi giá trị 15 ngày Pro còn lại. Thời gian VIP được cộng dồn, không mất ngày nào." 
  },
  { 
    q: "Nếu hủy VIP thì mất gì?", 
    a: "Bạn giữ toàn bộ quyền VIP đến đúng ngày hết hạn đã thanh toán. Sau đó tài khoản về Free: mất huy hiệu VIP, nhóm >10 thành viên vẫn hoạt động nhưng không thêm người mới được, ghim chat >3 sẽ tự bỏ ghim, file >10MB vẫn xem được nhưng không tải lên mới. Dữ liệu không bị xóa." 
  },
  { 
    q: "Thanh toán bằng cách nào? Có an toàn không?", 
    a: "Hỗ trợ Momo, ZaloPay, VNPay QR, thẻ ATM nội địa, Visa/Mastercard. Thanh toán qua cổng VNPay/PayOS đạt chuẩn PCI DSS, không lưu thông tin thẻ. Hóa đơn điện tử gửi về email sau khi thanh toán thành công." 
  },
  { 
    q: "Mua nhầm gói có hoàn tiền được không?", 
    a: "Có. Liên hệ hỗ trợ trong 24h từ lúc mua, chưa sử dụng tính năng VIP quá 10%. Hoàn tiền về ví thanh toán trong 3-7 ngày làm việc. Sau 24h hoặc đã dùng nhiều thì không hoàn, chỉ hỗ trợ nâng cấp gói." 
  },
  { 
    q: "1 tài khoản dùng VIP cho nhiều thiết bị được không?", 
    a: "Được. Đăng nhập cùng 1 tài khoản trên điện thoại, web, máy tính đều có VIP. Nhưng không chia sẻ tài khoản cho người khác, hệ thống check đăng nhập bất thường sẽ khóa VIP." 
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
        tier: tierId,
        amount: finalPrice,
        promoCode: appliedPromo?.code || null,
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Lỗi tạo đơn thanh toán');

    // Redirect sang PayOS quét QR
    window.location.href = data.paymentUrl;

  } catch (error: any) {
    toast.error("Lỗi: " + error.message);
    setPurchasingVip(null);
  }
  // Không setPurchasingVip(false) ở finally vì đã redirect rồi
};

  const applyPromoCode = () => {
  const validCodes: Record<string, number> = {
    'VIP10': 10,
    'WELCOME20': 20,
    'NEWUSER30': 30
  };
  const code = promoCode.toUpperCase();
  const discount = validCodes[code];

  if (discount) {
    setAppliedPromo({ code, discount });
    toast.success(`Áp dụng mã ${code} - Giảm ${discount}%`);
  } else {
    toast.error("Mã không hợp lệ");
  }
};

const daysLeft = userVip?.expiresAt
 ? Math.max(0, differenceInDays(userVip.expiresAt.toDate(), new Date()))
  : 0;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">


      <div className="px-4 pt-6 pb-24 space-y-4">
        {/* Banner */}
        <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 rounded-3xl p-6 text-center shadow-xl shadow-orange-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center animate-pulse">
              <Crown className="text-white" size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Mở khóa VIP</h2>
            <p className="text-sm text-white/90 font-medium">
              Trải nghiệm đầy đủ tính năng cao cấp nhất
            </p>
          </div>
        </div>

        {/* Current Plan */}
        {userVip && userVip.tier!== 'free' && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-0.5">
                  Gói hiện tại
                </p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {VIP_TIERS.find(t => t.id === userVip?.tier)?.badge}
                  {VIP_TIERS.find(t => t.id === userVip?.tier)?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#8e8e93]">Còn lại</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {daysLeft} ngày
                </p>
              </div>
            </div>
            <div className="h-2 bg-emerald-500/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${Math.min((daysLeft / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Promo Code */}
        {!appliedPromo && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <FiGift className="text-amber-500" size={18} />
              <p className="text-sm font-semibold">Mã giảm giá</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Nhập mã"
                className="flex-1 h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
              />
              <button
                onClick={applyPromoCode}
                disabled={!promoCode}
                className="px-4 h-10 bg-[#0a84ff] text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}

        {appliedPromo && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-500" size={18} />
              <span className="text-sm font-medium">Mã {appliedPromo.code} - Giảm {appliedPromo.discount}%</span>
            </div>
            <button onClick={() => setAppliedPromo(null)} className="text-sm text-red-500">Xóa</button>
          </div>
        )}

        {/* VIP Tiers */}
        <div className="space-y-3">
          {VIP_TIERS.map((tier) => {
            const isActive = userVip?.tier === tier.id;
            const finalPrice = appliedPromo? Math.round(tier.price * (1 - appliedPromo.discount / 100)) : tier.price;
            return (
              <div
                key={tier.id}
                className={`relative bg-white dark:bg-zinc-900 rounded-3xl p-5 border-2 transition-all ${
                  isActive
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'border-zinc-200/60 dark:border-zinc-800/60 shadow-md shadow-black/[0.04]'
                } ${tier.popular? 'scale-[1.02]' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full shadow-lg">
                    <span className="text- font-bold text-white flex items-center gap-1">
                      <FiZap size={12} /> PHỔ BIẾN NHẤT
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-3xl">{tier.badge}</span>
                      <h3 className="text-xl font-bold">{tier.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-1">
                      {appliedPromo && (
                        <span className="text-lg line-through text-[#8e8e93]">{tier.priceText}</span>
                      )}
                   <span className={`text-4xl font-black bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
  {finalPrice.toLocaleString('vi-VN')}
</span>
                      <span className="text-sm text-[#8e8e93] font-medium">{tier.duration}</span>
                    </div>
                    {tier.savePercent && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text- font-bold">
                        Tiết kiệm {tier.savePercent}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 mb-4">
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier.id === 'elite'? 'bg-amber-500/10' : 'bg-blue-500/10'
                      }`}>
                        <FiCheck className={tier.id === 'elite'? 'text-amber-500' : 'text-blue-500'} size={13} strokeWidth={3} />
                      </div>
                      <span className="text- leading-5 text-zinc-700 dark:text-zinc-300">{feat}</span>
                    </div>
                  ))}
                </div>

            <button
  onClick={() => handlePurchaseVip(tier.id)}
  disabled={!!purchasingVip || isActive}
  className={`w-full h-12 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 ${
    isActive
   ? 'bg-emerald-500 text-white'
      : `bg-gradient-to-r ${tier.color} text-white shadow-lg`
  }`}
>
  {purchasingVip === tier.id? (
    <FiLoader className="animate-spin" size={20} />
  ) : isActive? (
    <>
      <FiCheck size={18} /> Đang sử dụng
    </>
  ) : (
    <>
      <FiCreditCard size={18} /> Nâng cấp ngay
    </>
  )}
</button>
              </div>
            );
          })}
        </div>

      {/* Compare Features */}
<div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60">
  <h3 className="text-lg font-bold mb-4">So sánh gói VIP</h3>
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="text-left py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">Tính năng</th>
          <th className="text-center py-2.5 font-semibold text-zinc-900 dark:text-zinc-100 w-16">Free</th>
          <th className="text-center py-2.5 font-semibold text-blue-500 w-16">Pro</th>
          <th className="text-center py-2.5 font-semibold text-amber-500 w-16">Elite</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {[
          { name: 'Tạo nhóm', free: '10 nhóm', pro: '200 nhóm', elite: '500 nhóm' },
          { name: 'Ghim chat', free: '3 chat', pro: '10 chat', elite: 'Không giới hạn' },
          { name: 'Tải file', free: '10MB', pro: '100MB', elite: '500MB' },
          { name: 'Theme độc quyền', free: '✕', pro: '✓', elite: '✓' },
          { name: 'Không quảng cáo', free: '✕', pro: '✓', elite: '✓' },
          { name: 'Huy hiệu VIP', free: '✕', pro: '🔥', elite: '👑' },
          { name: 'Xem ai đọc tin', free: '✕', pro: '✕', elite: '✓' },
          { name: 'Hỗ trợ 24/7', free: '✕', pro: '✕', elite: '✓' },
        ].map((feat, i) => (
          <tr key={i}>
            <td className="py-3 text-zinc-700 dark:text-zinc-300">{feat.name}</td>
            <td className="text-center text-zinc-500 dark:text-zinc-400 text-[13px]">{feat.free}</td>
            <td className="text-center text-blue-500 font-medium text-[13px]">{feat.pro}</td>
            <td className="text-center text-amber-500 font-medium text-[13px]">{feat.elite}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

        {/* FAQ */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <FiShield className="text-[#0a84ff]" size={20} />
            Câu hỏi thường gặp
          </h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <button
                  onClick={() => setShowFAQ(showFAQ === i? null : i)}
                  className="w-full py-3 flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium pr-2">{item.q}</span>
                  {showFAQ === i? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                </button>
                {showFAQ === i && (
                  <p className="text-sm text-[#8e8e93] pb-3 leading-relaxed">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 pb-4">
       <p className="text-[13px] text-center text-[#8e8e93] leading-relaxed">
  Tự động gia hạn hàng tháng. Hủy bất cứ lúc nào trong Cài đặt.
  <br />Bằng việc mua, bạn đồng ý với{" "}
  <button onClick={() => router.push('/vip/terms')} className="text-[#0a84ff] active:opacity-60">
    Điều khoản VIP
  </button>{" "}và{" "}
  <button onClick={() => router.push('/privacy')} className="text-[#0a84ff] active:opacity-60">
    Chính sách bảo mật
  </button>.
</p>
        </div>
      </div>
    </div>
  );
}

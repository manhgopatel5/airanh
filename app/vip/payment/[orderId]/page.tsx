'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseDB } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { Copy, CheckCircle2, Clock, AlertCircle, Download, Share2, ShieldCheck, Sparkles, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Order = {
  userId: string;
  planId: 'pro' | 'elite';
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  qrUrl: string;
  createdAt: Timestamp;
  expireAt: Timestamp;
  paidAt?: Timestamp;
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getAuth();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        toast.error('Vui lòng đăng nhập');
        router.push('/auth');
        return;
      }
      
      if (!orderId) return;
      
      const unsubOrder = onSnapshot(
        doc(db, 'orders', orderId), 
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Order;
            setOrder(data);
            console.log('Order updated:', data.status); // Debug
          } else {
            toast.error('Không tìm thấy đơn hàng');
            router.push('/vip');
          }
          setLoading(false);
        }, 
        (error) => {
          console.error('Firestore error:', error.code, error.message);
          toast.error(`Lỗi: ${error.code}`);
          setLoading(false);
        }
      );
      
      return () => unsubOrder();
    });
    
    return () => unsubAuth();
  }, [orderId, db, router, auth]);

  // Auto polling check mỗi 5s khi đang pending
  useEffect(() => {
    if (order?.status !== 'pending') return;
    
    const interval = setInterval(async () => {
      await checkPaymentStatus(true); // silent mode
    }, 5000);
    
    return () => clearInterval(interval);
  }, [order?.status, orderId]);

  useEffect(() => {
    if (!order?.expireAt) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const expire = order.expireAt.toDate().getTime();
      const diff = expire - now;
      if (diff <= 0) {
        setCountdown('Đã hết hạn');
        clearInterval(interval);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.expireAt]);

  useEffect(() => {
    if (order?.status === 'paid') {
      toast.success('Thanh toán thành công!', {
        icon: <CheckCircle2 className="text-emerald-500" size={16} />,
      });
      setTimeout(() => router.push('/vip/success'), 2000);
    }
    if (order?.status === 'expired') {
      toast.error('Đơn hàng đã hết hạn');
      setTimeout(() => router.push('/vip'), 2000);
    }
  }, [order?.status, router]);

  const checkPaymentStatus = async (silent = false) => {
    if (!orderId || checking) return;
    setChecking(true);
    
    try {
      const res = await fetch(`/api/payment/check/${orderId}`, {
        method: 'GET',
      });
      const data = await res.json();
      
      if (data.status === 'paid') {
        toast.success('Đã xác nhận thanh toán!');
        // onSnapshot sẽ tự update order
      } else if (!silent) {
        toast.info('Chưa nhận được thanh toán. Vui lòng đợi 1-3 phút sau khi chuyển khoản.');
      }
    } catch (error: any) {
      if (!silent) toast.error('Lỗi kiểm tra: ' + error.message);
    } finally {
      setChecking(false);
    }
  };

  const copyInfo = async (text: string, label: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Đã copy ${label}`, {
      icon: <CheckCircle2 className="text-emerald-500" size={16} />,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadQR = () => {
    if (!order) return;
    const link = document.createElement('a');
    link.href = order.qrUrl;
    link.download = `QR_${order.planName}_${orderId}.png`;
    link.click();
    toast.success('Đang tải QR');
  };

  const shareQR = async () => {
    if (!order) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Đăng ký ${order.planName}`,
          text: `Quét mã để đăng ký ${order.planName}`,
          url: order.qrUrl,
        });
      } catch (err) {
        copyInfo(order.qrUrl, 'link QR', 'qr');
      }
    } else {
      copyInfo(order.qrUrl, 'link QR', 'qr');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="mx-auto max-w-md pt-8">
          <div className="overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-xl">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="p-6 space-y-4">
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
              <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <p className="text-lg font-semibold">Không tìm thấy đơn hàng</p>
        </div>
      </div>
    );
  }

  const isExpired = countdown === 'Đã hết hạn' || order.status === 'expired';
  const isPaid = order.status === 'paid';
  const isElite = order.planId === 'elite';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 pb-20">
      <div className="mx-auto max-w-md pt-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl bg-white dark:bg-zinc-900"
        >
          <div className={cn(
            "text-white p-6",
            isElite ? "bg-amber-500" : "bg-[#0a84ff]"
          )}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {isElite ? <Sparkles size={28} /> : <Zap size={28} />}
                <h1 className="text-2xl font-black">Đăng ký {order.planName}</h1>
              </div>
              <div className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">
                {order.amount.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <p className="text-sm text-white/90 font-medium">Mã đơn: #{orderId}</p>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {isPaid ? (
                <motion.div
                  key="paid"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                  >
                    <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-500" strokeWidth={2.5} />
                  </motion.div>
                  <h3 className="mt-4 text-2xl font-black">Thanh toán thành công!</h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    VIP đã được kích hoạt{order.paidAt && ` lúc ${order.paidAt.toDate().toLocaleTimeString('vi-VN')}`}. 
                    <br />Đang chuyển hướng...
                  </p>
                </motion.div>
              ) : isExpired ? (
                <motion.div
                  key="expired"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <AlertCircle className="mx-auto h-20 w-20 text-red-500" strokeWidth={2.5} />
                  <h3 className="mt-4 text-2xl font-black">Đơn hàng đã hết hạn</h3>
                  <p className="mt-2 text-sm text-zinc-500">Vui lòng tạo đơn mới</p>
                  <button 
                    className={cn(
                      "mt-6 h-12 px-8 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all",
                      isElite ? "bg-amber-500 shadow-amber-500/30" : "bg-[#0a84ff] shadow-blue-500/30"
                    )}
                    onClick={() => router.push('/vip')}
                  >
                    Tạo lại đơn
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Hết hạn sau: 
                      <span className={cn(
                        "font-mono text-lg ml-2",
                        countdown.startsWith('0') && "animate-pulse text-red-500"
                      )}>
                        {countdown}
                      </span>
                    </span>
                  </div>

                  <div className="relative mx-auto mb-6 w-fit rounded-3xl border-4 border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800">
                    <img 
                      src={order.qrUrl} 
                      alt="QR Code" 
                      className="h-64 w-64"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={() => {
                        console.error('QR Load Error:', order.qrUrl);
                        toast.error('Không tải được QR');
                      }}
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-xs font-bold shadow-lg dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      VietQR
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3">
                    <button 
                      className="h-12 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      onClick={downloadQR}
                    >
                      <Download className="h-5 w-5" /> Tải QR
                    </button>
                    <button 
                      className="h-12 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      onClick={shareQR}
                    >
                      <Share2 className="h-5 w-5" /> Chia sẻ
                    </button>
                  </div>

                  <button 
                    onClick={() => checkPaymentStatus()}
                    disabled={checking}
                    className={cn(
                      "mb-6 w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all",
                      isElite 
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" 
                        : "bg-[#0a84ff] text-white shadow-lg shadow-blue-500/30",
                      checking && "opacity-50"
                    )}
                  >
                    <RefreshCw className={cn("h-5 w-5", checking && "animate-spin")} />
                    {checking ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản'}
                  </button>

                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

                  <div className="space-y-4">
                    <h4 className="text-base font-bold flex items-center gap-2">
                      <span className={cn("w-1 h-5 rounded-full", isElite ? "bg-amber-500" : "bg-[#0a84ff]")} />
                      Hoặc chuyển khoản thủ công:
                    </h4>
                    
                    <div className="space-y-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 p-5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Ngân hàng:</span>
                        <span className="text-sm font-bold text-right">ACB - Ngân hàng TMCP Á Châu</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Số TK:</span>
                        <div className="flex items-center gap-2">
                          <button 
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            onClick={() => copyInfo('4187547', 'số tài khoản', 'stk')}
                          >
                            {copiedField === 'stk' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            )}
                          </button>
                          <span className="font-mono font-bold text-base">4187547</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Số tiền:</span>
                        <span className={cn(
                          "font-black text-lg",
                          isElite ? "text-amber-500" : "text-[#0a84ff]"
                        )}>
                          {order.amount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Nội dung:</span>
                        <div className="flex items-center gap-2">
                          <button 
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            onClick={() => copyInfo(`${order.planId === 'pro' ? 'VIPPRO' : 'VIPELITE'} ${orderId}`, 'nội dung', 'nd')}
                          >
                            {copiedField === 'nd' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            )}
                          </button>
                          <span className="font-mono font-bold text-sm">
                            {order.planId === 'pro' ? 'VIPPRO' : 'VIPELITE'} {orderId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border-2 border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck className="h-6 w-6 flex-shrink-0 text-blue-500 mt-0.5" strokeWidth={2.5} />
                      <div className="text-sm text-blue-900 dark:text-blue-200">
                        <p className="font-bold mb-2">Lưu ý quan trọng:</p>
                        <ul className="space-y-1.5 text-xs leading-relaxed">
                          <li className="flex gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>Chuyển đúng số tiền và nội dung để auto kích hoạt</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>Hệ thống tự động xử lý sau 1-3 phút. Nhấn "Tôi đã chuyển khoản" để check ngay</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>Không chuyển tiền nếu đơn đã hết hạn</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-zinc-500 leading-relaxed">
          Cần hỗ trợ? Liên hệ{' '}
          <a href="mailto:support@huha.online" className="font-semibold text-[#0a84ff] hover:underline">
            support@huha.online
          </a>
        </p>
      </div>
    </div>
  );
}
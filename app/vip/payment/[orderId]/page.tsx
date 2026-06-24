'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseDB } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { Copy, CheckCircle2, Clock, AlertCircle, Download, Share2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Order = {
  userId: string;
  planId: 'pro' | 'elite';
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  qrUrl: string;
  createdAt: Timestamp;
  expireAt: Timestamp;
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
            console.log('Order data:', data, 'Your UID:', user.uid); // Debug
            setOrder(data);
          } else {
            toast.error('Không tìm thấy đơn hàng');
            router.push('/vip');
          }
          setLoading(false);
        }, 
        (error) => {
          console.error('Firestore error:', error.code, error.message);
          toast.error(`Lỗi: ${error.code}`);
          setLoading(false); // QUAN TRỌNG: Tắt loading khi lỗi
        }
      );
      
      return () => unsubOrder();
    });
    
    return () => unsubAuth();
  }, [orderId, db, router, auth]);

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
      toast.success('Thanh toán thành công!');
      setTimeout(() => router.push('/vip/success'), 1500);
    }
    if (order?.status === 'expired') {
      toast.error('Đơn hàng đã hết hạn');
      setTimeout(() => router.push('/vip'), 2000);
    }
  }, [order?.status, router]);

  const copyInfo = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`Đã copy ${label}`);
  };

  const downloadQR = () => {
    if (!order) return;
    const link = document.createElement('a');
    link.href = order.qrUrl;
    link.download = `QR_${order.planName}_${orderId}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-2">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  const isExpired = countdown === 'Đã hết hạn' || order.status === 'expired';
  const isPaid = order.status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="mx-auto max-w-md pt-8">
        <button 
          onClick={() => router.back()} 
          className="mb-4 flex items-center gap-2 text-sm font-medium hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>

        <div className="overflow-hidden rounded-2xl border-0 shadow-2xl bg-white dark:bg-zinc-900">
          <div className={cn(
            "bg-gradient-to-r text-white p-6",
            order.planId === 'elite' 
             ? "from-amber-500 to-orange-600" 
              : "from-blue-500 to-indigo-600"
          )}>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Thanh toán {order.planName}</h1>
              <div className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                {order.amount.toLocaleString('vi-VN')}đ
              </div>
            </div>
            <p className="text-sm text-white/80 mt-1">Mã đơn: #{orderId}</p>
          </div>

          <div className="p-6">
            {isPaid? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="mt-4 text-xl font-bold">Thanh toán thành công!</h3>
                <p className="mt-2 text-sm text-zinc-500">
                  VIP đã được kích hoạt. Đang chuyển hướng...
                </p>
              </div>
            ) : isExpired? (
              <div className="py-12 text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
                <h3 className="mt-4 text-xl font-bold">Đơn hàng đã hết hạn</h3>
                <p className="mt-2 text-sm text-zinc-500">Vui lòng tạo đơn mới</p>
                <button 
                  className="mt-4 h-10 px-6 bg-blue-500 text-white rounded-xl font-semibold"
                  onClick={() => router.push('/vip')}
                >
                  Tạo lại đơn
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Hết hạn sau: <span className="font-mono text-lg">{countdown}</span>
                  </span>
                </div>

              <div className="relative mx-auto mb-6 w-fit rounded-2xl border-4 border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800">
  <img 
    src={order.qrUrl} 
    alt="QR Code" 
    className="h-64 w-64"
    referrerPolicy="no-referrer"
    crossOrigin="anonymous"
    onError={(e) => {
      console.error('QR Load Error:', order.qrUrl);
      toast.error('Không tải được QR');
    }}
    onLoad={() => console.log('QR Loaded:', order.qrUrl)}
  />
  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow dark:bg-slate-800">
    VietQR
  </div>
</div>
                <div className="mb-6 flex gap-2">
                  <button 
                    className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 font-semibold flex items-center justify-center gap-2"
                    onClick={downloadQR}
                  >
                    <Download className="h-4 w-4" /> Tải QR
                  </button>
                  <button 
                    className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 font-semibold flex items-center justify-center gap-2"
                    onClick={() => copyInfo(order.qrUrl, 'link QR')}
                  >
                    <Share2 className="h-4 w-4" /> Chia sẻ
                  </button>
                </div>

                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Hoặc chuyển khoản thủ công:</h4>
                  
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Ngân hàng:</span>
                      <span className="font-medium">ACB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Số TK:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">4187547</span>
                        <button 
                          className="h-6 w-6 flex items-center justify-center"
                          onClick={() => copyInfo('4187547', 'số tài khoản')}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Số tiền:</span>
                      <span className="font-medium text-blue-600">{order.amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Nội dung:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {order.planId === 'pro'? 'VIPPRO' : 'VIPELITE'} {orderId}
                        </span>
                        <button 
                          className="h-6 w-6 flex items-center justify-center"
                          onClick={() => copyInfo(`${order.planId === 'pro'? 'VIPPRO' : 'VIPELITE'} ${orderId}`, 'nội dung')}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="flex gap-2">
                    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div className="text-xs text-blue-900 dark:text-blue-200">
                      <p className="font-medium">Lưu ý quan trọng:</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
                        <li>Chuyển đúng số tiền và nội dung để auto kích hoạt</li>
                        <li>Hệ thống tự động xử lý sau 1-3 phút</li>
                        <li>Không chuyển tiền nếu đơn đã hết hạn</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Cần hỗ trợ? Liên hệ <a href="mailto:support@huha.online" className="underline">support@huha.online</a>
        </p>
      </div>
    </div>
  );
}
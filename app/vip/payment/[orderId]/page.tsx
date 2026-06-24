'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { getFirebaseDB } from '@/lib/firebase'; // Đổi từ db sang getFirebaseDB
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  paidAt?: Timestamp;
  sepayTransactionId?: number;
};

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const db = getFirebaseDB(); // Dùng getFirebaseDB()
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [countdown, setCountdown] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. Realtime listen đơn hàng
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        setOrder(snap.data() as Order);
      } else {
        toast.error('Không tìm thấy đơn hàng');
        router.push('/vip');
      }
    });
    return () => unsub();
  }, [orderId, db, router]);

  // 2. Đếm ngược 15 phút
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

  // 3. Auto redirect khi thanh toán xong
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
    setCopied(true);
    toast.success(`Đã copy ${label}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!order) return;
    const link = document.createElement('a');
    link.href = order.qrUrl;
    link.download = `QR_${order.planName}_${orderId}.png`;
    link.click();
  };

  if (!order) {
    return <div className="flex h-screen items-center justify-center">Đang tải...</div>;
  }

  const isExpired = countdown === 'Đã hết hạn' || order.status === 'expired';
  const isPaid = order.status === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="mx-auto max-w-md pt-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        <Card className="overflow-hidden border-0 shadow-2xl">
          <CardHeader className={cn(
            "bg-gradient-to-r text-white",
            order.planId === 'elite' 
             ? "from-amber-500 to-orange-600" 
              : "from-blue-500 to-indigo-600"
          )}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Thanh toán {order.planName}</CardTitle>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {order.amount.toLocaleString('vi-VN')}đ
              </Badge>
            </div>
            <p className="text-sm text-white/80">Mã đơn: #{orderId}</p>
          </CardHeader>

          <CardContent className="p-6">
            {isPaid? (
              <div className="py-12 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="mt-4 text-xl font-bold">Thanh toán thành công!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  VIP đã được kích hoạt. Đang chuyển hướng...
                </p>
              </div>
            ) : isExpired? (
              <div className="py-12 text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
                <h3 className="mt-4 text-xl font-bold">Đơn hàng đã hết hạn</h3>
                <p className="mt-2 text-sm text-muted-foreground">Vui lòng tạo đơn mới</p>
                <Button className="mt-4" onClick={() => router.push('/vip')}>
                  Tạo lại đơn
                </Button>
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
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-medium shadow dark:bg-slate-800">
                    VietQR
                  </div>
                </div>

                <div className="mb-6 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={downloadQR}>
                    <Download className="mr-2 h-4 w-4" /> Tải QR
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => copyInfo(order.qrUrl, 'link QR')}>
                    <Share2 className="mr-2 h-4 w-4" /> Chia sẻ
                  </Button>
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Hoặc chuyển khoản thủ công:</h4>
                  
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ngân hàng:</span>
                      <span className="font-medium">ACB</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Số TK:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">4187547</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => copyInfo('4187547', 'số tài khoản')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tiền:</span>
                      <span className="font-medium text-blue-600">{order.amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Nội dung:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {order.planId === 'pro'? 'VIPPRO' : 'VIPELITE'} {orderId}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6"
                          onClick={() => copyInfo(`${order.planId === 'pro'? 'VIPPRO' : 'VIPELITE'} ${orderId}`, 'nội dung')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
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
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Cần hỗ trợ? Liên hệ <a href="mailto:support@huha.online" className="underline">support@huha.online</a>
        </p>
      </div>
    </div>
  );
}
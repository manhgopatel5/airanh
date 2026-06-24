'use client';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function SuccessPage() {
  const router = useRouter();
  
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70 });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-20 w-20 text-green-500" />
        <h1 className="mt-6 text-3xl font-bold">Nâng cấp thành công!</h1>
        <p className="mt-2 text-muted-foreground">VIP của bạn đã được kích hoạt</p>
        <Button className="mt-6" onClick={() => router.push('/')}>
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
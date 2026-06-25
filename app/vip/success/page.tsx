'use client';
import { CheckCircle2, Home } from 'lucide-react';
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
        
        <Button 
          className="mt-8 px-8 py-6 rounded-2xl bg-[#0a84ff] hover:bg-[#0095ff] text-white font-bold text-base shadow-xl shadow-blue-500/40 active:scale-95 transition-all border-2 border-white/20"
          onClick={() => router.push('/')}
        >
          <Home className="w-5 h-5 mr-2" strokeWidth={2.5} />
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
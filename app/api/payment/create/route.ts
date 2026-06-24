import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  const { userId, planId, amount } = await req.json();
  const orderId = Date.now(); // VIPELITE 17297...
  
  // 1. Lưu đơn pending vào Firestore
  await setDoc(doc(db, 'orders', `${orderId}`), {
    userId, planId, amount, status: 'pending', createdAt: new Date()
  });

  // 2. Tạo link thanh toán SePay
  const sepayUrl = `https://qr.sepay.vn/img?acc=ACB&bank=ACB&amount=${amount}&des=VIPELITE ${orderId}&template=compact`;
  
  return NextResponse.json({ qrUrl: sepayUrl, orderId });
}
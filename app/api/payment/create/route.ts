import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const SEPAY_ACCOUNT = '4187547';
const SEPAY_BANK = 'ACB';

const VIP_PLANS = {
  pro: { 
    price: 49000, 
    name: 'VIP Pro',
    code: 'VIPPRO'
  },
  elite: { 
    price: 149000, 
    name: 'VIP Elite',
    code: 'VIPELITE'
  }
} as const;

type PlanId = keyof typeof VIP_PLANS;

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amount } = await req.json();

    if (!userId || !planId || !amount) {
      return NextResponse.json(
        { message: 'Thiếu userId, planId hoặc amount' }, 
        { status: 400 }
      );
    }

    if (!(planId in VIP_PLANS)) {
      return NextResponse.json(
        { message: 'Gói VIP không hợp lệ' }, 
        { status: 400 }
      );
    }

    const db = adminDb();
    
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { message: 'User không tồn tại' }, 
        { status: 404 }
      );
    }

    const plan = VIP_PLANS[planId as PlanId];
    if (amount !== plan.price) {
      return NextResponse.json(
        { message: 'Số tiền không hợp lệ' }, 
        { status: 400 }
      );
    }

    const orderId = Date.now();
    
    // FIX: Encode description để tránh lỗi dấu cách
    const description = encodeURIComponent(`${plan.code} ${orderId}`);
    const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT}&bank=${SEPAY_BANK}&amount=${amount}&des=${description}&template=compact`;
    
    await db.collection('orders').doc(`${orderId}`).set({
      userId,
      planId,
      planName: plan.name,
      amount,
      status: 'pending',
      qrUrl,
      createdAt: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000))
    });
    
    return NextResponse.json({ 
      qrUrl,
      orderId: `${orderId}`,
      amount,
      planName: plan.name
    });

  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: 'Lỗi server: ' + error.message }, 
      { status: 500 }
    );
  }
}
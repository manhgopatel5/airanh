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
};

type PlanId = keyof typeof VIP_PLANS;

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amount, promoCode } = await req.json();

    if (!userId ||!planId || amount == null) {
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
    let finalAmount: number = plan.price;
    let appliedDiscount = 0;
    let appliedCode: string | null = null;

    if (promoCode) {
      const code = promoCode.toUpperCase().trim();
      const promoRef = db.collection('promoCodes').doc(code);
      const promoSnap = await promoRef.get();

      if (!promoSnap.exists) {
        return NextResponse.json(
          { message: 'Mã giảm giá không tồn tại' },
          { status: 400 }
        );
      }

      const promo = promoSnap.data()!;

      if (!promo.active) {
        return NextResponse.json(
          { message: 'Mã đã bị tắt' },
          { status: 400 }
        );
      }

      if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
        return NextResponse.json(
          { message: 'Mã đã hết hạn' },
          { status: 400 }
        );
      }

      if (promo.maxUse && promo.usedCount >= promo.maxUse) {
        return NextResponse.json(
          { message: 'Mã đã hết lượt sử dụng' },
          { status: 400 }
        );
      }

      appliedDiscount = promo.discount;
      appliedCode = code;
      finalAmount = Math.round(plan.price * (1 - appliedDiscount / 100));

      // KHÔNG TĂNG usedCount ở đây nữa. Chuyển xuống webhook
    }

    if (amount!== finalAmount) {
      return NextResponse.json(
        { message: 'Số tiền không hợp lệ' },
        { status: 400 }
      );
    }

    // Dùng Firestore auto ID thay vì Date.now() để tránh trùng
    const orderRef = db.collection('orders').doc();
    const orderId = orderRef.id;

    const description = encodeURIComponent(`${plan.code} ${orderId}`);
    const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT}&bank=${SEPAY_BANK}&amount=${finalAmount}&des=${description}&template=compact`;

    await orderRef.set({
      userId,
      planId,
      planName: plan.name,
      amount: finalAmount,
      originalAmount: plan.price,
      promoCode: appliedCode,
      discount: appliedDiscount,
      status: 'pending',
      qrUrl,
      createdAt: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000))
    });

    return NextResponse.json({
      qrUrl,
      orderId,
      amount: finalAmount,
      planName: plan.name,
      discount: appliedDiscount
    });

  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: 'Lỗi server: ' + error.message },
      { status: 500 }
    );
  }
}
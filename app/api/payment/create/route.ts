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

    if (!userId ||!planId) {
      return NextResponse.json(
        { message: 'Thiếu userId hoặc planId' },
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
    let upgradeInfo = null;
    let appliedDiscount = 0;
    let appliedCode: string | null = null;

    // === LOGIC PRORATED UPGRADE ===
    if (planId === 'elite') {
      const subSnap = await db
       .collection('subscriptions')
       .where('userId', '==', userId)
       .where('status', '==', 'active')
       .limit(1)
       .get();

      if (!subSnap.empty) {
        const currentSub = subSnap.docs[0]?.data();
        if (!currentSub) {
          return NextResponse.json(
            { message: 'Không tìm thấy subscription' },
            { status: 404 }
          );
        }

        // Chỉ tính prorated khi đang Pro và còn hạn
        if (currentSub.planId === 'pro' && currentSub.expireAt?.toDate() > new Date()) {
          const now = new Date();
          const expireAt = currentSub.expireAt.toDate();
          const msPerDay = 1000 * 60 * 60 * 24;
          const daysLeft = Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / msPerDay));

          // Giá/ngày: Pro = 49000/30, Elite = 149000/30
          const proPerDay = VIP_PLANS.pro.price / 30;
          const elitePerDay = VIP_PLANS.elite.price / 30;

          // Tiền chênh lệch = (Elite - Pro) * ngày còn lại
          finalAmount = Math.max(0, Math.round((elitePerDay - proPerDay) * daysLeft));

          upgradeInfo = {
            from: 'pro',
            to: 'elite',
            daysLeft,
            originalPrice: plan.price,
            discount: plan.price - finalAmount
          };
        }
      }
    }
    // === KẾT THÚC LOGIC PRORATED ===

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

      // Áp promo lên giá đã prorated nếu có
      finalAmount = Math.round(finalAmount * (1 - appliedDiscount / 100));
    }

    // Chỉ check amount nếu client có gửi lên
    if (amount!== undefined && amount!== finalAmount) {
      return NextResponse.json(
        { message: 'Số tiền không hợp lệ' },
        { status: 400 }
      );
    }

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
      upgradeInfo,
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
      discount: appliedDiscount,
      upgradeInfo
    });

  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: 'Lỗi server: ' + error.message },
      { status: 500 }
    );
  }
}
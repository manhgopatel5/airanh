import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

const SEPAY_ACCOUNT = '4187547';
const SEPAY_BANK = 'ACB';

// SỬA: Rút gọn code để des <= 25 ký tự: P + 20 = 21, E + 20 = 21
const VIP_PLANS = {
  pro: {
    price: 49000,
    name: 'VIP Pro',
    code: 'P'
  },
  elite: {
    price: 149000,
    name: 'VIP Elite',
    code: 'E'
  }
};

type PlanId = keyof typeof VIP_PLANS;

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amount, promoCode } = await req.json();

    if (!userId || !planId) {
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

    const userData = userSnap.data();
    const plan = VIP_PLANS[planId as PlanId];
    let finalAmount: number = plan.price;
    let upgradeInfo = null;
    let appliedDiscount = 0;
    let appliedCode: string | null = null;

    // === LOGIC PRORATED UPGRADE ===
    if (planId === 'elite') {
      console.log('[UPGRADE] Check prorated for user:', userId);

      const currentVip = userData?.vip;
      console.log('[UPGRADE] Current vip:', JSON.stringify(currentVip));

      const isPro = currentVip?.tier === 'pro';
      const expireAt = currentVip?.expiresAt?.toDate();
      const isNotExpired = expireAt && expireAt > new Date();

      console.log('[UPGRADE] Check:', { isPro, expireAt, isNotExpired, now: new Date() });

      if (isPro && isNotExpired) {
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysLeft = Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / msPerDay));

        const proPerDay = VIP_PLANS.pro.price / 30;
        const elitePerDay = VIP_PLANS.elite.price / 30;
        finalAmount = Math.max(0, Math.round((elitePerDay - proPerDay) * daysLeft));

        upgradeInfo = {
          from: 'pro',
          to: 'elite',
          daysLeft,
          originalPrice: plan.price,
          discount: plan.price - finalAmount
        };

        console.log('[UPGRADE] Prorated applied:', { daysLeft, finalAmount, upgradeInfo });
      } else {
        console.log('[UPGRADE] Skip prorated: not pro or expired');
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
      finalAmount = Math.round(finalAmount * (1 - appliedDiscount / 100));
    }

    if (amount !== undefined && amount !== finalAmount) {
      return NextResponse.json(
        { message: 'Số tiền không hợp lệ' },
        { status: 400 }
      );
    }

    const orderRef = db.collection('orders').doc();
    const orderId = orderRef.id;

    // SỬA: Dùng full orderId 20 ký tự để khớp webhook regex
    // E + 20 = 21 ký tự < 25 → SePay ok
    const description = `${plan.code}${orderId}`; // EBSQRspautPNpsBJiQZgr
    const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_ACCOUNT}&bank=${SEPAY_BANK}&amount=${finalAmount}&des=${encodeURIComponent(description)}`;

    // Test QR URL trước khi lưu
    console.log('[SEPAY] Generated QR:', {
      orderId,
      description,
      descLength: description.length,
      qrUrl,
      amount: finalAmount
    });

    try {
      const qrCheck = await fetch(qrUrl, { method: 'HEAD' });
      console.log('[SEPAY] QR Status:', qrCheck.status, qrCheck.ok ? 'OK' : 'FAILED');
      if (!qrCheck.ok) {
        console.error('[SEPAY] QR generation failed:', await qrCheck.text());
      }
    } catch (err: any) {
      console.error('[SEPAY] QR fetch error:', err.message);
    }

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
      description, // Lưu để webhook check
      createdAt: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000))
    });

    console.log('[ORDER] Created:', { orderId, finalAmount, upgradeInfo, qrUrl });

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
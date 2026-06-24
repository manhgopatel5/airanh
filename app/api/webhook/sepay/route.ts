import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

type OrderData = {
  userId: string;
  planId: 'pro' | 'elite';
  planName: string;
  amount: number;
  originalAmount: number;
  promoCode?: string | null;
  discount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: FirebaseFirestore.Timestamp;
  expireAt: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  sepayTransactionId?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-sepay-signature');

    console.log('[SePay] Webhook received');

    // 1. Verify HMAC-SHA256
    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[SePay] Missing SEPAY_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (hmac!== signature) {
      console.error('[SePay] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('[SePay] Transaction:', {
      id: data.id,
      amount: data.transferAmount,
      desc: data.description,
    });

    // 2. FIX: Giữ nguyên case của orderId, chỉ check VIPPRO/VIPELITE không phân biệt hoa thường
    // Match: VIPPRO y801zsVF3s10j3qKI hoặc VIPPROy801zsVF3s10j3qKI
    const desc = data.description?.replace(/\s+/g, ''); // Chỉ bỏ space
    const match = desc?.match(/VIP(PRO|ELITE)([A-Za-z0-9]+)/i);

    if (!match) {
      console.error('[SePay] Cannot parse orderId from:', data.description);
      return NextResponse.json({ error: 'No orderId' }, { status: 400 });
    }

    const planType = match[1].toLowerCase() as 'pro' | 'elite';
    const orderId = match[2]; // Giữ nguyên: y801zsVF3s10j3qKI
    console.log('[SePay] Parsed orderId:', orderId, 'planType:', planType);

    // 3. Get order
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('[SePay] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as OrderData;

    // 4. Idempotent check
    if (order.status === 'paid') {
      console.log('[SePay] Order already paid:', orderId);
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    // 5. Validate amount - ép về number để tránh mismatch type
    const orderAmount = Number(order.amount);
    const paidAmount = Number(data.transferAmount);

    if (orderAmount!== paidAmount) {
      console.error('[SePay] Amount mismatch:', {
        expected: orderAmount,
        received: paidAmount,
        orderId,
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // 6. Check expiry
    if (order.expireAt.toDate() < new Date()) {
      await orderRef.update({ status: 'expired' });
      console.error('[SePay] Order expired:', orderId);
      return NextResponse.json({ error: 'Order expired' }, { status: 400 });
    }

    // 7. Transaction: update order + promo + user VIP
    await db.runTransaction(async (tx) => {
      const freshOrderSnap = await tx.get(orderRef);
      const freshOrder = freshOrderSnap.data() as OrderData;

      if (freshOrder.status === 'paid') {
        console.log('[SePay] Race condition: already paid by another request');
        return;
      }

      // 7.1 Update order -> paid
      tx.update(orderRef, {
        status: 'paid',
        paidAt: Timestamp.now(),
        sepayTransactionId: data.id,
      });

      // 7.2 Increment promo usedCount nếu có
      if (freshOrder.promoCode) {
        const promoRef = db.collection('promoCodes').doc(freshOrder.promoCode);
        tx.update(promoRef, { usedCount: FieldValue.increment(1) });
        console.log('[SePay] Incremented promo:', freshOrder.promoCode);
      }

      // 7.3 Upgrade VIP cho user
      const userRef = db.collection('users').doc(freshOrder.userId);
      const userSnap = await tx.get(userRef);
      const currentVip = userSnap.data()?.vip;

      let expireDate = new Date();
      if (currentVip?.tier!== 'free' && currentVip?.expiresAt) {
        const currentExpire = currentVip.expiresAt.toDate();
        if (currentExpire > new Date()) {
          expireDate = currentExpire; // Cộng dồn nếu đang có VIP
        }
      }
      expireDate.setDate(expireDate.getDate() + 30); // +30 ngày

      tx.update(userRef, {
        vip: {
          tier: freshOrder.planId,
          expiresAt: Timestamp.fromDate(expireDate),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log('[SePay] Upgraded user:', freshOrder.userId, 'to', freshOrder.planId);
    });

    console.log('[SePay] Success:', orderId);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[SePay] Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
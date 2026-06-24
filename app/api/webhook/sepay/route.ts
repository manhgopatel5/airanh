import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// QUAN TRỌNG: Tắt bodyParser của Next.js để lấy raw body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const body = await req.text(); // Phải lấy raw text, không dùng req.json()
    const sepaySignature = req.headers.get('x-sepay-signature');

    console.log('[SePay] Body length:', body.length);
    console.log('[SePay] Raw signature:', sepaySignature);

    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    console.log('[SePay] Secret length:', secret?.length); // Phải ra 40

    if (!secret) {
      console.error('[SePay] Missing SEPAY_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // Bỏ prefix "sha256="
    const signature = sepaySignature?.startsWith('sha256=')
    ? sepaySignature.slice(7)
      : sepaySignature;

    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (hmac!== signature) {
      console.error('[SePay] Invalid signature:', {
        expected: hmac,
        received: signature,
        bodyPreview: body.slice(0, 100)
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('[SePay] Transaction:', data.id);

    // Regex: Lấy orderId từ description, bỏ space và ký tự thừa của ACB
    const desc = data.description?.replace(/\s+/g, '');
    const match = desc?.match(/VIP(PRO|ELITE)([A-Za-z0-9]+)/i);

    if (!match) {
      console.error('[SePay] Cannot parse orderId from:', data.description);
      return NextResponse.json({ error: 'No orderId' }, { status: 400 });
    }

    const orderId = match[2];
    console.log('[SePay] Extracted orderId:', orderId);

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('[SePay] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as OrderData;
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    if (Number(order.amount)!== Number(data.transferAmount)) {
      console.error('[SePay] Amount mismatch:', { expected: order.amount, received: data.transferAmount });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (order.expireAt.toDate() < new Date()) {
      await orderRef.update({ status: 'expired' });
      return NextResponse.json({ error: 'Order expired' }, { status: 400 });
    }

    await db.runTransaction(async (tx) => {
      const freshOrderSnap = await tx.get(orderRef);
      const freshOrder = freshOrderSnap.data() as OrderData;
      if (freshOrder.status === 'paid') return;

      tx.update(orderRef, {
        status: 'paid',
        paidAt: Timestamp.now(),
        sepayTransactionId: data.id,
      });

      if (freshOrder.promoCode) {
        const promoRef = db.collection('promoCodes').doc(freshOrder.promoCode);
        tx.update(promoRef, { usedCount: FieldValue.increment(1) });
      }

      const userRef = db.collection('users').doc(freshOrder.userId);
      const userSnap = await tx.get(userRef);
      const currentVip = userSnap.data()?.vip;

      let expireDate = new Date();
      if (currentVip?.tier!== 'free' && currentVip?.expiresAt) {
        const currentExpire = currentVip.expiresAt.toDate();
        if (currentExpire > new Date()) expireDate = currentExpire;
      }
      expireDate.setDate(expireDate.getDate() + 30);

      tx.update(userRef, {
        vip: { tier: freshOrder.planId, expiresAt: Timestamp.fromDate(expireDate) },
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    console.log('[SePay] Success:', orderId);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[SePay] Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
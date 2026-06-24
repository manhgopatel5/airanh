import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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

function extractOrderId(content: string, description: string): string | null {
  const text = `${content} ${description}`.replace(/\s+/g, '');
  const match = text.match(/VIP(?:PRO|ELITE)([A-Za-z0-9]{20})/i);
  if (!match ||!match[1]) return null;
  return match[1];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sepaySignature = req.headers.get('x-sepay-signature') || '';
    const timestamp = req.headers.get('x-sepay-timestamp') || '';

    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[SePay] Missing SEPAY_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const payload = `${timestamp}.${body}`;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
.update(payload)
.digest('hex');

    if (sepaySignature!== expected) {
      console.error('[SePay] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) {
      return NextResponse.json({ error: 'Timestamp expired' }, { status: 400 });
    }

    const data = JSON.parse(body);
    console.log('[SePay] Transaction:', data.id, data.transferAmount);

    const orderId = extractOrderId(data.content || '', data.description || '');

    if (!orderId) {
      console.error('[SePay] Cannot parse orderId from:', data.content, data.description);
      return NextResponse.json({ error: 'No orderId found' }, { status: 400 });
    }

    console.log('[SePay] Extracted orderId:', orderId);

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      const recent = await db.collection('orders')
  .where('amount', '==', Number(data.transferAmount))
  .limit(3)
  .get();

      console.error('[SePay] Order not found:', orderId);
      console.error('[SePay] Recent orders with same amount:');
      recent.forEach(doc => {
        console.error(`- ${doc.id} | ${doc.data().status}`);
      });

      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as OrderData;

    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    if (Number(order.amount)!== Number(data.transferAmount)) {
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
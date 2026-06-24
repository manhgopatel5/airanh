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
  // Gộp cả content và description lại, bỏ space
  const text = `${content} ${description}`.replace(/\s+/g, '');
  // Bắt VIPPRO hoặc VIPELITE + chuỗi ID
  const match = text.match(/VIP(PRO|ELITE)([A-Za-z0-9]+)/i);
  if (!match) return null;

  // Auto fix lỗi nhìn nhầm: l->1, O->0, I->1
  return match[2]
  .replace(/l/g, '1')
  .replace(/O/g, '0')
  .replace(/I/g, '1');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sepaySignature = req.headers.get('x-sepay-signature') || '';
    const timestamp = req.headers.get('x-sepay-timestamp') || '';

    console.log('[SePay] Timestamp:', timestamp);
    console.log('[SePay] Signature:', sepaySignature);

    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[SePay] Missing SEPAY_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // SePay ký chuỗi: {timestamp}.{raw_body}
    const payload = `${timestamp}.${body}`;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

    if (sepaySignature!== expected) {
      console.error('[SePay] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check timestamp chống replay - quá 5 phút thì từ chối
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) {
      console.error('[SePay] Timestamp expired:', timestamp);
      return NextResponse.json({ error: 'Timestamp expired' }, { status: 400 });
    }

    const data = JSON.parse(body);
    console.log('[SePay] Transaction:', data.id, data.transferAmount);
    console.log('[SePay] Content:', data.content);
    console.log('[SePay] Description:', data.description);

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
      // Log 3 order gần nhất để debug
      const recent = await db.collection('orders')
      .where('amount', '==', Number(data.transferAmount))
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

      console.error('[SePay] Order not found:', orderId);
      console.error('[SePay] Recent orders with same amount:');
      recent.forEach(doc => {
        console.error(`- ${doc.id} | ${doc.data().status} | ${doc.data().createdAt.toDate()}`);
      });

      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as OrderData;

    if (order.status === 'paid') {
      console.log('[SePay] Order already paid:', orderId);
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    if (Number(order.amount)!== Number(data.transferAmount)) {
      console.error('[SePay] Amount mismatch:', order.amount, 'vs', data.transferAmount);
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (order.expireAt.toDate() < new Date()) {
      await orderRef.update({ status: 'expired' });
      console.error('[SePay] Order expired:', orderId);
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
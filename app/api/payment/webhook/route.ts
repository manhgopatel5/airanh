import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

type OrderData = {
  userId: string;
  planId: 'pro' | 'elite';
  planName: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: FirebaseFirestore.Timestamp;
  expireAt: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  sepayTransactionId?: number;
  promoCode?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-sepay-signature');

    const secret = process.env.SEPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Missing SEPAY_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (hmac!== signature) {
      console.error('Invalid signature:', { hmac, signature });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log('SePay webhook:', data);

    const match = data.description?.match(/VIP(PRO|ELITE) ([a-zA-Z0-9]+)/);
    if (!match) {
      console.error('No orderId in description:', data.description);
      return NextResponse.json({ error: 'No orderId' }, { status: 400 });
    }

    const orderId = match[2];

    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data() as OrderData;
    if (!order) {
      console.error('Order data empty:', orderId);
      return NextResponse.json({ error: 'Order data empty' }, { status: 404 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    if (order.amount!== data.transferAmount) {
      console.error('Amount mismatch:', { order: order.amount, paid: data.transferAmount });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    if (order.expireAt.toDate() < new Date()) {
      await orderRef.update({ status: 'expired' });
      console.error('Order expired:', orderId);
      return NextResponse.json({ error: 'Order expired' }, { status: 400 });
    }

    // Transaction để tránh race condition
    await db.runTransaction(async (tx) => {
      const freshOrderSnap = await tx.get(orderRef);
      const freshOrder = freshOrderSnap.data() as OrderData;

      if (freshOrder.status === 'paid') return; // Đã paid bởi request khác

      tx.update(orderRef, {
        status: 'paid',
        paidAt: Timestamp.now(),
        sepayTransactionId: data.id,
      });

      // Tăng usedCount cho mã giảm giá NẾU CÓ
      if (freshOrder.promoCode) {
        const promoRef = db.collection('promoCodes').doc(freshOrder.promoCode);
        tx.update(promoRef, { usedCount: FieldValue.increment(1) });
      }
    });

    // Cấp VIP cho user
    const { userId, planId } = order;
    const vipDays = 30;

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const currentVip = userSnap.data()?.vip;

    let expireDate = new Date();
    if (currentVip?.tier!== 'free' && currentVip?.expiresAt) {
      const currentExpire = currentVip.expiresAt.toDate();
      if (currentExpire > new Date()) {
        expireDate = currentExpire;
      }
    }
    expireDate.setDate(expireDate.getDate() + vipDays);

    await userRef.update({
      vip: {
        tier: planId,
        expiresAt: Timestamp.fromDate(expireDate)
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`User ${userId} upgraded to ${planId}, expire: ${expireDate}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
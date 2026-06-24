import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function GET(
  _req: NextRequest, // Đổi req thành _req để tránh lỗi unused
  { params }: { params: Promise<{ orderId: string }> } // Next.js 15 phải await params
) {
  const { orderId } = await params; // Thêm await

  if (!orderId) {
    return NextResponse.json({ error: 'Thiếu orderId' }, { status: 400 });
  }

  try {
    const db = adminDb();
    const orderSnap = await db.collection('orders').doc(orderId).get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    const order = orderSnap.data()!;

    if (order.status === 'paid') {
      return NextResponse.json({
        status: 'paid',
        paidAt: order.paidAt?.toDate().toISOString(),
      });
    }

    if (order.status === 'expired') {
      return NextResponse.json({ status: 'expired' });
    }

    const sepayToken = process.env.SEPAY_API_TOKEN;
    const sepayAccountId = process.env.SEPAY_ACCOUNT_ID;

    if (!sepayToken ||!sepayAccountId) {
      return NextResponse.json({ status: 'pending' });
    }

    const expectedContent = `${order.planId === 'pro'? 'VIPPRO' : 'VIPELITE'} ${orderId}`;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const fromDate = thirtyMinutesAgo.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];

    const sepayRes = await fetch(
      `https://my.sepay.vn/userapi/transactions/list?account_number=${sepayAccountId}&transaction_date_min=${fromDate}&transaction_date_max=${toDate}&limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${sepayToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!sepayRes.ok) {
      return NextResponse.json({ status: 'pending' });
    }

    const sepayData = await sepayRes.json();
    const transactions = sepayData.transactions || [];

    const matchedTx = transactions.find((tx: any) => {
      const amountIn = parseFloat(tx.amount_in);
      const content = tx.transaction_content?.toUpperCase().replace(/\s+/g, ' ').trim();
      const expected = expectedContent.toUpperCase();

      return (
        amountIn === order.amount &&
        content.includes(expected) &&
        parseFloat(tx.amount_out) === 0
      );
    });

    if (matchedTx) {
      await db.collection('orders').doc(orderId).update({
        status: 'paid',
        paidAt: Timestamp.now(),
        sepayTransactionId: matchedTx.id,
      });

      if (order.promoCode) {
        await db.collection('promoCodes').doc(order.promoCode).update({
          usedCount: FieldValue.increment(1),
        });
      }

      return NextResponse.json({
        status: 'paid',
        paidAt: new Date().toISOString(),
        transactionId: matchedTx.id,
      });
    }

    return NextResponse.json({ status: 'pending' });

  } catch (error: any) {
    console.error('Check payment error:', error);
    return NextResponse.json({ status: 'pending' });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin'; // DÙNG ADMIN
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-sepay-signature');
    
    // 1. Verify HMAC-SHA256
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
    
    // 2. Lấy orderId - BẮT CẢ VIPPRO VÀ VIPELITE
    const match = data.description?.match(/VIP(PRO|ELITE) (\d+)/);
    if (!match) {
      console.error('No orderId in description:', data.description);
      return NextResponse.json({ error: 'No orderId' }, { status: 400 });
    }
    
    const planType = match[1].toLowerCase(); // "pro" hoặc "elite"
    const orderId = match[2];

    // 3. Check đơn hàng - DÙNG ADMIN SDK
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) {
      console.error('Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data();
    if (order?.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    // 4. Check số tiền
    if (order?.amount!== data.transferAmount) {
      console.error('Amount mismatch:', { order: order?.amount, paid: data.transferAmount });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // 5. Update đơn thành paid
    await orderRef.update({ 
      status: 'paid',
      paidAt: Timestamp.now(),
      sepayTransactionId: data.id,
      planType // lưu thêm "pro" hoặc "elite"
    });
    
    // 6. Cấp VIP cho user
    const { userId, planId } = order;
    const vipDays = 30; // Cả 2 gói đều 30 ngày
    
    // Nếu user đang có VIP thì cộng dồn
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const currentVip = userSnap.data()?.vip;
    
    let expireDate = new Date();
    if (currentVip?.tier!== 'free' && currentVip?.expiresAt) {
      const currentExpire = currentVip.expiresAt.toDate();
      // Nếu VIP chưa hết hạn thì cộng dồn
      if (currentExpire > new Date()) {
        expireDate = currentExpire;
      }
    }
    expireDate.setDate(expireDate.getDate() + vipDays);
    
    await userRef.update({
      vip: {
        tier: planId, // 'pro' hoặc 'elite'
        expiresAt: Timestamp.fromDate(expireDate)
      }
    });

    console.log(`User ${userId} upgraded to ${planId}, expire: ${expireDate}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
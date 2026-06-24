import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';

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
    
    // 2. Lấy orderId từ description "VIPELITE 17297..."
    const orderId = data.description?.match(/VIPELITE (\d+)/)?.[1];
    if (!orderId) {
      console.error('No orderId in description:', data.description);
      return NextResponse.json({ error: 'No orderId' }, { status: 400 });
    }

    // 3. Check đơn hàng
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      console.error('Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderSnap.data();
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already paid' });
    }

    // 4. Update đơn thành paid
    await updateDoc(orderRef, { 
      status: 'paid',
      paidAt: Timestamp.now(),
      sepayTransactionId: data.id 
    });
    
    // 5. Cấp VIP cho user - SỬA CHỖ NÀY
    const { userId, planId } = order;
    const vipDays = planId === 'pro'? 30 : planId === 'elite'? 30 : 30; // Cả 2 gói đều 30 ngày
    
    // Nếu user đang có VIP thì cộng dồn
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
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
    
    await updateDoc(userRef, {
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
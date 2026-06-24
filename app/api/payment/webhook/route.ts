import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-sepay-signature');
  
  // 1. Verify HMAC-SHA256
  const hmac = crypto.createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET!)
   .update(body).digest('hex');
  if (hmac!== signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const data = JSON.parse(body);
  
  // 2. Lấy orderId từ description "VIPELITE 17297..."
  const orderId = data.description?.match(/VIPELITE (\d+)/)?.[1];
  if (!orderId) return NextResponse.json({ error: 'No orderId' }, { status: 400 });

  // 3. Update đơn + cấp VIP
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { userId, planId } = orderSnap.data();
  await updateDoc(orderRef, { status: 'paid' });
  
  // Cấp VIP cho user
  const vipDays = planId === 'month'? 30 : 365;
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + vipDays);
  
  await updateDoc(doc(db, 'users', userId), {
    vip: true,
    vipExpire: expireDate
  });

  return NextResponse.json({ success: true });
}
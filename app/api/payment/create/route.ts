import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

// Config giá gói - đồng bộ với frontend
const VIP_PLANS = {
  pro: { price: 49000, name: 'VIP Pro' },
  elite: { price: 149000, name: 'VIP Elite' }
} as const;

type PlanId = keyof typeof VIP_PLANS;

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amount } = await req.json();

    // 1. Validate dữ liệu đầu vào
    if (!userId || !planId || !amount) {
      return NextResponse.json(
        { message: 'Thiếu userId, planId hoặc amount' }, 
        { status: 400 }
      );
    }

    if (!(planId in VIP_PLANS)) {
      return NextResponse.json(
        { message: 'Gói VIP không hợp lệ' }, 
        { status: 400 }
      );
    }

    // 2. Check user tồn tại
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json(
        { message: 'User không tồn tại' }, 
        { status: 404 }
      );
    }

    // 3. Check giá tiền có khớp không - chống hack giá
    const plan = VIP_PLANS[planId as PlanId];
    if (amount!== plan.price) {
      console.error(`Price mismatch: client=${amount}, server=${plan.price}`);
      return NextResponse.json(
        { message: 'Số tiền không hợp lệ' }, 
        { status: 400 }
      );
    }

    // 4. Tạo orderId unique
    const orderId = Date.now();
    
    // 5. Lưu đơn pending vào Firestore
    await setDoc(doc(db, 'orders', `${orderId}`), {
      userId,
      planId,
      planName: plan.name,
      amount,
      status: 'pending',
      createdAt: Timestamp.now(),
      expireAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)) // Hết hạn sau 15p
    });

    // 6. Tạo link QR SePay
    // QUAN TRỌNG: Phải có dấu cách "VIPELITE 12345" để webhook parse được
    const qrUrl = `https://qr.sepay.vn/img?acc=ACB&bank=ACB&amount=${amount}&des=VIPELITE ${orderId}&template=compact`;
    
    console.log(`Order created: ${orderId} | User: ${userId} | Plan: ${planId} | Amount: ${amount}`);
    
    return NextResponse.json({ 
      qrUrl,
      orderId: `${orderId}`,
      amount,
      planName: plan.name
    });

  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: 'Lỗi server: ' + error.message }, 
      { status: 500 }
    );
  }
}
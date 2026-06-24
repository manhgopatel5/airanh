import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Thiếu mã giảm giá' }, 
        { status: 400 }
      );
    }

    const db = adminDb();
    const promoSnap = await db
      .collection('promoCodes')
      .doc(code.toUpperCase().trim())
      .get();
    
    if (!promoSnap.exists) {
      return NextResponse.json(
        { valid: false, message: 'Mã không tồn tại' }, 
        { status: 400 }
      );
    }
    
    const data = promoSnap.data()!;
    
    if (!data.active) {
      return NextResponse.json(
        { valid: false, message: 'Mã đã bị tắt' }, 
        { status: 400 }
      );
    }
    
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'Mã đã hết hạn' }, 
        { status: 400 }
      );
    }
    
    if (data.maxUse && data.usedCount >= data.maxUse) {
      return NextResponse.json(
        { valid: false, message: 'Mã đã hết lượt sử dụng' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      valid: true, 
      discount: data.discount,
      code: code.toUpperCase().trim()
    });
  } catch (error: any) {
    console.error('Validate promo error:', error);
    return NextResponse.json(
      { valid: false, message: 'Lỗi server' }, 
      { status: 500 }
    );
  }
}
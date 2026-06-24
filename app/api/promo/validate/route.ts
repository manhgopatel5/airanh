import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin"; // file init admin của bạn

export async function POST(req: Request) {
  const { code } = await req.json();
  const adminDb = getFirebaseAdmin().firestore();
  
  try {
    const promoSnap = await adminDb.collection('promoCodes').doc(code.toUpperCase()).get();
    
    if (!promoSnap.exists) {
      return NextResponse.json({ valid: false, message: 'Mã không tồn tại' }, { status: 400 });
    }
    
    const data = promoSnap.data()!;
    
    if (!data.active) {
      return NextResponse.json({ valid: false, message: 'Mã đã bị tắt' }, { status: 400 });
    }
    
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return NextResponse.json({ valid: false, message: 'Mã đã hết hạn' }, { status: 400 });
    }
    
    if (data.maxUse && data.usedCount >= data.maxUse) {
      return NextResponse.json({ valid: false, message: 'Mã đã hết lượt sử dụng' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      valid: true, 
      discount: data.discount,
      code: code.toUpperCase()
    });
  } catch (error: any) {
    return NextResponse.json({ valid: false, message: 'Lỗi server' }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { getVapidKeyFromEnv, validateVapidPublicKey } from "@/lib/vapidKey";

/** Trả VAPID public key lúc runtime (tránh build cũ trên Vercel) */
export async function GET() {
  const vapidKey = getVapidKeyFromEnv();
  const check = validateVapidPublicKey(vapidKey);

  if (!check.valid) {
    return NextResponse.json(
      { error: check.reason, vapidKey: null },
      { status: 500 }
    );
  }

  return NextResponse.json({ vapidKey });
}

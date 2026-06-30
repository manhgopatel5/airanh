import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 ngày

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken = body?.idToken as string | undefined;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const expiresIn = SESSION_MAX_AGE * 1000;
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[/api/auth] create session failed:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("__session")?.value;
  const response = NextResponse.json({ success: true });

  response.cookies.set("__session", "", {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  if (token) {
    try {
      const decoded = await adminAuth().verifySessionCookie(token);
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Cookie hết hạn hoặc không hợp lệ — vẫn xóa cookie
    }
  }

  return response;
}

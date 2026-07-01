import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/** Lấy uid từ session cookie hoặc Bearer ID token */
export async function getAuthUid(request: NextRequest): Promise<string | null> {
  const session = request.cookies.get("__session")?.value;
  if (session) {
    try {
      const decoded = await adminAuth().verifySessionCookie(session, true);
      return decoded.uid;
    } catch {
      // fall through
    }
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    try {
      const decoded = await adminAuth().verifyIdToken(bearer);
      return decoded.uid;
    } catch {
      return null;
    }
  }

  return null;
}

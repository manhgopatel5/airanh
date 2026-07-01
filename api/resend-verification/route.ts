import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const auth = adminAuth();

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await auth.verifyIdToken(token);
    const user = await auth.getUser(decoded.uid);

    if (!user.email) throw new Error("No email");
    if (user.emailVerified) throw new Error("Already verified");

    const link = await auth.generateEmailVerificationLink(user.email, {
      url: "https://huha.online",
    });

    await resend.emails.send({
      from: "Huha <admin@huha.online>",
      to: [user.email],
      subject: "Xác thực tài khoản Huha",
      html: `<p>Click để xác thực:</p><a href="${link}">${link}</a>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

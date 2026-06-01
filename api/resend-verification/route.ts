import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) initializeApp();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const user = await getAuth().getUser(decoded.uid);

    if (!user.email) throw new Error("No email");
    if (user.emailVerified) throw new Error("Already verified");

    const link = await getAuth().generateEmailVerificationLink(user.email, {
      url: "https://huha.online",
    });

    await resend.emails.send({
      from: "Huha <admin@huha.online>",
      to: [user.email],
      subject: "Xác thực tài khoản Huha",
      html: `<p>Click để xác thực:</p><a href="${link}">${link}</a>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
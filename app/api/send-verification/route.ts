import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { Resend } from "resend";
import * as crypto from "crypto";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");
      return NextResponse.json({ error: "Server chưa cấu hình RESEND_API_KEY" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Thiếu token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    const user = await getAuth().getUser(decoded.uid);

    if (!user.email) throw new Error("Tài khoản không có email");
    if (user.emailVerified) {
      return NextResponse.json({ error: "Email đã được xác thực rồi" }, { status: 400 });
    }

    // FIX 1: Bỏ orderBy để không cần index. Check 60s bằng where thôi
    const recentMail = await db
  .collection("emailVerifications")
  .where("uid", "==", user.uid)
  .where("createdAt", ">", Date.now() - 60 * 1000)
  .limit(1)
  .get();

    if (!recentMail.empty) {
      return NextResponse.json({
        error: "Bạn gửi quá nhanh. Vui lòng chờ 60 giây rồi thử lại."
      }, { status: 429 });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await db.collection("emailVerifications").doc(verifyToken).set({
      uid: user.uid,
      email: user.email,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    const link = `https://huha.online/verify-success?token=${encodeURIComponent(verifyToken)}`;
    const name = user.displayName || user.email.split('@')[0];

    // FIX 2: Dùng onboarding@resend.dev để test. noreply@huha.online phải verify domain mới gửi được
    const { data, error } = await resend.emails.send({
      from: "Huha <admin@huha.online>",
      to: [user.email],
      subject: `Mã xác thực Huha cho ${name}`,
      html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="margin:0; padding:0; background-color:#f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:16px; max-width:560px; width:100%;">
                <tr>
                  <td style="background: #0A84FF; padding: 48px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 32px; font-weight: 900;">Huha</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px;">
                    <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1d1d1f;">Chào ${name},</h2>
                    <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #515154;">
                      Cảm ơn bạn đã tạo tài khoản Huha. Bấm nút bên dưới để xác thực email và kích hoạt tài khoản.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px;">
                      <tr>
                        <td align="center" bgcolor="#0A84FF" style="border-radius:10px;">
                          <a href="${link}" target="_blank" style="display:inline-block; padding:16px 36px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                            Xác thực email
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #86868b;">
                      Link này sẽ hết hạn sau 24 giờ. Nếu không phải bạn tạo tài khoản, hãy bỏ qua email này.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px; background-color:#fafafa; border-top:1px solid #e5e5ea; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#8e8e93;">© 2026 Huha • huha.online</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
      text: `Chào ${name},\n\nXác thực tài khoản Huha tại: ${link}\n\nLink hết hạn sau 24h.`,
    });

    if (error) {
      console.error("Resend error:", JSON.stringify(error, null, 2));
      return NextResponse.json({
        error: `Gửi mail thất bại: ${error.message}`,
        detail: error
      }, { status: 500 });
    }

    console.log("Email sent successfully:", data?.id);
    return NextResponse.json({ ok: true, id: data?.id });

  } catch (err: any) {
    console.error("API resend error:", err);
    return NextResponse.json({
      error: err.message || "Lỗi server",
      stack: process.env.NODE_ENV === 'development'? err.stack : undefined
    }, { status: 500 });
  }
}
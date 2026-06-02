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
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const user = await getAuth().getUser(decoded.uid);

    if (!user.email) throw new Error("No email");
    if (user.emailVerified) return NextResponse.json({ error: "Already verified" }, { status: 400 });

    // Rate limit: 1 phút gửi 1 lần
    const lastSent = await db
     .collection("emailVerifications")
     .where("uid", "==", user.uid)
     .orderBy("createdAt", "desc")
     .limit(1)
     .get();

    if (!lastSent.empty) {
      const lastTime = lastSent.docs[0].data().createdAt;
      if (Date.now() - lastTime < 60 * 1000) {
        return NextResponse.json(
          { error: "Vui lòng đợi 1 phút trước khi gửi lại" },
          { status: 429 }
        );
      }
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h

    await db.collection("emailVerifications").doc(verifyToken).set({
      uid: user.uid,
      email: user.email,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    const link = `https://huha.online/api/verify-email?token=${verifyToken}`;

    const { data, error } = await resend.emails.send({
      from: "Huha <noreply@huha.online>",
      to: [user.email],
      subject: "Xác thực tài khoản Huha của bạn",
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align:center; border-bottom:1px solid #e4e4e7;">
                    <h1 style="margin:0; font-size:24px; font-weight:700; color:#18181b;">Huha</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:#18181b;">Xác thực email của bạn</h2>
                    <p style="margin:0 0 24px; font-size:16px; line-height:24px; color:#52525b;">
                      Chào bạn,<br><br>
                      Cảm ơn bạn đã đăng ký Huha. Bấm nút bên dưới để xác thực email và kích hoạt tài khoản.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center" style="border-radius:6px; background-color:#18181b;">
                          <a href="${link}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none;">
                            Xác thực tài khoản
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0; font-size:14px; line-height:22px; color:#71717a;">
                      Nút không hoạt động? Copy link này vào trình duyệt:<br>
                      <a href="${link}" style="color:#3b82f6; word-break:break-all;">${link}</a>
                    </p>
                    <p style="margin:24px 0 0; font-size:14px; line-height:22px; color:#71717a;">
                      Link sẽ hết hạn sau 24 giờ. Nếu bạn không đăng ký Huha, hãy bỏ qua email này.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 40px; background-color:#fafafa; border-top:1px solid #e4e4e7; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#a1a1aa;">
                      © 2026 Huha. Mọi quyền được bảo lưu.<br>
                      <a href="https://huha.online" style="color:#71717a; text-decoration:none;">huha.online</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
      text: `Chào bạn,\n\nXác thực tài khoản Huha tại link: ${link}\n\nLink hết hạn sau 24h. Nếu bạn không đăng ký, hãy bỏ qua email này.`,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    console.error("API resend error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
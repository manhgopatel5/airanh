
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const db = adminDb();
    const auth = adminAuth();

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await auth.verifyIdToken(token);
    const user = await auth.getUser(decoded.uid);

    if (!user.email) throw new Error("No email");
    if (user.emailVerified) throw new Error("Already verified");

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await db.collection("emailVerifications").doc(verifyToken).set({
      uid: user.uid,
      email: user.email,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    // Đổi link sang page thay vì API để không bị chặn "Mở bằng"
const link = `https://huha.online/api/verify-email?token=${verifyToken}`;

    const { data, error } = await resend.emails.send({
      from: "Huha <admin@huha.online>", // Đổi thành noreply
      to: [user.email],
      subject: "Xác thực email Huha", // Bỏ "Kết nối không giới hạn" cho ngắn
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; max-width:560px; width:100%;">
                <tr>
                  <td style="background: #0A84FF; padding: 40px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 900;">Huha</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px; color: #1d1d1f;">
                    <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">Chào ${user.displayName || "bạn"},</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #515154; margin: 0 0 24px;">
                      Cảm ơn bạn đã tạo tài khoản Huha. Bấm nút bên dưới để xác thực email và kích hoạt tài khoản.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center" style="border-radius:8px; background-color:#0A84FF;">
                          <a href="${link}" target="_blank" style="display:inline-block; padding:16px 32px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none;">
                            Xác thực email
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 14px; line-height: 1.6; color: #86868b; margin: 24px 0 0;">
                      Nút không hoạt động? Copy link này:<br>
                      <a href="${link}" style="color:#0A84FF; word-break:break-all;">${link}</a>
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; color: #86868b; margin: 24px 0 0;">
                      Link hết hạn sau 24 giờ. Nếu không phải bạn đăng ký, hãy bỏ qua email này.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px; background-color:#fafafa; border-top:1px solid #e5e5ea; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#8e8e93;">
                      © 2026 Huha • <a href="https://huha.online" style="color:#8e8e93; text-decoration:none;">huha.online</a>
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
      text: `Chào ${user.displayName || "bạn"},\n\nXác thực tài khoản Huha tại link: ${link}\n\nLink hết hạn sau 24h. Nếu bạn không đăng ký, hãy bỏ qua email này.`,
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
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
      throw new Error("Missing RESEND_API_KEY");
    }

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const user = await getAuth().getUser(decoded.uid);

    if (!user.email) throw new Error("No email");
    if (user.emailVerified) throw new Error("Already verified");

    // Rate limit: check 60s
    const recentMail = await db
    .collection("emailVerifications")
    .where("uid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

    const lastDoc = recentMail.docs[0];
    if (lastDoc && Date.now() - lastDoc.data().createdAt < 60 * 1000) {
      return NextResponse.json({ error: "Vui lòng chờ 60 giây trước khi gửi lại" }, { status: 429 });
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
    const name = user.displayName || "bạn";

    const { data, error } = await resend.emails.send({
      from: "Huha <noreply@huha.online>",
      to: [user.email],
      subject: `Xác thực tài khoản Huha của ${name}`,
      html: `
      <!DOCTYPE html>
      <html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Xác thực tài khoản Huha</title>
        <!--[if mso]>
        <xml>
          <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
        <style>
          :root { color-scheme: light dark; supported-color-schemes: light dark; }
          @media (prefers-color-scheme: dark) {
           .bg-body { background-color: #000000!important; }
           .bg-card { background-color: #1c1c1e!important; }
           .text-primary { color: #ffffff!important; }
           .text-secondary { color: #aeaeb2!important; }
           .footer { background-color: #2c2c2e!important; border-color: #3a3a3c!important; }
          }
          @media only screen and (max-width: 600px) {
           .container { width: 100%!important; }
           .px { padding-left: 24px!important; padding-right: 24px!important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; word-spacing:normal; background-color:#f5f5f7;" class="bg-body">
        <div role="article" aria-roledescription="email" lang="vi" style="text-size-adjust:100%; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;" class="bg-body">
            <tr>
              <td align="center" style="padding: 40px 16px;">
                <!--[if mso]>
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
                <tr><td>
                <![endif]-->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden;" class="container bg-card">
                  <!-- Header -->
                  <tr>
                    <td style="background: #0A84FF; padding: 48px 24px; text-align: center;">
                      <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 900; line-height: 1; color: #ffffff;">
                        Huha
                      </h1>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 32px;" class="px">
                      <h2 style="margin: 0 0 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; color: #1d1d1f; line-height: 1.3;" class="text-primary">
                        Chào ${name},
                      </h2>
                      <p style="margin: 0 0 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #515154;" class="text-secondary">
                        Cảm ơn bạn đã tạo tài khoản Huha. Bấm nút bên dưới để xác thực email và kích hoạt tài khoản của bạn.
                      </p>

                      <!-- Button - Outlook + Gmail safe -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px;">
                        <tr>
                          <td align="left" style="border-radius:10px; background-color:#0A84FF;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${link}" style="height:52px; v-text-anchor:middle; width:200px;" arcsize="20%" fillcolor="#0A84FF" stroke="f">
                              <v:textbox inset="0,0,0,0">
                                <center style="color:#ffffff; font-family:sans-serif; font-size:16px; font-weight:700;">Xác thực email</center>
                              </v:textbox>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if!mso]><!-->
                            <a href="${link}" target="_blank" style="display:inline-block; padding:16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px; mso-padding-alt:0; text-align:center;">
                              Xác thực email
                            </a>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #86868b;" class="text-secondary">
                        Link này sẽ hết hạn sau 24 giờ. Nếu không phải bạn tạo tài khoản, hãy bỏ qua email này.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 32px; background-color:#fafafa; border-top:1px solid #e5e5ea; text-align:center;" class="footer px">
                      <p style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:12px; color:#8e8e93;" class="text-secondary">
                        © 2026 Huha • <a href="https://huha.online" style="color:#8e8e93; text-decoration:none;">huha.online</a>
                      </p>
                    </td>
                  </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
      `,
      text: `Chào ${name},\n\nCảm ơn bạn đã tạo tài khoản Huha. Xác thực email tại link: ${link}\n\nLink hết hạn sau 24 giờ. Nếu bạn không đăng ký, hãy bỏ qua email này.\n\nHuha • huha.online`,
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
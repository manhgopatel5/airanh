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

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await db.collection("emailVerifications").doc(verifyToken).set({
      uid: user.uid,
      email: user.email,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });

    const link = `https://huha.online/api/verify-email?token=${verifyToken}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: "Huha <onboarding@resend.dev>",
      to: [user.email],
      subject: "Xác thực tài khoản Huha",
      html: `<a href="${link}">Bấm để xác thực</a><p>Link: ${link}</p>`,
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
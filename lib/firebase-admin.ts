import { initializeApp, getApps, cert, App, ServiceAccount } from "firebase-admin/app";
import { getMessaging, Messaging, BatchResponse, Message } from "firebase-admin/messaging";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

/* ================= VALIDATE ENV ================= */
const requiredEnvs = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

for (const env of requiredEnvs) {
  if (!process.env[env]) {
    throw new Error(`Missing environment variable: ${env}`);
  }
}

/* ================= SERVICE ACCOUNT ================= */
const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
};

/* ================= LAZY INIT ================= */
let app: App;
let messaging: Messaging;
let db: Firestore;
let auth: Auth;

function getFirebaseAdmin() {
  if (!getApps().length) {
    try {
      app = initializeApp({
        credential: cert(serviceAccount),
      ...(process.env.FIREBASE_DATABASE_URL && {
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        }),
      });
      if (process.env.DEBUG) console.log("✅ Firebase Admin initialized");
    } catch (e) {
      console.error("❌ Firebase Admin init failed:", e);
      throw e;
    }
  } else {
    app = getApps()[0]!;
  }

  if (!messaging) messaging = getMessaging(app);
  if (!db) db = getFirestore(app);
  if (!auth) auth = getAuth(app);

  return { app, messaging, db, auth };
}

/* ================= EXPORTS ================= */
export const adminApp = () => getFirebaseAdmin().app;
export const adminMessaging = () => getFirebaseAdmin().messaging;
export const adminDb = () => getFirebaseAdmin().db;
export const adminAuth = () => getFirebaseAdmin().auth;

/* ================= TYPE ================= */
export type SendNotificationPayload = {
  token: string | string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, any>;
  link?: string;
  priority?: "high" | "normal";
  ttl?: number; // seconds
  dryRun?: boolean;
};

export type SendNotificationResult = {
  successCount: number;
  failureCount: number;
  failedTokens: string[];
  messageId?: string;
  errors?: { token: string; error: string }[];
};

/* ================= HELPER ================= */
const stringifyData = (data?: Record<string, any>): Record<string, string> => {
  if (!data) return {};
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, typeof v === "string"? v : JSON.stringify(v)])
  );
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ================= SEND NOTIFICATION ================= */
export async function sendNotification(
  payload: SendNotificationPayload
): Promise<SendNotificationResult> {
  const { token, title, body, imageUrl, data, link, priority = "high", ttl = 86400, dryRun = false } = payload;
  const msg = getFirebaseAdmin().messaging;

  const baseMessage: Omit<Message, "token" | "topic" | "condition"> = {
    notification: { title, body,...(imageUrl && { imageUrl }) },
    data: stringifyData(data),
    webpush: {
      fcmOptions: { link: link || "/" },
      notification: {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        requireInteraction: priority === "high",
      },
      headers: { TTL: ttl.toString() },
    },
    android: {
      priority: priority === "high"? "high" : "normal",
      ttl: ttl * 1000,
      notification: {
        icon: "ic_notification",
        color: "#3B82F6",
    ...(priority === "high" && { sound: "default" }),
      },
    },
    apns: {
      headers: { "apns-priority": priority === "high"? "10" : "5" },
      payload: {
        aps: {
          badge: 1,
      ...(priority === "high" && { sound: "default" }),
          "content-available": 1,
        },
      },
    },
  };

  const sendWithRetry = async (sendFn: () => Promise<any>, retries = 2): Promise<any> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await sendFn();
      } catch (e: any) {
        if (e.code === "messaging/server-unavailable" && i < retries) {
          await sleep(1000 * (i + 1));
          continue;
        }
        throw e;
      }
    }
  };

  try {
    if (Array.isArray(token)) {
      const tokens = [...new Set(token)];
      const chunks: string[][] = [];
      for (let i = 0; i < tokens.length; i += 500) {
        chunks.push(tokens.slice(i, i + 500));
      }

      const results: BatchResponse[] = await Promise.all(
        chunks.map((t) =>
          sendWithRetry(() =>
            msg.sendEachForMulticast({ tokens: t,...baseMessage }, dryRun)
          )
        )
      );

      const failedTokens: string[] = [];
      const errors: { token: string; error: string }[] = [];
      let successCount = 0;
      let failureCount = 0;

      results.forEach((r, chunkIdx) => {
        successCount += r.successCount;
        failureCount += r.failureCount;
        r.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const tk = chunks[chunkIdx]![idx]!;
            failedTokens.push(tk);
            errors.push({ token: tk, error: resp.error?.message || "unknown" });
          }
        });
      });

      return { successCount, failureCount, failedTokens, errors };
    } else {
      const res = await sendWithRetry(() => msg.send({...baseMessage, token }, dryRun));
      return { successCount: 1, failureCount: 0, failedTokens: [], messageId: res };
    }
  } catch (e: any) {
    console.error("Send notification error:", e);
    if (e.code === "messaging/registration-token-not-registered") {
      const tk = Array.isArray(token)? token[0]! : token;
      return {
        successCount: 0,
        failureCount: 1,
        failedTokens: Array.isArray(token)? token : [token],
        errors: [{ token: tk, error: e.message }],
      };
    }
    throw e;
  }
}

/* ================= VERIFY ID TOKEN ================= */
export async function verifyIdToken(idToken: string, checkRevoked = false) {
  try {
    const decoded = await getFirebaseAdmin().auth.verifyIdToken(idToken, checkRevoked);
    return decoded;
  } catch (e) {
    console.error("Verify token error:", e);
    return null;
  }
}

/* ================= DELETE TOKENS ================= */
export async function deleteInvalidTokens(userTokenMap: Map<string, string[]>): Promise<number> {
  const { db } = getFirebaseAdmin();
  let totalDeleted = 0;

  const entries = [...userTokenMap.entries()];
  for (let i = 0; i < entries.length; i += 500) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + 500);

    for (const [uid, tokens] of chunk) {
      const ref = db.doc(`users/${uid}`);
      batch.update(ref, {
        fcmTokens: FieldValue.arrayRemove(...tokens),
        fcmToken: null,
        fcmTokenUpdatedAt: null,
      });
    }

    await batch.commit();
    totalDeleted += chunk.length;
  }

  return totalDeleted;
}

/* ================= SEND TO TOPIC ================= */
export async function sendToTopic(
  topic: string,
  payload: Omit<SendNotificationPayload, "token">
): Promise<string> {
  const { title, body, imageUrl, data, link, priority = "normal", ttl = 86400 } = payload;
  const msg = getFirebaseAdmin().messaging;

  return msg.send({
    topic,
    notification: { title, body,...(imageUrl && { imageUrl }) },
    data: stringifyData(data),
    webpush: { fcmOptions: { link: link || "/" } },
    android: { priority: priority === "high"? "high" : "normal", ttl: ttl * 1000 },
    apns: { headers: { "apns-priority": priority === "high"? "10" : "5" } },
  });
}
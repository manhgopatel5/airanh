import { initializeApp, getApps, cert, App, ServiceAccount } from "firebase-admin/app";
import { getMessaging, Messaging, BatchResponse, Message } from "firebase-admin/messaging";
import { getFirestore, Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import type { FeedTask, TaskListItem } from "@/types/task";

/* ================= SERVICE ACCOUNT ================= */
function getServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId ||!clientEmail ||!privateKey) {
    console.error('Missing Firebase Admin env:', { projectId:!!projectId, clientEmail:!!clientEmail, privateKey:!!privateKey });
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

/* ================= LAZY INIT ================= */
let app: App | null = null;
let messaging: Messaging | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

function getFirebaseAdmin() {
  if (app) return { app, messaging: messaging!, db: db!, auth: auth! };

  if (!getApps().length) {
    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      throw new Error('Firebase Admin credentials not configured');
    }

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

/* ================= EXPORTS - KHÔNG THROW ================= */
export const adminApp = () => {
  try {
    return getFirebaseAdmin().app;
  } catch {
    return null;
  }
};

export const adminMessaging = () => {
  try {
    return getFirebaseAdmin().messaging;
  } catch {
    return null;
  }
};

export const adminDb = () => {
  try {
    return getFirebaseAdmin().db;
  } catch {
    return null;
  }
};

export const adminAuth = () => {
  try {
    return getFirebaseAdmin().auth;
  } catch {
    return null;
  }
};

/* ================= HELPER: Timestamp -> string ================= */
const tsToString = (ts: any): string | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return null;
};

/* ================= GET JOBS CHO ISR ================= */
export async function getJobsFromFirebaseAdmin(
  type: 'task' | 'plan' = 'task',
  limitCount = 10
): Promise<FeedTask[]> {
  const db = adminDb();
  if (!db) throw new Error('Firestore not available');

  const allowedStatuses = type === 'plan'
   ? ['open', 'pending', 'full', 'doing', 'in_progress']
    : ['open', 'pending', 'full', 'doing'];

  const selectedFields = [
    'slug', 'shortId', 'title', 'description', 'type', 'status', 'visibility',
    'userId', 'userName', 'userAvatar', 'userShortId', 'userUsername', 'userVerified',
    'price', 'currency', 'totalSlots', 'joined', 'budgetType', 'paymentMethod',
    'isRemote', 'category', 'tags', 'images', 'viewCount', 'likeCount',
    'commentCount', 'location', 'banned', 'hidden', 'appliedCount',
    'createdAt', 'updatedAt', 'deadline', 'startDate', 'applicationDeadline',
    'eventDate', 'endDate', 'maxParticipants', 'currentParticipants',
    'costType', 'costAmount', 'costDescription', 'milestones'
  ];

  const buildQuery = (requirePublic: boolean) => {
    let query = db.collection('tasks')
     .where('type', '==', type)
     .where('status', 'in', allowedStatuses)
     .orderBy('createdAt', 'desc')
     .limit(limitCount);

    if (requirePublic) {
      query = query.where('visibility', '==', 'public');
    }

    return query.select(...selectedFields);
  };

  let snap;
  try {
    snap = await buildQuery(true).get();
  } catch (error: any) {
    if (error?.code!== 9 && error?.code!== 'FAILED_PRECONDITION') throw error;
    console.warn('Public jobs index unavailable, falling back without visibility filter:', error?.details || error?.message);
    snap = await buildQuery(false).get();
  }

  if (snap.empty) {
    snap = await buildQuery(false).get();
  }

  return snap.docs.map(doc => {
    const d = doc.data();
    const taskData: TaskListItem = {
      id: doc.id,
      slug: d.slug || "",
      shortId: d.shortId || "",
      title: d.title || "",
      description: d.description || "",
      type: d.type || type,
      status: d.status || "open",
      visibility: d.visibility || "public",
      userId: d.userId || "",
      userName: d.userName || "",
      userAvatar: d.userAvatar || "",
     ...(d.userVerified!== undefined && { userVerified: d.userVerified }),
     ...(d.userShortId!== undefined && { userShortId: d.userShortId }),
     ...(d.userUsername!== undefined && { userUsername: d.userUsername }),
      price: d.price?? 0,
      currency: d.currency || "VND",
      totalSlots: d.totalSlots?? d.maxParticipants?? 0,
      joined: d.joined?? 0,
      budgetType: d.budgetType || "fixed",
     ...(d.paymentMethod!== undefined && { paymentMethod: d.paymentMethod }),
     ...(d.isRemote!== undefined && { isRemote: d.isRemote }),
      category: d.category || "",
      tags: Array.isArray(d.tags)? d.tags : [],
      images: Array.isArray(d.images)? d.images : [],
      viewCount: d.viewCount?? 0,
      likeCount: d.likeCount?? 0,
      commentCount: d.commentCount?? 0,
      likes: [],
     ...(d.location!== undefined && { location: d.location }),
      savedBy: [],
      applicants: [],
     ...(d.banned!== undefined && { banned: d.banned }),
     ...(d.hidden!== undefined && { hidden: d.hidden }),
     ...(d.appliedCount!== undefined && { appliedCount: d.appliedCount }),
     ...(d.maxParticipants!== undefined && { maxParticipants: d.maxParticipants }),
     ...(d.currentParticipants!== undefined && { currentParticipants: d.currentParticipants }),
     ...(d.costType!== undefined && { costType: d.costType }),
     ...(d.costAmount!== undefined && { costAmount: d.costAmount }),
     ...(d.costDescription!== undefined && { costDescription: d.costDescription }),
     ...(d.milestones!== undefined && { milestones: d.milestones }),
      createdAt: tsToString(d.createdAt),
     ...(d.updatedAt && { updatedAt: tsToString(d.updatedAt) }),
     ...(d.deadline && { deadline: tsToString(d.deadline) }),
     ...(d.startDate && { startDate: tsToString(d.startDate) }),
     ...(d.applicationDeadline && { applicationDeadline: tsToString(d.applicationDeadline) }),
     ...(d.eventDate && { eventDate: tsToString(d.eventDate) }),
     ...(d.endDate && { endDate: tsToString(d.endDate) }),
    };

    return taskData as FeedTask;
  }).filter((task) => task.banned!== true && task.hidden!== true && (task as FeedTask & { visibility?: string }).visibility!== 'private');
}

/* ================= TYPE ================= */
export type SendNotificationPayload = {
  token: string | string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, any>;
  link?: string;
  priority?: "high" | "normal";
  ttl?: number;
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
  const msg = adminMessaging();
  if (!msg) throw new Error('Firebase Messaging not initialized');

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
    const auth = adminAuth();
    if (!auth) return null;
    const decoded = await auth.verifyIdToken(idToken, checkRevoked);
    return decoded;
  } catch (e) {
    console.error("Verify token error:", e);
    return null;
  }
}

/* ================= DELETE TOKENS ================= */
export async function deleteInvalidTokens(userTokenMap: Map<string, string[]>): Promise<number> {
  const db = adminDb();
  if (!db) return 0;
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
  const msg = adminMessaging();
  if (!msg) throw new Error('Firebase Messaging not initialized');

  return msg.send({
    topic,
    notification: { title, body,...(imageUrl && { imageUrl }) },
    data: stringifyData(data),
    webpush: { fcmOptions: { link: link || "/" } },
    android: { priority: priority === "high"? "high" : "normal", ttl: ttl * 1000 },
    apns: { headers: { "apns-priority": priority === "high"? "10" : "5" } },
  });
}
import { initializeApp, getApps, cert, App, ServiceAccount } from "firebase-admin/app";
import { getMessaging, Messaging, BatchResponse, Message } from "firebase-admin/messaging";
import { getFirestore, Firestore, FieldValue, Timestamp, Query } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage"; // THÊM
import type { FeedTask, TaskListItem } from "@/types/task";
import { isActiveFeedItem } from "@/types/task";
import { enrichTasksWithUserDataAdmin } from "@/lib/task/enrichTasks";

/* ================= CATEGORY MAP ================= */
const CATEGORY_MAP: Record<string, string> = {
  'Việc gấp': 'urgent',
  'Kỹ năng': 'skill',
  'Mua hộ': 'shopping',
  'Giúp đỡ': 'help',
  'Chuyển đồ': 'delivery',
  'Dọn dẹp': 'cleaning',
  'Ăn uống': 'food',
  'Việc nhà': 'housework',
  'Khác': 'other',
};

/* ================= SERVICE ACCOUNT ================= */
const requiredEnvs = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

/** Chuẩn hóa PEM key — xử lý \\n, quote thừa, key một dòng, hoặc sai format Vercel */
export function parseFirebasePrivateKey(raw?: string): string {
  if (!raw?.trim()) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY");
  }

  let key = raw.trim();

  // Fix paste sai: value có thể bắt đầu bằng :" hoặc :
  if (key.startsWith(':"')) {
    key = key.slice(2);
  } else if (key.startsWith(":")) {
    key = key.slice(1).trim();
  }

  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  key = key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n");

  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";

  if (key.includes(begin) && key.includes(end) && !key.includes("\n")) {
    const body = key.replace(begin, "").replace(end, "").replace(/\s+/g, "");
    const lines = body.match(/.{1,64}/g) || [];
    key = `${begin}\n${lines.join("\n")}\n${end}\n`;
  }

  if (!key.includes(begin)) {
    throw new Error("FIREBASE_PRIVATE_KEY phải là PEM (-----BEGIN PRIVATE KEY-----)");
  }

  return key;
}

function getServiceAccount(): ServiceAccount {
  const missing = requiredEnvs.filter((env) =>!process.env[env]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variable: ${missing.join(", ")}`);
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: parseFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };
}

/* ================= LAZY INIT ================= */
let app: App;
let messaging: Messaging;
let db: Firestore;
let auth: Auth;
let storage: Storage; // THÊM

function getFirebaseAdmin() {
  if (!getApps().length) {
    try {
      app = initializeApp({
        credential: cert(getServiceAccount()),
        // THÊM DÒNG NÀY - dùng đúng tên bucket của bạn
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'airanh-ba64c.firebasestorage.app',
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
  if (!storage) storage = getStorage(app); // THÊM

  return { app, messaging, db, auth, storage }; // THÊM storage
}

/* ================= EXPORTS ================= */
export const adminApp = () => getFirebaseAdmin().app;
export const adminMessaging = () => getFirebaseAdmin().messaging;
export const adminDb = () => getFirebaseAdmin().db;
export const adminAuth = () => getFirebaseAdmin().auth;
export const adminStorage = () => getFirebaseAdmin().storage; // THÊM

/* ================= HELPER: Timestamp -> string ================= */
const tsToString = (ts: any): string | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return null;
};

/* ================= GET JOBS CHO ISR + API ================= */
export type GetJobsOptions = {
  type?: 'task' | 'plan';
  limitCount?: number;
  sortBy?: 'hot' | 'new' | 'views' | 'likes' | 'price_asc' | 'price_desc';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  cursor?: string;
};

export async function getJobsFromFirebaseAdmin(
  options: GetJobsOptions = {}
): Promise<{ tasks: FeedTask[], nextCursor: string | null }> {
  const {
    type = 'task',
    limitCount = 10,
    sortBy = 'new',
    category,
    minPrice,
    maxPrice,
    cursor
  } = options;

  const { db } = getFirebaseAdmin();

  const selectedFields = [
    'slug', 'shortId', 'title', 'description', 'type', 'status', 'visibility',
    'userId', 'userName', 'userAvatar', 'userShortId', 'userUsername', 'userVerified',
    'price', 'currency', 'totalSlots', 'joined', 'budgetType', 'paymentMethod',
    'isRemote', 'category', 'tags', 'images', 'viewCount', 'likeCount', 'hotScore', 'priceRange', 'urgency',
    'commentCount', 'location', 'banned', 'hidden', 'appliedCount',
    'createdAt', 'updatedAt', 'deadline', 'startDate', 'applicationDeadline',
    'eventDate', 'endDate', 'maxParticipants', 'currentParticipants',
    'costType', 'costAmount', 'costDescription', 'milestones'
  ];

  let query: Query = db.collection('tasks')
.where('type', '==', type)
.where('status', '==', 'open');

  // FIX: Map "Mua hộ" -> "shopping" trước khi query
  const categorySlug = category? CATEGORY_MAP[category] || category : undefined;
  if (categorySlug) {
    query = query.where('category', '==', categorySlug);
    console.log('>>> Filtering category:', category, '->', categorySlug);
  }

  // FIX: Filter price - chỉ cho task
  const hasPriceFilter = minPrice!== undefined || maxPrice!== undefined;
  if (type === 'task') {
    if (minPrice!== undefined) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice!== undefined) {
      query = query.where('price', '<=', maxPrice);
    }
  }

  // FIX: Logic orderBy - Firestore yêu cầu orderBy price trước nếu có range filter
  if (hasPriceFilter) {
    if (sortBy === 'price_desc') {
      query = query.orderBy('price', 'desc');
    } else {
      query = query.orderBy('price', 'asc');
    }
  } else {
    if (sortBy === 'hot') {
      query = query.orderBy('hotScore', 'desc');
    } else if (sortBy === 'views') {
      query = query.orderBy('viewCount', 'desc');
    } else if (sortBy === 'likes') {
      query = query.orderBy('likeCount', 'desc');
    } else if (sortBy === 'price_asc') {
      query = query.orderBy('price', 'asc');
    } else if (sortBy === 'price_desc') {
      query = query.orderBy('price', 'desc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }
  }

  // Pagination
  if (cursor) {
    const cursorDoc = await db.collection('tasks').doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  query = query.limit(limitCount);

  let snap;
  try {
    snap = await query.select(...selectedFields).get();
  } catch (error: any) {
    console.error('Firestore query error:', error?.code, error?.message);
    if (error?.code === 9 || error?.code === 'FAILED_PRECONDITION') {
      console.warn('Index missing. Create index for:', {
        type, sortBy, category: categorySlug, minPrice, maxPrice
      });
      throw error;
    }
    throw error;
  }

  console.log('>>> Firestore docs:', snap.size, 'sortBy:', sortBy, 'category:', categorySlug);

  let tasks = snap.docs.map(doc => {
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
      userName: d.userName || d.displayName || d.name || "",
      userAvatar: d.userAvatar || d.photoURL || d.avatar || "",
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
      hotScore: d.hotScore?? 0,
      priceRange: d.priceRange,
    ...(d.location!== undefined && { location: d.location }),
      savedBy: [],
      applicants: [],
      banned: d.banned === true,
      hidden: d.hidden === true,
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
  }).filter((task) =>
    task.visibility !== "private" &&
    task.banned !== true &&
    task.hidden !== true &&
    isActiveFeedItem(task)
  );

  // FIX: Sort lại ở client nếu có filter giá + sortBy không phải price
  if (hasPriceFilter && sortBy === 'new') {
    tasks = tasks.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } else if (hasPriceFilter && sortBy === 'views') {
    tasks = tasks.sort((a, b) => b.viewCount - a.viewCount);
  } else if (hasPriceFilter && sortBy === 'hot') {
    tasks = tasks.sort((a, b) => ((b as any).hotScore || 0) - ((a as any).hotScore || 0));
  }

  tasks = await enrichTasksWithUserDataAdmin(db, tasks);

  const lastDoc = snap.docs[snap.docs.length - 1];
  const nextCursor = lastDoc? lastDoc.id : null;

  return { tasks, nextCursor };
}

/* ================= TYPE ================= */
export type SendNotificationPayload = {
  token: string | string[];
  title: string;
  body: string;
  imageUrl?: string;
  iconUrl?: string;
  /** Gửi data-only để SW tự hiện — tránh trùng thông báo + "from Huha" trên iOS */
  dataOnly?: boolean;
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
  const {
    token,
    title,
    body,
    imageUrl,
    iconUrl,
    dataOnly = false,
    data,
    link,
    priority = "high",
    ttl = 86400,
    dryRun = false,
  } = payload;
  const msg = getFirebaseAdmin().messaging;

  const icon = iconUrl || "/icon-192.PNG";
  const mergedData = stringifyData({
    title,
    body,
    icon,
    ...data,
  });

  const baseMessage: Omit<Message, "token" | "topic" | "condition"> = dataOnly
    ? {
        data: mergedData,
        webpush: {
          fcmOptions: { link: link || "/" },
          headers: { TTL: ttl.toString() },
        },
      }
    : {
        notification: { title, body, ...(imageUrl && { imageUrl }) },
        data: mergedData,
        webpush: {
          fcmOptions: { link: link || "/" },
          notification: {
            icon,
            badge: icon,
            requireInteraction: priority === "high",
          },
          headers: { TTL: ttl.toString() },
        },
        android: {
          priority: priority === "high" ? "high" : "normal",
          ttl: ttl * 1000,
          notification: {
            icon: "ic_notification",
            color: "#3B82F6",
            ...(priority === "high" && { sound: "default" }),
          },
        },
        apns: {
          headers: { "apns-priority": priority === "high" ? "10" : "5" },
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
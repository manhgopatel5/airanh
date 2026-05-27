import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { nanoid } from 'nanoid';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId ||!clientEmail ||!privateKey) {
  throw new Error("Missing Firebase Admin credentials: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();
const adminAuth = getAuth();

const generateSearchKeywords = (name: string, userId: string, username?: string): string[] => {
  const keywords = new Set<string>();
  const nameLower = name.toLowerCase().trim();
  if (nameLower) {
    keywords.add(nameLower);
    keywords.add(nameLower.replace(/\s+/g, ""));
    const no = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    keywords.add(no);
    keywords.add(no.replace(/\s+/g, ""));
    nameLower.split(" ").forEach((w) => {
      if (w.length >= 2) keywords.add(w);
    });
  }
  keywords.add(userId.toLowerCase());
  if (username) keywords.add(username.toLowerCase());
  return Array.from(keywords).filter((k) => k.length >= 2);
};

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const { uid, email, name, picture, email_verified } = decodedToken;

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) return NextResponse.json({ success: true });

    await db.runTransaction(async (tx) => {
      let userId = `AIR${nanoid(6).toUpperCase()}`;

      const baseName = name || email?.split('@')[0] || 'User';
      let baseUsername = baseName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

      let username = baseUsername || 'user';
      let counter = 1;
      while ((await tx.get(db.collection('usernames').doc(username))).exists) {
        username = `${baseUsername}${counter++}`;
      }

      // CHUẨN: displayName bắt buộc, không null
      const displayName = name?.trim() || email?.split('@')[0] || 'User';
      const photoURL = picture || null;

      const newUser = {
        uid,
        displayName, // Đổi từ name -> displayName cho khớp Auth
        nameLower: displayName.toLowerCase(),
        username,
        userId,
        email: email || null,
        emailVerified: email_verified || false,
        photoURL, // Đổi từ avatar -> photoURL cho khớp Auth
        bio: "",
        isOnline: true,
        lastSeen: FieldValue.serverTimestamp(),
        fcmTokens: [],
        verified: false, // Thêm field này cho createTask
        status: "active" as const,
        searchKeywords: generateSearchKeywords(displayName, userId, username),
        hidden: false,
        deletedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      tx.set(userRef, newUser);
      tx.set(db.collection('usernames').doc(username), { uid });
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Create user error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
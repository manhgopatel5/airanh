import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { nanoid } from 'nanoid';

// FIX: Validate env để tránh string | undefined
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
    const { uid, email, name, picture } = decodedToken;

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) return NextResponse.json({ success: true });

    await db.runTransaction(async (tx) => {
      let userId = `AIR${nanoid(6).toUpperCase()}`;
      let baseUsername = (name || email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
      let username = baseUsername || 'user';
      let counter = 1;
      while ((await tx.get(db.collection('usernames').doc(username))).exists) {
        username = `${baseUsername}${counter++}`;
      }

      const userName = name || email?.split('@')[0] || 'User';
      const newUser = {
        uid,
        name: userName,
        nameLower: userName.toLowerCase(),
        username,
        userId,
        email: email || "", // FIX: không dùng undefined
        emailVerified: decodedToken.email_verified || false,
        avatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
        bio: "",
        isOnline: true,
        lastSeen: Timestamp.now(), // FIX: Dùng Timestamp thay Date
        fcmTokens: [],
        status: "active" as const,
        searchKeywords: generateSearchKeywords(userName, userId, username),
        hidden: false,
        deletedAt: null, // FIX: explicit null thay vì undefined
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
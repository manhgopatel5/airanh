import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

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
    // 1. Verify token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const auth = adminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, email, name, picture, email_verified } = decodedToken;

    // 2. Check user đã tồn tại chưa
    const db = adminDb();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      // FIX: Nếu user cũ chưa có huhaScore thì update thêm
      const data = userSnap.data();
      if (data?.huhaScore === undefined) {
        await userRef.update({ huhaScore: 0 });
      }
      return NextResponse.json({ success: true, existed: true });
    }

    // 3. Tạo user mới trong transaction
    await db.runTransaction(async (tx) => {
      // Double check trong transaction để tránh race condition
      const checkSnap = await tx.get(userRef);
      if (checkSnap.exists) return;

      const userId = `AIR${nanoid(6).toUpperCase()}`;

      // Generate username unique
      const baseName = name || email?.split('@')[0] || 'user';
      let baseUsername = baseName
     .toLowerCase()
     .normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .replace(/\s+/g, "")
     .replace(/[^a-z0-9]/g, "")
     .slice(0, 20);

      let username = baseUsername || 'user';
      let counter = 1;

      // Check username trùng trong transaction
      while ((await tx.get(db.collection('usernames').doc(username))).exists) {
        username = `${baseUsername}${counter++}`;
        if (counter > 100) throw new Error('Cannot generate unique username');
      }

      const displayName = name?.trim() || email?.split('@')[0] || 'User';
      const photoURL = picture || null;

      const newUser = {
        uid,
        displayName,
        nameLower: displayName.toLowerCase(),
        username,
        userId,
        email: email || null,
        emailVerified: email_verified || false,
        photoURL,
        bio: "",
        isOnline: true,
        lastSeen: FieldValue.serverTimestamp(),
        fcmTokens: [],
        verified: false,
        status: "active" as const,
        searchKeywords: generateSearchKeywords(displayName, userId, username),
        hidden: false,
        deletedAt: null,
        huhaScore: 0, // ĐÃ THÊM DÒNG NÀY
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        onboardingCompleted: false,
      };

      tx.set(userRef, newUser);
      tx.set(db.collection('usernames').doc(username), { uid });
    });

    return NextResponse.json({ success: true, existed: false });

  } catch (e: any) {
    console.error("Create user error:", e);

    if (e.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    if (e.code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json(
      { error: e.message || "Internal error" },
      { status: 500 }
    );
  }
}
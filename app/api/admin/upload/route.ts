import { NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Init Firebase Admin nếu chưa có
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // ví dụ: airanh-xxx.appspot.com
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getStorage().bucket();
    const fileName = `events/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });

    await fileRef.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err.message);
    return NextResponse.json({ error: 'Upload failed', detail: err.message }, { status: 500 });
  }
}
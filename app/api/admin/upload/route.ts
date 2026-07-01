import { NextResponse } from 'next/server'
import { adminStorage } from '@/lib/firebase-admin'

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = adminStorage().bucket('airanh-ba64c.firebasestorage.app');
    
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Upload error:', err);
    return NextResponse.json({ 
      error: 'Upload failed', 
      detail: message,
    }, { status: 500 });
  }
}

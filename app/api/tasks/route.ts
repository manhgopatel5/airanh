import { NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const docRef = await adminDb().collection('tasks').add({
    ...body,
      userId: decoded.uid,
      userName: decoded.name || 'User',
      userAvatar: decoded.picture || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'open',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      likes: [],
      savedBy: [],
      banned: false,
      hidden: false,
    })

    // Xóa cache CDN sau khi tạo task để feed update ngay
    revalidatePath('/api/jobs?type=task')
    revalidatePath('/api/jobs?type=plan')

    return NextResponse.json({
      success: true,
      id: docRef.id
    })
  } catch (error) {
    console.error('API /tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
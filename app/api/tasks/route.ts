import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, getJobsFromFirebaseAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// Map giá thành bucket để filter nhanh
const getPriceRange = (price: number): number => {
  if (price === 0) return 0; // Miễn phí
  if (price < 50000) return 1; // < 50K
  if (price < 200000) return 2; // 50K - 200K
  if (price < 500000) return 3; // 200K - 500K
  return 4; // > 500K
};

// GET - Dùng cho SWR khi search/filter/loadMore
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get('type') as 'task' | 'plan') || 'task';
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = (searchParams.get('sortBy') as any) || 'new';
  
  // FIX: Check null trước khi parseInt
  const cursorParam = searchParams.get('cursor');
  const cursor = cursorParam? parseInt(cursorParam) : undefined;
  
  const categories = searchParams.get('categories')?.split(',').filter(Boolean);
  const priceRange = searchParams.get('priceRange');
  const query = searchParams.get('query');

  try {
    const data = await getJobsFromFirebaseAdmin({
      type,
      limitCount: limit,
      sortBy,
      categories,
      priceRange: priceRange && priceRange!== 'all'? parseInt(priceRange) : undefined,
      cursor,
    });

    // Filter query text bằng JS nếu có
    let tasks = data.tasks;
    if (query) {
      const q = query.toLowerCase();
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ tasks, nextCursor: data.nextCursor });
  } catch (error) {
    console.error('API /api/tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}

// POST - Tạo task/plan
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Validate bắt buộc
    if (!body.title || body.title.trim().length < 5) {
      return NextResponse.json({ error: 'Tiêu đề tối thiểu 5 ký tự' }, { status: 400 });
    }
    if (!body.description || body.description.trim().length < 20) {
      return NextResponse.json({ error: 'Mô tả tối thiểu 20 ký tự' }, { status: 400 });
    }
    if (!body.type ||!['task', 'plan'].includes(body.type)) {
      return NextResponse.json({ error: 'Thiếu type: task hoặc plan' }, { status: 400 });
    }
    if (!body.category) {
      return NextResponse.json({ error: 'Thiếu danh mục' }, { status: 400 });
    }

    const isTask = body.type === 'task';
    const price = Number(body.price) || 0;

    const taskData = {
  ...body,
      // Ghi đè field hệ thống
      userId: decoded.uid,
      userName: decoded.name || 'User',
      userAvatar: decoded.picture || '',
      userVerified: decoded.email_verified || false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      
      // Trạng thái
      status: 'open',
      banned: false,
      hidden: false,
      visibility: 'public',
      
      // Metric cho search/sort
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      likes: [],
      savedBy: [],
      hotScore: 0,
      
      // Chuẩn hóa dữ liệu
      title: body.title.trim(),
      description: body.description.trim(),
      price: price,
      priceRange: getPriceRange(price),
      tags: Array.isArray(body.tags)? body.tags : [],
      images: Array.isArray(body.images)? body.images : [],
      
      // Task riêng
  ...(isTask && {
        totalSlots: Number(body.totalSlots) || 1,
        joined: 0,
        budgetType: body.budgetType || 'fixed',
        isRemote: body.isRemote || false,
        deadline: body.deadline? new Date(body.deadline) : null,
        startDate: body.startDate? new Date(body.startDate) : null,
        urgency: body.urgency || 'flexible',
        needApproval: body.needApproval || false,
      }),
      
      // Plan riêng
  ...(!isTask && {
        eventDate: body.eventDate? new Date(body.eventDate) : null,
        endDate: body.endDate? new Date(body.endDate) : null,
        maxParticipants: Number(body.maxParticipants) || 4,
        currentParticipants: 0,
        costType: body.costType || 'share',
        costAmount: Number(body.costAmount) || 0,
        costDescription: body.costDescription || '',
        allowInvite: body.allowInvite!== false,
        requireApproval: body.requireApproval || false,
        autoAccept:!body.requireApproval,
      }),

      // Geo data cho tab "Gần bạn" sau này
  ...(body.location?.lat && body.location?.lng && {
        location: {
          lat: body.location.lat,
          lng: body.location.lng,
        },
      }),
    };

    const docRef = await adminDb().collection('tasks').add(taskData);

    // Xóa cache ISR
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      id: docRef.id,
      slug: body.slug || docRef.id
    });
  } catch (error) {
    console.error('API /api/tasks POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
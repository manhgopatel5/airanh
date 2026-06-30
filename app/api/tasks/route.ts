import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, getJobsFromFirebaseAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { getFeedItemDueMillis, isActiveFeedItem } from '@/types/task';

const getPriceRange = (price: number): number => {
  if (price === 0) return 0;
  if (price < 50000) return 1;
  if (price < 200000) return 2;
  if (price < 500000) return 3;
  return 4;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get('type') as 'task' | 'plan') || 'task';
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = (searchParams.get('sortBy') as any) || 'new';

  const cursor = searchParams.get('cursor') || undefined;

  // CHANGED: chỉ lấy 1 category đầu tiên thay vì array
const category = searchParams.get('category') || undefined;

  const deadlineRange = searchParams.get('deadlineRange') || 'all';
  const priceRangeParam = searchParams.get('priceRange');
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  if (priceRangeParam && priceRangeParam!== 'all') {
    switch (priceRangeParam) {
      case 'free':
        minPrice = 0;
        maxPrice = 0;
        break;
      case 'lt50':
        minPrice = 0;
        maxPrice = 49999;
        break;
      case '50-200':
        minPrice = 50000;
        maxPrice = 200000;
        break;
      case '200-500':
        minPrice = 200000;
        maxPrice = 500000;
        break;
      case 'gt500':
        minPrice = 500001;
        maxPrice = undefined;
        break;
      default:
        const parsed = parseInt(priceRangeParam);
        if (!isNaN(parsed)) {
          minPrice = parsed;
          maxPrice = parsed;
        }
    }
  }

  const query = searchParams.get('query') || undefined;

  console.log('>>> API PARAMS:', { type, sortBy, priceRangeParam, minPrice, maxPrice, category, query, cursor, deadlineRange });

  try {
    const data = await getJobsFromFirebaseAdmin({
      type,
      limitCount: limit,
      sortBy,
     // CHANGED: categories -> category
    ...(category && { category }),
    ...(minPrice!== undefined && { minPrice }),
    ...(maxPrice!== undefined && { maxPrice }),
    ...(cursor && { cursor }),
    });

    let tasks = data.tasks.filter(isActiveFeedItem);

    if (query) {
      const q = query.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

 // Lọc theo thời hạn còn lại
if (deadlineRange!== 'all') {
  const now = Date.now();
  let deadlineTimestamp = Infinity;

  switch(deadlineRange) {
    case "1h":
      deadlineTimestamp = now + 60 * 60 * 1000;
      break;
    case "today":
      deadlineTimestamp = new Date().setHours(23, 59, 999);
      break;
    case "3days":
      deadlineTimestamp = now + 3 * 24 * 60 * 60 * 1000;
      break;
    case "week":
      deadlineTimestamp = now + 7 * 24 * 60 * 60 * 1000;
      break;
    case "month":
      deadlineTimestamp = now + 30 * 24 * 60 * 60 * 1000;
      break;
  }

  tasks = tasks.filter((task) => {
    const dueMs = getFeedItemDueMillis(task);
    if (dueMs === null) return false;

    return dueMs >= now && dueMs <= deadlineTimestamp;
  });
}

    return NextResponse.json({ tasks, nextCursor: data.nextCursor });
  } catch (error) {
    console.error('API /api/tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

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
      userId: decoded.uid,
      userName: decoded.name || 'User',
      userAvatar: decoded.picture || '',
      userVerified: decoded.email_verified || false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: 'open',
      banned: false,
      hidden: false,
      visibility: 'public',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      likes: [],
      savedBy: [],
      hotScore: 0,
      title: body.title.trim(),
      description: body.description.trim(),
      price: price,
      priceRange: getPriceRange(price),
      tags: Array.isArray(body.tags)? body.tags : [],
      images: Array.isArray(body.images)? body.images : [],
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
    ...(body.location?.lat && body.location?.lng && {
        location: {
          lat: body.location.lat,
          lng: body.location.lng,
        },
      }),
    };

    const docRef = await adminDb().collection('tasks').add(taskData);
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
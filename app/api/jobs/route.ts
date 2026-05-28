// app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'
import type { FeedTask } from '@/types/task'

export const revalidate = 60 // ISR: Cache ở CDN 60s

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') as 'task' | 'plan') || 'task'
  const limit = Number(searchParams.get('limit')) || 10

  try {
    // 1. Lấy từ Firebase Admin với .select() đã tối ưu
    const allJobs = await getJobsFromFirebaseAdmin(limit)
    
    // 2. Lọc theo type ở server để giảm payload
    const jobs: FeedTask[] = allJobs.filter(j => j.type === type)

    return NextResponse.json(jobs, {
      status: 200,
      headers: {
        // Cache 60s ở CDN, 300s stale-while-revalidate
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
      }
    })
  } catch (error) {
    console.error('API /jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
// app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'

export const revalidate = 60 // Cache ở CDN 60s

export async function GET() {
  const jobs = await getJobsFromFirebaseAdmin(10)
  return NextResponse.json(jobs)
}
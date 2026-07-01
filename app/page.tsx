import { Suspense } from 'react'
import { getActiveEvents } from '@/lib/eventsServer'
import AppContainer from './AppContainer'
import type { FeedTask } from '@/types/task'
import type { EventItem } from '@/data/events'
import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'

// 1. ISR: Cache HTML + data 60s cho toàn bộ user
// 1000 user vào trong 60s chỉ tốn 20 Firestore reads
export const revalidate = 60

// 2. Force dynamic để đọc searchParams, nhưng vẫn có cache nhờ revalidate
export const dynamic = 'force-dynamic'

// 3. Prefetch DNS + preconnect để FCP nhanh hơn
export async function generateMetadata() {
  return {
    other: {
      'dns-prefetch': 'https://firestore.googleapis.com',
      'preconnect': 'https://firestore.googleapis.com',
    }
  }
}

export default async function HomePage() {
  let initialJobs: FeedTask[] = []
  let initialPlans: FeedTask[] = []
  let initialEvents: EventItem[] = []

  try {
    const [jobsData, plansData, events] = await Promise.all([
      getJobsFromFirebaseAdmin({ type: 'task' }),
      getJobsFromFirebaseAdmin({ type: 'plan' }),
      getActiveEvents().catch((err) => {
        console.error('Failed to prefetch events:', err)
        return [] as EventItem[]
      }),
    ])
    initialJobs = jobsData.tasks
    initialPlans = plansData.tasks
    initialEvents = events
  } catch (error) {
    console.error('Failed to prefetch feeds:', error)
    initialJobs = []
    initialPlans = []
    initialEvents = []
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-white dark:bg-zinc-950" />}>
      <AppContainer initialJobs={initialJobs} initialPlans={initialPlans} initialEvents={initialEvents} />
    </Suspense>
  )
}
import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'
import AppContainer from './AppContainer'
import type { FeedTask } from '@/types/task'

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

export default async function HomePage({
  searchParams,
}: {
  // Next.js 15: searchParams là Promise
  searchParams: Promise<{ tab?: string }>
}) {
  // 4. Await searchParams theo Next.js 15
  const params = await searchParams
  const currentTab = params.tab || 'home'
  let initialJobs: FeedTask[] = []
  let initialPlans: FeedTask[] = []

  // 5. Fetch SSR cho tab home và plans
  if (currentTab === 'home' || !params.tab) {
    try {
      initialJobs = await getJobsFromFirebaseAdmin('task', 10)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      initialJobs = []
    }
  }

  if (currentTab === 'plans') {
    try {
      initialPlans = await getJobsFromFirebaseAdmin('plan', 10)
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      initialPlans = []
    }
  }

  // 6. Truyền data xuống Client Component
  return <AppContainer initialJobs={initialJobs} initialPlans={initialPlans} />
}
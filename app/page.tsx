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

export default async function HomePage() {
  let initialJobs: FeedTask[] = []
  let initialPlans: FeedTask[] = []

  // Prefetch cả Task và Plan để chuyển mode tức thì trên Home.
  // API public đã cache CDN, nên 2 query này được amortize theo revalidate thay vì mỗi lần bấm tab.
  try {
    const [jobs, plans] = await Promise.all([
      getJobsFromFirebaseAdmin('task', 12),
      getJobsFromFirebaseAdmin('plan', 12),
    ])
    initialJobs = jobs
    initialPlans = plans
  } catch (error) {
    console.error('Failed to prefetch feeds:', error)
    initialJobs = []
    initialPlans = []
  }

  // 6. Truyền data xuống Client Component
  return <AppContainer initialJobs={initialJobs} initialPlans={initialPlans} />
}
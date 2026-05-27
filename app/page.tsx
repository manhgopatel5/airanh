import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'
import AppContainer from './AppContainer'
import type { FeedTask } from '@/types/task' // CHUẨN: Import type gốc, không tự tạo

// 1. ISR: Cache HTML + data 60s cho toàn bộ user
// 1000 user vào trong 60s chỉ tốn 10 Firestore reads
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

// XÓA HOÀN TOÀN: Không được tự định nghĩa FeedTask ở đây
// type FeedTask = Task & { banned?: boolean; hidden?: boolean; };

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

  // 5. Chỉ fetch khi vào tab home. Tab khác để client tự lo
  if (currentTab === 'home') {
    try {
      // Chạy ở server Node.js, không tốn quota browser
      initialJobs = await getJobsFromFirebaseAdmin(10)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      // Nếu lỗi thì vẫn render, để client fetch fallback
      initialJobs = []
    }
  }

  // 6. Truyền data xuống Client Component
  return <AppContainer initialJobs={initialJobs} />
}
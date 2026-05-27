import { getJobsFromFirebaseAdmin } from '@/lib/firebase-admin'
import AppContainer from './AppContainer'

// 1. ISR: Cache HTML + data 60s cho toàn bộ user
// 1000 user vào trong 60s chỉ tốn 10 Firestore reads
export const revalidate = 60

// 2. Force dynamic để đọc searchParams, nhưng vẫn có cache nhờ revalidate
export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  // 3. Chỉ fetch khi vào tab home. Tab khác để client tự lo
  const currentTab = searchParams.tab || 'home'
  let initialJobs = []

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

  // 4. Truyền data xuống Client Component
  return <AppContainer initialJobs={initialJobs} />
}
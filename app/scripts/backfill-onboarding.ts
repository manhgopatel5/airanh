import { adminDb } from '@/lib/firebase-admin'

async function backfill() {
  const db = adminDb()
  const snap = await db.collection('users').get()
  
  const batch = db.batch()
  let count = 0
  
  snap.docs.forEach(doc => {
    if (doc.data().onboardingCompleted === undefined) {
      // User cũ có displayName rồi thì coi như đã onboard
      const hasProfile = !!doc.data().displayName
      batch.update(doc.ref, { 
        onboardingCompleted: hasProfile // true nếu có tên, false nếu chưa
      })
      count++
    }
  })
  
  await batch.commit()
  console.log(`Updated ${count} users`)
}

backfill()
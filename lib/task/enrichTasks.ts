import type { Firestore } from 'firebase-admin/firestore'
import type { FeedTask } from '@/types/task'
import { resolveTaskAuthorFields } from './author'
import { extractAuthorVip } from '@/lib/vip'

type UserProfile = { name: string; avatar: string | null; vip?: { tier?: string; expiresAt?: unknown } }

export async function enrichTasksWithUserDataAdmin(
  adminDb: Firestore,
  tasks: FeedTask[]
): Promise<FeedTask[]> {
  const userIds = [...new Set(tasks.map((t) => t.userId).filter(Boolean))]
  if (!userIds.length) return tasks

  const userMap = new Map<string, UserProfile>()

  for (let i = 0; i < userIds.length; i += 10) {
    const chunk = userIds.slice(i, i + 10)
    const refs = chunk.map((id) => adminDb.collection('users').doc(id))
    const snaps = await adminDb.getAll(...refs)
    snaps.forEach((snap) => {
      if (!snap.exists) return
      const u = snap.data()!
      userMap.set(snap.id, {
        name: u.displayName || u.name || u.username || '',
        avatar: u.photoURL || u.avatar || null,
        ...(u.vip ? { vip: u.vip as NonNullable<UserProfile['vip']> } : {}),
      })
    })
  }

  return tasks.map((task) => {
    const fromUser = task.userId ? userMap.get(task.userId) : undefined
    const { userName, userAvatar } = resolveTaskAuthorFields(
      task as FeedTask & Record<string, unknown>,
      fromUser
    )
    const vipFields = extractAuthorVip(fromUser as Record<string, unknown> | undefined)
    return {
      ...task,
      userName,
      userAvatar,
      ...vipFields,
    }
  })
}

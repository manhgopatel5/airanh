import type { FeedTask } from '@/types/task'

type AuthorSource = FeedTask & {
  displayName?: string
  name?: string
  photoURL?: string
  avatar?: string
  ownerId?: string
}

export function getTaskAuthorId(task: AuthorSource): string {
  return task.userId || task.ownerId || ''
}

export function getTaskAuthorName(
  task: AuthorSource,
  owner?: { displayName?: string; name?: string; username?: string } | null
): string {
  return (
    owner?.displayName ||
    owner?.name ||
    owner?.username ||
    task.userName ||
    task.displayName ||
    task.name ||
    'AIR user'
  )
}

export function getTaskAuthorAvatar(
  task: AuthorSource,
  owner?: { photoURL?: string | null; avatar?: string } | null
): string | null {
  return (
    owner?.photoURL ||
    owner?.avatar ||
    task.userAvatar ||
    task.photoURL ||
    task.avatar ||
    null
  )
}

export function resolveTaskAuthorFields(
  task: FeedTask & Record<string, unknown>,
  fromUser?: { name: string; avatar: string | null } | null
) {
  const userName =
    fromUser?.name ||
    task.userName ||
    (task.displayName as string) ||
    (task.name as string) ||
    ''
  const userAvatar =
    fromUser?.avatar ||
    task.userAvatar ||
    (task.photoURL as string) ||
    (task.avatar as string) ||
    null

  return { userName, userAvatar }
}

export function mapFirestoreUserToOwner(data: Record<string, unknown>, uid: string) {
  return {
    uid,
    name: (data.displayName as string) || (data.name as string) || (data.username as string) || 'Người dùng',
    avatar: (data.photoURL as string) || (data.avatar as string) || '',
    online: data.online as boolean | undefined,
    rating: (data.stats as { rating?: number } | undefined)?.rating,
    reviewCount: (data.stats as { totalReviews?: number } | undefined)?.totalReviews,
    verified: !!(data.emailVerified || data.isVerifiedId || data.verified),
    isNewUser: false,
    ...(data.vip ? { vip: data.vip as { tier?: string; expiresAt?: unknown } } : {}),
  }
}

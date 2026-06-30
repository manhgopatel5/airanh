import type { Timestamp } from 'firebase/firestore'

export type AppNotification = {
  id: string
  toUserId: string
  fromUserId: string
  fromUserName: string
  fromUserAvatar: string
  type: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'task_apply' | 'system' | 'group_invite' | 'mention' | 'stranger_match' | 'stranger_message'
  content: string
  isRead: boolean
  createdAt: Timestamp
  link?: string | undefined
  actionData?: Record<string, unknown> | undefined
}

export function toTimestampDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds: number }).seconds)
    if (!Number.isNaN(seconds)) return new Date(seconds * 1000)
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export function mapSubcollectionNotification(
  id: string,
  data: Record<string, unknown>,
  currentUid: string
): AppNotification {
  const type = (data.type as AppNotification['type']) || 'system'
  const fromUserId = (data.fromUid as string) || (data.fromUserId as string) || ''
  const fromUserName = (data.fromName as string) || (data.fromUserName as string) || 'Người dùng'
  const fromUserAvatar = (data.fromAvatar as string) || (data.fromUserAvatar as string) || ''
  const message = (data.message as string) || (data.content as string) || ''
  const title = (data.title as string) || ''
  const content = title && message && !message.startsWith(title) ? `${title}: ${message}` : message || title
  const actionData = (data.actionData as Record<string, unknown>) || undefined

  let link = data.link as string | undefined
  if (!link) {
    if (type === 'friend_request' && fromUserId) link = '/friends'
    if (type === 'friend_accepted' && actionData?.chatId) link = `/chat/${actionData.chatId}`
    if ((type === 'stranger_match' || type === 'stranger_message') && actionData?.chatId) {
      link = `/stranger/${actionData.chatId}`
    }
  }

  return {
    id,
    toUserId: currentUid,
    fromUserId,
    fromUserName,
    fromUserAvatar,
    type,
    content,
    isRead: !!(data.read ?? data.isRead),
    createdAt: data.createdAt as Timestamp,
    link,
    actionData,
  }
}

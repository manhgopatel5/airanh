import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getFirebaseDB } from '@/lib/firebase'
import type { FeedTask } from '@/types/task'

export async function sendTaskShareToChat(params: {
  task: FeedTask
  senderId: string
  senderName: string
  recipientId: string
  progress?: number
}) {
  const { task, senderId, senderName, recipientId, progress } = params
  const db = getFirebaseDB()
  const chatId = [senderId, recipientId].sort().join('_')

  const progressLabel = progress != null ? `Tiến độ ${progress}%` : 'Đã chia sẻ'
  await setDoc(
    doc(db, 'chats', chatId),
    {
      members: [senderId, recipientId],
      lastMessage: `${progressLabel}: ${task.title}`,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    type: 'task_share',
    taskId: task.id,
    taskTitle: task.title,
    taskType: task.type,
    ...(progress != null ? { progress } : {}),
    senderId,
    senderName,
    createdAt: serverTimestamp(),
  })

  return chatId
}

export async function submitTaskUserReport(params: {
  reporterId: string
  reporterName: string
  targetId: string
  targetName: string
  targetShortId?: string
  taskId: string
  taskTitle: string
  reason: string
  note?: string
}) {
  const db = getFirebaseDB()
  await addDoc(collection(db, 'reports'), {
    type: 'user',
    targetId: params.targetId,
    targetName: params.targetName,
    ...(params.targetShortId ? { targetShortId: params.targetShortId } : {}),
    from: params.reporterId,
    fromName: params.reporterName,
    reason: params.reason,
    note: params.note?.trim() || null,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

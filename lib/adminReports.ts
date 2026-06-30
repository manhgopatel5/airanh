import type { Timestamp } from 'firebase-admin/firestore'

export type ReportStatus = 'pending' | 'resolved' | 'rejected'

export type AdminReport = {
  id: string
  type: string
  targetId: string
  targetName: string
  targetShortId: string
  targetAvatar?: string
  from: string
  fromName: string
  reason: string
  note?: string | null
  status: ReportStatus
  createdAt: string | null
  reviewedAt?: string | null
  reviewedBy?: string
}

export const REPORT_REASON_LABEL: Record<string, string> = {
  spam: 'Spam / Quảng cáo',
  fake: 'Tài khoản giả mạo',
  quay_roi: 'Quấy rối / Bắt nạt',
  adult: 'Nội dung 18+',
  violence: 'Bạo lực',
  other: 'Lý do khác',
}

export const REPORT_TYPE_LABEL: Record<string, string> = {
  user: 'Người dùng',
  task: 'Task',
  comment: 'Bình luận',
}

function toIso(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString()
  }
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return null
}

export function serializeReport(id: string, data: Record<string, unknown>): AdminReport {
  const targetAvatar = data.targetAvatar ? String(data.targetAvatar) : undefined
  const reviewedBy = data.reviewedBy ? String(data.reviewedBy) : undefined

  return {
    id,
    type: String(data.type || 'unknown'),
    targetId: String(data.targetId || ''),
    targetName: String(data.targetName || 'Không rõ'),
    targetShortId: String(data.targetShortId || ''),
    ...(targetAvatar ? { targetAvatar } : {}),
    from: String(data.from || ''),
    fromName: String(data.fromName || 'Ẩn danh'),
    reason: String(data.reason || 'other'),
    note: data.note ? String(data.note) : null,
    status: (data.status as ReportStatus) || 'pending',
    createdAt: toIso(data.createdAt),
    reviewedAt: toIso(data.reviewedAt),
    ...(reviewedBy ? { reviewedBy } : {}),
  }
}

export function sortReportsNewestFirst(reports: AdminReport[]): AdminReport[] {
  return [...reports].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
    return bTime - aTime
  })
}

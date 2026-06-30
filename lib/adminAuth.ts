export const ADMIN_EMAILS = [
  'justastormyday@gmail.com',
  'hongann2210@gmail.com',
] as const

export const ADMIN_UIDS = [
  'xKsvMeFGeCcM4dgyMrxQmH70FBE3',
  'ceWtvtIxZQMgWCzYxZiB3p0mSNi1',
] as const

export function isAdminUser(uid?: string | null, email?: string | null): boolean {
  if (!uid && !email) return false
  if (uid && (ADMIN_UIDS as readonly string[]).includes(uid)) return true
  if (email && (ADMIN_EMAILS as readonly string[]).includes(email)) return true
  return false
}

export async function verifyAdminRequest(authHeader: string | null) {
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  const { adminAuth } = await import('@/lib/firebase-admin')
  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded || !isAdminUser(decoded.uid, decoded.email)) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, decoded }
}

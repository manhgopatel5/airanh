import { adminAuth } from '@/lib/firebase-admin'
import { isAdminUser } from '@/lib/adminAuth'

export async function verifyAdminRequest(authHeader: string | null) {
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded || !isAdminUser(decoded.uid, decoded.email)) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }

  return { ok: true as const, decoded }
}

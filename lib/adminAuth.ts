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

export function isInQuietHours(
  quietHours?: { enabled?: boolean; from?: string; to?: string }
): boolean {
  if (!quietHours?.enabled || !quietHours.from || !quietHours.to) return false

  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  const [fromH, fromM] = quietHours.from.split(':').map(Number)
  const [toH, toM] = quietHours.to.split(':').map(Number)
  const from = (fromH ?? 0) * 60 + (fromM ?? 0)
  const to = (toH ?? 0) * 60 + (toM ?? 0)

  if (from <= to) return current >= from && current < to
  return current >= from || current < to
}

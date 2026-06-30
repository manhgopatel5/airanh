export type CategoryItem = {
  id: string
  label: string
  icon: string
  color: string
}

export const CATEGORY_TASKS: CategoryItem[] = [
  { id: 'doing', label: 'Việc gấp', icon: '⚡️', color: '#0A84FF' },
  { id: 'skill', label: 'Kỹ năng', icon: '🎓', color: '#5E5CE6' },
  { id: 'shopping', label: 'Mua hộ', icon: '🛍️', color: '#FF9F0A' },
  { id: 'help', label: 'Giúp đỡ', icon: '🤝', color: '#30D158' },
  { id: 'moving', label: 'Chuyển đồ', icon: '🚚', color: '#FF375F' },
  { id: 'cleaning', label: 'Dọn dẹp', icon: '🧹', color: '#64D2FF' },
  { id: 'repair', label: 'Sửa chữa', icon: '🔧', color: '#BF5AF2' },
  { id: 'tutoring', label: 'Gia sư', icon: '📚', color: '#0A84FF' },
  { id: 'photography', label: 'Chụp ảnh', icon: '📸', color: '#FF9F0A' },
  { id: 'design', label: 'Thiết kế', icon: '🎨', color: '#BF5AF2' },
  { id: 'cooking', label: 'Nấu ăn', icon: '🍳', color: '#FF375F' },
  { id: 'petcare', label: 'Chăm thú cưng', icon: '🐕', color: '#30D158' },
  { id: 'babysit', label: 'Trông trẻ', icon: '👶', color: '#64D2FF' },
  { id: 'elderly', label: 'Chăm người già', icon: '👴', color: '#5E5CE6' },
  { id: 'event', label: 'Sự kiện', icon: '🎉', color: '#FF9F0A' },
  { id: 'marketing', label: 'Marketing', icon: '📢', color: '#0A84FF' },
  { id: 'writing', label: 'Viết lách', icon: '✍️', color: '#BF5AF2' },
  { id: 'translate', label: 'Dịch thuật', icon: '🌐', color: '#64D2FF' },
  { id: 'consulting', label: 'Tư vấn', icon: '💼', color: '#30D158' },
  { id: 'other', label: 'Khác', icon: '📋', color: '#8E8E93' },
]

export const CATEGORY_PLANS: CategoryItem[] = [
  { id: 'coffee', label: 'Cà phê', icon: '☕', color: '#8B4513' },
  { id: 'meal', label: 'Ăn uống', icon: '🍜', color: '#FF6347' },
  { id: 'sport', label: 'Thể thao', icon: '⚽', color: '#30D158' },
  { id: 'party', label: 'Tiệc tùng', icon: '🎉', color: '#FF9F0A' },
  { id: 'movie', label: 'Xem phim', icon: '🎬', color: '#BF5AF2' },
  { id: 'music', label: 'Âm nhạc', icon: '🎵', color: '#FF375F' },
  { id: 'travel', label: 'Du lịch', icon: '✈️', color: '#0A84FF' },
  { id: 'game', label: 'Game', icon: '🎮', color: '#5E5CE6' },
  { id: 'study', label: 'Học nhóm', icon: '📚', color: '#64D2FF' },
  { id: 'volunteer', label: 'Tình nguyện', icon: '❤️', color: '#FF375F' },
  { id: 'hiking', label: 'Leo núi', icon: '⛰️', color: '#30D158' },
  { id: 'camping', label: 'Cắm trại', icon: '🏕️', color: '#FF9F0A' },
  { id: 'beach', label: 'Đi biển', icon: '🏖️', color: '#0A84FF' },
  { id: 'karaoke', label: 'Karaoke', icon: '🎤', color: '#BF5AF2' },
  { id: 'boardgame', label: 'Board game', icon: '🎲', color: '#5E5CE6' },
  { id: 'picnic', label: 'Dã ngoại', icon: '🧺', color: '#30D158' },
  { id: 'workshop', label: 'Workshop', icon: '🔨', color: '#FF9F0A' },
  { id: 'networking', label: 'Kết nối', icon: '🤝', color: '#0A84FF' },
  { id: 'clubbing', label: 'Club', icon: '🪩', color: '#BF5AF2' },
  { id: 'other', label: 'Khác', icon: '📋', color: '#8E8E93' },
]

/** English / slang aliases → category ids or Vietnamese tokens for search */
export const SEARCH_ALIASES: Record<string, string[]> = {
  art: ['design', 'thiết kế', 'vẽ', 'design'],
  design: ['thiết kế', 'design'],
  word: ['writing', 'viết', 'viết lách', 'writing'],
  writing: ['viết lách', 'writing', 'viết'],
  photo: ['photography', 'chụp ảnh', 'photography'],
  photoography: ['photography', 'chụp ảnh'],
  tutor: ['tutoring', 'gia sư', 'tutoring'],
  clean: ['cleaning', 'dọn dẹp', 'cleaning'],
  move: ['moving', 'chuyển đồ', 'moving'],
  shop: ['shopping', 'mua hộ', 'shopping'],
  urgent: ['doing', 'việc gấp', 'gấp'],
  coffee: ['cà phê', 'coffee'],
  food: ['meal', 'ăn uống', 'meal'],
  eat: ['meal', 'ăn uống'],
  gym: ['sport', 'thể thao', 'sport'],
  sport: ['thể thao', 'sport'],
  movie: ['xem phim', 'phim', 'movie'],
  film: ['movie', 'xem phim'],
  game: ['game', 'chơi game'],
  travel: ['du lịch', 'travel', 'phượt'],
  study: ['học nhóm', 'study'],
}

export function getCategoryLabel(categoryId: string, type: 'task' | 'plan' = 'task'): string {
  const list = type === 'plan' ? CATEGORY_PLANS : CATEGORY_TASKS
  return list.find((c) => c.id === categoryId)?.label || categoryId
}

export function getCategoryMeta(categoryId: string, type: 'task' | 'plan' = 'task') {
  const list = type === 'plan' ? CATEGORY_PLANS : CATEGORY_TASKS
  return list.find((c) => c.id === categoryId)
}

/** Expand search query tokens with Vietnamese + category aliases */
export function expandSearchTokens(rawQuery: string): string[] {
  const tokens = rawQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)

  const expanded = new Set<string>()
  for (const token of tokens) {
    expanded.add(token)
    const aliases = SEARCH_ALIASES[token]
    if (aliases) aliases.forEach((a) => expanded.add(a.toLowerCase()))
    const taskCat = CATEGORY_TASKS.find(
      (c) => c.id === token || c.label.toLowerCase().includes(token)
    )
    if (taskCat) {
      expanded.add(taskCat.id)
      expanded.add(taskCat.label.toLowerCase())
    }
    const planCat = CATEGORY_PLANS.find(
      (c) => c.id === token || c.label.toLowerCase().includes(token)
    )
    if (planCat) {
      expanded.add(planCat.id)
      expanded.add(planCat.label.toLowerCase())
    }
  }
  return Array.from(expanded)
}

export function matchesExpandedQuery(
  haystackParts: (string | undefined | null)[],
  rawQuery: string
): boolean {
  const tokens = rawQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
  if (!tokens.length) return true

  const haystack = haystackParts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return tokens.every((token) => {
    const variants = expandSearchTokens(token)
    return variants.some((v) => haystack.includes(v))
  })
}

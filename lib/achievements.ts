import {
  type GamificationUser,
  getCategoryCount,
  getTasksCreatedTotal,
} from "./gamification";

export type AchievementIconName =
  | "Users" | "Sparkles" | "Star" | "Shield" | "Briefcase" | "Flame"
  | "ShieldCheck" | "Mail" | "Camera" | "Crown" | "Clock" | "Globe"
  | "Gem" | "Heart" | "TrendingUp" | "ThumbsUp" | "BookOpen" | "MapPin"
  | "Coffee" | "Music" | "Sun" | "Gamepad2" | "Utensils" | "Dumbbell"
  | "Film" | "Plane" | "Moon" | "Gift" | "Calendar" | "ShoppingBag"
  | "Mic" | "Bike" | "Palette" | "Beer" | "Map" | "PartyPopper";

export type AchievementDef = {
  id: number;
  iconName: AchievementIconName;
  label: string;
  desc: string;
  condition: string;
  category: "profile" | "task";
  check: (u: GamificationUser) => boolean;
};

export const ALL_ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 1, iconName: "Users", label: "Bạn bè khắp nơi", desc: "Kết nối 10+ người bạn", condition: "Có ≥ 10 bạn bè", category: "profile", check: (u) => u.friendCount >= 10 },
  { id: 2, iconName: "Sparkles", label: "Tân binh", desc: "Thành viên mới", condition: "Tham gia < 30 ngày", category: "profile", check: (u) => u.joinedDays > 0 && u.joinedDays <= 30 },
  { id: 3, iconName: "Star", label: "5 sao lấp lánh", desc: "Được đánh giá 5 sao", condition: "Rating = 5.0", category: "profile", check: (u) => (u.stats.rating || 0) >= 5 && (u.stats.totalReviews || 0) >= 1 },
  { id: 4, iconName: "Shield", label: "Chính chủ 100%", desc: "Xác minh CCCD xong", condition: "Xác minh CCCD", category: "profile", check: (u) => u.isVerifiedId },
  { id: 5, iconName: "Briefcase", label: "Thợ cày", desc: "Cày 50 job như trâu", condition: "Hoàn thành ≥ 50 job", category: "profile", check: (u) => (u.stats.completed || 0) >= 50 },
  { id: 6, iconName: "Flame", label: "Streak 30 ngày", desc: "Đăng nhập 30 ngày liên tiếp", condition: "Streak ≥ 30 ngày", category: "profile", check: (u) => u.streakDays >= 30 },
  { id: 7, iconName: "ShieldCheck", label: "Profile xịn sò", desc: "Điền đủ 100% thông tin", condition: "Hồ sơ = 100%", category: "profile", check: (u) => u.profileCompletion >= 100 },
  { id: 8, iconName: "Mail", label: "Email real", desc: "Xác thực email rồi", condition: "Xác minh email", category: "profile", check: (u) => u.emailVerified },
  { id: 9, iconName: "Camera", label: "Nhiếp ảnh gia", desc: "Đăng 5+ ảnh portfolio", condition: "Portfolio ≥ 5 mục", category: "profile", check: (u) => u.portfolio.length >= 5 },
  { id: 10, iconName: "Crown", label: "Đại gia", desc: "Cày 100 job không biết mệt", condition: "Hoàn thành ≥ 100 job", category: "profile", check: (u) => (u.stats.completed || 0) >= 100 },
  { id: 11, iconName: "Clock", label: "Lão làng", desc: "Tham gia 365 ngày", condition: "Tham gia ≥ 1 năm", category: "profile", check: (u) => u.joinedDays >= 365 },
  { id: 12, iconName: "Globe", label: "Quốc tế hóa", desc: "Kết nối quốc tế", condition: "Có tương tác quốc tế", category: "profile", check: (u) => (u.stats.internationalTasks || 0) >= 1 },
  { id: 13, iconName: "Gem", label: "Kim cương", desc: "Đạt level 50", condition: "Đạt Lv.50", category: "profile", check: (u) => u.level >= 50 },
  { id: 14, iconName: "ShieldCheck", label: "Uy tín 100%", desc: "Tin được như vàng 9999", condition: "Độ uy tín = 100%", category: "profile", check: (u) => u.trustScore >= 100 },
  { id: 15, iconName: "Crown", label: "Top 1%", desc: "Lọt top 1% người dùng", condition: "Độ uy tín ≥ 95%", category: "profile", check: (u) => u.trustScore >= 95 },
  { id: 16, iconName: "Heart", label: "Bạn thân 50 người", desc: "Mở rộng vòng kết nối", condition: "Có ≥ 50 bạn bè", category: "profile", check: (u) => u.friendCount >= 50 },
  { id: 17, iconName: "TrendingUp", label: "Level 25+", desc: "Chăm cày lên level", condition: "Đạt Lv.25", category: "profile", check: (u) => u.level >= 25 },
  { id: 18, iconName: "ThumbsUp", label: "Được yêu thích", desc: "50+ đánh giá tích cực", condition: "Reviews ≥ 50", category: "profile", check: (u) => (u.stats.totalReviews || 0) >= 50 },
  { id: 19, iconName: "BookOpen", label: "Skill master", desc: "Thêm 10+ kỹ năng", condition: "Skills ≥ 10", category: "profile", check: (u) => u.skills.length >= 10 },
  { id: 20, iconName: "MapPin", label: "Dân chơi Sài Gòn", desc: "Check-in TP.HCM", condition: "Location ở Sài Gòn", category: "profile", check: (u) => /hồ chí minh|ho chi minh|sài gòn|saigon|tp\.?\s*hcm/i.test(u.location) },
  { id: 21, iconName: "Coffee", label: "Trùm cafe", desc: "Tạo 5 kèo đi cafe", condition: "Tạo 5 task cafe", category: "task", check: (u) => getCategoryCount(u, "coffee") >= 5 },
  { id: 22, iconName: "Heart", label: "Ông mai bà mối", desc: "Tạo 10 kèo hẹn hò", condition: "Tạo 10 task ăn uống/social", category: "task", check: (u) => getCategoryCount(u, "meal", "coffee", "networking") >= 10 },
  { id: 23, iconName: "Music", label: "Party king", desc: "Tổ chức 3 buổi nhậu", condition: "Tạo 3 task party", category: "task", check: (u) => getCategoryCount(u, "party", "clubbing", "karaoke") >= 3 },
  { id: 24, iconName: "Sun", label: "Dậy sớm", desc: "Tạo task buổi sáng 10 lần", condition: "Tạo 10 task buổi sáng", category: "task", check: (u) => (u.stats.morningTasks || 0) >= 10 },
  { id: 25, iconName: "Gamepad2", label: "Game thủ", desc: "Tạo 5 kèo chơi game", condition: "Tạo 5 task game", category: "task", check: (u) => getCategoryCount(u, "game", "boardgame") >= 5 },
  { id: 26, iconName: "Utensils", label: "Food reviewer", desc: "Tạo 10 kèo đi ăn", condition: "Tạo 10 task ăn uống", category: "task", check: (u) => getCategoryCount(u, "meal", "picnic") >= 10 },
  { id: 27, iconName: "Dumbbell", label: "Gymer", desc: "Rủ 5 người đi tập gym", condition: "Tạo 5 task thể thao", category: "task", check: (u) => getCategoryCount(u, "sport", "hiking") >= 5 },
  { id: 28, iconName: "Film", label: "Mọt phim", desc: "Tạo 5 kèo xem phim", condition: "Tạo 5 task xem phim", category: "task", check: (u) => getCategoryCount(u, "movie") >= 5 },
  { id: 29, iconName: "Plane", label: "Phượt thủ", desc: "Tổ chức 3 chuyến đi chơi xa", condition: "Tạo 3 task du lịch", category: "task", check: (u) => getCategoryCount(u, "travel", "beach", "camping", "hiking") >= 3 },
  { id: 30, iconName: "Moon", label: "Cú đêm", desc: "Tạo 10 task buổi tối", condition: "Tạo 10 task tối", category: "task", check: (u) => (u.stats.eveningTasks || 0) >= 10 },
  { id: 31, iconName: "Gift", label: "Người hào phóng", desc: "Tạo 5 task miễn phí", condition: "Tạo 5 task free", category: "task", check: (u) => (u.stats.freeTasksCreated || 0) >= 5 },
  { id: 32, iconName: "Users", label: "Nhóm trưởng", desc: "Tạo task cho 10+ người", condition: "Task có 10+ người join", category: "task", check: (u) => (u.stats.maxTaskJoins || 0) >= 10 },
  { id: 33, iconName: "Calendar", label: "Siêu bận rộn", desc: "Có task 7 ngày liên tiếp", condition: "Tạo task 7 ngày liên tục", category: "task", check: (u) => (u.stats.consecutiveTaskDays || 0) >= 7 },
  { id: 34, iconName: "ShoppingBag", label: "Thánh shopping", desc: "Rủ 5 người đi mua sắm", condition: "Tạo 5 task shopping", category: "task", check: (u) => getCategoryCount(u, "shopping") >= 5 },
  { id: 35, iconName: "Mic", label: "Ca sĩ phòng trà", desc: "Tổ chức 3 buổi karaoke", condition: "Tạo 3 task karaoke", category: "task", check: (u) => getCategoryCount(u, "karaoke") >= 3 },
  { id: 36, iconName: "Bike", label: "Vận động viên", desc: "Rủ 5 người đi thể thao", condition: "Tạo 5 task thể thao", category: "task", check: (u) => getCategoryCount(u, "sport", "hiking", "camping") >= 5 },
  { id: 37, iconName: "Palette", label: "Nghệ sĩ", desc: "Tổ chức workshop vẽ/nhạc", condition: "Tạo 3 task workshop", category: "task", check: (u) => getCategoryCount(u, "workshop", "music") >= 3 },
  { id: 38, iconName: "Beer", label: "Bợm nhậu", desc: "Tạo 10 kèo nhậu", condition: "Tạo 10 task nhậu", category: "task", check: (u) => getCategoryCount(u, "party", "clubbing") >= 10 },
  { id: 39, iconName: "Map", label: "Hướng dẫn viên", desc: "Dẫn 20 người đi chơi", condition: "20+ người join task", category: "task", check: (u) => (u.stats.maxTaskJoins || 0) >= 20 },
  { id: 40, iconName: "PartyPopper", label: "Vua task", desc: "Tạo 100 task đi chơi", condition: "Tạo 100 task/plan", category: "task", check: (u) => getTasksCreatedTotal(u) >= 100 },
];

export type EvaluatedAchievement = AchievementDef & { unlocked: boolean };

export function evaluateAchievements(user: GamificationUser): EvaluatedAchievement[] {
  return ALL_ACHIEVEMENT_DEFS.map((def) => ({
    ...def,
    unlocked: def.check(user),
  }));
}

export function getUnlockedAchievementIds(user: GamificationUser): number[] {
  return evaluateAchievements(user)
    .filter((a) => a.unlocked)
    .map((a) => a.id);
}

export const ACHIEVEMENT_COLORS: Record<number, { gradient: string; border: string }> = {
  1: { gradient: "from-pink-400 to-rose-400", border: "border-pink-400" },
  2: { gradient: "from-emerald-400 to-teal-400", border: "border-emerald-400" },
  3: { gradient: "from-yellow-400 to-amber-400", border: "border-yellow-400" },
  4: { gradient: "from-blue-400 to-sky-400", border: "border-blue-400" },
  5: { gradient: "from-indigo-400 to-blue-400", border: "border-indigo-400" },
  6: { gradient: "from-orange-400 to-red-400", border: "border-orange-400" },
  7: { gradient: "from-green-400 to-emerald-400", border: "border-green-400" },
  8: { gradient: "from-sky-400 to-blue-400", border: "border-sky-400" },
  9: { gradient: "from-teal-400 to-cyan-400", border: "border-teal-400" },
  10: { gradient: "from-yellow-500 to-amber-500", border: "border-yellow-500" },
};

const ACHIEVEMENT_GRADIENT_HEX: Record<number, [string, string]> = {
  1: ["#F472B6", "#FB7185"],
  2: ["#34D399", "#2DD4BF"],
  3: ["#FACC15", "#FBBF24"],
  4: ["#60A5FA", "#38BDF8"],
  5: ["#818CF8", "#6366F1"],
  6: ["#FB923C", "#F87171"],
  7: ["#4ADE80", "#34D399"],
  8: ["#38BDF8", "#3B82F6"],
  9: ["#2DD4BF", "#22D3EE"],
  10: ["#FBBF24", "#F59E0B"],
};

export function getAchievementGradientHex(id: number): [string, string] {
  const palette: [string, string][] = [
    ["#A78BFA", "#C084FC"],
    ["#22D3EE", "#3B82F6"],
    ["#A3E635", "#4ADE80"],
    ["#E879F9", "#F472B6"],
    ["#F87171", "#FB923C"],
  ];
  return ACHIEVEMENT_GRADIENT_HEX[id] || palette[(id - 1) % palette.length]!;
}

export function getAchievementColor(id: number): { gradient: string; border: string } {
  const palette = [
    "from-violet-400 to-purple-400",
    "from-cyan-400 to-blue-400",
    "from-lime-400 to-green-400",
    "from-fuchsia-400 to-pink-400",
    "from-red-400 to-orange-400",
  ];
  const borders = [
    "border-violet-400",
    "border-cyan-400",
    "border-lime-400",
    "border-fuchsia-400",
    "border-red-400",
  ];
  const idx = (id - 1) % palette.length;
  return ACHIEVEMENT_COLORS[id] || {
    gradient: palette[idx]!,
    border: borders[idx]!,
  };
}

export type InterestGroup = {
  group: string;
  base: string[];
  variants?: string[];
};

const groups: InterestGroup[] = [
  {
    group: "Âm nhạc",
    base: [
      "Nghe nhạc", "Hát", "Chơi guitar", "Chơi piano", "DJ",
      "Sáng tác nhạc", "Thu âm", "Mix nhạc", "Beat making", "Rap",
      "Cover nhạc", "Chơi violin", "Ukulele", "Trống", "Sáng tác lời"
    ],
    variants: ["cơ bản", "nâng cao", "chuyên sâu", "tại nhà", "ngoài trời"],
  },
  {
    group: "Thể thao",
    base: [
      "Bóng đá", "Bóng rổ", "Cầu lông", "Gym", "Yoga",
      "Chạy bộ", "Bơi lội", "Đạp xe", "Leo núi", "Boxing",
      "Pilates", "HIIT", "Skateboard", "Bóng chuyền", "Tennis"
    ],
    variants: ["hàng ngày", "cuối tuần", "chuyên nghiệp", "giải trí"],
  },
  {
    group: "Công nghệ",
    base: [
      "Lập trình", "AI", "Web dev", "App dev", "Blockchain",
      "Game dev", "UI/UX", "Data science", "Cybersecurity", "DevOps",
      "Cloud", "Automation", "Open source", "Debugging", "Startup tech"
    ],
    variants: ["side project", "freelance", "startup", "học online"],
  },
  {
    group: "Sáng tạo",
    base: [
      "Vẽ tranh", "Thiết kế", "Viết lách", "Chụp ảnh", "Edit video",
      "Animation", "3D", "Content creation", "Digital art", "Illustration",
      "Storytelling", "Blogging", "Copywriting", "Tattoo design", "Cosplay"
    ],
    variants: ["digital", "truyền thống", "cá nhân", "thương mại"],
  },
  {
    group: "Giải trí",
    base: [
      "Xem phim", "Anime", "Chơi game", "YouTube", "TikTok",
      "Podcast", "Livestream", "Memes", "Stand-up comedy", "Review phim",
      "Reaction video", "K-Drama", "Netflix", "Marvel", "Sitcom"
    ],
    variants: ["kinh dị", "hài", "tình cảm", "hành động"],
  },
  {
    group: "Ẩm thực",
    base: [
      "Nấu ăn", "Làm bánh", "Cafe", "Trà sữa", "BBQ",
      "Ăn vặt", "Healthy food", "Ăn chay", "Fine dining", "Street food",
      "Review đồ ăn", "Food vlog", "Cooking show", "Trang trí món ăn", "Mixology"
    ],
    variants: ["tại nhà", "ngoài tiệm", "cao cấp", "bình dân"],
  },
  {
    group: "Du lịch",
    base: [
      "Du lịch", "Camping", "Phượt", "Backpacking", "Resort",
      "Check-in", "Travel vlog", "City tour", "Road trip", "Homestay",
      "Khám phá văn hóa", "Safari", "Du lịch biển", "Du lịch núi", "Festival"
    ],
    variants: ["trong nước", "quốc tế", "một mình", "nhóm"],
  },
  {
    group: "Phát triển bản thân",
    base: [
      "Đọc sách", "Thiền", "Journaling", "Time management",
      "Productivity", "Goal setting", "Mindfulness", "Deep work",
      "Critical thinking", "Self reflection", "Habit building", "Coaching",
      "Life planning", "Motivation", "Discipline"
    ],
    variants: ["hàng ngày", "challenge 30 ngày", "chuyên sâu"],
  },
  {
    group: "Kinh doanh",
    base: [
      "Startup", "Marketing", "Sales", "Đầu tư", "Crypto",
      "Chứng khoán", "Dropshipping", "Affiliate", "E-commerce",
      "Branding", "Content marketing", "SEO", "Ads", "Product building", "Pitching"
    ],
    variants: ["online", "offline", "cá nhân", "team"],
  },
  {
    group: "Xã hội",
    base: [
      "Networking", "Tình nguyện", "Event", "Community",
      "Public speaking", "Debate", "Mentoring", "Teaching",
      "Teamwork", "Leadership", "Workshop", "Seminar", "Club", "NGO", "Social work"
    ],
    variants: ["offline", "online", "weekly", "monthly"],
  },
  {
    group: "Đời sống",
    base: [
      "Thú cưng", "Trang trí nhà", "Minimalism", "Gardening",
      "Shopping", "Fashion", "Skincare", "Makeup", "Self-care",
      "Morning routine", "Night routine", "Bullet journal",
      "Cleaning", "Organizing", "DIY decor"
    ],
    variants: ["budget", "cao cấp", "DIY"],
  },
  {
    group: "Game",
    base: [
      "FPS", "MOBA", "RPG", "MMORPG", "Battle royale",
      "Game indie", "Game retro", "Sandbox", "Survival",
      "Speedrun", "Esports", "Streaming game", "Game design",
      "Game review", "Co-op"
    ],
    variants: ["rank", "casual", "try hard"],
  },
  {
    group: "Học tập",
    base: [
      "Toán học", "Khoa học", "Lịch sử", "Tâm lý học",
      "Triết học", "Online course", "Mindmap", "Flashcard",
      "Research", "Case study", "Phân tích", "Logic",
      "Học nhanh", "Ghi chú", "Brainstorming"
    ],
    variants: ["tự học", "chuyên sâu", "ứng dụng"],
  },
];

export const generateInterests = () => {
  const result: { [key: string]: string[] } = {};

  groups.forEach((g) => {
    const items = new Set<string>();

    g.base.forEach((b) => {
      items.add(b);

      g.variants?.forEach((v) => {
        const text = `${b} ${v}`.trim();
        items.add(text);
      });
    });

    result[g.group] = Array.from(items).sort((a, b) =>
      a.localeCompare(b, "vi")
    );
  });

  return result;
};

export const interestGroups = generateInterests();

/* ================= HELPERS - Dùng cho matching ================= */
export type InterestCategory = keyof typeof interestGroups;

// 1. Tất cả interest phẳng, dedupe
export const allInterests = Array.from(
  new Set(Object.values(interestGroups).flat())
).sort((a, b) => a.localeCompare(b, "vi"));

// 2. Tất cả category
export const allInterestCategories = Object.keys(interestGroups) as InterestCategory[];

// 3. Tìm category từ interest
export const getInterestCategory = (interest: string): InterestCategory | null => {
  const i = interest.trim();
  for (const [cat, items] of Object.entries(interestGroups)) {
    if (items.includes(i)) return cat as InterestCategory;
  }
  return null;
};

// 4. Validate interest có hợp lệ không
export const isValidInterest = (interest: string): boolean => {
  return allInterests.includes(interest.trim());
};

// 5. Gợi ý interest theo keyword - dùng cho search/autocomplete
export const suggestInterests = (keyword: string, limit = 10): string[] => {
  const k = keyword.toLowerCase().trim();
  if (!k) return [];
  return allInterests.filter(i => i.toLowerCase().includes(k)).slice(0, limit);
};

// 6. Lấy interest theo category
export const getInterestsByCategory = (category: InterestCategory): string[] => {
  return interestGroups[category] || [];
};

// 7. Match 2 user: trả về số interest chung
export const matchInterests = (user1: string[], user2: string[]): number => {
  const set1 = new Set(user1);
  return user2.filter(i => set1.has(i)).length;
};

// 8. Slug để lưu Firestore - không dấu, lowercase
const slugify = (str: string): string =>
  str
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-");

export const interestSlugs = allInterests.map(slugify);
export const slugToInterest = (slug: string): string | null => {
  const idx = interestSlugs.indexOf(slug);
  return idx >= 0? allInterests[idx] : null;
};

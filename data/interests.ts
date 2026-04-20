type InterestGroup = {
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

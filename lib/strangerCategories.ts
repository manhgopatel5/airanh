export type StrangerCategoryId =
  | "tat-ca"
  | "thich-di-phuot"
  | "nguoi-yeu"
  | "moi-quan-he-nghiem-tuc"
  | "ranh-toi-nay"
  | "nhung-nguoi-ban-moi"
  | "muon-co-con"
  | "du-lich"
  | "hoi-me-phim"
  | "yeu-the-thao"
  | "hen-di-cafe"
  | "thich-di-nhau"
  | "me-mao-hiem"
  | "hoi-yeu-sang-tao"
  | "dam-me-am-thuc"
  | "yeu-thien-nhien"
  | "yeu-am-nhac"
  | "cham-soc-ban-than";

export type StrangerCategoryIcon =
  | "sparkles"
  | "bike"
  | "heart"
  | "gem"
  | "moon"
  | "hand"
  | "baby"
  | "plane"
  | "tv"
  | "dumbbell"
  | "coffee"
  | "wine"
  | "dices"
  | "palette"
  | "utensils"
  | "leaf"
  | "headphones"
  | "sparkle";

export type StrangerCategory = {
  id: StrangerCategoryId;
  label: string;
  icon: StrangerCategoryIcon;
  gradient: string;
  ring: string;
};

export const STRANGER_CATEGORIES: readonly StrangerCategory[] = [
  { id: "tat-ca", label: "Tất cả", icon: "sparkles", gradient: "from-violet-500 to-indigo-600", ring: "ring-violet-400/40" },
  { id: "thich-di-phuot", label: "Thích đi phượt", icon: "bike", gradient: "from-orange-500 to-amber-600", ring: "ring-orange-400/40" },
  { id: "nguoi-yeu", label: "Người yêu", icon: "heart", gradient: "from-rose-500 to-pink-600", ring: "ring-rose-400/40" },
  { id: "moi-quan-he-nghiem-tuc", label: "Mối quan hệ nghiêm túc", icon: "gem", gradient: "from-fuchsia-500 to-purple-600", ring: "ring-fuchsia-400/40" },
  { id: "ranh-toi-nay", label: "Rảnh tối nay", icon: "moon", gradient: "from-indigo-500 to-blue-700", ring: "ring-indigo-400/40" },
  { id: "nhung-nguoi-ban-moi", label: "Những người bạn mới", icon: "hand", gradient: "from-sky-500 to-cyan-600", ring: "ring-sky-400/40" },
  { id: "muon-co-con", label: "Muốn có con", icon: "baby", gradient: "from-pink-400 to-rose-500", ring: "ring-pink-400/40" },
  { id: "du-lich", label: "Du lịch", icon: "plane", gradient: "from-blue-500 to-sky-600", ring: "ring-blue-400/40" },
  { id: "hoi-me-phim", label: "Hội mê Phim", icon: "tv", gradient: "from-red-500 to-rose-600", ring: "ring-red-400/40" },
  { id: "yeu-the-thao", label: "Yêu thể thao", icon: "dumbbell", gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-400/40" },
  { id: "hen-di-cafe", label: "Hẹn đi cafe", icon: "coffee", gradient: "from-amber-600 to-yellow-700", ring: "ring-amber-400/40" },
  { id: "thich-di-nhau", label: "Thích đi nhậu", icon: "wine", gradient: "from-purple-600 to-violet-700", ring: "ring-purple-400/40" },
  { id: "me-mao-hiem", label: "Mê mạo hiểm", icon: "dices", gradient: "from-lime-500 to-green-600", ring: "ring-lime-400/40" },
  { id: "hoi-yeu-sang-tao", label: "Hội yêu Sáng tạo", icon: "palette", gradient: "from-pink-500 to-orange-500", ring: "ring-pink-400/40" },
  { id: "dam-me-am-thuc", label: "Đam mê ẩm thực", icon: "utensils", gradient: "from-orange-400 to-red-500", ring: "ring-orange-400/40" },
  { id: "yeu-thien-nhien", label: "Yêu thiên nhiên", icon: "leaf", gradient: "from-green-500 to-emerald-600", ring: "ring-green-400/40" },
  { id: "yeu-am-nhac", label: "Yêu âm nhạc", icon: "headphones", gradient: "from-violet-500 to-purple-600", ring: "ring-violet-400/40" },
  { id: "cham-soc-ban-than", label: "Chăm sóc bản thân", icon: "sparkle", gradient: "from-teal-400 to-cyan-500", ring: "ring-teal-400/40" },
] as const;

export function getStrangerCategory(id: string): StrangerCategory | undefined {
  return STRANGER_CATEGORIES.find((c) => c.id === id);
}

export const STRANGER_CATEGORY_COUNT = STRANGER_CATEGORIES.length - 1;

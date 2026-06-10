export type EventItem = {
  id: string; // đổi number -> string vì Firestore docId là string
  title: string;
  tag: string;
  tagColor: string;
  desc: string;
  image: string;
  joined: number;
  distance: string;
  icon: string;
  category:
    | "phuot" | "bar" | "workshop" | "anuong" | "music"
    | "sports" | "shopping" | "coffee" | "photo" | "movie"
    | "festival" | "exhibition" | "nightlife" | "chill" | "dating";
  address: string;
  openTime: string;
  price: string;
  tips: string[];
  gallery: string[];
  mapUrl: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews?: number;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export const CATEGORY_INFO = {
  phuot: { label: "Phượt", icon: "⛰️", color: "from-red-500 to-orange-500" },
  bar: { label: "Bar", icon: "🍸", color: "from-purple-500 to-pink-500" },
  workshop: { label: "Workshop", icon: "🎨", color: "from-blue-500 to-cyan-500" },
  anuong: { label: "Ăn uống", icon: "🍜", color: "from-amber-500 to-orange-500" },
  music: { label: "Âm nhạc", icon: "🎵", color: "from-emerald-500 to-teal-500" },
  sports: { label: "Thể thao", icon: "🏃", color: "from-lime-500 to-green-500" },
  shopping: { label: "Mua sắm", icon: "🛍️", color: "from-violet-500 to-purple-500" },
  coffee: { label: "Cafe", icon: "☕", color: "from-teal-500 to-green-500" },
  photo: { label: "Chụp ảnh", icon: "📸", color: "from-rose-500 to-pink-500" },
  movie: { label: "Phim", icon: "🎬", color: "from-indigo-500 to-blue-500" },
  festival: { label: "Lễ hội", icon: "✨", color: "from-cyan-500 to-blue-500" },
  exhibition: { label: "Triển lãm", icon: "🖼️", color: "from-fuchsia-500 to-pink-500" },
  nightlife: { label: "Nightlife", icon: "🌃", color: "from-zinc-700 to-zinc-900" },
  chill: { label: "Chill", icon: "📚", color: "from-teal-500 to-green-500" },
  dating: { label: "Hẹn hò", icon: "💕", color: "from-pink-500 to-rose-500" }
};

export const getEventsByCategory = (cat: EventItem['category'], events: EventItem[]) =>
  events.filter(e => e.category === cat);

export const getTrendingEvents = (events: EventItem[]) =>
  events.filter(e => e.tag === "TRENDING" || e.tag === "HOT");

// XÓA HẾT EVENTS_DATA - chuyển lên Firestore
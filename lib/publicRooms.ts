export type PublicCityMeta = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tag: string;
  tagColor: string;
  region: "north" | "central" | "south";
  desc: string;
  imageUrl: string;
  accent: string;
};

/** Ảnh địa danh biểu tượng — crop vuông cho avatar phòng */
function landmark(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?w=400&h=400&fit=crop&auto=format&q=85`;
}

export const PUBLIC_CITIES: PublicCityMeta[] = [
  {
    id: "hcm",
    name: "SÀI GÒN",
    emoji: "🏙️",
    color: "from-blue-500 to-cyan-500",
    tag: "PHỐ SÁNG",
    tagColor: "from-blue-500 to-cyan-400",
    region: "south",
    desc: "Năng lượng phố không ngủ",
    imageUrl: landmark("1449824913935-59a10b8d2000"),
    accent: "#0a84ff",
  },
  {
    id: "hn",
    name: "HÀ NỘI",
    emoji: "🏛️",
    color: "from-orange-500 to-red-500",
    tag: "THỦ ĐÔ",
    tagColor: "from-orange-500 to-red-400",
    region: "north",
    desc: "Nghìn năm văn hiến",
    imageUrl: landmark("1559592413-7cec4d0cae2b"),
    accent: "#f97316",
  },
  {
    id: "dn",
    name: "ĐÀ NẴNG",
    emoji: "🌉",
    color: "from-teal-500 to-emerald-500",
    tag: "BIỂN XANH",
    tagColor: "from-teal-500 to-emerald-400",
    region: "central",
    desc: "Biển xanh, cầu Vàng",
    imageUrl: landmark("1490750967868-88aa4486c946"),
    accent: "#14b8a6",
  },
  {
    id: "ct",
    name: "CẦN THƠ",
    emoji: "🌾",
    color: "from-green-500 to-lime-500",
    tag: "MIỀN TÂY",
    tagColor: "from-green-500 to-lime-400",
    region: "south",
    desc: "Chợ nổi, sông nước",
    imageUrl: landmark("1514282401047-d79a71a590e8"),
    accent: "#22c55e",
  },
  {
    id: "hp",
    name: "HẢI PHÒNG",
    emoji: "⚓",
    color: "from-purple-500 to-pink-500",
    tag: "CẢNG BIỂN",
    tagColor: "from-purple-500 to-pink-400",
    region: "north",
    desc: "Hoa phượng, cảng biển",
    imageUrl: landmark("1505765050516-f72dcac9c60e"),
    accent: "#a855f7",
  },
  {
    id: "dl",
    name: "ĐÀ LẠT",
    emoji: "🌸",
    color: "from-pink-500 to-rose-500",
    tag: "NGÀN HOA",
    tagColor: "from-pink-500 to-rose-400",
    region: "central",
    desc: "Sương mù, thông reo",
    imageUrl: landmark("1470071459604-3b5ec3a7fe05"),
    accent: "#ec4899",
  },
  {
    id: "nt",
    name: "NHA TRANG",
    emoji: "🏖️",
    color: "from-sky-500 to-blue-500",
    tag: "BIỂN ĐẸP",
    tagColor: "from-sky-500 to-blue-400",
    region: "central",
    desc: "Cát vàng, nắng ấm",
    imageUrl: landmark("1507525428034-b723cf961d3e"),
    accent: "#0ea5e9",
  },
  {
    id: "hue",
    name: "HUẾ",
    emoji: "🏯",
    color: "from-violet-500 to-purple-500",
    tag: "CỐ ĐÔ",
    tagColor: "from-violet-500 to-purple-400",
    region: "central",
    desc: "Cố đô trầm lắng",
    imageUrl: landmark("1548013146-72479768bada"),
    accent: "#8b5cf6",
  },
];

export type PublicRoomItem = {
  id: string;
  cityId: string;
  name: string;
  emoji: string;
  color: string;
  tag: string;
  tagColor: string;
  region: PublicCityMeta["region"];
  desc: string;
  imageUrl: string;
  memberCount: number;
  onlineCount: number;
  lastMessage?: string;
  isJoined: boolean;
  isHot: boolean;
};

export function buildDefaultRooms(): PublicRoomItem[] {
  return PUBLIC_CITIES.map((city) => ({
    id: `public_${city.id}`,
    cityId: city.id,
    name: city.name,
    emoji: city.emoji,
    color: city.color,
    tag: city.tag,
    tagColor: city.tagColor,
    region: city.region,
    desc: city.desc,
    imageUrl: city.imageUrl,
    memberCount: 0,
    onlineCount: 0,
    lastMessage: `Chào mừng đến ${city.name}!`,
    isJoined: false,
    isHot: false,
  }));
}

export function getCityMetaByRoomId(roomId: string): PublicCityMeta | undefined {
  const cityId = roomId.replace(/^public_/, "");
  return PUBLIC_CITIES.find((c) => c.id === cityId);
}

export const REGION_LABELS: Record<PublicCityMeta["region"], string> = {
  north: "Miền Bắc",
  central: "Miền Trung",
  south: "Miền Nam",
};

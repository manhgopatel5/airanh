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
};

const bg = {
  hcm: "b6e3f4",
  hn: "ffd5dc",
  dn: "c0f7db",
  ct: "d1f4d1",
  hp: "e8d5ff",
  dl: "ffcce1",
  nt: "cce7ff",
  hue: "f0d9ff",
} as const;

export const PUBLIC_CITIES: PublicCityMeta[] = [
  {
    id: "hcm",
    name: "SÀI GÒN",
    emoji: "🏙️",
    color: "from-blue-500 to-cyan-500",
    tag: "SÔI ĐỘNG",
    tagColor: "from-blue-500 to-cyan-400",
    region: "south",
    desc: "Phòng chat công cộng Sài Gòn — gặp gỡ, trò chuyện và kết nối mọi người.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=saigon&backgroundColor=${bg.hcm}&radius=12&size=256`,
  },
  {
    id: "hn",
    name: "HÀ NỘI",
    emoji: "🏛️",
    color: "from-orange-500 to-red-500",
    tag: "THỦ ĐÔ",
    tagColor: "from-orange-500 to-red-400",
    region: "north",
    desc: "Không gian chat Thủ đô — chia sẻ câu chuyện và tìm bạn mới.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=hanoi&backgroundColor=${bg.hn}&radius=12&size=256`,
  },
  {
    id: "dn",
    name: "ĐÀ NẴNG",
    emoji: "🌉",
    color: "from-teal-500 to-emerald-500",
    tag: "BIỂN XANH",
    tagColor: "from-teal-500 to-emerald-400",
    region: "central",
    desc: "Phòng chat miền Trung — thư giãn và trò chuyện cùng cộng đồng.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=danang&backgroundColor=${bg.dn}&radius=12&size=256`,
  },
  {
    id: "ct",
    name: "CẦN THƠ",
    emoji: "🌾",
    color: "from-green-500 to-lime-500",
    tag: "MIỀN TÂY",
    tagColor: "from-green-500 to-lime-400",
    region: "south",
    desc: "Gặp gỡ bạn bè miền Tây sông nước trong phòng chat ấm áp.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=cantho&backgroundColor=${bg.ct}&radius=12&size=256`,
  },
  {
    id: "hp",
    name: "HẢI PHÒNG",
    emoji: "⚓",
    color: "from-purple-500 to-pink-500",
    tag: "CẢNG BIỂN",
    tagColor: "from-purple-500 to-pink-400",
    region: "north",
    desc: "Trò chuyện cùng cộng đồng Hải Phòng năng động.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=haiphong&backgroundColor=${bg.hp}&radius=12&size=256`,
  },
  {
    id: "dl",
    name: "ĐÀ LẠT",
    emoji: "🌸",
    color: "from-pink-500 to-rose-500",
    tag: "THƠ MỘNG",
    tagColor: "from-pink-500 to-rose-400",
    region: "central",
    desc: "Phòng chat thành phố ngàn hoa — chill và kết bạn.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=dalat&backgroundColor=${bg.dl}&radius=12&size=256`,
  },
  {
    id: "nt",
    name: "NHA TRANG",
    emoji: "🏖️",
    color: "from-sky-500 to-blue-500",
    tag: "BIỂN ĐẸP",
    tagColor: "from-sky-500 to-blue-400",
    region: "central",
    desc: "Chat cùng những người yêu biển và du lịch Nha Trang.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=nhatrang&backgroundColor=${bg.nt}&radius=12&size=256`,
  },
  {
    id: "hue",
    name: "HUẾ",
    emoji: "🏯",
    color: "from-violet-500 to-purple-500",
    tag: "CỐ ĐÔ",
    tagColor: "from-violet-500 to-purple-400",
    region: "central",
    desc: "Không gian trò chuyện cổ kính và thân thiện tại Huế.",
    imageUrl: `https://api.dicebear.com/7.x/lorelei/png?seed=hue&backgroundColor=${bg.hue}&radius=12&size=256`,
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

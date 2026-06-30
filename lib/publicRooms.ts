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

function avatar(
  style: "adventurer" | "lorelei" | "micah",
  seed: string,
  bg: string,
  traits = ""
): string {
  const q = new URLSearchParams({
    seed,
    backgroundColor: bg,
    radius: "14",
    size: "256",
  });
  const extra = new URLSearchParams(traits);
  extra.forEach((value, key) => q.set(key, value));
  return `https://api.dicebear.com/7.x/${style}/png?${q.toString()}`;
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
    imageUrl: avatar("adventurer", "hcm-saigon", "b6e3f4", "hair=short03&glasses=variant05"),
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
    imageUrl: avatar("lorelei", "hn-thang-long", "fde68a", "hair=variant04&clothing=variant02"),
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
    imageUrl: avatar("micah", "dn-cau-rong", "99f6e4", "hair=fonze&glasses=round&shirt=open"),
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
    imageUrl: avatar("adventurer", "ct-mekong", "bbf7d0", "hair=short01&features=freckles"),
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
    imageUrl: avatar("adventurer", "hp-cang", "e9d5ff", "hair=short05&glasses=variant02"),
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
    imageUrl: avatar("lorelei", "dl-thanh-pho-hoa", "ffcce1", "hair=variant08&clothing=variant03"),
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
    imageUrl: avatar("micah", "nt-bien", "bae6fd", "hair=pixie&mouth=smile&shirt=open"),
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
    imageUrl: avatar("lorelei", "hue-imperial", "ddd6fe", "hair=variant06&clothing=variant01"),
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

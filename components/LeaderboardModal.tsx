"use client";
import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { FiX, FiTrendingUp, FiAward } from "react-icons/fi";
import { getFirebaseDB } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  
  
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

import * as Dialog from "@radix-ui/react-dialog";

import {
  Zap, Crown, Flame, Trophy, Sparkles, Shield, Gem, Coffee, Heart, Music, Sun,
  Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag,
  Mic, Bike, Palette, Beer, Map, PartyPopper, Briefcase, Camera, Globe, Clock,
  TrendingUp, ThumbsUp, BookOpen, ShieldCheck, MapPin, Users, Mail, Star
} from "lucide-react";

const IconMap = {
  Crown, Flame, Trophy, Sparkles, Shield, Gem, Coffee, Heart, Music, Sun,
  Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag,
  Mic, Bike, Palette, Beer, Map, PartyPopper, Briefcase, Camera, Globe, Clock,
  TrendingUp, ThumbsUp, BookOpen, ShieldCheck, MapPin, Users, Mail, Star
} as const;

type IconName = keyof typeof IconMap;

type UserProgress = {
  uid: string;
  name: string;
  avatar: string;
  level: number;
  exp: number;
  huhaScore: number;
  streakDays: number;
  badges: string[];
  rank: number;
  vip?: { tier: 'free' | 'pro' | 'elite' };
  stats?: {
    completed: number;
    rating: number;
    totalReviews: number;
    friendsMade: number;
    eventsJoined: number;
    checkins: number;
    groupsManaged: number;
    eventsHosted: number;
  };
  createdAt?: Timestamp;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  skills?: string[];
  portfolio?: any[];
  location?: string;
  profileCompletion: number;
  trustScore: number;
  joinedDays: number;
  friendCount: number;
};

type TopUser = {
  uid: string;
  name: string;
  avatar: string;
  score: number;
  level: number;
  badge: string;
};

type Achievement = {
  id: number;
  iconName: IconName;
  label: string;
  desc: string;
  unlocked: (u: UserProgress) => boolean;
  condition: string;
  category: "profile" | "task";
};

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 1, iconName: 'Users', label: "Bạn bè khắp nơi", desc: "Kết nối 10+ người bạn", unlocked: (u) => u.friendCount >= 10, condition: "Có ≥ 10 bạn bè", category: "profile" },
  { id: 2, iconName: 'Sparkles', label: "Tân binh", desc: "Thành viên lâu năm", unlocked: (u) => u.joinedDays <= 30, condition: "Tham gia < 30 ngày", category: "profile" },
  { id: 3, iconName: 'Star', label: "5 sao lấp lánh", desc: "Được crush cho 5 sao", unlocked: (u) => (u.stats?.rating || 0) >= 5.0 && (u.stats?.totalReviews || 0) >= 1, condition: "Rating = 5.0", category: "profile" },
  { id: 4, iconName: 'Shield', label: "Chính chủ 100%", desc: "Xác minh CCCD xong", unlocked: (u) =>!!u.isVerifiedId, condition: "Xác minh CCCD", category: "profile" },
  { id: 5, iconName: 'Briefcase', label: "Thợ cày", desc: "Cày 50 job như trâu", unlocked: (u) => (u.stats?.completed || 0) >= 50, condition: "Hoàn thành ≥ 50 job", category: "profile" },
  { id: 6, iconName: 'Flame', label: "Streak 30 ngày", desc: "Online không nghỉ ngày nào", unlocked: (u) => u.joinedDays >= 30, condition: "Tham gia ≥ 30 ngày", category: "profile" },
  { id: 7, iconName: 'ShieldCheck', label: "Profile xịn sò", desc: "Điền đủ 100% thông tin", unlocked: (u) => u.profileCompletion >= 100, condition: "Hồ sơ = 100%", category: "profile" },
  { id: 8, iconName: 'Mail', label: "Email real", desc: "Xác thực email rồi", unlocked: (u) =>!!u.emailVerified, condition: "Xác minh email", category: "profile" },
  { id: 9, iconName: 'Camera', label: "Nhiếp ảnh gia", desc: "Đăng 5+ ảnh portfolio", unlocked: (u) => (u.portfolio?.length || 0) >= 5, condition: "Portfolio ≥ 5 mục", category: "profile" },
  { id: 10, iconName: 'Crown', label: "Đại gia", desc: "Cày 100 job không biết mệt", unlocked: (u) => (u.stats?.completed || 0) >= 100, condition: "Hoàn thành ≥ 100 job", category: "profile" },
  { id: 11, iconName: 'Clock', label: "Lão làng", desc: "Tham gia 365 ngày", unlocked: (u) => u.joinedDays >= 365, condition: "Tham gia ≥ 1 năm", category: "profile" },
  { id: 12, iconName: 'Globe', label: "Quốc tế hóa", desc: "Đi chơi với bạn nước ngoài", unlocked: () => false, condition: "Có task với user nước ngoài", category: "profile" },
  { id: 13, iconName: 'Gem', label: "Kim cương", desc: "Đạt level 50", unlocked: (u) => u.level >= 50, condition: "Đạt Lv.50", category: "profile" },
  { id: 14, iconName: 'ShieldCheck', label: "Uy tín 100%", desc: "Tin được như vàng 9999", unlocked: (u) => u.trustScore >= 100, condition: "Độ uy tín = 100%", category: "profile" },
  { id: 15, iconName: 'Crown', label: "Top 1%", desc: "Lọt top 1% người dùng", unlocked: (u) => u.trustScore >= 95, condition: "Độ uy tín ≥ 95%", category: "profile" },
  { id: 16, iconName: 'Heart', label: "Bạn thân 50 người", desc: "Mở rộng vòng kết nối", unlocked: (u) => u.friendCount >= 50, condition: "Có ≥ 50 bạn bè", category: "profile" },
  { id: 17, iconName: 'TrendingUp', label: "Level 25+", desc: "Chăm cày lên level", unlocked: (u) => u.level >= 25, condition: "Đạt Lv.25", category: "profile" },
  { id: 18, iconName: 'ThumbsUp', label: "Được yêu thích", desc: "50+ đánh giá tích cực", unlocked: (u) => (u.stats?.totalReviews || 0) >= 50, condition: "Reviews ≥ 50", category: "profile" },
  { id: 19, iconName: 'BookOpen', label: "Skill master", desc: "Thêm 10+ kỹ năng", unlocked: (u) => (u.skills?.length || 0) >= 10, condition: "Skills ≥ 10", category: "profile" },
  { id: 20, iconName: 'MapPin', label: "Dân chơi Sài Gòn", desc: "Check-in Ho Chi Minh City", unlocked: (u) => u.location?.includes("Hồ Chí Minh") || false, condition: "Location ở Sài gòn", category: "profile" },
  { id: 21, iconName: 'Coffee', label: "Trùm cafe", desc: "Tạo 5 kèo đi cafe", unlocked: () => false, condition: "Tạo 5 task cafe", category: "task" },
  { id: 22, iconName: 'Heart', label: "Ông mai bà mối", desc: "Tạo 10 kèo hẹn hò", unlocked: () => false, condition: "Tạo 10 task hẹn hò", category: "task" },
  { id: 23, iconName: 'Music', label: "Party king", desc: "Tổ chức 3 buổi nhậu", unlocked: () => false, condition: "Tạo 3 task nhậu/party", category: "task" },
  { id: 24, iconName: 'Sun', label: "Dậy sớm", desc: "Tạo task buổi sáng 10 lần", unlocked: () => false, condition: "Tạo 10 task buổi sáng", category: "task" },
  { id: 25, iconName: 'Gamepad2', label: "Game thủ", desc: "Tạo 5 kèo chơi game", unlocked: () => false, condition: "Tạo 5 task game", category: "task" },
  { id: 26, iconName: 'Utensils', label: "Food reviewer", desc: "Tạo 10 kèo đi ăn", unlocked: () => false, condition: "Tạo 10 task ăn uống", category: "task" },
  { id: 27, iconName: 'Dumbbell', label: "Gymer", desc: "Rủ 5 người đi tập gym", unlocked: () => false, condition: "Tạo 5 task gym", category: "task" },
  { id: 28, iconName: 'Film', label: "Mọt phim", desc: "Tạo 5 kèo xem phim", unlocked: () => false, condition: "Tạo 5 task xem phim", category: "task" },
  { id: 29, iconName: 'Plane', label: "Phượt thủ", desc: "Tổ chức 3 chuyến đi chơi xa", unlocked: () => false, condition: "Tạo 3 task du lịch", category: "task" },
  { id: 30, iconName: 'Moon', label: "Cú đêm", desc: "Tạo 10 task buổi tối", unlocked: () => false, condition: "Tạo 10 task tối", category: "task" },
  { id: 31, iconName: 'Gift', label: "Người hào phóng", desc: "Tạo 5 task miễn phí", unlocked: () => false, condition: "Tạo 5 task free", category: "task" },
  { id: 32, iconName: 'Users', label: "Nhóm trưởng", desc: "Tạo task cho 10+ người", unlocked: () => false, condition: "Task có 10+ người join", category: "task" },
  { id: 33, iconName: 'Calendar', label: "Siêu bận rộn", desc: "Có task 7 ngày liên tiếp", unlocked: () => false, condition: "Tạo task 7 ngày liên tục", category: "task" },
  { id: 34, iconName: 'ShoppingBag', label: "Thánh shopping", desc: "Rủ 5 người đi mua sắm", unlocked: () => false, condition: "Tạo 5 task shopping", category: "task" },
  { id: 35, iconName: 'Mic', label: "Ca sĩ phòng trà", desc: "Tổ chức 3 buổi karaoke", unlocked: () => false, condition: "Tạo 3 task karaoke", category: "task" },
  { id: 36, iconName: 'Bike', label: "Vận động viên", desc: "Rủ 5 người đi đạp xe/chạy bộ", unlocked: () => false, condition: "Tạo 5 task thể thao", category: "task" },
  { id: 37, iconName: 'Palette', label: "Nghệ sĩ", desc: "Tổ chức workshop vẽ/nhạc", unlocked: () => false, condition: "Tạo 3 task workshop", category: "task" },
  { id: 38, iconName: 'Beer', label: "Bợm nhậu", desc: "Tạo 10 kèo nhậu", unlocked: () => false, condition: "Tạo 10 task nhậu", category: "task" },
  { id: 39, iconName: 'Map', label: "Hướng dẫn viên", desc: "Dẫn 20 người đi chơi", unlocked: () => false, condition: "20+ người join task", category: "task" },
  { id: 40, iconName: 'PartyPopper', label: "Vua task", desc: "Tạo 100 task đi chơi", unlocked: () => false, condition: "Tạo 100 task", category: "task" },
];

const calcUserData = (d: any, uid: string, rank?: number): UserProgress => {
  const level = Math.floor((d.huhaScore || 0) / 100) + 1;
  const exp = (d.huhaScore || 0) % 100;
  const joinedDays = d.createdAt?.seconds? Math.floor((Date.now() - d.createdAt.seconds * 1000) / 86400000) : 0;
  const profileFields = [d.avatar, d.bio, d.skills?.length, d.portfolio?.length, d.location, d.title, d.emailVerified, d.isVerifiedId];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  const trustScore = Math.min(100, Math.floor((d.stats?.rating || 0) * 15 + (d.stats?.completed || 0) * 1.2 + (d.stats?.totalReviews || 0)));

  return {
    uid,
name: (d.displayName || d.name || d.nameLower || d.username || "User").replace(/^\w/, (c: string) => c.toUpperCase()),
    avatar: d.photoURL || d.avatar || "",
    level,
    exp,
    huhaScore: d.huhaScore || 0,
    streakDays: d.stats?.streakDays || 0,
    badges: d.badges || [],
    rank: rank?? d.rank?? 0,
    vip: d.vip || { tier: 'free' },
    stats: {
      completed: d.stats?.completed || 0,
      rating: d.stats?.rating || 0,
      totalReviews: d.stats?.totalReviews || 0,
      friendsMade: d.friendCount || 0,
      eventsJoined: d.stats?.eventsJoined || 0,
      checkins: d.stats?.checkins || 0,
      groupsManaged: d.stats?.groupsManaged || 0,
      eventsHosted: d.stats?.eventsHosted || 0,
    },
    createdAt: d.createdAt,
    emailVerified: d.emailVerified || false,
    isVerifiedId: d.isVerifiedId || false,
    skills: d.skills || [],
    portfolio: d.portfolio || [],
    location: d.location || "",
    profileCompletion,
    trustScore,
    joinedDays,
    friendCount: d.friendCount || 0,
  };
};
const OverviewTab = memo(({ userData, topUsers, onShowLevelInfo }: { 
  userData: UserProgress | null; 
  topUsers: TopUser[];
  onShowLevelInfo: () => void;
}) => {
  const expPercent = useMemo(() => userData? (userData.exp / 100) * 100 : 0, [userData?.exp]);

 

  if (!userData) return null;

  return (
    <div className="pt-3 space-y-3">
<button
  onClick={onShowLevelInfo}
  className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700 text-left active:scale-[0.98] transition-all"
>
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
        <Sparkles className="text-amber-500" size={20} />
      </div>
      <div>
        <p className="text-xs text-zinc-500">Cấp độ hiện tại</p>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Level {userData.level}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-xs text-zinc-500">EXP</p>
      <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{userData.exp}/100</p>
    </div>
  </div>
  <div className="relative h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${expPercent}%` }} />
  </div>
  <p className="text-xs text-zinc-500 mt-2">Còn {100 - userData.exp} EXP để lên Level {userData.level + 1}</p>
</button>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-700">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Trophy className="text-amber-500" size={18} />
          Top Vinh Danh Tuần Này
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, idx) => {
            const u = topUsers[idx];
            const badge = idx === 0? "👑" : idx === 1? "🥈" : "🥉";
            return (
              <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl border ${u? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 opacity-40"}`}>
                <span className="text-2xl">{badge}</span>
                {u? (
                  <>
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-zinc-500">Lv.{u.level} • {u.score} điểm</p>
                    </div>
                    {idx === 0 && <Crown className="text-amber-500" size={18} />}
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-400">Top {idx + 1}:...</p>
                      <p className="text-xs text-zinc-400">Lv.? •? điểm</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Users, label: "Bạn bè", value: userData.friendCount, color: "text-pink-500" },
          { icon: ShieldCheck, label: "Uy tín", value: `${userData.trustScore}/100`, color: "text-blue-500" },
          { icon: Briefcase, label: "Hoàn thành", value: userData.stats?.completed || 0, color: "text-green-500" },
          { icon: Star, label: "Đánh giá", value: `${userData.stats?.rating?.toFixed(1) || "0.0"}`, suffix: `(${userData.stats?.totalReviews || 0})`, color: "text-amber-500" },
          { icon: Calendar, label: "Sự kiện", value: userData.stats?.eventsJoined || 0, color: "text-purple-500" },
          { icon: Clock, label: "Tham gia", value: userData.joinedDays, suffix: "ngày", color: "text-orange-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={stat.color} size={16} />
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {stat.value} {stat.suffix && <span className="text-xs text-zinc-500">{stat.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

    
    </div>
  );
});

const BadgesTab = memo(({ userData }: { userData: UserProgress | null }) => {
  const unlockedIds = useMemo(() => {
    if (!userData) return new Set<number>();
    return new Set(ALL_ACHIEVEMENTS.filter(a => a.unlocked(userData)).map(a => a.id));
  }, [userData?.level, userData?.friendCount, userData?.trustScore, userData?.joinedDays, userData?.profileCompletion, userData?.emailVerified, userData?.isVerifiedId, userData?.stats?.rating, userData?.stats?.completed, userData?.stats?.totalReviews, userData?.skills?.length, userData?.portfolio?.length, userData?.location]);

  return (
    <div className="grid grid-cols-3 gap-3 pt-3">
      {ALL_ACHIEVEMENTS.map((item) => {
        const unlocked = unlockedIds.has(item.id);
        const Icon = IconMap[item.iconName];
        return (
          <div key={item.id} className="p-3 rounded-2xl border text-center bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
            <div className={`mb-1 flex justify-center ${unlocked? "" : "grayscale opacity-40"}`}>
              <Icon className="w-8 h-8" />
            </div>
            <p className="text-xs font-bold">{item.label}</p>
            <p className="text-zinc-500 mt-0.5 line-clamp-2 text-[10px]">{item.desc}</p>
          </div>
        );
      })}
    </div>
  );
});

const RankTab = memo(({ rankUsers, currentUserId }: { rankUsers: UserProgress[]; currentUserId?: string | undefined }) => {
  return (
    <div className="pt-3 space-y-2">
      {Array.from({ length: 20 }, (_, idx) => {
        const u = rankUsers[idx];
        const isMe = u?.uid === currentUserId;
        const hasUser =!!u;

        return (
          <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${isMe? "bg-white dark:bg-zinc-900 border-amber-500 ring-2 ring-amber-500" : hasUser? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 opacity-40"}`}>
            <div className="w-8 text-center">
              {idx === 0? <span className="text-2xl">👑</span> : idx === 1? <span className="text-2xl">🥈</span> : idx === 2? <span className="text-2xl">🥉</span> : <span className="text-sm font-bold text-zinc-400">#{idx + 1}</span>}
            </div>
            {hasUser? (
              <>
                <img src={u.avatar || "/default-avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1">
                    {u.name} {isMe && <span className="text-xs text-amber-500">(Bạn)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">Lv.{u.level} • {u.huhaScore} điểm</p>
                </div>
                {u.vip?.tier === "elite" && <Crown className="text-amber-500" size={18} />}
                {u.vip?.tier === "pro" && <span className="text-lg">💎</span>}
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-400">Top {idx + 1}: <span className="font-normal">...</span></p>
                  <p className="text-xs text-zinc-400">Lv.? •? điểm</p>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default function LeaderboardModal({ onClose, currentUserId }: { onClose: () => void; currentUserId?: string }) {
  const db = getFirebaseDB();
  
  const [tab, setTab] = useState<"overview" | "badges" | "rank">("overview");
  const [userData, setUserData] = useState<UserProgress | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [rankUsers, setRankUsers] = useState<UserProgress[]>([]);
  const [showLevelInfo, setShowLevelInfo] = useState(false);


// 1. TAB XẾP HẠNG - load 20 user top
useEffect(() => {
  if (tab!== "rank") return;
  const q = query(
    collection(db, "users"),
    orderBy("huhaScore", "desc"),
    orderBy("nameLower", "asc"),
    limit(20)
  );
  const unsub = onSnapshot(q, (snap) => {
    const users = snap.docs.map((d, idx) => calcUserData(d.data(), d.id, idx + 1));
    setRankUsers(users);
  }, (err) => {
    console.error("RANK ERROR:", err.message);
    setRankUsers([]);
  });
  return () => unsub();
}, [db, tab]);

// 2. LOAD USER HIỆN TẠI - không tính rank ở đây nữa
useEffect(() => {
  if (!currentUserId) return;

  const unsubUser = onSnapshot(doc(db, "users", currentUserId), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      setUserData(calcUserData(data, snap.id, 0)); // rank = 0 tạm
    }
  });

  return () => unsubUser();
}, [currentUserId, db]);

// 3. TÍNH RANK TỪ LIST RANKUSERS - đồng bộ với tab Xếp hạng
useEffect(() => {
  if (!userData?.uid) return;
  if (!rankUsers.length) return;

  const myIndex = rankUsers.findIndex(u => u.uid === userData.uid);
  const myRank = myIndex >= 0? myIndex + 1 : rankUsers.length + 1;

  setUserData(prev => prev? {...prev, rank: myRank } : null);
}, [userData?.uid, rankUsers]);

// 4. TOP 3 VINH DANH - dùng chung logic với rank
useEffect(() => {
  const q = query(
    collection(db, "users"),
    orderBy("huhaScore", "desc"),
    orderBy("nameLower", "asc"),
    limit(3)
  );
  const unsub = onSnapshot(q, (snap) => {
    const users = snap.docs.map((d, idx) => {
      const u = calcUserData(d.data(), d.id, idx + 1);
      return {
        uid: u.uid,
        name: u.name,
        avatar: u.avatar,
        score: u.huhaScore,
        level: u.level,
        badge: idx === 0? "👑" : idx === 1? "🥈" : "🥉"
      };
    });
    setTopUsers(users);
  }, (err) => {
    console.error("TOP3 ERROR:", err.message);
    setTopUsers([]);
  });
  return () => unsub();
}, [db]);



 const handleClose = useCallback(() => onClose(), [onClose]);

if (!userData) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-2xl">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

return (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={handleClose} />
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-zinc-900 sm:rounded-3xl shadow-xl h-[100dvh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-300 pt-safe">
        <div className="w-9 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 pt-4 pb-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
<img
  src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || "U")}&background=F59E0B&color=fff`}
  alt=""
  className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700"
/>
           <button
  onClick={() => setShowLevelInfo(true)}
  className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-zinc-900 active:scale-90 transition-all"
>
  <span className="text-xs font-black text-white">{userData?.level || 1}</span>
</button>
              </div>
              <div>
  <h2 className="text-lg font-bold flex items-center gap-1.5">
    {userData?.name || "Đang tải..."}
    {userData?.vip?.tier === 'elite' && <Crown className="text-amber-500" size={16} />}
    {userData?.vip?.tier === 'pro' && <span className="text-sm">💎</span>}
  </h2>
  {userData && (
    <p className="text-xs text-zinc-500">Hạng #{userData.rank || '—'}</p>
  )}
</div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 -mr-1 flex items-center justify-center text-zinc-400">
              <FiX size={22} />
            </button>
          </div>

     

          {userData && userData.streakDays > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <Flame className="text-orange-500" size={18} />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{userData.streakDays} ngày streak • x2 EXP</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {[
              { id: "overview", label: "Tổng quan", icon: FiTrendingUp },
              { id: "badges", label: "Huy hiệu", icon: FiAward },
              { id: "rank", label: "Xếp hạng", icon: Trophy },
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id as any)} 
                className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border ${
                  tab === t.id 
                    ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-amber-600 dark:text-amber-400" 
                    : "border-transparent text-zinc-500"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-5 pb-[env(safe-area-inset-bottom)]">
{tab === "overview" && <OverviewTab userData={userData} topUsers={topUsers} onShowLevelInfo={() => setShowLevelInfo(true)} />}
          {tab === "badges" && <BadgesTab userData={userData} />}
          {tab === "rank" && <RankTab rankUsers={rankUsers} currentUserId={currentUserId} />}
        </div>
      </div>
      {/* DIALOG CẤP ĐỘ */}
      <Dialog.Root open={showLevelInfo} onOpenChange={setShowLevelInfo}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-[70] shadow-2xl">
            <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4">
              Hệ thống cấp độ Huha
            </Dialog.Title>

            <div className="mb-5 p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Công thức tính XP
              </p>
              <div className="space-y-1.5 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Hoàn thành 1 job</span>
                  <span className="font-semibold">+12 XP</span>
                </div>
                <div className="flex justify-between">
                  <span>Nhận 1 đánh giá</span>
                  <span className="font-semibold">+8 XP</span>
                </div>
                <div className="flex justify-between">
                  <span>Rating trung bình</span>
                  <span className="font-semibold">+Rating × 20 XP</span>
                </div>
                <div className="pt-2 mt-2 border-t border-blue-300 flex justify-between font-bold">
                  <span>Tổng XP hiện tại</span>
                  <span>{userData?.huhaScore || 0} XP</span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Mỗi level cần 300 XP
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
              Các cấp độ
            </p>
            <div className="space-y-2.5">
              {[
                { range: "1 - 7", name: "Mới tham gia", icon: <Sparkles className="w-4 h-4" />, gradient: "from-sky-400 to-blue-600", xp: "0 - 2,100" },
                { range: "8 - 19", name: "Thành viên tích cực", icon: <Flame className="w-4 h-4" />, gradient: "from-emerald-500 to-teal-500", xp: "2,100 - 5,700" },
                { range: "20 - 34", name: "Đối tác tin cậy", icon: <Shield className="w-4 h-4" />, gradient: "from-blue-500 to-sky-500", xp: "5,700 - 10,200" },
                { range: "35 - 49", name: "Chuyên gia", icon: <Gem className="w-4 h-4" />, gradient: "from-violet-500 to-fuchsia-500", xp: "10,200 - 14,700" },
                { range: "50+", name: "Huyền thoại", icon: <Crown className="w-4 h-4" />, gradient: "from-amber-400 to-orange-500", xp: "14,700+" },
              ].map((tier, i) => {
                const minLv = parseInt(tier.range.split(" - ")[0] || "0");
                const isActive = (userData?.level || 1) >= minLv;
                return (
                  <div
                    key={i}
                    className={`p-3.5 rounded-2xl border ${
                      isActive? "border-zinc-300 bg-zinc-50" : "border-zinc-200 bg-white opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-r ${tier.gradient} text-white flex items-center justify-center shadow-sm`}>
                          {tier.icon}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-sm">{tier.name}</p>
                          <p className="text-xs text-zinc-500">Level {tier.range}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-700">{tier.xp}</p>
                        <p className="text-xs text-zinc-500">XP</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
              Đã hiểu
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
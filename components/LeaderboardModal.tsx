"use client";
import { useEffect, useState } from "react";
import { FiX, FiAward, FiTrendingUp } from "react-icons/fi";
import { Crown, Flame, Trophy, Sparkles, Shield, Gem, Coffee, Heart, Music, Sun, Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag, Mic, Bike, Palette, Beer, Map, PartyPopper, Briefcase, Camera, Globe, Clock, TrendingUp, ThumbsUp, BookOpen, ShieldCheck, MapPin } from "lucide-react";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from "firebase/firestore";


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
  createdAt?: any;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  skills?: string[];
  portfolio?: any[];
  location?: string;
};

type TopUser = {
  uid: string;
  name: string;
  avatar: string;
  score: number;
  level: number;
  badge: string;
};

const ALL_ACHIEVEMENTS = [
  { id: 1, icon: <Users className="w-5 h-5" />, label: "Bạn bè khắp nơi", desc: "Kết nối 10+ người bạn", unlocked: (u: any) => u.friendsCount >= 10, condition: "Có ≥ 10 bạn bè", color: "from-pink-400 to-rose-400", category: "profile" },
  { id: 2, icon: <Sparkles className="w-5 h-5" />, label: "Tân binh", desc: "Thành viên lâu năm", unlocked: (u: any) => u.joinedDays <= 30, condition: "Tham gia < 30 ngày", color: "from-emerald-400 to-teal-400", category: "profile" },
  { id: 3, icon: <Star className="w-5 h-5" />, label: "5 sao lấp lánh", desc: "Được crush cho 5 sao", unlocked: (u: any) => u.rating >= 5.0 && u.reviews >= 1, condition: "Rating = 5.0", color: "from-yellow-400 to-amber-400", category: "profile" },
  { id: 4, icon: <Shield className="w-5 h-5" />, label: "Chính chủ 100%", desc: "Xác minh CCCD xong", unlocked: (u: any) => u.isVerifiedId, condition: "Xác minh CCCD", color: "from-blue-400 to-sky-400", category: "profile" },
  { id: 5, icon: <Briefcase className="w-5 h-5" />, label: "Thợ cày", desc: "Cày 50 job như trâu", unlocked: (u: any) => u.completed >= 50, condition: "Hoàn thành ≥ 50 job", color: "from-indigo-400 to-blue-400", category: "profile" },
  { id: 6, icon: <Flame className="w-5 h-5" />, label: "Streak 30 ngày", desc: "Online không nghỉ ngày nào", unlocked: (u: any) => u.joinedDays >= 30, condition: "Tham gia ≥ 30 ngày", color: "from-orange-400 to-red-400", category: "profile" },
  { id: 7, icon: <Award className="w-5 h-5" />, label: "Profile xịn sò", desc: "Điền đủ 100% thông tin", unlocked: (u: any) => u.profileCompletion >= 100, condition: "Hồ sơ = 100%", color: "from-green-400 to-emerald-400", category: "profile" },
  { id: 8, icon: <Mail className="w-5 h-5" />, label: "Email real", desc: "Xác thực email rồi", unlocked: (u: any) => u.emailVerified, condition: "Xác minh email", color: "from-sky-400 to-blue-400", category: "profile" },
  { id: 9, icon: <Camera className="w-5 h-5" />, label: "Nhiếp ảnh gia", desc: "Đăng 5+ ảnh portfolio", unlocked: (u: any) => (u.portfolio?.length || 0) >= 5, condition: "Portfolio ≥ 5 mục", color: "from-teal-400 to-cyan-400", category: "profile" },
  { id: 10, icon: <Crown className="w-5 h-5" />, label: "Đại gia", desc: "Cày 100 job không biết mệt", unlocked: (u: any) => u.completed >= 100, condition: "Hoàn thành ≥ 100 job", color: "from-yellow-500 to-amber-500", category: "profile" },
  { id: 11, icon: <Clock className="w-5 h-5" />, label: "Lão làng", desc: "Tham gia 365 ngày", unlocked: (u: any) => u.joinedDays >= 365, condition: "Tham gia ≥ 1 năm", color: "from-lime-400 to-green-400", category: "profile" },
  { id: 12, icon: <Globe className="w-5 h-5" />, label: "Quốc tế hóa", desc: "Đi chơi với bạn nước ngoài", unlocked: () => false, condition: "Có task với user nước ngoài", color: "from-indigo-400 to-purple-400", category: "profile" },
  { id: 13, icon: <Gem className="w-5 h-5" />, label: "Kim cương", desc: "Đạt level 50", unlocked: (u: any) => u.level >= 50, condition: "Đạt Lv.50", color: "from-cyan-400 to-blue-500", category: "profile" },
  { id: 14, icon: <ShieldCheck className="w-5 h-5" />, label: "Uy tín 100%", desc: "Tin được như vàng 9999", unlocked: (u: any) => u.trustScore >= 100, condition: "Độ uy tín = 100%", color: "from-blue-500 to-indigo-500", category: "profile" },
  { id: 15, icon: <Crown className="w-5 h-5" />, label: "Top 1%", desc: "Lọt top 1% người dùng", unlocked: (u: any) => u.trustScore >= 95, condition: "Độ uy tín ≥ 95%", color: "from-amber-400 to-yellow-500", category: "profile" },
  { id: 16, icon: <Heart className="w-5 h-5" />, label: "Bạn thân 50 người", desc: "Mở rộng vòng kết nối", unlocked: (u: any) => u.friendsCount >= 50, condition: "Có ≥ 50 bạn bè", color: "from-rose-400 to-pink-500", category: "profile" },
  { id: 17, icon: <TrendingUp className="w-5 h-5" />, label: "Level 25+", desc: "Chăm cày lên level", unlocked: (u: any) => u.level >= 25, condition: "Đạt Lv.25", color: "from-purple-400 to-violet-400", category: "profile" },
  { id: 18, icon: <ThumbsUp className="w-5 h-5" />, label: "Được yêu thích", desc: "50+ đánh giá tích cực", unlocked: (u: any) => u.reviews >= 50, condition: "Reviews ≥ 50", color: "from-rose-400 to-pink-400", category: "profile" },
  { id: 19, icon: <BookOpen className="w-5 h-5" />, label: "Skill master", desc: "Thêm 10+ kỹ năng", unlocked: (u: any) => (u.skills?.length || 0) >= 10, condition: "Skills ≥ 10", color: "from-slate-400 to-gray-400", category: "profile" },
  { id: 20, icon: <MapPin className="w-5 h-5" />, label: "Dân chơi Sài Gòn", desc: "Check-in Ho Chi Minh City", unlocked: (u: any) => u.location?.includes("Hồ Chí Minh"), condition: "Location ở Sài gòn", color: "from-emerald-400 to-green-500", category: "profile" },
  { id: 21, icon: <Coffee className="w-5 h-5" />, label: "Trùm cafe", desc: "Tạo 5 kèo đi cafe", unlocked: () => false, condition: "Tạo 5 task cafe", color: "from-amber-600 to-yellow-600", category: "task" },
  { id: 22, icon: <Heart className="w-5 h-5" />, label: "Ông mai bà mối", desc: "Tạo 10 kèo hẹn hò", unlocked: () => false, condition: "Tạo 10 task hẹn hò", color: "from-rose-400 to-pink-500", category: "task" },
  { id: 23, icon: <Music className="w-5 h-5" />, label: "Party king", desc: "Tổ chức 3 buổi nhậu", unlocked: () => false, condition: "Tạo 3 task nhậu/party", color: "from-purple-400 to-fuchsia-400", category: "task" },
  { id: 24, icon: <Sun className="w-5 h-5" />, label: "Dậy sớm", desc: "Tạo task buổi sáng 10 lần", unlocked: () => false, condition: "Tạo 10 task buổi sáng", color: "from-yellow-400 to-orange-400", category: "task" },
  { id: 25, icon: <Gamepad2 className="w-5 h-5" />, label: "Game thủ", desc: "Tạo 5 kèo chơi game", unlocked: () => false, condition: "Tạo 5 task game", color: "from-violet-400 to-purple-400", category: "task" },
  { id: 26, icon: <Utensils className="w-5 h-5" />, label: "Food reviewer", desc: "Tạo 10 kèo đi ăn", unlocked: () => false, condition: "Tạo 10 task ăn uống", color: "from-orange-400 to-red-400", category: "task" },
  { id: 27, icon: <Dumbbell className="w-5 h-5" />, label: "Gymer", desc: "Rủ 5 người đi tập gym", unlocked: () => false, condition: "Tạo 5 task gym", color: "from-red-400 to-rose-400", category: "task" },
  { id: 28, icon: <Film className="w-5 h-5" />, label: "Mọt phim", desc: "Tạo 5 kèo xem phim", unlocked: () => false, condition: "Tạo 5 task xem phim", color: "from-slate-400 to-zinc-400", category: "task" },
  { id: 29, icon: <Plane className="w-5 h-5" />, label: "Phượt thủ", desc: "Tổ chức 3 chuyến đi chơi xa", unlocked: () => false, condition: "Tạo 3 task du lịch", color: "from-sky-400 to-blue-500", category: "task" },
  { id: 30, icon: <Moon className="w-5 h-5" />, label: "Cú đêm", desc: "Tạo 10 task buổi tối", unlocked: () => false, condition: "Tạo 10 task tối", color: "from-indigo-500 to-purple-600", category: "task" },
  { id: 31, icon: <Gift className="w-5 h-5" />, label: "Người hào phóng", desc: "Tạo 5 task miễn phí", unlocked: () => false, condition: "Tạo 5 task free", color: "from-pink-400 to-rose-400", category: "task" },
  { id: 32, icon: <Users className="w-5 h-5" />, label: "Nhóm trưởng", desc: "Tạo task cho 10+ người", unlocked: () => false, condition: "Task có 10+ người join", color: "from-cyan-400 to-blue-400", category: "task" },
  { id: 33, icon: <Calendar className="w-5 h-5" />, label: "Siêu bận rộn", desc: "Có task 7 ngày liên tiếp", unlocked: () => false, condition: "Tạo task 7 ngày liên tục", color: "from-teal-400 to-green-400", category: "task" },
  { id: 34, icon: <ShoppingBag className="w-5 h-5" />, label: "Thánh shopping", desc: "Rủ 5 người đi mua sắm", unlocked: () => false, condition: "Tạo 5 task shopping", color: "from-fuchsia-400 to-pink-400", category: "task" },
  { id: 35, icon: <Mic className="w-5 h-5" />, label: "Ca sĩ phòng trà", desc: "Tổ chức 3 buổi karaoke", unlocked: () => false, condition: "Tạo 3 task karaoke", color: "from-purple-500 to-pink-500", category: "task" },
  { id: 36, icon: <Bike className="w-5 h-5" />, label: "Vận động viên", desc: "Rủ 5 người đi đạp xe/chạy bộ", unlocked: () => false, condition: "Tạo 5 task thể thao", color: "from-green-500 to-emerald-500", category: "task" },
  { id: 37, icon: <Palette className="w-5 h-5" />, label: "Nghệ sĩ", desc: "Tổ chức workshop vẽ/nhạc", unlocked: () => false, condition: "Tạo 3 task workshop", color: "from-rose-400 to-orange-400", category: "task" },
  { id: 38, icon: <Beer className="w-5 h-5" />, label: "Bợm nhậu", desc: "Tạo 10 kèo nhậu", unlocked: () => false, condition: "Tạo 10 task nhậu", color: "from-amber-500 to-yellow-600", category: "task" },
  { id: 39, icon: <Map className="w-5 h-5" />, label: "Hướng dẫn viên", desc: "Dẫn 20 người đi chơi", unlocked: () => false, condition: "20+ người join task", color: "from-blue-400 to-cyan-400", category: "task" },
  { id: 40, icon: <PartyPopper className="w-5 h-5" />, label: "Vua task", desc: "Tạo 100 task đi chơi", unlocked: () => false, condition: "Tạo 100 task", color: "from-yellow-400 via-orange-400 to-red-400", category: "task" },
];

export default function LeaderboardModal({ onClose, currentUserId }: { onClose: () => void; currentUserId?: string }) {
  const db = getFirebaseDB();
  const [tab, setTab] = useState<"overview" | "badges" | "rank">("overview");
  const [userData, setUserData] = useState<UserProgress | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;
    const unsub = onSnapshot(doc(db, "users", currentUserId), async (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const level = Math.floor((d.huhaScore || 0) / 100) + 1;
        const exp = (d.huhaScore || 0) % 100;
        const joinedDays = d.createdAt?.seconds? Math.floor((Date.now() - d.createdAt.seconds * 1000) / 86400000) : 999;

        const friendsSnap = await getDocs(collection(db, "users", currentUserId, "friends"));
        setFriendCount(friendsSnap.size);

        const profileCompletion = Math.round(([
          d.avatar, d.bio, d.skills?.length, d.portfolio?.length, d.location, d.title, d.emailVerified, d.isVerifiedId,
        ].filter(Boolean).length / 8) * 100);

        const trustScore = Math.min(100, Math.floor((d.stats?.rating || 0) * 15 + (d.stats?.completed || 0) * 1.2 + (d.stats?.totalReviews || 0)));

        setUserData({
          uid: snap.id,
          name: d.name || "Bạn",
          avatar: d.avatar || "",
          level,
          exp,
          huhaScore: d.huhaScore || 0,
          streakDays: d.stats?.streakDays || 0,
          badges: d.badges || [],
          rank: d.rank || 0,
          vip: d.vip || { tier: 'free' },
          stats: {
            completed: d.stats?.completed || 0,
            rating: d.stats?.rating || 0,
            totalReviews: d.stats?.totalReviews || 0,
            friendsMade: friendsSnap.size,
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
        });
      }
    });
    return () => unsub();
  }, [currentUserId, db]);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("huhaScore", "desc"), limit(3));
    const unsub = onSnapshot(q, (snap) => {
      setTopUsers(snap.docs.map((d, idx) => ({
        uid: d.id,
        name: d.data().name,
        avatar: d.data().avatar,
        score: d.data().huhaScore || 0,
        level: Math.floor((d.data().huhaScore || 0) / 100) + 1,
        badge: idx === 0? "👑" : idx === 1? "🥈" : "🥉"
      })));
    });
    return () => unsub();
  }, [db]);

  const expPercent = userData? (userData.exp / 100) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-gradient-to-b from-amber-50 via-white to-orange-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-black rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="w-9 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header Level */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
<img src={userData?.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover ring-4 ring-amber-400/30" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center border-2 border-white dark:border-zinc-900">
                  <span className="text-xs font-black text-white">{userData?.level}</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-1.5">
                  {userData?.name}
                  {userData?.vip?.tier === 'elite' && <Crown className="text-amber-500" size={16} />}
                  {userData?.vip?.tier === 'pro' && <span className="text-sm">💎</span>}
                </h2>
                <p className="text-xs text-zinc-500">Hạng #{userData?.rank || '?'} • {userData?.huhaScore} điểm</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 -mr-1 flex items-center justify-center text-zinc-400">
              <FiX size={22} />
            </button>
          </div>

          {/* EXP Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-600 dark:text-amber-400">Level {userData?.level}</span>
              <span className="text-zinc-500">{userData?.exp}/100 EXP</span>
            </div>
            <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 rounded-full transition-all duration-500 shadow-lg shadow-orange-500/50" style={{ width: `${expPercent}%` }} />
            </div>
          </div>

          {/* Streak */}
          {userData && userData.streakDays > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-xl">
              <Flame className="text-orange-500" size={18} />
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                {userData.streakDays} ngày streak • x2 EXP
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            {[
              { id: "overview", label: "Tổng quan", icon: FiTrendingUp },
              { id: "badges", label: "Huy hiệu", icon: FiAward },
              { id: "rank", label: "Xếp hạng", icon: Trophy },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${tab === t.id? "bg-white dark:bg-zinc-900 shadow-sm text-amber-600 dark:text-amber-400" : "text-zinc-500"}`}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 pb-5">
          {tab === "overview" && (
            <div className="space-y-3">
              <div className="bg-white dark:bg-zinc-800/50 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Trophy className="text-amber-500" size={18} />
                  Top Vinh Danh Tuần Này
                </h3>
                <div className="space-y-2">
                  {topUsers.map((u, idx) => (
                    <div key={u.uid} className={`flex items-center gap-3 p-2.5 rounded-xl ${idx === 0? "bg-gradient-to-r from-amber-400/20 to-orange-500/20 border border-amber-500/30" : "bg-zinc-50 dark:bg-zinc-800/50"}`}>
                      <span className="text-2xl">{u.badge}</span>
<img src={u.avatar} alt="" className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.name}</p>
                        <p className="text-xs text-zinc-500">Lv.{u.level} • {u.score} điểm</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "badges" && (
            <div className="grid grid-cols-3 gap-3">
              {ALL_ACHIEVEMENTS.map((item) => {
                const u = userData;
                if (!u) return null;
                const unlocked = item.unlocked({
                  friendsCount: u.stats?.friendsMade || 0,
                  joinedDays: u.createdAt?.seconds? Math.floor((Date.now() - u.createdAt.seconds * 1000) / 86400000) : 999,
                  rating: u.stats?.rating || 0,
                  reviews: u.stats?.totalReviews || 0,
                  isVerifiedId: u.isVerifiedId || false,
                  completed: u.stats?.completed || 0,
                  profileCompletion: Math.round((Object.values(u).filter(Boolean).length / 8) * 100),
                  emailVerified: u.emailVerified || false,
                  portfolio: u.portfolio || [],
                  level: u.level,
                  trustScore: Math.min(100, Math.floor((u.stats?.rating || 0) * 15 + (u.stats?.completed || 0) * 1.2)),
                  skills: u.skills || [],
                  location: u.location || "",
                });
                return (
                  <div key={item.id} className={`p-3 rounded-2xl border text-center ${unlocked? "bg-gradient-to-br from-amber-400/20 to-orange-500/20 border-amber-500/30" : "bg-zinc-100 dark:bg-zinc-800/50 border-black/5 dark:border-white/5 opacity-50"}`}>
                    <div className={`text-3xl mb-1 ${unlocked? "" : "grayscale"}`}>{item.icon}</div>
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "rank" && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Xem đầy đủ BXH ở app chính
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
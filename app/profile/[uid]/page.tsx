"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDocs, // thêm
  collection, // thêm
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { toast, Toaster } from "sonner";
import {
  MessageCircle,
  UserPlus,
  Check,
  UserMinus,
  User, 
  Star,
  Briefcase,
  Info,
  MapPin,
  Clock,
  ExternalLink,
  Zap,
  Share2,
  Flag,
  Crown,
  Sparkles,
  Flame,
  Shield,
  
  Gem,
  ChevronRight,
  Coffee,
  Users,
  Heart,
  Award,
  Mail,
  Music,
  Camera,
  Sun,
  Globe,
  Gamepad2,
  Utensils,
  Dumbbell,
  Film,
  Plane,
  Moon,
  Gift,
  Calendar,
  ShoppingBag,
  Mic,
  Bike,
  Palette,
  Beer,
  Map,
  PartyPopper,
  TrendingUp,
  ThumbsUp,
  BookOpen,
  Phone,
  ShieldCheck,
  Lock,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";


type PublicUser = {
  uid: string;
  name: string;
  userId: string;
  avatar: string;
  bio?: string;
  birthday?: string;  
  phone?: string;
  title?: string;
  location?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  emailVerified?: boolean;
  isVerifiedId?: boolean;
  skills?: string[];
  portfolio?: {
    title: string;
    url: string;
  }[];
  stats?: {
    completed: number;
    rating: number;
    totalReviews: number;
    
  };
  createdAt?: Timestamp;
};

type RankData = {
  name: string;
  icon: React.ReactNode;
  gradient: string;
  glow: string;
};

export default function PublicProfile() {
  const { uid } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [targetUser, setTargetUser] = useState<PublicUser | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
const [friendCount, setFriendCount] = useState(0); // CHUYỂN LÊN ĐÂY
  const [showTrustInfo, setShowTrustInfo] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAchievementInfo, setShowAchievementInfo] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  // Component hàng thông tin
const InfoRow = ({
  icon,
  label,
  value,
  verified = false,
  empty = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  verified?: boolean;
  empty?: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-4 active:bg-zinc-50 transition-colors">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`${empty? 'text-zinc-300' : 'text-zinc-400'}`}>
        {icon}
      </div>
      <span className="text-[15px] text-zinc-700">{label}</span>
    </div>
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className={`text-[15px] ${empty? 'text-zinc-400' : 'text-zinc-900 font-medium'}`}>
        {value}
      </span>
      {verified && (
        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
        </div>
      )}
    </div>
  </div>
);


const Divider = () => <div className="h-px bg-zinc-100 ml-[52px]" />;

  // ===== TÍNH TOÁN STATS - CHỈ KHAI BÁO 1 LẦN =====
  const completed = targetUser?.stats?.completed || 0;
  const reviews = targetUser?.stats?.totalReviews || 0;
  const rating = targetUser?.stats?.rating || 0;
  

const xp =
  completed * 12 +
  reviews * 8 +
  Math.floor(rating * 20);

  const level = Math.max(1, Math.floor(xp / 300) + 1);
  const currentLevelXP = xp % 300;
  const progress = (currentLevelXP / 300) * 100;

const trustScore = Math.min(
  100,
  Math.floor(rating * 15 + completed * 1.2 + reviews) // BỎ + responseRate * 0.35
);

const joinedDays =
  targetUser?.createdAt?.seconds
  ? Math.floor(
      (Date.now() - targetUser.createdAt.seconds * 1000) / 86400000
    )
  : 999;

  const profileCompletion = Math.round(
    ([
      targetUser?.avatar,
      targetUser?.bio,
      targetUser?.skills?.length,
      targetUser?.portfolio?.length,
      targetUser?.location,
      targetUser?.title,
      targetUser?.emailVerified,
      targetUser?.isVerifiedId,
    ].filter(Boolean).length / 8) * 100
  );

  // ===== 40 THÀNH TỰU =====
  const allAchievements = useMemo(() => [
    // Profile 20 cái
  {
    id: 1,
    icon: <Users className="w-5 h-5" />,
    label: "Bạn bè khắp nơi",
    desc: "Kết nối 10+ người bạn",
    unlocked: friendCount >= 10,
    condition: "Có ≥ 10 bạn bè",
    color: "from-pink-400 to-rose-400",
    borderColor: "border-pink-400",
    category: "profile",
  },
    
    {
      id: 2,
      icon: <Sparkles className="w-5 h-5" />,
      label: "Tân binh",
      desc: "Thành viên lâu năm",
      unlocked: joinedDays <= 30,
      condition: "Tham gia < 30 ngày",
      color: "from-emerald-400 to-teal-400",
      borderColor: "border-emerald-400",
      category: "profile",
    },
    {
      id: 3,
      icon: <Star className="w-5 h-5" />,
      label: "5 sao lấp lánh",
      desc: "Được crush cho 5 sao",
      unlocked: rating >= 5.0 && reviews >= 1,
      condition: "Rating = 5.0",
      color: "from-yellow-400 to-amber-400",
      borderColor: "border-yellow-400",
      category: "profile",
    },
    {
      id: 4,
      icon: <Shield className="w-5 h-5" />,
      label: "Chính chủ 100%",
      desc: "Xác minh CCCD xong",
      unlocked: targetUser?.isVerifiedId || false,
      condition: "Xác minh CCCD",
      color: "from-blue-400 to-sky-400",
      borderColor: "border-blue-400",
      category: "profile",
    },
    {
      id: 5,
      icon: <Briefcase className="w-5 h-5" />,
      label: "Thợ cày",
      desc: "Cày 50 job như trâu",
      unlocked: completed >= 50,
      condition: "Hoàn thành ≥ 50 job",
      color: "from-indigo-400 to-blue-400",
      borderColor: "border-indigo-400",
      category: "profile",
    },
    {
      id: 6,
      icon: <Flame className="w-5 h-5" />,
      label: "Streak 30 ngày",
      desc: "Online không nghỉ ngày nào",
      unlocked: joinedDays >= 30,
      condition: "Tham gia ≥ 30 ngày",
      color: "from-orange-400 to-red-400",
      borderColor: "border-orange-400",
      category: "profile",
    },
    {
      id: 7,
      icon: <Award className="w-5 h-5" />,
      label: "Profile xịn sò",
      desc: "Điền đủ 100% thông tin",
      unlocked: profileCompletion >= 100,
      condition: "Hồ sơ = 100%",
      color: "from-green-400 to-emerald-400",
      borderColor: "border-green-400",
      category: "profile",
    },
    {
      id: 8,
      icon: <Mail className="w-5 h-5" />,
      label: "Email real",
      desc: "Xác thực email rồi",
      unlocked: targetUser?.emailVerified || false,
      condition: "Xác minh email",
      color: "from-sky-400 to-blue-400",
      borderColor: "border-sky-400",
      category: "profile",
    },
    {
      id: 9,
      icon: <Camera className="w-5 h-5" />,
      label: "Nhiếp ảnh gia",
      desc: "Đăng 5+ ảnh portfolio",
      unlocked: (targetUser?.portfolio?.length || 0) >= 5,
      condition: "Portfolio ≥ 5 mục",
      color: "from-teal-400 to-cyan-400",
      borderColor: "border-teal-400",
      category: "profile",
    },
    {
      id: 10,
      icon: <Crown className="w-5 h-5" />,
      label: "Đại gia",
      desc: "Cày 100 job không biết mệt",
      unlocked: completed >= 100,
      condition: "Hoàn thành ≥ 100 job",
      color: "from-yellow-500 to-amber-500",
      borderColor: "border-yellow-500",
      category: "profile",
    },
    {
      id: 11,
      icon: <Clock className="w-5 h-5" />,
      label: "Lão làng",
      desc: "Tham gia 365 ngày",
      unlocked: joinedDays >= 365,
      condition: "Tham gia ≥ 1 năm",
      color: "from-lime-400 to-green-400",
      borderColor: "border-lime-400",
      category: "profile",
    },
    {
      id: 12,
      icon: <Globe className="w-5 h-5" />,
      label: "Quốc tế hóa",
      desc: "Đi chơi với bạn nước ngoài",
      unlocked: false,
      condition: "Có task với user nước ngoài",
      color: "from-indigo-400 to-purple-400",
      borderColor: "border-indigo-400",
      category: "profile",
    },
    {
      id: 13,
      icon: <Gem className="w-5 h-5" />,
      label: "Kim cương",
      desc: "Đạt level 50",
      unlocked: level >= 50,
      condition: "Đạt Lv.50",
      color: "from-cyan-400 to-blue-500",
      borderColor: "border-cyan-400",
      category: "profile",
    },
    {
      id: 14,
      icon: <ShieldCheck className="w-5 h-5" />,
      label: "Uy tín 100%",
      desc: "Tin được như vàng 9999",
      unlocked: trustScore >= 100,
      condition: "Độ uy tín = 100%",
      color: "from-blue-500 to-indigo-500",
      borderColor: "border-blue-500",
      category: "profile",
    },
    {
      id: 15,
      icon: <Crown className="w-5 h-5" />,
      label: "Top 1%",
      desc: "Lọt top 1% người dùng",
      unlocked: trustScore >= 95,
      condition: "Độ uy tín ≥ 95%",
      color: "from-amber-400 to-yellow-500",
      borderColor: "border-amber-400",
      category: "profile",
    },
   {
  id: 16,
  icon: <Heart className="w-5 h-5" />,
  label: "Bạn thân 50 người",
  desc: "Mở rộng vòng kết nối",
  unlocked: friendCount >= 50,
  condition: "Có ≥ 50 bạn bè",
  color: "from-rose-400 to-pink-500",
  borderColor: "border-rose-400",
  category: "profile",
},
    {
      id: 17,
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Level 25+",
      desc: "Chăm cày lên level",
      unlocked: level >= 25,
      condition: "Đạt Lv.25",
      color: "from-purple-400 to-violet-400",
      borderColor: "border-purple-400",
      category: "profile",
    },
    {
      id: 18,
      icon: <ThumbsUp className="w-5 h-5" />,
      label: "Được yêu thích",
      desc: "50+ đánh giá tích cực",
      unlocked: reviews >= 50,
      condition: "Reviews ≥ 50",
      color: "from-rose-400 to-pink-400",
      borderColor: "border-rose-400",
      category: "profile",
    },
    {
      id: 19,
      icon: <BookOpen className="w-5 h-5" />,
      label: "Skill master",
      desc: "Thêm 10+ kỹ năng",
      unlocked: (targetUser?.skills?.length || 0) >= 10,
      condition: "Skills ≥ 10",
      color: "from-slate-400 to-gray-400",
      borderColor: "border-slate-400",
      category: "profile",
    },
    {
      id: 20,
      icon: <MapPin className="w-5 h-5" />,
      label: "Dân chơi Sài Gòn",
      desc: "Check-in Ho Chi Minh City",
      unlocked: targetUser?.location?.includes("Hồ Chí Minh") || false,
      condition: "Location ở HCM",
      color: "from-emerald-400 to-green-500",
      borderColor: "border-emerald-400",
      category: "profile",
    },
    // Task 20 cái
    {
      id: 21,
      icon: <Coffee className="w-5 h-5" />,
      label: "Trùm cafe",
      desc: "Tạo 5 kèo đi cafe",
      unlocked: false,
      condition: "Tạo 5 task cafe",
      color: "from-amber-600 to-yellow-600",
      borderColor: "border-amber-600",
      category: "task",
    },
    {
      id: 22,
      icon: <Heart className="w-5 h-5" />,
      label: "Ông mai bà mối",
      desc: "Tạo 10 kèo hẹn hò",
      unlocked: false,
      condition: "Tạo 10 task hẹn hò",
      color: "from-rose-400 to-pink-500",
      borderColor: "border-rose-400",
      category: "task",
    },
    {
      id: 23,
      icon: <Music className="w-5 h-5" />,
      label: "Party king",
      desc: "Tổ chức 3 buổi nhậu",
      unlocked: false,
      condition: "Tạo 3 task nhậu/party",
      color: "from-purple-400 to-fuchsia-400",
      borderColor: "border-purple-400",
      category: "task",
    },
    {
      id: 24,
      icon: <Sun className="w-5 h-5" />,
      label: "Dậy sớm",
      desc: "Tạo task buổi sáng 10 lần",
      unlocked: false,
      condition: "Tạo 10 task buổi sáng",
      color: "from-yellow-400 to-orange-400",
      borderColor: "border-yellow-400",
      category: "task",
    },
    {
      id: 25,
      icon: <Gamepad2 className="w-5 h-5" />,
      label: "Game thủ",
      desc: "Tạo 5 kèo chơi game",
      unlocked: false,
      condition: "Tạo 5 task game",
      color: "from-violet-400 to-purple-400",
      borderColor: "border-violet-400",
      category: "task",
    },
    {
      id: 26,
      icon: <Utensils className="w-5 h-5" />,
      label: "Food reviewer",
      desc: "Tạo 10 kèo đi ăn",
      unlocked: false,
      condition: "Tạo 10 task ăn uống",
      color: "from-orange-400 to-red-400",
      borderColor: "border-orange-400",
      category: "task",
    },
    {
      id: 27,
      icon: <Dumbbell className="w-5 h-5" />,
      label: "Gymer",
      desc: "Rủ 5 người đi tập gym",
      unlocked: false,
      condition: "Tạo 5 task gym",
      color: "from-red-400 to-rose-400",
      borderColor: "border-red-400",
      category: "task",
    },
    {
      id: 28,
      icon: <Film className="w-5 h-5" />,
      label: "Mọt phim",
      desc: "Tạo 5 kèo xem phim",
      unlocked: false,
      condition: "Tạo 5 task xem phim",
      color: "from-slate-400 to-zinc-400",
      borderColor: "border-slate-400",
      category: "task",
    },
    {
      id: 29,
      icon: <Plane className="w-5 h-5" />,
      label: "Phượt thủ",
      desc: "Tổ chức 3 chuyến đi chơi xa",
      unlocked: false,
      condition: "Tạo 3 task du lịch",
      color: "from-sky-400 to-blue-500",
      borderColor: "border-sky-400",
      category: "task",
    },
    {
      id: 30,
      icon: <Moon className="w-5 h-5" />,
      label: "Cú đêm",
      desc: "Tạo 10 task buổi tối",
      unlocked: false,
      condition: "Tạo 10 task tối",
      color: "from-indigo-500 to-purple-600",
      borderColor: "border-indigo-500",
      category: "task",
    },
    {
      id: 31,
      icon: <Gift className="w-5 h-5" />,
      label: "Người hào phóng",
      desc: "Tạo 5 task miễn phí",
      unlocked: false,
      condition: "Tạo 5 task free",
      color: "from-pink-400 to-rose-400",
      borderColor: "border-pink-400",
      category: "task",
    },
    {
      id: 32,
      icon: <Users className="w-5 h-5" />,
      label: "Nhóm trưởng",
      desc: "Tạo task cho 10+ người",
      unlocked: false,
      condition: "Task có 10+ người join",
      color: "from-cyan-400 to-blue-400",
      borderColor: "border-cyan-400",
      category: "task",
    },
    {
      id: 33,
      icon: <Calendar className="w-5 h-5" />,
      label: "Siêu bận rộn",
      desc: "Có task 7 ngày liên tiếp",
      unlocked: false,
      condition: "Tạo task 7 ngày liên tục",
      color: "from-teal-400 to-green-400",
      borderColor: "border-teal-400",
      category: "task",
    },
    {
      id: 34,
      icon: <ShoppingBag className="w-5 h-5" />,
      label: "Thánh shopping",
      desc: "Rủ 5 người đi mua sắm",
      unlocked: false,
      condition: "Tạo 5 task shopping",
      color: "from-fuchsia-400 to-pink-400",
      borderColor: "border-fuchsia-400",
      category: "task",
    },
    {
      id: 35,
      icon: <Mic className="w-5 h-5" />,
      label: "Ca sĩ phòng trà",
      desc: "Tổ chức 3 buổi karaoke",
      unlocked: false,
      condition: "Tạo 3 task karaoke",
      color: "from-purple-500 to-pink-500",
      borderColor: "border-purple-500",
      category: "task",
    },
    {
      id: 36,
      icon: <Bike className="w-5 h-5" />,
      label: "Vận động viên",
      desc: "Rủ 5 người đi đạp xe/chạy bộ",
      unlocked: false,
      condition: "Tạo 5 task thể thao",
      color: "from-green-500 to-emerald-500",
      borderColor: "border-green-500",
      category: "task",
    },
    {
      id: 37,
      icon: <Palette className="w-5 h-5" />,
      label: "Nghệ sĩ",
      desc: "Tổ chức workshop vẽ/nhạc",
      unlocked: false,
      condition: "Tạo 3 task workshop",
      color: "from-rose-400 to-orange-400",
      borderColor: "border-rose-400",
      category: "task",
    },
    {
      id: 38,
      icon: <Beer className="w-5 h-5" />,
      label: "Bợm nhậu",
      desc: "Tạo 10 kèo nhậu",
      unlocked: false,
      condition: "Tạo 10 task nhậu",
      color: "from-amber-500 to-yellow-600",
      borderColor: "border-amber-500",
      category: "task",
    },
    {
      id: 39,
      icon: <Map className="w-5 h-5" />,
      label: "Hướng dẫn viên",
      desc: "Dẫn 20 người đi chơi",
      unlocked: false,
      condition: "20+ người join task",
      color: "from-blue-400 to-cyan-400",
      borderColor: "border-blue-400",
      category: "task",
    },
    {
      id: 40,
      icon: <PartyPopper className="w-5 h-5" />,
      label: "Vua task",
      desc: "Tạo 100 task đi chơi",
      unlocked: false,
      condition: "Tạo 100 task",
      color: "from-yellow-400 via-orange-400 to-red-400",
      borderColor: "border-orange-400",
      category: "task",
    },
], [rating, completed, trustScore, joinedDays, targetUser, reviews, profileCompletion, level, friendCount]);

  
  const isOwnProfile = user?.uid === uid;

const fetchUser = useCallback(async () => {
  if (!uid || !user || typeof uid !== 'string') return; // THÊM typeof

  try {
    const [userSnap, currentUserSnap] = await Promise.all([
      getDoc(doc(db, "users", uid as string)),
      getDoc(doc(db, "users", user.uid)),
    ]);

    if (!userSnap.exists()) {
      toast.error("Không tìm thấy người dùng");
      router.replace("/404");
      return;
    }

    const data = {
      uid: userSnap.id,
      ...userSnap.data(),
    } as PublicUser;

    setTargetUser(data);

    if (currentUserSnap.exists()) {
      setCurrentUserData(currentUserSnap.data());
    }

    const friendSnap = await getDoc(
      doc(db, "users", user.uid, "friends", userSnap.id)
    );
    setIsFriend(friendSnap.exists());

    try {
  const friendsCollection = await getDocs(collection(db, "users", uid as string, "friends"));
  setFriendCount(friendsCollection.size);
} catch (e) {
  console.warn("Không đọc được số bạn bè:", e);
  setFriendCount(0); // Set 0 nếu không có quyền đọc
}

  } catch (err) {
    console.error(err);
    toast.error("Có lỗi xảy ra");
   
  } finally {
    setLoading(false);
  }
}, [uid, user, db, router]);

  

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleConnect = async () => {
    if (!user ||!targetUser || actionLoading) return;

    if (user.uid === targetUser?.uid) {
      return toast.error("Đây là bạn");
    }

    setActionLoading(true);

    try {
      await Promise.all([
        setDoc(
          doc(db, "users", user.uid, "friends", targetUser?.uid),
          {
            createdAt: serverTimestamp(),
            status: "accepted",
            name: targetUser?.name || "Unknown User",
            avatar: targetUser?.avatar || "",
            userId: targetUser?.userId || "",
            title: targetUser?.title || "",
          }
        ),
        setDoc(
          doc(db, "users", targetUser?.uid, "friends", user.uid),
          {
            createdAt: serverTimestamp(),
            status: "accepted",
            name: currentUserData?.name || user.displayName || "User",
            avatar: currentUserData?.avatar || user.photoURL || "",
            userId: currentUserData?.userId || "",
            title: currentUserData?.title || "",
          }
        ),
      ]);

      setIsFriend(true);
      toast.success(`Đã kết nối với ${targetUser?.name}`);
      if ("vibrate" in navigator) {
        navigator.vibrate(8);
      }
    } catch (err) {
      console.error(err);
      toast.error("Kết nối thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!user ||!targetUser || actionLoading) return;

    setActionLoading(true);

    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid, "friends", targetUser?.uid)),
        deleteDoc(doc(db, "users", targetUser?.uid, "friends", user.uid)),
      ]);

      setIsFriend(false);
      toast.success("Đã hủy kết nối");
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const levelTiers = [
    {
      range: "1 - 7",
      name: "Mới tham gia",
      icon: <Sparkles className="w-4 h-4" />,
      gradient: "from-sky-400 to-blue-600",
      xp: "0 - 2,100",
      perks: "Bắt đầu hành trình trên Airanh",
    },
    {
      range: "8 - 19",
      name: "Thành viên tích cực",
      icon: <Flame className="w-4 h-4" />,
      gradient: "from-emerald-500 to-teal-500",
      xp: "2,100 - 5,700",
      perks: "Hoạt động thường xuyên, được đánh giá tốt",
    },
    {
      range: "20 - 34",
      name: "Đối tác tin cậy",
      icon: <Shield className="w-4 h-4" />,
      gradient: "from-blue-500 to-sky-500",
      xp: "5,700 - 10,200",
      perks: "Được cộng đồng tin tưởng cao",
    },
    {
      range: "35 - 49",
      name: "Chuyên gia",
      icon: <Gem className="w-4 h-4" />,
      gradient: "from-violet-500 to-fuchsia-500",
      xp: "10,200 - 14,700",
      perks: "Kinh nghiệm dày dặn, uy tín hàng đầu",
    },
    {
      range: "50+",
      name: "Huyền thoại",
      icon: <Crown className="w-4 h-4" />,
      gradient: "from-amber-400 to-orange-500",
      xp: "14,700+",
      perks: "Biểu tượng uy tín của cộng đồng",
    },
  ];

  const handleShare = async () => {
    if (!targetUser) return;

    const url = `https://airanh.vercel.app/profile/${targetUser?.uid}`;

    if (navigator.share) {
      await navigator.share({
        title: targetUser?.name,
        text: `Xem hồ sơ ${targetUser?.name}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }
  };

  const formatLastSeen = (timestamp?: Timestamp) => {
    if (!timestamp) {
      return "Lâu rồi";
    }

    return formatDistanceToNow(timestamp.toDate(), {
      addSuffix: true,
      locale: vi,
    });
  };

  const rank: RankData = useMemo(() => {
    if (level >= 50) {
      return {
        name: "Huyền thoại",
        icon: <Crown className="w-3.5 h-3.5" />,
        gradient: "from-amber-400 to-orange-500",
        glow: "shadow-amber-500/20",
      };
    }
    if (level >= 35) {
      return {
        name: "Chuyên gia",
        icon: <Gem className="w-3.5 h-3.5" />,
        gradient: "from-violet-500 to-fuchsia-500",
        glow: "shadow-violet-500/20",
      };
    }
    if (level >= 20) {
      return {
        name: "Đối tác tin cậy",
        icon: <Shield className="w-3.5 h-3.5" />,
        gradient: "from-blue-500 to-sky-500",
        glow: "shadow-blue-500/20",
      };
    }
    if (level >= 8) {
      return {
        name: "Thành viên tích cực",
        icon: <Flame className="w-3.5 h-3.5" />,
        gradient: "from-emerald-500 to-teal-500",
        glow: "shadow-emerald-500/20",
      };
    }
    return {
      name: "Mới tham gia",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      gradient: "from-sky-400 to-blue-600",
      glow: "shadow-blue-500/20",
    };
  }, [level]);





if (loading) {
  return (
    <div className="
      min-h-screen
      bg-[#020617]
      overflow-hidden
      relative
    ">
      <div className="
        absolute inset-0
        bg-[radial-gradient(circle_at_top,#2563EB,transparent_40%)]
        opacity-30
      " />
      <div className="
        relative z-10
        px-6 py-10
        max-w-md mx-auto
        animate-pulse
      ">
        <div className="
          w-32 h-32
          rounded-full
          bg-white/10
          mx-auto
        " />
        <div className="
          h-8
          rounded-2xl
          bg-white/10
          mt-6
          w-56
          mx-auto
        " />
        <div className="
          h-4
          rounded-xl
          bg-white/10
          mt-3
          w-40
          mx-auto
        " />
      </div>
    </div>
  );
}
if (!targetUser) return null;

return (
  <div className="min-h-screen bg-zinc-50 pb-28">
    <Toaster richColors position="top-center" />

{/* HEADER - TRẮNG SẠCH */}
<div className="relative bg-white pt-3 pb-4">


  {/* AVATAR + INFO - GIẢM KHOẢNG CÁCH */}
  <div className="flex flex-col items-center">
    <div className="relative">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 p-0.5 shadow-lg">
        <div className="w-full h-full rounded-full bg-white p-0.5">
          <img
            src={
              targetUser?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                targetUser?.name || "User"
              )}&size=200&background=E5E5E5&color=525252`
            }
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      {targetUser?.online && (
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-[2.5px] border-white shadow-md animate-pulse" />
      )}
      {isOwnProfile && (
        <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-all border border-zinc-200">
          <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>

    <div className="flex items-center justify-center gap-1.5 mt-2.5">
      <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
        {targetUser?.name || "Unknown User"}
      </h1>
      {targetUser?.emailVerified && (
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white stroke-[3]" />
        </div>
      )}
    </div>

    {/* BỎ USERID */}

    {/* RANK BADGE - INFO NÚT NHỎ GÓC PHẢI */}
<div className="mt-2.5 relative inline-block">
  <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${rank.gradient} text-white flex items-center gap-1.5 shadow-lg`}>
    {rank.icon}
    <span className="font-bold text-xs">{rank.name}</span>
    <div className="px-2 py-0.5 rounded-full bg-white/30 text- font-black backdrop-blur-sm">
      Lv.{level}
    </div>
  </div>
  
  {/* Nút info nhỏ góc phải như ô Độ uy tín */}
  <button
    onClick={() => setShowLevelInfo(true)}
    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95 shadow-sm"
  >
    <Info className="w-2.5 h-2.5 text-zinc-500" />
  </button>
</div>

{/* HOẠT ĐỘNG + VỊ TRÍ */}
<div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100">
    <div className={`w-1.5 h-1.5 rounded-full ${targetUser?.online? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
    <span className="text-xs text-zinc-600 font-medium">
      {targetUser?.online
       ? "Online"
        : formatLastSeen(targetUser?.lastSeen)}
    </span>
  </div>

  {targetUser?.location && (
    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100">
      <MapPin className="w-3 h-3 text-zinc-500" />
      <span className="text-xs text-zinc-600 font-medium">
        {targetUser.location}
      </span>
    </div>
  )}
</div>
{/* 4 NÚT ICON - KHÔNG CHỮ */}
{!isOwnProfile && (
  <div className="flex items-center justify-center gap-3 mt-3">
    <button
      onClick={() => router.push(`/chat/${targetUser?.uid}`)}
      className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center active:scale-90 transition-all"
    >
      <MessageCircle className="w-5 h-5 text-blue-600" />
    </button>
    
    <button
      onClick={isFriend ? handleUnfriend : handleConnect}
      disabled={actionLoading}
      className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
    >
      {isFriend ? (
        <UserMinus className="w-5 h-5 text-pink-600" />
      ) : (
        <UserPlus className="w-5 h-5 text-pink-600" />
      )}
    </button>

    <button
      onClick={handleShare}
      className="w-11 h-11 rounded-full bg-sky-50 flex items-center justify-center active:scale-90 transition-all"
    >
      <Share2 className="w-5 h-5 text-sky-600" />
    </button>

    <button
      onClick={() => setShowMore(!showMore)}
      className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center active:scale-90 transition-all"
    >
      <Flag className="w-5 h-5 text-orange-600" />
    </button>
  </div>
)}
  </div>
</div>

<div className="px-4 pt-3">
  <div className="max-w-md mx-auto space-y-3">

{/* THÔNG TIN CÁ NHÂN - CĂN GIỮA + HIỆU ỨNG */}
<div className="mb-3">
  <button
    onClick={() => setShowUserInfo(true)}
    className="w-full rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group"
  >
    {/* Hiệu ứng pulse gợi ý click */}
    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 animate-[shimmer_2s_infinite] -translate-x-full group-hover:animate-none" />
    
    <div className="flex items-center justify-center gap-2 relative">
      <User className="w-4 h-4 text-blue-600 animate-pulse" />
      <span className="text-sm font-bold text-blue-900 uppercase tracking-wide">
        THÔNG TIN CÁ NHÂN
      </span>
      <ChevronRight className="w-4 h-4 text-blue-600 animate-pulse" />
    </div>
    
    {/* Chỉ hiện với chủ profile */}
    {isOwnProfile && (
      <div className="mt-1.5 text-xs text-blue-700 font-medium">
        Hoàn thiện {profileCompletion}%
      </div>
    )}
  </button>
</div>


{/* STATS */}
<div className="grid grid-cols-4 gap-2">
  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm relative">
    <button
      onClick={() => setShowTrustInfo(true)}
      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95"
    >
      <Info className="w-2.5 h-2.5 text-zinc-500" />
    </button>
    <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
      <Shield className="w-4 h-4" />
      <span className="text-base font-bold">{trustScore}%</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Độ uy tín</p>
  </div>

  {/* THAY TỪ PHẢN HỒI -> BẠN BÈ */}
  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-pink-500 mb-1">
      <Users className="w-4 h-4" />
      <span className="text-base font-bold">{friendCount}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Bạn bè</p>
  </div>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-sky-500 mb-1">
      <Briefcase className="w-4 h-4" />
      <span className="text-base font-bold">{completed}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Hoàn thành</p>
  </div>

  <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm">
    <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
      <Star className="w-4 h-4 fill-current" />
      <span className="text-base font-bold">{reviews}</span>
    </div>
    <p className="text-xs text-zinc-500 leading-tight">Đánh giá</p>
  </div>
</div>
{/* THÀNH TỰU - THIẾT KẾ HEXAGON */}
<div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <p className="text-sm font-bold text-zinc-900">Thành tựu</p>
    <button
      onClick={() => {
        setSelectedAchievement(null);
        setShowAchievementInfo(true);
      }}
      className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center active:scale-95"
    >
      <Info className="w-3 h-3 text-zinc-500" />
    </button>
  </div>
  
  <div className="grid grid-cols-3 gap-3">
    {allAchievements.slice(0, 6).map((item) => (
      <button
        key={item.id}
        onClick={() => {
          setSelectedAchievement(item);
          setShowAchievementInfo(true);
        }}
        className="flex flex-col items-center active:scale-95 transition-all"
      >
        {/* HEXAGON */}
        <div className="relative w-16 h-16 mb-2">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              {item.unlocked && (
                <linearGradient id={`gradient-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={item.color.includes('amber')? '#FBBF24' : 
                    item.color.includes('emerald')? '#34D399' :
                    item.color.includes('violet')? '#A78BFA' :
                    item.color.includes('yellow')? '#FACC15' :
                    item.color.includes('blue')? '#60A5FA' :
                    item.color.includes('indigo')? '#818CF8' :
                    item.color.includes('orange')? '#FB923C' :
                    item.color.includes('rose')? '#FB7185' :
                    item.color.includes('green')? '#4ADE80' :
                    item.color.includes('sky')? '#38BDF8' :
                    item.color.includes('purple')? '#C084FC' :
                    item.color.includes('teal')? '#2DD4BF' :
                    item.color.includes('lime')? '#A3E635' :
                    item.color.includes('pink')? '#F472B6' :
                    item.color.includes('cyan')? '#22D3EE' :
                    item.color.includes('fuchsia')? '#E879F9' : '#60A5FA'
                  } />
                  <stop offset="100%" stopColor={item.color.includes('orange')? '#FB923C' : 
                    item.color.includes('teal')? '#2DD4BF' :
                    item.color.includes('fuchsia')? '#E879F9' :
                    item.color.includes('amber')? '#FBBF24' :
                    item.color.includes('sky')? '#38BDF8' :
                    item.color.includes('blue')? '#3B82F6' :
                    item.color.includes('red')? '#F87171' :
                    item.color.includes('pink')? '#F472B6' :
                    item.color.includes('emerald')? '#34D399' :
                    item.color.includes('purple')? '#C084FC' :
                    item.color.includes('yellow')? '#FACC15' :
                    item.color.includes('indigo')? '#818CF8' : '#3B82F6'
                  } />
                </linearGradient>
              )}
            </defs>
            <polygon
              points="50 1 95 25 95 75 50 99 5 75 5 25"
              fill={item.unlocked? `url(#gradient-${item.id})` : "none"}
              stroke={item.unlocked? "none" : "#D4D4D8"}
              strokeWidth="2"
              strokeDasharray={item.unlocked? "none" : "4 4"}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center ${
            item.unlocked? "text-white" : "text-zinc-400"
          }`}>
            {item.unlocked? item.icon : <Lock className="w-5 h-5" />}
          </div>
        </div>
        
        <p className="text-xs font-semibold text-zinc-900 text-center leading-tight">
          {item.label}
        </p>
        <p className="text-[10px] text-zinc-500 text-center leading-tight mt-0.5 line-clamp-2">
          {item.desc}
        </p>
      </button>
    ))}
  </div>

  {allAchievements.length > 6 && (
    <button
      onClick={() => {
        setSelectedAchievement(null);
        setShowAchievementInfo(true);
      }}
      className="w-full mt-3 py-2 rounded-xl bg-zinc-50 text-xs font-semibold text-zinc-600 active:bg-zinc-100"
    >
      Xem tất cả {allAchievements.length} thành tựu
    </button>
  )}
</div>



{/* SKILLS */}
{targetUser?.skills && targetUser?.skills.length > 0 && (
  <div className="mt-5">
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        Kỹ năng
      </p>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="flex flex-wrap gap-2">
      {targetUser?.skills.map((skill) => (
        <div
          key={skill}
          className="px-3.5 py-2 rounded-2xl border border-zinc-200/80 bg-white text-sm font-medium text-zinc-700 shadow-sm"
        >
          {skill}
        </div>
      ))}
    </div>
  </div>
)}

{/* PORTFOLIO */}
{targetUser?.portfolio && targetUser?.portfolio.length > 0 && (
  <div className="mt-6">
    <div className="flex items-center justify-between mb-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
        Portfolio
      </p>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="space-y-2.5">
      {targetUser?.portfolio.slice(0, 4).map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm active:scale-[0.98] transition-all"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {item.title}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Portfolio project</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-zinc-400" />
          </div>
        </a>
      ))}
    </div>
  </div>
)}




<Dialog.Root open={showLevelInfo} onOpenChange={setShowLevelInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-50 shadow-2xl">
      <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4">
        Hệ thống cấp độ Airanh
      </Dialog.Title>

      {/* CÔNG THỨC TÍNH XP */}
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
      <span>{xp} XP</span>
    </div>
    <div className="text-xs text-blue-700 mt-1">
      Mỗi level cần 300 XP
    </div>
  </div>
</div>

      {/* BẢNG RANK */}
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
        Các cấp độ
      </p>
      <div className="space-y-2.5">
        {levelTiers.map((tier, i) => (
 <div
  key={i}
  className={`p-3.5 rounded-2xl border ${
  level >= parseInt(tier.range.split(" - ")[0] || "0")
     ? "border-zinc-300 bg-zinc-50"
      : "border-zinc-200 bg-white opacity-60"
  }`}
>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-r ${tier.gradient} text-white flex items-center justify-center shadow-sm`}
                >
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
            <p className="text-xs text-zinc-600 leading-5">{tier.perks}</p>
          </div>
        ))}
      </div>

      {/* LEVEL HIỆN TẠI */}
      <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white">
        <p className="text-xs text-zinc-400 mb-1">Level hiện tại của bạn</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-r ${rank.gradient} flex items-center justify-center`}
            >
              {rank.icon}
            </div>
            <div>
              <p className="font-bold">{rank.name}</p>
              <p className="text-xs text-zinc-300">Lv.{level}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{xp}</p>
            <p className="text-xs text-zinc-400">XP</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Tiến trình</span>
            <span className="text-zinc-300">{currentLevelXP}/300 XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${rank.gradient}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
        Đã hiểu
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
<Dialog.Root open={showTrustInfo} onOpenChange={setShowTrustInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-50 shadow-2xl">
      <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-500" />
        Độ uy tín được tính thế nào?
      </Dialog.Title>

      <p className="text-sm text-zinc-600 mb-4">
        Độ uy tín phản ánh mức độ tin cậy của bạn dựa trên hoạt động thực tế. Điểm càng cao càng được ưu tiên.
      </p>

      {/* BREAKDOWN CHI TIẾT */}
<div className="space-y-3 mb-5">
  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-semibold text-zinc-700">Đánh giá trung bình</span>
      <span className="text-sm font-bold text-blue-600">
        +{Math.min(Math.floor(rating * 15), 40)}/40
      </span>
    </div>
    <p className="text-xs text-zinc-500">
      {rating} sao × 15 điểm. Tối đa 40 điểm
    </p>
  </div>

  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-semibold text-zinc-700">Công việc hoàn thành</span>
      <span className="text-sm font-bold text-blue-600">
        +{Math.min(Math.floor(completed * 1.2), 30)}/30
      </span>
    </div>
    <p className="text-xs text-zinc-500">
      {completed} job × 1.2 điểm. Tối đa 30 điểm
    </p>
  </div>

  <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
    <div className="flex justify-between items-center mb-1">
      <span className="text-sm font-semibold text-zinc-700">Số lượng đánh giá</span>
      <span className="text-sm font-bold text-blue-600">
        +{Math.min(reviews, 15)}/15
      </span>
    </div>
    <p className="text-xs text-zinc-500">
      {reviews} đánh giá × 1 điểm. Tối đa 15 điểm
    </p>
  </div>
</div>

        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-zinc-700">Xác minh tài khoản</span>
            <span className="text-sm font-bold text-blue-600">
              +{(targetUser?.emailVerified? 5 : 0) + (targetUser?.isVerifiedId? 5 : 0)}/10
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Email {targetUser?.emailVerified? '✓ +5' : '✗ 0'}, CCCD {targetUser?.isVerifiedId? '✓ +5' : '✗ 0'}
          </p>
        </div>

   <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200">
  <div className="flex justify-between items-center mb-1">
    <span className="text-sm font-semibold text-zinc-700">Thời gian tham gia</span>
    <span className="text-sm font-bold text-blue-600">
      +{Math.min(Math.floor(joinedDays / 30), 5)}/5
    </span>
  </div>
  <p className="text-xs text-zinc-500">
    {joinedDays > 0
      ? `${joinedDays} ngày = ${Math.floor(joinedDays / 30)} tháng. Tối đa 5 điểm`
      : "Chưa có dữ liệu. Tối đa 5 điểm"}
  </p>
</div>
  

     
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Tổng điểm uy tín</span>
          <span className="text-2xl font-bold">{trustScore}/100</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${trustScore}%` }}
          />
        </div>
      </div>

      <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
        Đã hiểu
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
<Dialog.Root open={showAchievementInfo} onOpenChange={setShowAchievementInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 z-50 shadow-2xl">
      {selectedAchievement? (
        <>
          <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg"
              style={{
                background: selectedAchievement.unlocked 
                 ? `linear-gradient(135deg, ${selectedAchievement.color.includes('amber')? '#FBBF24' : 
                      selectedAchievement.color.includes('emerald')? '#34D399' :
                      selectedAchievement.color.includes('violet')? '#A78BFA' :
                      selectedAchievement.color.includes('yellow')? '#FACC15' :
                      selectedAchievement.color.includes('blue')? '#60A5FA' :
                      selectedAchievement.color.includes('indigo')? '#818CF8' :
                      selectedAchievement.color.includes('orange')? '#FB923C' :
                      selectedAchievement.color.includes('rose')? '#FB7185' :
                      selectedAchievement.color.includes('green')? '#4ADE80' :
                      selectedAchievement.color.includes('sky')? '#38BDF8' :
                      selectedAchievement.color.includes('purple')? '#C084FC' :
                      selectedAchievement.color.includes('teal')? '#2DD4BF' :
                      selectedAchievement.color.includes('lime')? '#A3E635' :
                      selectedAchievement.color.includes('pink')? '#F472B6' :
                      selectedAchievement.color.includes('cyan')? '#22D3EE' :
                      selectedAchievement.color.includes('fuchsia')? '#E879F9' : '#60A5FA'}, ${
                      selectedAchievement.color.includes('orange')? '#FB923C' : 
                      selectedAchievement.color.includes('teal')? '#2DD4BF' :
                      selectedAchievement.color.includes('fuchsia')? '#E879F9' :
                      selectedAchievement.color.includes('amber')? '#FBBF24' :
                      selectedAchievement.color.includes('sky')? '#38BDF8' :
                      selectedAchievement.color.includes('blue')? '#3B82F6' :
                      selectedAchievement.color.includes('red')? '#F87171' :
                      selectedAchievement.color.includes('pink')? '#F472B6' :
                      selectedAchievement.color.includes('emerald')? '#34D399' :
                      selectedAchievement.color.includes('purple')? '#C084FC' :
                      selectedAchievement.color.includes('yellow')? '#FACC15' :
                      selectedAchievement.color.includes('indigo')? '#818CF8' : '#3B82F6'})`
                  : '#F4F4F5'
              }}
            >
              <div className={selectedAchievement.unlocked? "text-white" : "text-zinc-400"}>
                {selectedAchievement.icon}
              </div>
            </div>
            <div>
              <p>{selectedAchievement.label}</p>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                {selectedAchievement.category === 'task'? 'Thành tựu Task' : 'Thành tựu Profile'}
              </p>
            </div>
          </Dialog.Title>
          
          <p className="text-sm text-zinc-600 mb-4 leading-6">{selectedAchievement.desc}</p>
          
          <div className={`p-4 rounded-2xl border ${selectedAchievement.unlocked? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'}`}>
            <p className="text-xs font-bold text-zinc-700 mb-2 uppercase tracking-wider">Điều kiện mở khóa</p>
            <p className="text-sm text-zinc-700 font-medium">{selectedAchievement.condition}</p>
          </div>
          
          {selectedAchievement.unlocked && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="text-sm font-bold">Đã mở khóa</span>
            </div>
          )}
        </>
      ) : (
        <>
          <Dialog.Title className="text-xl font-bold text-zinc-900 mb-4">
            Tất cả thành tựu
          </Dialog.Title>
          <p className="text-xs text-zinc-500 mb-4">
            Đã mở khóa {allAchievements.filter(a => a.unlocked).length}/{allAchievements.length} thành tựu
          </p>
          <div className="grid grid-cols-3 gap-3">
            {allAchievements.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedAchievement(item)}
                className="flex flex-col items-center active:scale-95 transition-all"
              >
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1.5 ${
                    item.unlocked? '' : 'bg-zinc-100 border-2 border-dashed border-zinc-300'
                  }`}
                  style={item.unlocked? {
                    background: `linear-gradient(135deg, ${item.color.includes('amber')? '#FBBF24' : 
                      item.color.includes('emerald')? '#34D399' :
                      item.color.includes('violet')? '#A78BFA' :
                      item.color.includes('yellow')? '#FACC15' :
                      item.color.includes('blue')? '#60A5FA' :
                      item.color.includes('indigo')? '#818CF8' :
                      item.color.includes('orange')? '#FB923C' :
                      item.color.includes('rose')? '#FB7185' :
                      item.color.includes('green')? '#4ADE80' :
                      item.color.includes('sky')? '#38BDF8' :
                      item.color.includes('purple')? '#C084FC' :
                      item.color.includes('teal')? '#2DD4BF' :
                      item.color.includes('lime')? '#A3E635' :
                      item.color.includes('pink')? '#F472B6' :
                      item.color.includes('cyan')? '#22D3EE' :
                      item.color.includes('fuchsia')? '#E879F9' : '#60A5FA'}, ${
                      item.color.includes('orange')? '#FB923C' : 
                      item.color.includes('teal')? '#2DD4BF' :
                      item.color.includes('fuchsia')? '#E879F9' :
                      item.color.includes('amber')? '#FBBF24' :
                      item.color.includes('sky')? '#38BDF8' :
                      item.color.includes('blue')? '#3B82F6' :
                      item.color.includes('red')? '#F87171' :
                      item.color.includes('pink')? '#F472B6' :
                      item.color.includes('emerald')? '#34D399' :
                      item.color.includes('purple')? '#C084FC' :
                      item.color.includes('yellow')? '#FACC15' :
                      item.color.includes('indigo')? '#818CF8' : '#3B82F6'})`
                  } : {}}
                >
                  <div className={item.unlocked? "text-white" : "text-zinc-400"}>
                    {item.unlocked? item.icon : <Lock className="w-4 h-4" />}
                  </div>
                </div>
                <p className="text-xs font-semibold text-zinc-700 text-center leading-tight line-clamp-2">{item.label}</p>
              </button>
            ))}
          </div>
        </>
      )}
      <Dialog.Close className="mt-5 w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
        Đóng
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
{/* MODAL THÔNG TIN CÁ NHÂN - THIẾT KẾ MỚI */}
<Dialog.Root open={showUserInfo} onOpenChange={setShowUserInfo}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Dialog.Content className="fixed inset-0 z-50 bg-zinc-50 overflow-y-auto">
      {/* HEADER GRADIENT */}
      <div className="sticky top-0 bg-white border-b border-zinc-200 z-10">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Dialog.Close className="w-9 h-9 rounded-full flex items-center justify-center active:bg-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Dialog.Close>
          <Dialog.Title className="text-[17px] font-bold text-zinc-900">
            Thông tin cá nhân
          </Dialog.Title>
          {isOwnProfile && (
            <button
              onClick={() => router.push('/settings/profile')}
              className="text-[15px] font-semibold text-blue-500 active:opacity-60"
            >
              Sửa
            </button>
          )}
          {!isOwnProfile && <div className="w-9" />}
        </div>
      </div>

      {/* PROFILE HEADER CARD */}
      <div className="bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 px-5 pt-8 pb-20">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-2xl">
              <img
                src={
                  targetUser?.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser?.name || "User")}&size=200&background=3B82F6&color=fff`
                }
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {targetUser?.emailVerified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-500 border-[3px] border-white flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-white mt-4">
            {targetUser?.name || "Unknown User"}
          </h2>
          <p className="text-sm text-blue-100 mt-0.5">@{targetUser?.userId || 'user'}</p>

          <div className="flex items-center gap-2 mt-3">
            <div className={`px-3 py-1 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5`}>
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="text-xs font-bold text-white">Lv.{level}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">
                {joinedDays >= 999
                 ? "Thành viên lâu năm"
                  : joinedDays === 0
                   ? "Tham gia Hôm nay"
                    : `${joinedDays} ngày`
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETION PROGRESS - CHỈ CHỦ PROFILE */}
      {isOwnProfile && (
        <div className="px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-zinc-900">Hoàn thiện hồ sơ</p>
                <p className="text-xs text-zinc-500 mt-0.5">Cập nhật để tăng độ uy tín</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-blue-500">{profileCompletion}%</p>
              </div>
</div>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* THÔNG TIN CƠ BẢN */}
      <div className="px-4 mt-5">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">
          Thông tin cơ bản
        </p>
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <InfoRow
            icon={<Mail className="w-5 h-5" />}
            label="Email"
            value={targetUser?.emailVerified? "••••••@gmail.com" : "Chưa xác minh"}
            verified={targetUser?.emailVerified}
          />
          <Divider />
          <InfoRow
            icon={<User className="w-5 h-5" />}
            label="Họ và tên"
            value={targetUser?.name || "Chưa cập nhật"}
          />
          <Divider />
          <InfoRow
            icon={<Calendar className="w-5 h-5" />}
            label="Ngày sinh"
            value={targetUser?.birthday || "Chưa cập nhật"}
            empty={!targetUser?.birthday}
          />
          <Divider />
          <InfoRow
            icon={<Phone className="w-5 h-5" />}
            label="Số điện thoại"
            value={targetUser?.phone? "••••••" + targetUser.phone.slice(-3) : "Chưa cập nhật"}
            empty={!targetUser?.phone}
          />
        </div>
      </div>

      {/* THÔNG TIN KHÁC */}
      <div className="px-4 mt-4">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2.5">
          Thông tin khác
        </p>
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
          <InfoRow
            icon={<MapPin className="w-5 h-5" />}
            label="Địa chỉ"
            value={targetUser?.location || "Chưa cập nhật"}
            empty={!targetUser?.location}
          />
          <Divider />
          <InfoRow
            icon={<Globe className="w-5 h-5" />}
            label="Ngôn ngữ"
            value="Tiếng Việt"
          />
          <Divider />
          <InfoRow
            icon={<ShieldCheck className="w-5 h-5" />}
            label="Xác minh CCCD"
            value={targetUser?.isVerifiedId? "Đã xác minh" : "Chưa xác minh"}
            verified={targetUser?.isVerifiedId}
            empty={!targetUser?.isVerifiedId}
          />
        </div>
      </div>

      {/* NÚT HÀNH ĐỘNG - CHỈ CHỦ PROFILE */}
      {isOwnProfile && (
        <div className="px-4 mt-4 mb-8">
          <button
            onClick={() => router.push('/settings/profile')}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 text-white font-bold text-[15px] shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all"
          >
            Cập nhật thông tin
          </button>
        </div>
      )}

      {!isOwnProfile && <div className="h-8" />}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
        </div>
      </div>
    </div>
  );
}

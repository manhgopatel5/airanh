"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiX, FiCheck, FiPlus, FiChevronRight, FiUpload, FiClock, FiMapPin, FiEye, FiCopy, FiNavigation } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAuth } from "@/lib/useAuth";

type Category = { id: string; label: string; emoji: string; suggestions: string[] };
type CostType = "free" | "share" | "host" | "ticket";
type Privacy = "public" | "friends" | "private";

const CATEGORIES: Category[] = [
  { id: "cafe", label: "Cafe", emoji: "☕", suggestions: ["Cafe sáng T7", "Work date", "Cafe chill", "Làm việc", "Cafe view đẹp", "Cafe mèo", "Study cafe", "Cafe acoustic", "Cafe rooftop", "Cafe sách"] },
  { id: "drink", label: "Nhậu", emoji: "🍻", suggestions: ["Nhậu tối nay", "Beer craft", "Rooftop", "Quán quen", "Nhậu bờ kè", "Beer club", "Nhậu ốc", "Tửu lầu", "Quán nhậu chill", "Nhậu cuối tuần"] },
  { id: "game", label: "Game", emoji: "🎮", suggestions: ["Boardgame", "PS5", "Bida", "Ma sói", "Bi-a", "Bowling", "Game center", "VR game", "Escape room", "Karaoke game"] },
  { id: "sport", label: "Thể thao", emoji: "🏃", suggestions: ["Chạy bộ", "Đá banh", "Cầu lông", "Bơi", "Gym", "Yoga", "Tennis", "Bóng rổ", "Leo núi", "Đạp xe"] },
  { id: "music", label: "Nhạc", emoji: "🎵", suggestions: ["Nghe nhạc", "Acoustic", "Live band", "DJ", "Phòng trà", "Concert", "Nhạc jazz", "Vinyl cafe", "Open mic", "Nhạc sống"] },
  { id: "shopping", label: "Mua sắm", emoji: "🛍️", suggestions: ["Đi mall", "Chợ đêm", "Thrift shop", "Mua đồ", "Window shopping", "Săn sale", "Chợ Bến Thành", "Saigon Centre", "Takashimaya", "Vincom"] },
  { id: "date", label: "Hẹn hò", emoji: "💕", suggestions: ["Hẹn hò", "First date", "Date night", "Xem phim", "Ăn tối", "Dạo phố", "Cafe date", "Picnic", "Sunset", "Rooftop date"] },
  { id: "work", label: "Công việc", emoji: "💼", suggestions: ["Họp nhóm", "Brainstorm", "Coworking", "Networking", "Workshop", "Meeting", "Làm dự án", "Thảo luận", "Pitching", "Team building"] },
  { id: "study", label: "Học", emoji: "📚", suggestions: ["Học nhóm", "Workshop", "Ôn thi", "Thuyết trình", "Học tiếng Anh", "Coding", "Thư viện", "Học online", "Study with me", "Ôn IELTS"] },
  { id: "movie", label: "Chill", emoji: "🎬", suggestions: ["Xem phim", "Concert", "Karaoke", "Bar", "Netflix", "CGV", "Lotte", "BHD", "Phim ma", "Phim tình cảm"] },
  { id: "food", label: "Ăn", emoji: "🍜", suggestions: ["Ăn lẩu", "Buffet", "Ăn đêm", "Quán mới", "Ăn vặt", "Hải sản", "Nướng", "Lẩu bò", "Dimsum", "Bánh mì"] },
  { id: "travel", label: "Đi chơi", emoji: "🏖️", suggestions: ["Phượt", "Picnic", "Cắm trại", "Đà Lạt", "Vũng Tàu", "Mũi Né", "Cần Giờ", "Đi biển", "Camping", "Road trip"] },
  { id: "volunteer", label: "Thiện nguyện", emoji: "🤝", suggestions: ["Phát cơm", "Dọn rác", "Thăm mái ấm", "Hiến máu", "Dạy học", "Trồng cây", "Từ thiện", "Gây quỹ", "Tình nguyện", "Giúp đỡ"] },
  { id: "wellness", label: "Wellness", emoji: "🧘", suggestions: ["Spa", "Massage", "Yoga", "Thiền", "Xông hơi", "Chăm sóc da", "Detox", "Mindfulness", "Pilates", "Thư giãn"] },
  { id: "art", label: "Nghệ thuật", emoji: "🎨", suggestions: ["Vẽ tranh", "Triển lãm", "Workshop art", "Pottery", "Nhiếp ảnh", "Gallery", "Vẽ màu nước", "Điêu khắc", "Handmade", "Sáng tác"] },
  { id: "pet", label: "Thú cưng", emoji: "🐕", suggestions: ["Dắt chó đi dạo", "Cafe thú cưng", "Tắm cho pet", "Công viên chó", "Chơi với mèo", "Pet spa", "Đi dạo", "Chụp ảnh pet", "Gặp gỡ", "Pet day"] },
];

const DESCRIPTION_PRESETS: Record<string, string[]> = {
  cafe: [
    "Wifi mạnh hơn ý chí đi làm sáng thứ 2 📶",
    "Ngồi 5 tiếng gọi đúng 1 ly vẫn được 😭",
    "View đẹp tới mức quay camera trước liền 📸",
    "Yên tĩnh đủ để nghe tiếng deadline tới gần 👀",
    "Cafe đậm như mối quan hệ toxic ☕"
  ],

  drink: [
    "Uống vui là chính, đừng gọi ex lúc say 🍻",
    "Say vừa thôi còn nhớ đường về 😵",
    "Không ép uống, ép là nghỉ chơi 😌",
    "Đi tỉnh về xỉn là thành công 🫠",
    "Kèo này chỉ thiếu người bao thôi 💸"
  ],

  game: [
    "Thua thì cười, đừng đập bàn phím 🎮",
    "Không toxic, chửi nhẹ thôi 😭",
    "AFK là bị réo tên cả dòng họ 👀",
    "Chơi vì đam mê, thắng vì may mắn 🤡",
    "Rank không quan trọng, quan trọng là cay 😤"
  ],

  sport: [
    "Chạy chưa tới nơi đã muốn về 🥵",
    "Khởi động kỹ kẻo mai đi cà nhắc 😭",
    "Mồ hôi rơi nhiều hơn nước mắt thất tình 💦",
    "Tập cho khỏe chứ không phải để up story 🤡",
    "Hít đất 5 cái thấy cuộc đời vô nghĩa 😵"
  ],

  music: [
    "Hát hay không quan trọng, tự tin là được 🎤",
    "Sai nhạc vẫn phải phiêu 😌",
    "Chill nhẹ như chưa từng bị deadline dí 🎶",
    "Nghe nhạc chữa lành nhưng ví vẫn đau 😭",
    "Mood lên cao như giá đồ ăn 🫠"
  ],

  shopping: [
    "Đi ngắm là chính, mua là tai nạn 🛍️",
    "Sale 50% nhưng vẫn hết tiền 😭",
    "Mặc thử xong không muốn cởi ra 👀",
    "Đi một vòng mất luôn lương tháng 💸",
    "Mua vì thích chứ không cần lý do 🤡"
  ],

  date: [
    "Đừng ghost nhau sau buổi gặp nha 😭",
    "Lịch sự nhưng đừng giả trân 😌",
    "Im lặng không đáng sợ bằng hết chuyện để nói 👀",
    "Đi chơi nhẹ nhàng như chưa từng bị từ chối 💔",
    "Nếu ngại quá thì giả vờ coi menu 🫠"
  ],

  work: [
    "Deadline dí sát hơn chủ nợ 😭",
    "Làm hết sức, lương tính sau 💸",
    "OT vì đam mê chứ ai muốn đâu 🤡",
    "Không drama công sở là thành công rồi 😌",
    "Làm việc có tâm, cuối tháng hết tiền 😵"
  ],

  study: [
    "Học 5 phút nghỉ 2 tiếng 📚",
    "Mở sách ra là buồn ngủ liền 😭",
    "Học nhóm nhưng chủ yếu là ăn 🤡",
    "Deadline bài tập nhanh hơn ánh sáng 👀",
    "Cố học để mai còn giàu 🫠"
  ],

  movie: [
    "Không spoil không là nghỉ chơi 🎬",
    "Mang não theo nếu phim hack não 🧠",
    "Xem phim xong giả vờ hiểu hết 😌",
    "Phim hay tới mức quên check điện thoại 📱",
    "Khóc nhẹ thôi đừng làm ngập rạp 😭"
  ],

  food: [
    "Ăn hết mình, mai tính tiếp 🍜",
    "Diet để mai, hôm nay ăn trước 🤡",
    "No tới mức thở bằng niềm tin 😭",
    "Ăn chung cho vui chứ không ai giành đâu 😌",
    "Món ngon tới mức quên chụp hình 📸"
  ],

  travel: [
    "Đi chữa lành nhưng ví tổn thương 💸",
    "Xách balo lên và quên deadline 🧳",
    "Đi cho biết đó biết đây 👀",
    "Chụp 200 tấm chọn được 1 tấm 😭",
    "Mệt nhưng vui nên kệ 🫠"
  ],

  volunteer: [
    "Giúp người tích đức cho đỡ nghiệp 😌",
    "Cho đi yêu thương nhận lại mệt 😭",
    "Làm việc tốt không cần check-in 🤝",
    "Mệt nhưng lòng thấy vui ghê 🫶",
    "Team thiện nguyện nhưng vẫn tấu hài 🤡"
  ],

  wellness: [
    "Chữa lành tạm thời trước khi đi làm lại 😭",
    "Thở sâu như đang thiền trên núi 🧘",
    "Relax nhẹ cho đời bớt toxic 😌",
    "Đi xả stress chứ stress không tự hết 🫠",
    "Yên bình hiếm hoi giữa cuộc đời deadline 👀"
  ],

  art: [
    "Vẽ không đẹp nhưng đầy cảm xúc 🎨",
    "Sáng tạo mạnh ai nấy hiểu 😭",
    "Nghệ thuật là ánh sáng của hóa đơn chưa trả 🫠",
    "Feel nghệ sĩ nhưng tài khoản hơi buồn 💸",
    "Không ai hiểu tác phẩm cũng không sao 🤡"
  ],

  pet: [
    "Boss là chính, con sen là phụ 🐱",
    "Vuốt mèo chữa lành mọi tổn thương 😭",
    "Đi chơi với boss vui hơn gặp người yêu 😌",
    "Coi chừng boss chê nha 👀",
    "Pet dễ thương tới mức muốn nghỉ làm ở nhà luôn 🫠"
  ]
};

const TEMPLATES = [
  { name: "Cafe Sáng Cuối Tuần", cat: "cafe", title: "Cafe sáng thứ 7 chill cùng team", loc: "The Workshop - 27 Ngô Đức Kế", time: "09:00" },
  { name: "Nhậu Bờ Kè Thả Ga", cat: "drink", title: "Nhậu tối nay - Beer craft & mồi ngon", loc: "Quán ốc Đào - Q4", time: "19:00" },
  { name: "Chạy Bộ Bình Minh", cat: "sport", title: "Chạy bộ 5km công viên sáng sớm", loc: "Công viên Tao Đàn", time: "05:30" },
  { name: "Boardgame Đêm Thứ 7", cat: "game", title: "Boardgame Ma Sói & Catan tối T7", loc: "Boardgame Station - Q3", time: "19:30" },
  { name: "Date Night Lãng Mạn", cat: "date", title: "Date night rooftop ngắm Sài Gòn", loc: "EON 51 - Bitexco", time: "19:30" },
  { name: "Acoustic Chill Tối", cat: "music", title: "Nghe acoustic live band thư giãn", loc: "Yoko Cafe - Q3", time: "20:00" },
  { name: "Shopping Săn Sale", cat: "shopping", title: "Đi mall săn sale cuối tuần", loc: "Vincom Đồng Khởi", time: "14:00" },
  { name: "Brainstorm Dự Án Mới", cat: "work", title: "Họp nhóm brainstorm ý tưởng Q4", loc: "The Hive - Thảo Điền", time: "10:00" },
  { name: "Phát Cơm Từ Thiện", cat: "volunteer", title: "Phát 100 phần cơm cho người vô gia cư", loc: "Bệnh viện Chợ Rẫy", time: "07:00" },
  { name: "Spa Thư Giãn Cuối Tuần", cat: "wellness", title: "Spa massage đá nóng thư giãn", loc: "Anam QT Spa - Q1", time: "15:00" },
  { name: "Workshop Vẽ Màu Nước", cat: "art", title: "Học vẽ màu nước cho người mới", loc: "The Craft House - Q2", time: "14:00" },
  { name: "Dắt Pet Đi Dạo", cat: "pet", title: "Offline dắt chó đi dạo công viên", loc: "Công viên Gia Định", time: "17:00" },
];

const POPULAR_PLACES = ["Landmark 81", "Tao Đàn", "Bitexco", "Thảo Điền", "Nhà thờ Đức Bà", "Phố đi bộ Nguyễn Huệ", "Bùi Viện", "Thảo Cầm Viên", "Crescent Mall"];

export default function CreatePlanFinal() {
  const router = useRouter();
  useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<string[]>([]);
  const [nearbyIndex, setNearbyIndex] = useState(0);
  const [locating, setLocating] = useState(false);
  const [step, setStep] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]!);
  const [location, setLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(2);
  const [maxPeople, setMaxPeople] = useState(4);
  const [costType, setCostType] = useState<CostType>("share");
  const [costAmount, setCostAmount] = useState(0);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [cover, setCover] = useState<string | null>(null);
  const [invites, setInvites] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [minAge, setMinAge] = useState(0);
  const [needApproval, setNeedApproval] = useState(false);
  const [pollTime, setPollTime] = useState(false);
  const [pollLocation, setPollLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchFriend, setSearchFriend] = useState("");

  const [friends, setFriends] = useState<Array<{id: string, name: string, avatar: string, online: boolean}>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

useEffect(() => {
  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const res = await fetch('/api/friends?limit=50');
      const data = await res.json();
      setFriends(data.map((f: any) => ({
        id: f.id,
        name: f.name || f.displayName,
        avatar: f.avatar || f.photoURL || `https://i.pravatar.cc/80?u=${f.id}`,
        online: f.online || f.isOnline || false
      })));
    } catch {
      setFriends([
        { id: "1", name: "Minh Nguyễn", avatar: "https://i.pravatar.cc/80?u=1", online: true },
        { id: "2", name: "An Trần", avatar: "https://i.pravatar.cc/80?u=2", online: true },
      ]);
    } finally {
      setFriendsLoading(false);
    }
  };
  fetchFriends();
  const interval = setInterval(fetchFriends, 30000);
  return () => clearInterval(interval);
}, []);

  const filteredFriends = useMemo(() => friends.filter(f => f.name.toLowerCase().includes(searchFriend.toLowerCase())), [friends, searchFriend]);

  useEffect(() => {
    const saved = localStorage.getItem("plan_draft");
    if (saved) try {
      const d = JSON.parse(saved);
      setTitle(d.title || "");
      setDesc(d.desc || "");
      setCategory(CATEGORIES.find(c => c.id === d.cat) || CATEGORIES[0]!);
      setLocation(d.location || "");
      setTime(d.time || "");
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("plan_draft", JSON.stringify({ title, desc, cat: category.id, location, time }));
  }, [title, desc, category, location, time]);

  useEffect(() => {
  if (nearbyPlaces.length === 0) return;
  const id = setInterval(() => {
    setNearbyIndex(i => (i + 4) % nearbyPlaces.length);
  }, 5000);
  return () => clearInterval(id);
}, [nearbyPlaces]);

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB");
    if (!f.type.startsWith("image/")) return toast.error("Chỉ chọn ảnh");
    const r = new FileReader();
    r.onload = ev => setCover(ev.target?.result as string);
    r.readAsDataURL(f);
    toast.success("Đã thêm ảnh");
  }, []);

  const getCurrentLocation = () => {
  if (!navigator.geolocation) return toast.error("Trình duyệt không hỗ trợ");
  setLocating(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      // Giả lập địa điểm gần - thực tế gọi API
      setNearbyPlaces([
  "Highlands gần đây", "The Coffee House", "Starbucks", "Phúc Long",
  "Katinat", "Cheese Coffee", "Cộng Cafe", "OHA Coffee",
  "Laha Cafe", "Gong Cha", "Tocotoco", "KOI Thé",
  "Phê La", "Aha Cafe", "Trung Nguyên", "Passio"
]);
      setLocating(false);
      toast.success("Đã lấy vị trí");
    },
    () => {
      setLocating(false);
      toast.error("Không lấy được vị trí");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

  const toggleInvite = (id: string) => {
    setInvites(p => {
      const n = p.includes(id)? p.filter(i => i!== id) : [...p, id];
      if (n.length > 20) { toast.error("Tối đa 20 người"); return p; }
      return n;
    });
  };

  const addReq = () => {
    const t = reqInput.trim();
    if (!t) return;
    if (requirements.length >= 5) return toast.error("Tối đa 5 mục");
    if (requirements.includes(t)) return toast.error("Đã có rồi");
    setRequirements([...requirements, t]);
    setReqInput("");
  };

  const removeReq = (idx: number) => setRequirements(rs => rs.filter((_, i) => i!== idx));

const handleDragEnd = (_: any, info: PanInfo) => {
  if (Math.abs(info.offset.x) < 50) return setDragX(0);
  if (info.offset.x < -50 && step < 3 && canNext) setStep(s => s + 1);  // Vuốt TRÁI → tiến
  if (info.offset.x > 50 && step > 1) setStep(s => s - 1);               // Vuốt PHẢI → lùi
  setDragX(0);
};

  const useTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setLocation(t.loc);
    setCategory(CATEGORIES.find(c => c.id === t.cat) || CATEGORIES[0]!);
    const d = new Date();
    const [h, m] = t.time.split(":").map(Number);
    d.setHours(h || 0, m || 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    setTime(d.toISOString().slice(0, 16));
    setShowTemplates(false);
    toast.success(`Đã dùng mẫu "${t.name}"`);
  };

  const submit = async () => {
    if (!title.trim() || title.trim().length < 3) return toast.error("Nhập tên (tối thiểu 3 ký tự)");
    if (!location.trim()) return toast.error("Chọn địa điểm");
    if (!time || new Date(time) < new Date()) return toast.error("Chọn thời gian hợp lệ");
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      localStorage.removeItem("plan_draft");
      toast.success("Tạo kế hoạch thành công!");
      setTimeout(() => router.push("/"), 600);
    } catch {
      toast.error("Tạo thất bại");
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;
  const canNext = step === 1? title.trim().length >= 3 : step === 2?!!location.trim() &&!!time : true;
  const splitCost = costAmount > 0 && costType === "share"? Math.ceil(costAmount / maxPeople) : 0;
  const currentPresets = DESCRIPTION_PRESETS[category.id] || [];

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 select-none">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="h-0.5 w-full bg-zinc-200 dark:bg-zinc-800"><motion.div className="h-full bg-green-500" animate={{ width: `${progress}%` }} /></div>
          <div className="h-14 px-4 flex items-center gap-3">
            <button onClick={() => step > 1? setStep(s => s - 1) : router.back()} className="w-9 h-9 -ml-2 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"><FiX size={22} /></button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-black">BƯỚC {step}/3</span>
                <span className="text-[11px] text-zinc-500">Tự động lưu</span>
              </div>
              <h1 className="text-[17px] font-semibold truncate -mt-0.5">{step === 1? "Bạn muốn làm gì?" : step === 2? "Khi nào & ở đâu?" : "Mời bạn bè"}</h1>
            </div>
            <button onClick={() => setShowTemplates(true)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><FiCopy size={18} /></button>
            <button onClick={() => setShowPreview(true)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><FiEye size={18} /></button>
          </div>
        </div>

        <div className="max-w-[600px] mx-auto pb-28">
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} onDrag={(_, i) => setDragX(i.offset.x)} onDragEnd={handleDragEnd} style={{ x: dragX }}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">
                  <div>
                    <p className="text-[13px] text-zinc-500 mb-2.5 px-1">Chọn loại hoạt động</p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {CATEGORIES.map(c => {
                        const active = category.id === c.id;
                        return (
                          <button key={c.id} onClick={() => setCategory(c)} className={`relative aspect-square rounded-[20px] border-2 transition-all active:scale-95 ${active? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="text-[26px] leading-none">{c.emoji}</span>
                              <span className={`text-[11px] font-medium ${active? "text-green-600 dark:text-green-400" : "text-zinc-600 dark:text-zinc-400"}`}>{c.label}</span>
                            </div>
                            {active && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full grid place-items-center shadow-md"><FiCheck size={12} className="text-white" strokeWidth={3} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-[28px] leading-none mt-1">{category.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 50))} placeholder={category.suggestions[0]} className="w-full text-[22px] font-bold bg-transparent outline-none border-0 p-0 placeholder:text-zinc-300 dark:placeholder:text-zinc-700" autoFocus />
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto">
                            {category.suggestions.map(s => (
                              <button key={s} onClick={() => setTitle(s)} className="px-2.5 h-[26px] rounded-full bg-zinc-100 dark:bg-zinc-800 text-[12px] hover:bg-zinc-200 active:scale-95 whitespace-nowrap">{s}</button>
                            ))}
                          </div>
                          <span className={`text-[11px] ml-2 shrink-0 ${title.length > 40? "text-amber-600" : "text-zinc-400"}`}>{title.length}/50</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 300))} placeholder="Mô tả thêm về hoạt động, vibe, yêu cầu..." rows={3} className="w-full text-[15px] leading-[22px] bg-transparent outline-none border-0 p-0 resize-none placeholder:text-zinc-400" />
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex gap-1.5 flex-wrap">
                        {currentPresets.map(t => (
                          <button key={t} onClick={() => setDesc(d => d? `${d} ${t}.` : `${t}.`)} className="text-[11px] px-2.5 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200">+ {t}</button>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400 ml-2 shrink-0">{desc.length}/300</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
  <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-green-500/10 grid place-items-center"><FiMapPin className="text-green-600" size={18} /></div><h3 className="font-semibold text-[15px]">Địa điểm</h3></div>
  <div className="flex items-center gap-2">
    <button onClick={getCurrentLocation} disabled={locating} className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center hover:bg-zinc-200 active:scale-95 disabled:opacity-50">
      {locating? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <FiNavigation size={14} className="text-zinc-600 dark:text-zinc-400" />}
    </button>
    <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={pollLocation} onChange={e => setPollLocation(e.target.checked)} className="w-4 h-4 accent-green-500 rounded" />Bình chọn</label>
  </div>
</div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[{ l: "Tối nay", h: 19 }, { l: "Ngày mai", h: 9, d: 1 }, { l: "T7", h: 9, wd: 6 }, { l: "CN", h: 9, wd: 0 }].map(q => (
                        <button key={q.l} onClick={() => { const d = new Date(); if (q.d) d.setDate(d.getDate() + q.d); if (q.wd!== undefined) { const diff = q.wd - d.getDay(); d.setDate(d.getDate() + (diff <= 0? diff + 7 : diff)); } d.setHours(q.h, 0, 0); setTime(d.toISOString().slice(0, 16)); }} className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[13px] font-medium active:scale-95">{q.l}</button>
                      ))}
                    </div>
                    <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full h-12 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-[15px]" />
                    <div className="flex items-center gap-3 mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Thời lượng</span>
                      <div className="flex gap-1.5 ml-auto">{[1, 2, 3, 4, 6].map(h => <button key={h} onClick={() => setDuration(h)} className={`w-9 h-8 rounded-lg text-[13px] font-medium transition-colors ${duration === h? "bg-green-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"}`}>{h}h</button>)}</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-green-500/10 grid place-items-center"><FiMapPin className="text-green-600" size={18} /></div><h3 className="font-semibold text-[15px]">Địa điểm</h3></div>
                      <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={pollLocation} onChange={e => setPollLocation(e.target.checked)} className="w-4 h-4 accent-green-500 rounded" />Bình chọn</label>
                    </div>
                    <div className="relative"><FiNavigation className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} /><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Tìm địa điểm, quán, địa chỉ..." className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-[15px] placeholder:text-zinc-400" /></div>
{nearbyPlaces.length > 0 && (
  <div className="mt-2.5">
    <div className="flex items-center justify-between mb-1.5 px-1">
      <p className="text-[11px] text-zinc-500">Gần bạn</p>
      <div className="flex gap-0.5">
        {Array.from({ length: Math.ceil(nearbyPlaces.length / 4) }).map((_, i) => (
          <div key={i} className={`w-1 h-1 rounded-full transition-all ${Math.floor(nearbyIndex / 4) === i? "w-3 bg-blue-500" : "bg-zinc-300"}`} />
        ))}
      </div>
    </div>
    <div className="h-8 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div key={nearbyIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="flex gap-1.5">
          {nearbyPlaces.slice(nearbyIndex, nearbyIndex + 4).map(p => (
            <button key={p} onClick={() => setLocation(p)} className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-medium whitespace-nowrap transition-all active:scale-95 ${location === p? "bg-green-500 text-white shadow-sm" : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100"}`}>{p}</button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
)}
<div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide pb-1">{POPULAR_PLACES.map(p => <button key={p} onClick={() => setLocation(p)} className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors ${location === p? "bg-green-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"}`}>{p}</button>)}</div>
                    <input value={locationDetail} onChange={e => setLocationDetail(e.target.value)} placeholder="Địa chỉ cụ thể (tùy chọn)" className="w-full mt-3 h-10 px-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 outline-none focus:ring-2 focus:ring-green-500/20 text-[13px] placeholder:text-zinc-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                      <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide">Số người</p>
                      <div className="flex items-baseline gap-1.5 mt-1"><span className="text-[32px] font-bold leading-none">{maxPeople}</span><span className="text-[13px] text-zinc-500">người</span></div>
                      <input type="range" min={2} max={20} value={maxPeople} onChange={e => setMaxPeople(Number(e.target.value))} className="w-full mt-3 accent-green-500" />
                    </div>
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
  <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide">Chi phí</p>
  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
    {[
      { v: "free", l: "Miễn phí" },
      { v: "share", l: "Chia đều" },
      { v: "host", l: "Mình bao" },
      { v: "ticket", l: "Có vé" },
    ].map(o => (
      <button key={o.v} onClick={() => setCostType(o.v as CostType)} className={`h-9 rounded-full text-[13px] font-medium transition-all active:scale-95 ${costType === o.v? "bg-green-500 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"}`}>{o.l}</button>
    ))}
  </div>
  {costType!== "free" && costType!== "host" && (
    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
      <div className="flex items-baseline gap-1.5">
        <input type="number" value={costAmount || ""} onChange={e => setCostAmount(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-24 text-[24px] font-bold bg-transparent outline-none" />
        <span className="text-[13px] text-zinc-500">đ</span>
      </div>
      {splitCost > 0 && <p className="text-[11px] text-green-600 font-medium mt-0.5">~{splitCost.toLocaleString()}đ/người</p>}
    </div>
  )}
</div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">
           <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
  <div className="flex items-center justify-between mb-3.5">
    <h3 className="font-semibold text-[15px]">Mời bạn bè</h3>
    {invites.length > 0 && <span className="text-[12px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">{invites.length}</span>}
  </div>
  <input value={searchFriend} onChange={e => setSearchFriend(e.target.value)} placeholder="Tìm bạn bè..." className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-green-500/20 text-[13px] mb-3" />
  <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide min-h-[80px]">
    {friendsLoading? (
      [...Array(5)].map((_, i) => (
        <div key={i} className="shrink-0">
          <div className="w-[60px] h-[60px] rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="w-12 h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded mt-1.5 mx-auto animate-pulse" />
        </div>
      ))
    ) : filteredFriends.length === 0? (
      <div className="w-full py-4 text-center">
        <p className="text-[13px] text-zinc-500">{searchFriend? "Không tìm thấy bạn bè" : "Chưa có bạn bè"}</p>
      </div>
    ) : (
      filteredFriends.map(f => {
        const isInvited = invites.includes(f.id);
        return (
          <button key={f.id} onClick={() => toggleInvite(f.id)} className="shrink-0 relative group">
            <div className={`w-[60px] h-[60px] rounded-2xl overflow-hidden transition-all ${isInvited? "ring-2 ring-green-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : "ring-1 ring-zinc-200 dark:ring-zinc-800 group-hover:ring-zinc-300"}`}>
              <img src={f.avatar} alt="" className="w-full h-full object-cover" />
              {f.online && <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse" />}
            </div>
            <p className="text-[11px] mt-1.5 w-[60px] truncate font-medium">{f.name}</p>
            {isInvited && <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full grid place-items-center shadow-md"><FiCheck size={11} className="text-white" strokeWidth={3} /></div>}
          </button>
        );
      })
    )}
  </div>
</div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-[15px]">Ảnh bìa</h3><span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Tùy chọn</span></div>
                    {cover? (
                      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden group">
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCover(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"><FiX size={14} className="text-white" /></button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-green-500/50 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors grid place-items-center gap-2 group">
                        <FiUpload size={24} className="text-zinc-400 group-hover:text-green-500 transition-colors" />
                        <span className="text-[13px] text-zinc-500 group-hover:text-green-600">Thêm ảnh</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
                    {[
                      { label: "Ai xem được", value: privacy, setter: setPrivacy, options: [["public", "Công khai"], ["friends", "Bạn bè"], ["private", "Riêng tư"]] },
                      { label: "Độ tuổi", value: minAge, setter: setMinAge, options: [[0, "Mọi tuổi"], [18, "18+"], [21, "21+"]] },
                    ].map((item, i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <span className="text-[14px] font-medium">{item.label}</span>
                        <select value={item.value} onChange={e => item.setter(e.target.value as any)} className="text-[13px] font-medium bg-transparent outline-none cursor-pointer">
                          {item.options.map(([v, l]) => <option key={String(v)} value={v}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-[14px] font-medium">Duyệt thành viên</span>
                      <button onClick={() => setNeedApproval(!needApproval)} className={`relative w-11 h-6 rounded-full transition-colors ${needApproval? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${needApproval? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                    <h3 className="font-semibold text-[15px] mb-3">Cần chuẩn bị</h3>
                    <div className="flex gap-2">
                      <input value={reqInput} onChange={e => setReqInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addReq()} placeholder="VD: Laptop, giày..." className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-green-500/20 text-[14px]" />
                      <button onClick={addReq} className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 grid place-items-center transition-colors active:scale-95"><FiPlus size={18} className="text-white" /></button>
                    </div>
                    {requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {requirements.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-[12px]">{r}</span>
                            <button onClick={() => removeReq(i)} className="w-4 h-4 grid place-items-center hover:text-red-500 transition-colors"><FiX size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-[600px] mx-auto px-4 h-[84px] flex items-center gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="flex gap-1">{[1, 2, 3].map(i => <div key={i} className={`h-1 rounded-full transition-all ${i === step? "w-8 bg-green-500" : i < step? "w-1 bg-green-500/60" : "w-1 bg-zinc-300 dark:bg-zinc-700"}`} />)}</div>
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-12 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium hover:bg-zinc-200 active:scale-95 transition-all">Quay lại</button>}
              <button onClick={() => step < 3? setStep(s => s + 1) : submit()} disabled={!canNext || loading} className="h-12 px-6 min-w-[120px] rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : step < 3? <><span>Tiếp</span><FiChevronRight size={18} /></> : <><FiCheck size={18} /><span>Đăng</span></>}
              </button>
            </div>
          </div>
        </div>

        {showTemplates && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTemplates(false)}>
            <div className="w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 sm:rounded-[28px] rounded-t-[28px] p-4 max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
              <h3 className="font-bold text-[18px] mb-3">Mẫu có sẵn</h3>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => useTemplate(t)} className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-left transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 grid place-items-center text-[18px]">{CATEGORIES.find(c => c.id === t.cat)?.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-[12px] text-zinc-500 truncate">{t.title} • {t.loc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
            <div className="w-full max-w-[380px] bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              {cover && <img src={cover} alt="" className="w-full aspect-[16/9] object-cover" />}
              <div className="p-5">
                <h2 className="text-[22px] font-bold leading-tight">{title || "Tên hoạt động"}</h2>
                <p className="text-[14px] text-zinc-500 mt-1">{category.label} • {time? new Date(time).toLocaleString("vi-VN", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "Chưa chọn"}</p>
                {location && <p className="text-[14px] mt-3 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"><FiMapPin size={14} />{location}</p>}
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowPreview(false)} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium hover:bg-zinc-200">Đóng</button>
                  <button onClick={() => { setShowPreview(false); submit(); }} className="flex-1 h-11 rounded-2xl bg-green-500 text-white font-medium hover:bg-green-600">Đăng</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
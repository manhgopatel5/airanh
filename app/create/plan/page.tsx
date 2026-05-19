"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { useRouter } from "next/navigation";

import { getFirebaseDB } from "@/lib/firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore";

import {
  FiX,
  FiCheck,
  FiChevronRight,
  FiUpload,
  FiClock,
  FiMapPin,
  FiEye,
  FiCopy,
  FiNavigation,
  FiZap,
  FiUsers,
} from "react-icons/fi";

import {
  toast,
  Toaster,
} from "sonner";

import {
  motion,
  AnimatePresence,
  PanInfo,
} from "framer-motion";

import { useAuth } from "@/lib/useAuth";

import LottiePlayer from "@/components/LottiePlayer";

import * as L from "@/components/illustrations";

type Category = {
  id: string;
  label: string;
  emoji: string;
  suggestions: string[];
};

type CostType =
  | "free"
  | "share"
  | "host"
  | "ticket";

type Privacy =
  | "public"
  | "friends"
  | "friends_except"
  | "private";

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
  cafe: ["Wifi mạnh hơn ý chí đi làm sáng thứ 2 📶", "Ngồi 5 tiếng gọi đúng 1 ly vẫn được 😭", "View đẹp tới mức quay camera trước liền 📸", "Yên tĩnh đủ để nghe tiếng deadline tới gần 👀", "Cafe đậm như mối quan hệ toxic ☕"],
  drink: ["Uống vui là chính, đừng gọi ex lúc say 🍻", "Say vừa thôi còn nhớ đường về 😵", "Không ép uống, ép là nghỉ chơi 😌", "Đi tỉnh về xỉn là thành công 🫠", "Kèo này chỉ thiếu người bao thôi 💸"],
  game: ["Thua thì cười, đừng đập bàn phím 🎮", "Không toxic, chửi nhẹ thôi 😭", "AFK là bị réo tên cả dòng họ 👀", "Chơi vì đam mê, thắng vì may mắn 🤡", "Rank không quan trọng, quan trọng là cay 😤"],
  sport: ["Chạy chưa tới nơi đã muốn về 🥵", "Khởi động kỹ kẻo mai đi cà nhắc 😭", "Mồ hôi rơi nhiều hơn nước mắt thất tình 💦", "Tập cho khỏe chứ không phải để up story 🤡", "Hít đất 5 cái thấy cuộc đời vô nghĩa 😵"],
  music: ["Hát hay không quan trọng, tự tin là được 🎤", "Sai nhạc vẫn phải phiêu 😌", "Chill nhẹ như chưa từng bị deadline dí 🎶", "Nghe nhạc chữa lành nhưng ví vẫn đau 😭", "Mood lên cao như giá đồ ăn 🫠"],
  shopping: ["Đi ngắm là chính, mua là tai nạn 🛍️", "Sale 50% nhưng vẫn hết tiền 😭", "Mặc thử xong không muốn cởi ra 👀", "Đi một vòng mất luôn lương tháng 💸", "Mua vì thích chứ không cần lý do 🤡"],
  date: ["Đừng ghost nhau sau buổi gặp nha 😭", "Lịch sự nhưng đừng giả trân 😌", "Im lặng không đáng sợ bằng hết chuyện để nói 👀", "Đi chơi nhẹ nhàng như chưa từng bị từ chối 💔", "Nếu ngại quá thì giả vờ coi menu 🫠"],
  work: ["Deadline dí sát hơn chủ nợ 😭", "Làm hết sức, lương tính sau 💸", "OT vì đam mê chứ ai muốn đâu 🤡", "Không drama công sở là thành công rồi 😌", "Làm việc có tâm, cuối tháng hết tiền 😵"],
  study: ["Học 5 phút nghỉ 2 tiếng 📚", "Mở sách ra là buồn ngủ liền 😭", "Học nhóm nhưng chủ yếu là ăn 🤡", "Deadline bài tập nhanh hơn ánh sáng 👀", "Cố học để mai còn giàu 🫠"],
  movie: ["Không spoil không là nghỉ chơi 🎬", "Mang não theo nếu phim hack não 🧠", "Xem phim xong giả vờ hiểu hết 😌", "Phim hay tới mức quên check điện thoại 📱", "Khóc nhẹ thôi đừng làm ngập rạp 😭"],
  food: ["Ăn hết mình, mai tính tiếp 🍜", "Diet để mai, hôm nay ăn trước 🤡", "No tới mức thở bằng niềm tin 😭", "Ăn chung cho vui chứ không ai giành đâu 😌", "Món ngon tới mức quên chụp hình 📸"],
  travel: ["Đi chữa lành nhưng ví tổn thương 💸", "Xách balo lên và quên deadline 🧳", "Đi cho biết đó biết đây 👀", "Chụp 200 tấm chọn được 1 tấm 😭", "Mệt nhưng vui nên kệ 🫠"],
  volunteer: ["Giúp người tích đức cho đỡ nghiệp 😌", "Cho đi yêu thương nhận lại mệt 😭", "Làm việc tốt không cần check-in 🤝", "Mệt nhưng lòng thấy vui ghê 🫶", "Team thiện nguyện nhưng vẫn tấu hài 🤡"],
  wellness: ["Chữa lành tạm thời trước khi đi làm lại 😭", "Thở sâu như đang thiền trên núi 🧘", "Relax nhẹ cho đời bớt toxic 😌", "Đi xả stress chứ stress không tự hết 🫠", "Yên bình hiếm hoi giữa cuộc đời deadline 👀"],
  art: ["Vẽ không đẹp nhưng đầy cảm xúc 🎨", "Sáng tạo mạnh ai nấy hiểu 😭", "Nghệ thuật là ánh sáng của hóa đơn chưa trả 🫠", "Feel nghệ sĩ nhưng tài khoản hơi buồn 💸", "Không ai hiểu tác phẩm cũng không sao 🤡"],
  pet: ["Boss là chính, con sen là phụ 🐱", "Vuốt mèo chữa lành mọi tổn thương 😭", "Đi chơi với boss vui hơn gặp người yêu 😌", "Coi chừng boss chê nha 👀", "Pet dễ thương tới mức muốn nghỉ làm ở nhà luôn 🫠"]
};

const TEMPLATES = [
  { name: "Cafe Sáng Cuối Tuần", cat: "cafe", title: "Cafe sáng thứ 7 chill cùng team", loc: "The Workshop - 27 Ngô Đức Kế", time: "09:00" },
  { name: "Nhậu Bờ Kè Thả Ga", cat: "drink", title: "Nhậu tối nay - Beer craft & mồi ngon", loc: "Quán ốc Đào - Q4", time: "19:00" },
  { name: "Chạy Bộ Bình Minh", cat: "sport", title: "Chạy bộ 5km công viên sáng sớm", loc: "Công viên Tao Đàn", time: "05:30" },
  { name: "Boardgame Đêm Thứ 7", cat: "game", title: "Boardgame Ma Sói & Catan tối T7", loc: "Boardgame Station - Q3", time: "19:30" },
  { name: "Date Night Lãng Mạn", cat: "date", title: "Date night rooftop ngắm Sài Gòn", loc: "EON 51 - Bitexco", time: "19:30" },
  { name: "Acoustic Chill Tối", cat: "music", title: "Nghe acoustic live band thư giãn", loc: "Yoko Cafe - Q3", time: "20:00" },
];
  const QUICK_ACTIVITIES = [
  { 
    name: "Shopping Săn Sale", 
    cat: "shopping", 
    title: "Đi mall săn sale cuối tuần", 
    loc: "Vincom Đồng Khởi", 
    time: "14:00" 
  },
  { 
    name: "Brainstorm Dự Án Mới", 
    cat: "work", 
    title: "Họp nhóm brainstorm ý tưởng Q4", 
    loc: "The Hive - Thảo Điền", 
    time: "10:00" 
  },
  { 
    name: "Phát Cơm Từ Thiện", 
    cat: "volunteer", 
    title: "Phát 100 phần cơm cho người vô gia cư", 
    loc: "Bệnh viện Chợ Rẫy", 
    time: "07:00" 
  },
  { 
    name: "Spa Thư Giãn Cuối Tuần", 
    cat: "wellness", 
    title: "Spa massage đá nóng thư giãn", 
    loc: "Anam QT Spa - Q1", 
    time: "15:00" 
  },
  { 
    name: "Workshop Vẽ Màu Nước", 
    cat: "art", 
    title: "Học vẽ màu nước cho người mới", 
    loc: "The Craft House - Q2", 
    time: "14:00" 
  },
  { 
    name: "Dắt Pet Đi Dạo", 
    cat: "pet", 
    title: "Offline dắt chó đi dạo công viên", 
    loc: "Công viên Gia Định", 
    time: "17:00" 
  },
];
const SWIPE_THRESHOLD = 80;
const POPULAR_PLACES = [
  // ==================== HÀ NỘI ====================

  // Lịch sử - Văn hóa
  "Hồ Hoàn Kiếm",
  "Văn Miếu Quốc Tử Giám",
  "Lăng Chủ tịch HCM",
  "Chùa Một Cột",
  "Hoàng thành Thăng Long",
  "Nhà hát Lớn HN",
  "Cột cờ Hà Nội",
  "Chùa Trấn Quốc",
  "Phủ Tây Hồ",
  "Đền Ngọc Sơn",
  "Chùa Quán Sứ",
  "Nhà thờ Lớn",
  "Bảo tàng HCM",
  "Bảo tàng Dân tộc học",
  "Bảo tàng Lịch sử",

  // Phố cổ & Chợ
  "Phố cổ 36 phố phường",
  "Chợ Đồng Xuân",
  "Phố Hàng Mã",
  "Phố Hàng Đào",
  "Phố Tạ Hiện",
  "Phố đi bộ Hồ Gươm",
  "Chợ đêm Hàng Ngang",
  "Phố Hàng Bạc",
  "Phố Mã Mây",
  "Chợ hoa Quảng Bá",

  // Hồ & Công viên
  "Hồ Tây",
  "Hồ Trúc Bạch",
  "Hồ Thiền Quang",
  "Công viên Thống Nhất",
  "Công viên Thủ Lệ",
  "Công viên Yên Sở",
  "Vườn hoa Lý Thái Tổ",
  "Công viên nước Hồ Tây",
  "Hồ Bảy Mẫu",
  "Hồ Giảng Võ",

  // TTTM
  "Vincom Bà Triệu",
  "Vincom Royal City",
  "Vincom Times City",
  "Vincom Metropolis",
  "Lotte Center",
  "Lotte Mall Tây Hồ",
  "Aeon Mall Long Biên",
  "Aeon Mall Hà Đông",
  "Tràng Tiền Plaza",
  "Vincom Smart City",
  "The Garden",
  "Indochina Plaza",
  "Savico Megamall",
  "Mipec Long Biên",
  "Keangnam",

  // Cafe nổi tiếng
  "Cafe Giảng",
  "Cafe Đinh",
  "Cộng Cà Phê",
  "Highlands Hàm Cá Mập",
  "The Note Coffee",
  "Tranquil Books",
  "Xofa Cafe",
  "Nola Cafe",
  "Cafe Phố Cổ",
  "All Day Coffee",
  "Blackbird Coffee",
  "Kafa Cafe",
  "L'etape",
  "Loading T",
  "Oromia",
  "Cup of Tea",
  "Cafe Duy Trí",
  "Maison de Tet",
  "Ban Công",
  "Cafe Nắng",

  // Ăn uống
  "Phở Bát Đàn",
  "Bún chả Hàng Mành",
  "Chả cá Lã Vọng",
  "Bánh cuốn Thanh Trì",
  "Phở cuốn Ngũ Xã",
  "Bún thang Cầu Gỗ",
  "Kem Tràng Tiền",
  "Bia hơi Tạ Hiện",
  "Phố ẩm thực Tống Duy Tân",
  "Chợ ẩm thực Đồng Xuân",
  "Bún đậu Hàng Khay",
  "Xôi Yến",
  "Bánh mì Phố Huế",
  "Lẩu Phan",
  "Nướng Gầm Cầu",

  // Vui chơi
  "Thiên Đường Bảo Sơn",
  "Time City",
  "Royal City Ice Rink",
  "CGV Vincom",
  "BHD Star",
  "Lotte Cinema",
  "Hanoi Creative City",
  "Vinke",
  "TiniWorld",
  "Jump Arena",

  // Bar - Pub
  "1900 Le Theatre",
  "The Unicorn",
  "Standing Bar",
  "Mad Botanist",
  "Nê Cocktail",

  // ==================== TP.HCM ====================

  // Lịch sử - Văn hóa
  "Dinh Độc Lập",
  "Nhà thờ Đức Bà",
  "Bưu điện Trung tâm",
  "Bảo tàng Chứng tích CT",
  "Bảo tàng HCM",
  "Bảo tàng Lịch sử",
  "Chùa Vĩnh Nghiêm",
  "Chùa Xá Lợi",
  "Đền thờ Đức Thánh Trần",
  "Nhà thờ Tân Định",
  "Chợ Bến Thành",
  "Bến Nhà Rồng",
  "Địa đạo Củ Chi",
  "Bảo tàng Mỹ thuật",
  "Nhà hát Thành phố",

  // Phố đi bộ & Khu vui chơi
  "Phố đi bộ Nguyễn Huệ",
  "Bùi Viện",
  "Phạm Ngũ Lão",
  "Công viên Tao Đàn",
  "Công viên 23/9",
  "Phố đi bộ Bùi Hữu Nghĩa",
  "Cầu Ánh Sao",
  "Khu Thảo Điền",
  "Phú Mỹ Hưng",
  "Landmark 81 Park",

  // Công viên - Thảo cầm viên
  "Thảo Cầm Viên",
  "Công viên Gia Định",
  "Công viên Lê Văn Tám",
  "Công viên Hoàng Văn Thụ",
  "Đầm Sen",
  "Suối Tiên",
  "Khu du lịch Văn Thánh",
  "Công viên nước Đầm Sen",

  // TTTM
  "Vincom Đồng Khởi",
  "Takashimaya",
  "Saigon Centre",
  "Vincom Landmark 81",
  "Crescent Mall",
  "SC VivoCity",
  "Giga Mall",
  "Vincom Thảo Điền",
  "Estella Place",
  "Pearl Plaza",
  "Parkson",
  "Diamond Plaza",
  "Nowzone",
  "Union Square",
  "Vincom Mega Mall",
  "Aeon Mall Tân Phú",
  "Aeon Mall Bình Tân",
  "Lotte Mart Nam Sài Gòn",

  // Cafe hot
  "The Workshop",
  "Cộng Cà Phê SG",
  "Highlands Bitexco",
  "Phúc Long Lê Lợi",
  "Katinat",
  "Oromia Coffee",
  "L'Usine",
  "The Loft",
  "Work Saigon",
  "Bosgaurus",
  "Shin Coffee",
  "The Running Bean",
  "Cafe Apartment 42 Nguyễn Huệ",
  "Think Cafe",
  "Soo Kafe",
  "Cafe EON 51",
  "Du Miên Garden",
  "The Dome Kaffe",
  "Saigon Oi",
  "Cheese Coffee",
  "Starbucks Reserve",
  "% Arabica",

  // Ăn uống
  "Phở Hòa Pasteur",
  "Bánh mì Huynh Hoa",
  "Cơm tấm Ba Ghiền",
  "Hủ tiếu Nam Vang",
  "Bún bò Huế Đông Ba",
  "Bánh xèo 46A",
  "Ốc Đào",
  "Lẩu cá kèo Bà Huyện",
  "Bánh tráng Trảng Bàng",
  "Phố ẩm thực Vĩnh Khánh",
  "Chợ đêm Bến Thành",
  "Khu ăn vặt Hồ Con Rùa",
  "Sushi Hokkaido",
  "Pizza 4P's",
  "The Deck",

  // Bar - Pub - Club
  "Chill Skybar",
  "EON51",
  "Blanchy Lounge",
  "Lush",
  "Apocalypse Now",
  "Oscar",
  "The View",
  "Rooftop Garden",
  "Pasteur Street Brewing",
  "Heart of Darkness",

  // Rạp chiếu & Game
  "CGV Landmark",
  "CGV Vivo",
  "BHD Bitexco",
  "Lotte Cinema",
  "Galaxy Cinema",
  "Escape Room",
  "VR Game Park",

  // ==================== ĐÀ NẴNG ====================

  // Biển & Cầu
  "Biển Mỹ Khê",
  "Biển Non Nước",
  "Biển An Bàng",
  "Biển Bắc Mỹ An",
  "Biển Phạm Văn Đồng",
  "Biển Sơn Trà",
  "Bãi Rạng",
  "Bãi Bụt",
  "Cầu Rồng",
  "Cầu Sông Hàn",
  "Cầu Trần Thị Lý",
  "Cầu Thuận Phước",
  "Cầu Nguyễn Văn Trỗi",
  "Cầu Tình Yêu",
  "Bán đảo Sơn Trà",

  // Núi & Thiên nhiên
  "Bà Nà Hills",
  "Đỉnh Bàn Cờ",
  "Chùa Linh Ứng Sơn Trà",
  "Ngũ Hành Sơn",
  "Đèo Hải Vân",
  "Suối Mơ",
  "Suối Hoa",
  "Hồ Hòa Trung",
  "Ghềnh Bàng",
  "Rừng dừa Bảy Mẫu",
  "Công viên Biển Đông",
  "Công viên APEC",

  // Khu du lịch
  "Sun World Bà Nà",
  "Asia Park",
  "Công viên nước Mikazuki",
  "VinWonders Nam Hội An",
  "Khu du lịch Hòa Phú Thành",
  "Thác Hòa Phú Thành",
  "Khu du lịch Sinh thái",
  "Bảo tàng 3D Art",
  "Upside Down World",
  "Helio Center",

  // TTTM
  "Vincom Đà Nẵng",
  "Lotte Mart",
  "Big C",
  "Coopmart",
  "Parkson",
  "Indochina Riverside",
  "GO!",
  "Chợ Hàn",

  // Cafe view đẹp
  "Cộng Cà Phê Đà Nẵng",
  "Highlands Bạch Đằng",
  "Phúc Long",
  "The Cups Coffee",
  "Boulevard Galeto",
  "Mộc Cafe",
  "43 Factory",
  "Wonderlust",
  "Aroi Dessert",
  "Memory Lounge",
  "Sky36",
  "On The Radio",
  "Cafe Trúc Lâm Viên",
  "Làng Cafe",
  "Papa Container",
  "Cafe 1976",
  "Ancient Cafe",
  "Nia Cafe",
  "Gecko Cafe",
  "Lighthouse",

  // Ăn uống đặc sản
  "Bánh xèo Bà Dưỡng",
  "Mì Quảng Bà Mua",
  "Bún chả cá Hờn",
  "Bánh tráng cuốn thịt heo",
  "Hải sản Bé Mặn",
  "Hải sản Năm Đảnh",
  "Bê thui Cầu Mống",
  "Chè Liên",
  "Bánh bèo Bà Bé",
  "Mỳ Quảng ếch Bếp Trang",
  "Bún mắm Vân",
  "Gỏi cá Nam Ô",
  "Bánh canh ruộng",
  "Ốc hút",
  "Cao lầu",
  "Bánh đập",
  "Nem lụi",
  "Bánh ướt",
  "Cháo chờ Nam Ô",
  "Bánh mì Phượng",

  // Chợ & Phố đi bộ
  "Chợ Cồn",
  "Chợ Hàn",
  "Chợ đêm Helio",
  "Chợ đêm Sơn Trà",
  "Phố đi bộ Bạch Đằng",
  "Phố An Thượng",
  "Chợ đêm Lê Duẩn",
  "Chợ Bắc Mỹ An",

  // Bar - Pub
  "Sky36 Bar",
  "On The Radio",
  "Golden Pine",
  "Bamboo Bar",
  "New Phương Đông",
  "Memory Lounge",
  "The Craftsman",
];


const vibrate = (
  pattern: number | number[]
) => {
  if (
    typeof navigator !== "undefined" &&
    "vibrate" in navigator
  ) {
    navigator.vibrate(pattern);
  }
};
const formatLocalDate = (
  date: Date
) => {
  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
};
export default function CreatePlanPro() {
  const router = useRouter();

  const { user } = useAuth();

  const fileRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    userLocation,
    setUserLocation,
  ] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [
    nearbyPlaces,
    setNearbyPlaces,
  ] = useState<string[]>([]);

  const [locating, setLocating] =
    useState(false);

  const [step, setStep] =
    useState(1);

  const [loading, setLoading] =
    useState(false);
  
  const [success, setSuccess] =
    useState(false);

  const [
    showPreview,
    setShowPreview,
  ] = useState(false);

  const [
    showTemplates,
    setShowTemplates,
  ] = useState(false);

  // Form state
  const [title, setTitle] =
    useState("");

  const [desc, setDesc] =
    useState("");

  const [category, setCategory] =
    useState<Category>(
      CATEGORIES[0]!
    );

  const [location, setLocation] =
    useState("");

  const [
    locationDetail,
    setLocationDetail,
  ] = useState("");

  const [time, setTime] =
    useState("");

  const [duration, setDuration] =
    useState(2);

  const [
    maxPeople,
    setMaxPeople,
  ] = useState(4);

  const [costType, setCostType] =
    useState<CostType>(
      "share"
    );

  const [
    costAmount,
    setCostAmount,
  ] = useState(0);

  const [privacy, setPrivacy] =
    useState<Privacy>(
      "public"
    );

const [cover, setCover] =
  useState<string | null>(null);

const [
  _coverFile,
  setCoverFile,
] = useState<File | null>(
  null
);



  const [invites, setInvites] =
    useState<string[]>([]);

  const [
    requirements,
    setRequirements,
  ] = useState<string[]>([]);

  const [reqInput, setReqInput] =
    useState("");

  const [minAge, setMinAge] =
    useState(0);

  const [
    needApproval,
    setNeedApproval,
  ] = useState(false);

  const [
    pollLocation,
    setPollLocation,
  ] = useState(false);

  const [pollTime, setPollTime] =
    useState(false);

  const [
    searchFriend,
    setSearchFriend,
  ] = useState("");

const [ageRange, setAgeRange] =
  useState<[number, number]>([
    18,
    35,
  ]);

  const [
    currentAddress,
    setCurrentAddress,
  ] = useState("");

  const [friends, setFriends] =
    useState<
      Array<{
        id: string;
        name: string;
        avatar: string;
        online: boolean;
      }>
    >([]);

  const [
    friendsLoading,
    setFriendsLoading,
  ] = useState(false);

  // Load friends
  useEffect(() => {
    if (!user?.uid) return;

    setFriendsLoading(true);

    const db = getFirebaseDB();

    const friendsQuery = query(
      collection(db, "friends"),
      where("userId", "==", user.uid),
      where(
        "status",
        "==",
        "accepted"
      ),
      limit(50)
    );

    const unsubscribe =
      onSnapshot(
        friendsQuery,
        async (snapshot) => {
          try {
            const data =
              await Promise.all(
                snapshot.docs.map(
                  async (
                    document
                  ) => {
                    const friend =
                      document.data();

                    const userDoc =
                      await getDoc(
                        doc(
                          db,
                          "users",
                          friend.friendId
                        )
                      );

                    const userData =
                      userDoc.data();

                    return {
                      id: friend.friendId,

                      name:
                        userData?.displayName ||
                        "Unknown",

                      avatar:
                        userData?.photoURL ||
                        `https://i.pravatar.cc/80?u=${friend.friendId}`,

                      online:
                        userData?.lastSeen?.toDate?.() >
                        new Date(
                          Date.now() -
                            180000
                        ),
                    };
                  }
                )
              );

            setFriends(data);
          } catch (error) {
            console.error(error);
          } finally {
            setFriendsLoading(
              false
            );
          }
        }
      );

    return () => unsubscribe();
  }, [user?.uid]);

  // Load draft
  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "plan_draft_v2"
        );

      if (!saved) return;

      const draft =
        JSON.parse(saved);

      setTitle(
        draft.title || ""
      );

      setDesc(
        draft.desc || ""
      );

      setCategory(
        CATEGORIES.find(
          (c) =>
            c.id === draft.cat
        ) ||
          CATEGORIES[0]!
      );

      setLocation(
        draft.location || ""
      );

      setTime(
        draft.time || ""
      );
    } catch (error) {
      console.error(error);
    }
  }, []);

  // Auto save draft
  useEffect(() => {
    const timeout =
      setTimeout(() => {
        localStorage.setItem(
          "plan_draft_v2",
          JSON.stringify({
            title,
            desc,
            cat: category.id,
            location,
            time,
          })
        );
      }, 300);

    return () =>
      clearTimeout(timeout);
  }, [
    title,
    desc,
    category,
    location,
    time,
  ]);

  // Presence
  useEffect(() => {
    if (!user?.uid) return;

    const db = getFirebaseDB();

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const updatePresence =
      () => {
        updateDoc(userRef, {
          lastSeen:
            Timestamp.now(),
        }).catch(
          console.error
        );
      };

    updatePresence();

    const interval =
      setInterval(
        updatePresence,
        30000
      );

    return () =>
      clearInterval(interval);
  }, [user?.uid]);

  // Cleanup blob
  useEffect(() => {
    return () => {
      if (
        cover?.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          cover
        );
      }
    };
  }, [cover]);

  const filteredFriends =
    useMemo(() => {
      return friends.filter(
        (friend) =>
          friend.name
            .toLowerCase()
            .includes(
              searchFriend.toLowerCase()
            )
      );
    }, [
      friends,
      searchFriend,
    ]);

  const handleImage =
    useCallback(
      (
        e: React.ChangeEvent<HTMLInputElement>
      ) => {
        const file =
          e.target.files?.[0];

        if (!file) return;

        if (
          file.size >
          5 *
            1024 *
            1024
        ) {
          toast.error(
            "Ảnh tối đa 5MB"
          );

          return;
        }

        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          toast.error(
            "Chỉ chọn ảnh"
          );

          return;
        }

        if (
          cover?.startsWith(
            "blob:"
          )
        ) {
          URL.revokeObjectURL(
            cover
          );
        }

        const previewUrl =
          URL.createObjectURL(
            file
          );

       setCover(previewUrl);

setCoverFile(file);

        toast.success(
          "Đã thêm ảnh"
        );

        vibrate(10);
      },
      [cover]
    );

  const getCurrentLocation =
    async () => {
      if (
        !navigator.geolocation
      ) {
        toast.error(
          "Trình duyệt không hỗ trợ"
        );

        return;
      }

      setLocating(true);

      navigator.geolocation.getCurrentPosition(
        async (
          position
        ) => {
          const {
            latitude,
            longitude,
          } = position.coords;

          setUserLocation({
            lat: latitude,
            lng: longitude,
          });

          try {
            const geoResponse =
              await fetch(
                `/api/places/geocode?lat=${latitude}&lng=${longitude}`
              );

            const geoData =
              await geoResponse.json();

            const address =
              geoData
                ?.results?.[0]
                ?.formatted_address ||
              `${latitude.toFixed(
                4
              )}, ${longitude.toFixed(
                4
              )}`;

            setCurrentAddress(
              address
            );

            setLocationDetail(
              address
            );

            const nearbyResponse =
              await fetch(
                `/api/places/nearby?lat=${latitude}&lng=${longitude}`
              );

            const nearbyData =
              await nearbyResponse.json();

            setNearbyPlaces(
              nearbyData?.results
                ?.slice(0, 8)
                ?.map(
                  (
                    place: {
                      name: string;
                    }
                  ) =>
                    place.name
                ) || []
            );
          } catch {
            setCurrentAddress(
              `${latitude.toFixed(
                4
              )}, ${longitude.toFixed(
                4
              )}`
            );

            setNearbyPlaces([
              "Highlands",
              "Starbucks",
              "Phúc Long",
            ]);
          }

          setLocating(false);

          toast.success(
            "Đã lấy vị trí"
          );

          vibrate(10);
        },
        () => {
          setLocating(false);

          toast.error(
            "Không lấy được vị trí"
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        }
      );
    };

  const toggleInvite = (
    id: string
  ) => {
    setInvites((prev) => {
      const next =
        prev.includes(id)
          ? prev.filter(
              (item) =>
                item !== id
            )
          : [...prev, id];

      if (next.length > 20) {
        toast.error(
          "Tối đa 20 người"
        );

        return prev;
      }

      vibrate(5);

      return next;
    });
  };

  const addReq = () => {
    const value =
      reqInput.trim();

    if (!value) return;

    if (
      requirements.length >=
      5
    ) {
      toast.error(
        "Tối đa 5 mục"
      );

      return;
    }

    if (
requirements.some(
  (item) =>
    item.toLowerCase() ===
    value.toLowerCase()
)
    ) {
      toast.error(
        "Đã có rồi"
      );

      return;
    }

    setRequirements((prev) => [
      ...prev,
      value,
    ]);

    setReqInput("");

    vibrate(5);
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (
      Math.abs(
        info.offset.x
      ) < SWIPE_THRESHOLD
    ) {
      return;
    }

    if (
      info.offset.x <
        -SWIPE_THRESHOLD &&
      step < 3 &&
      canNext
    ) {
      setStep(
        (prev) => prev + 1
      );

      vibrate(5);

      return;
    }

    if (
      info.offset.x >
        SWIPE_THRESHOLD &&
      step > 1
    ) {
      setStep(
        (prev) => prev - 1
      );

      vibrate(5);
    }
  };

  const useTemplate = (
    template:
      typeof TEMPLATES[0]
  ) => {
    setTitle(
      template.title
    );

    setLocation(
      template.loc
    );

    setCategory(
      CATEGORIES.find(
        (c) =>
          c.id ===
          template.cat
      ) ||
        CATEGORIES[0]!
    );

    const date =
      new Date();

    const [hours, minutes] =
      template.time
        .split(":")
        .map(Number);

    date.setHours(
      hours || 0,
      minutes || 0,
      0
    );

    if (date < new Date()) {
      date.setDate(
        date.getDate() + 1
      );
    }

    setTime(
      formatLocalDate(date)
    );

    setShowTemplates(false);

    toast.success(
      `Đã dùng mẫu "${template.name}"`
    );

    vibrate(10);
  };

  const submit =
    async () => {
      if (
        !title.trim() ||
        title.trim().length < 3
      ) {
        toast.error(
          "Nhập tên tối thiểu 3 ký tự"
        );

        return;
      }

      if (
        !location.trim()
      ) {
        toast.error(
          "Chọn địa điểm"
        );

        return;
      }

      if (
        !time ||
        new Date(time) <
          new Date()
      ) {
        toast.error(
          "Chọn thời gian hợp lệ"
        );

        return;
      }

      setLoading(true);

      try {
        const db =
          getFirebaseDB();

        await addDoc(
          collection(
            db,
            "plans"
          ),
          {
            title:
              title.trim(),

            desc:
              desc.trim(),

            category:
              category.id,

            location:
              location.trim(),

            locationDetail:
              locationDetail.trim(),

            coordinates:
              userLocation
                ? {
                    lat: userLocation.lat,
                    lng: userLocation.lng,
                  }
                : null,

            time: Timestamp.fromDate(
              new Date(time)
            ),

            duration,

            maxPeople,

            costType,

            costAmount:
              costType ===
                "free" ||
              costType ===
                "host"
                ? 0
                : costAmount,

            privacy,

            minAge,

            needApproval,

            pollTime,

            pollLocation,

            invites,

            requirements,

           cover: cover || "",

            createdBy:
              user?.uid,

            createdAt:
              Timestamp.now(),

            status:
              "active",

            participants: [
              user?.uid,
            ],
          }
        );

        localStorage.removeItem(
          "plan_draft_v2"
        );

        toast.success(
          "🎉 Tạo kế hoạch thành công!"
        );

        vibrate([
          10,
          50,
          10,
        ]);

        setSuccess(true);

        setTimeout(() => {
          router.push("/");
        }, 1800);
      } catch (error) {
        console.error(error);

        toast.error(
          "Tạo thất bại, thử lại"
        );
      } finally {
        setLoading(false);
      }
    };

  const progress =
    (step / 3) * 100;

  const canNext =
    step === 1
      ? title.trim()
          .length >= 3
      : step === 2
        ? Boolean(
            location.trim()
          ) &&
          Boolean(time)
        : true;

  const splitCost =
    costAmount > 0 &&
    costType === "share"
      ? Math.ceil(
          costAmount /
            maxPeople
        )
      : 0;

  const currentPresets =
    DESCRIPTION_PRESETS[
      category.id
    ] || [];

 return (
  <>
    <Toaster
      richColors
      position="top-center"
    />

    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/80 backdrop-blur-2xl dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="h-[3px] bg-zinc-200 dark:bg-zinc-800">
          <motion.div
            className="h-full bg-[#0042B2]"
            animate={{
              width: `${progress}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        </div>

        <div className="mx-auto flex h-14 max-w-[680px] items-center gap-3 px-4">
<button
  type="button"
  aria-label="Đóng"
  onClick={() => {
              if (step > 1) {
                setStep(
                  (prev) =>
                    prev - 1
                );
              } else {
                router.back();
              }

              vibrate(5);
            }}
            className="grid h-9 w-9 place-items-center rounded-xl transition-all hover:bg-zinc-100 active:scale-90 dark:hover:bg-zinc-800"
          >
            <FiX
              size={20}
              className="text-zinc-600 dark:text-zinc-400"
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-lg bg-[#0042B2] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                BƯỚC {step}
              </span>

              <span className="text-[11px] text-zinc-500">
                /3 • Tự động lưu
              </span>
            </div>

            <h1 className="mt-0.5 text-[17px] font-bold leading-tight">
              {
                [
                  "Bạn muốn làm gì?",
                  "Khi nào & ở đâu?",
                  "Mời bạn bè",
                ][step - 1]
              }
            </h1>
          </div>

          <div className="flex items-center gap-1">
<button
  type="button"
  aria-label="Mẫu có sẵn"
  onClick={() => {
    setShowTemplates(
                  true
                );

                vibrate(5);
              }}
              className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition-all hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
            >
              <FiCopy size={18} />
            </button>

<button
  type="button"
  aria-label="Xem trước"
  onClick={() => {
    setShowPreview(
                  true
                );

                vibrate(5);
              }}
              className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition-all hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
            >
              <FiEye size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[680px] pb-28">
        <motion.div
          drag="x"
          dragConstraints={{
            left: 0,
            right: 0,
          }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={
            handleDragEnd
          }
        >
          <AnimatePresence
            mode="wait"
          >
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{
                  opacity: 0,
                  x: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -20,
                }}
                className="space-y-4 p-4"
              >
                {/* Categories */}
                <div>
                  <p className="mb-3 px-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Chọn loại hoạt
                    động
                  </p>

                  <div className="grid grid-cols-4 gap-2.5">
                    {CATEGORIES.map(
                      (c) => {
                        const active =
                          category.id ===
                          c.id;

                        return (
                          <motion.button
                            key={
                              c.id
                            }
                            type="button"
                            whileTap={{
                              scale: 0.92,
                            }}
                            onClick={() => {
                              setCategory(
                                c
                              );

                              vibrate(
                                5
                              );
                            }}
                            className={`relative aspect-square rounded-3xl border-2 transition-all ${
                              active
                                ? "border-[#0042B2] bg-[#0042B2]/5 shadow-lg shadow-[#0042B2]/10"
                                : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
                            }`}
                          >
                            <div className="flex h-full flex-col items-center justify-center gap-1.5">
                              <span className="text-3xl leading-none">
                                {
                                  c.emoji
                                }
                              </span>

                              <span
                                className={`text-[11px] font-semibold leading-tight ${
                                  active
                                    ? "text-[#0042B2]"
                                    : "text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {
                                  c.label
                                }
                              </span>
                            </div>

                            {active && (
                              <motion.div
                                initial={{
                                  scale: 0,
                                }}
                                animate={{
                                  scale: 1,
                                }}
                                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#0042B2] shadow-lg"
                              >
                                <FiCheck
                                  size={
                                    14
                                  }
                                  strokeWidth={
                                    3
                                  }
                                  className="text-white"
                                />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-3xl">
                      {
                        category.emoji
                      }
                    </span>

                    <div className="flex-1">
                      <input
                        autoFocus
                        aria-label="Tên hoạt động"
                        value={title}
                        maxLength={
                          50
                        }
                        onChange={(
                          e
                        ) =>
                          setTitle(
                            e.target.value.slice(
                              0,
                              50
                            )
                          )
                        }
                        placeholder={
                          category
                            .suggestions[0]
                        }
                        className="w-full bg-transparent text-2xl font-black outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                      />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex max-w-full flex-wrap gap-1.5">
                          {category.suggestions
                            .slice(
                              0,
                              5
                            )
                            .map(
                              (
                                suggestion
                              ) => (
                                <button
                                  key={
                                    suggestion
                                  }
                                  type="button"
                                  onClick={() => {
                                    setTitle(
                                      suggestion
                                    );

                                    vibrate(
                                      5
                                    );
                                  }}
                                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900"
                                >
                                  {
                                    suggestion
                                  }
                                </button>
                              )
                            )}
                        </div>

                        <span
                          className={`text-xs font-medium tabular-nums ${
                            title.length >
                            40
                              ? "text-amber-600"
                              : "text-zinc-400"
                          }`}
                        >
                          {
                            title.length
                          }
                          /50
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Activities */}
                <div>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      Hoạt động
                      nhanh
                    </p>

                    <span className="text-xs text-zinc-400">
                      Chạm để dùng
                      ngay
                    </span>
                  </div>

                  <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                    {QUICK_ACTIVITIES.map(
                      (
                        item
                      ) => (
                        <button
                          key={
                            item.name
                          }
                          type="button"
                          onClick={() =>
                            useTemplate(
                              item
                            )
                          }
                          className="w-[220px] shrink-0 rounded-3xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-[#0042B2] active:scale-95 dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">
                              {
                                CATEGORIES.find(
                                  (
                                    c
                                  ) =>
                                    c.id ===
                                    item.cat
                                )
                                  ?.emoji
                              }
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate font-black">
                                {
                                  item.name
                                }
                              </p>

                              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                                {
                                  item.title
                                }
                              </p>

                              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                                <span>
                                  {
                                    item.loc
                                  }
                                </span>

                                <span>
                                  •
                                </span>

                                <span>
                                  {
                                    item.time
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>
   {/* Description */}
<div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
  <textarea
    value={desc}
    aria-label="Mô tả hoạt động"
    onChange={(e) =>
      setDesc(
        e.target.value.slice(
          0,
          300
        )
      )
    }
    placeholder="Mô tả thêm về hoạt động, vibe, yêu cầu..."
    rows={3}
    className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-zinc-400"
  />

  <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-900">
    <div className="flex flex-wrap gap-1.5">
      {currentPresets
        .slice(0, 3)
        .map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => {
              setDesc(
                (prev) =>
                  prev
                    ? `${prev} ${text}`
                    : text
              );

              vibrate(5);
            }}
            className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
          >
            +{" "}
            {text.slice(
              0,
              15
            )}
            ...
          </button>
        ))}
    </div>

    <span className="text-xs tabular-nums text-zinc-400">
      {desc.length}/300
    </span>
  </div>
</div>
</motion.div>
)}

{step === 2 && (
<motion.div
  key="s2"
  initial={{
    opacity: 0,
    x: 20,
  }}
  animate={{
    opacity: 1,
    x: 0,
  }}
  exit={{
    opacity: 0,
    x: -20,
  }}
  className="space-y-4 p-4"
>
  {/* Time */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0042B2]/10">
          <FiClock
            className="text-[#0042B2]"
            size={18}
          />
        </div>

        <h3 className="font-bold">
          Thời gian
        </h3>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pollTime}
          onChange={(e) =>
            setPollTime(
              e.target.checked
            )
          }
          className="h-4 w-4 rounded accent-[#0042B2]"
        />

        <span className="text-zinc-600 dark:text-zinc-400">
          Bình chọn
        </span>
      </label>
    </div>

    <div className="mb-3 grid grid-cols-4 gap-2">
      {[
        {
          l: "Tối nay",
          h: 19,
        },
        {
          l: "Ngày mai",
          h: 9,
          d: 1,
        },
        {
          l: "T7",
          h: 9,
          wd: 6,
        },
        {
          l: "CN",
          h: 9,
          wd: 0,
        },
      ].map((quick) => (
        <button
          key={quick.l}
          type="button"
          onClick={() => {
            const date =
              new Date();

            if (quick.d) {
              date.setDate(
                date.getDate() +
                  quick.d
              );
            }

            if (
              quick.wd !==
              undefined
            ) {
              const diff =
                quick.wd -
                date.getDay();

              date.setDate(
                date.getDate() +
                  (diff <= 0
                    ? diff + 7
                    : diff)
              );
            }

            date.setHours(
              quick.h,
              0,
              0
            );

            setTime(
              formatLocalDate(
                date
              )
            );

            vibrate(5);
          }}
          className="h-11 rounded-2xl bg-zinc-100 text-sm font-medium transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900"
        >
          {quick.l}
        </button>
      ))}
    </div>

    <input
      type="datetime-local"
      aria-label="Thời gian"
      value={time}
      onChange={(e) =>
        setTime(
          e.target.value
        )
      }
      min={formatLocalDate(
        new Date()
      )}
      className="h-12 w-full rounded-2xl border-2 border-transparent bg-zinc-50 px-4 font-medium outline-none transition-all focus:border-[#0042B2] dark:bg-zinc-900"
    />

    <div className="mt-4 flex items-center gap-3">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Thời lượng:
      </span>

      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 6].map(
          (hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => {
                setDuration(
                  hours
                );

                vibrate(5);
              }}
              className={`h-8 w-10 rounded-xl text-sm font-medium transition-all ${
                duration ===
                hours
                  ? "bg-[#0042B2] text-white"
                  : "bg-zinc-100 dark:bg-zinc-900"
              }`}
            >
              {hours}h
            </button>
          )
        )}
      </div>
    </div>
  </div>

  {/* Location */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0042B2]/10">
          <FiMapPin
            className="text-[#0042B2]"
            size={18}
          />
        </div>

        <h3 className="font-bold">
          Địa điểm
        </h3>
      </div>

      <div className="flex items-center gap-2">
<button
  type="button"
  aria-label="Lấy vị trí hiện tại"
  onClick={() => {
    getCurrentLocation();

            vibrate(5);
          }}
          disabled={locating}
          className="grid h-8 w-8 place-items-center rounded-xl bg-zinc-100 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 dark:bg-zinc-900"
        >
          {locating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          ) : (
            <FiNavigation
              size={16}
            />
          )}
        </button>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={
              pollLocation
            }
            onChange={(e) =>
              setPollLocation(
                e.target.checked
              )
            }
            className="h-4 w-4 rounded accent-[#0042B2]"
          />

          <span className="text-zinc-600 dark:text-zinc-400">
            Bình chọn
          </span>
        </label>
      </div>
    </div>
                  <input
  value={location}
  aria-label="Địa điểm"
  onChange={(e) =>
    setLocation(
      e.target.value
    )
  }
  placeholder="Tìm địa điểm, quán, địa chỉ..."
  className="h-12 w-full rounded-2xl border-2 border-transparent bg-zinc-50 px-4 font-medium outline-none transition-all focus:border-[#0042B2] dark:bg-zinc-900"
/>
    <input
  value={locationDetail}
  aria-label="Địa chỉ chi tiết"
  onChange={(e) =>
    setLocationDetail(
      e.target.value
    )
  }
  placeholder="Địa chỉ chi tiết, tầng, bàn..."
  className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none transition-all focus:border-[#0042B2] dark:border-zinc-800 dark:bg-zinc-900"
/>

{currentAddress && (
  <p className="mt-2 truncate text-sm text-[#0042B2]">
    📍 {currentAddress}
  </p>
)}

<div className="scrollbar-hide mt-3 flex gap-1.5 overflow-x-auto">
  {(nearbyPlaces.length >
  0
    ? nearbyPlaces
    : POPULAR_PLACES.slice(
        0,
        8
      )
  ).map((place) => (
    <button
      key={place}
      type="button"
      onClick={() => {
        setLocation(
          place
        );

        vibrate(5);
      }}
      className={`h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-all ${
        location ===
        place
          ? "bg-[#0042B2] text-white"
          : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900"
      }`}
    >
      {place}
    </button>
  ))}
</div>
</div>

{/* People & Cost */}
<div className="grid grid-cols-2 gap-3">
  {/* People */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
      Số người
    </p>

    <div className="flex items-baseline gap-2">
      <span className="text-4xl font-black">
        {maxPeople}
      </span>

      <span className="text-zinc-500">
        người
      </span>
    </div>

    <input
      type="range"
      min={2}
      max={20}
      value={maxPeople}
      onChange={(e) => {
        setMaxPeople(
          Number(
            e.target.value
          )
        );

        vibrate(5);
      }}
      className="mt-3 w-full accent-[#0042B2]"
    />
  </div>

  {/* Cost */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
      Chi phí
    </p>

    <div className="grid grid-cols-2 gap-1.5">
      {[
        {
          v: "free",
          l: "Free",
        },
        {
          v: "share",
          l: "Share",
        },
        {
          v: "host",
          l: "Bao",
        },
        {
          v: "ticket",
          l: "Vé",
        },
      ].map((option) => (
        <button
          key={option.v}
          type="button"
          onClick={() => {
            setCostType(
              option.v as CostType
            );

            vibrate(5);
          }}
          className={`h-8 rounded-xl text-xs font-bold transition-all ${
            costType ===
            option.v
              ? "bg-[#0042B2] text-white"
              : "bg-zinc-100 dark:bg-zinc-900"
          }`}
        >
          {option.l}
        </button>
      ))}
    </div>

    {costType !==
      "free" &&
      costType !==
        "host" && (
        <>
          <input
            type="number"
            aria-label="Chi phí"
            value={
              costAmount || ""
            }
            onChange={(e) =>
 setCostAmount(
  Math.max(
    0,
    Number(
      e.target.value
    ) || 0
  )
)
            }
            placeholder="0"
            className="mt-2 h-9 w-full rounded-xl bg-zinc-50 px-3 text-center font-bold outline-none dark:bg-zinc-900"
          />

          {costType ===
            "share" &&
            costAmount >
              0 && (
              <div className="mt-2 text-center">
                <span className="text-xs text-zinc-500">
                  Mỗi người khoảng
                </span>

                <p className="text-sm font-bold text-[#0042B2]">
                  {splitCost.toLocaleString(
                    "vi-VN"
                  )}
                  đ
                </p>
              </div>
            )}
        </>
      )}
  </div>
</div>
</motion.div>
)}

{step === 3 && (
<motion.div
  key="s3"
  initial={{
    opacity: 0,
    x: 20,
  }}
  animate={{
    opacity: 1,
    x: 0,
  }}
  exit={{
    opacity: 0,
    x: -20,
  }}
  className="space-y-4 p-4"
>
  {/* Invite Friends */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-bold">
        Yêu cầu tham gia
      </h3>
   <span className="text-xs text-zinc-400">
  {requirements.length}/5
</span>
</div>

<div className="flex gap-2">
  <input
    value={reqInput}
    aria-label="Yêu cầu tham gia"
    onChange={(e) =>
      setReqInput(
        e.target.value
      )
    }
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();

        addReq();
      }
    }}
    placeholder="Ví dụ: Mang áo khoác"
    className="h-11 flex-1 rounded-2xl bg-zinc-50 px-4 outline-none dark:bg-zinc-900"
  />

  <button
    type="button"
    onClick={addReq}
    className="rounded-2xl bg-[#0042B2] px-4 font-bold text-white transition-transform active:scale-95"
  >
    Thêm
  </button>
</div>

{requirements.length >
  0 && (
  <div className="mt-4 flex flex-wrap gap-2">
    {requirements.map(
      (requirement) => (
        <div
          key={requirement}
          className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-900"
        >
          <span className="text-sm font-medium">
            {requirement}
          </span>

          <button
            type="button"
            onClick={() =>
              setRequirements(
                (
                  prev
                ) =>
                  prev.filter(
                    (
                      item
                    ) =>
                      item !==
                      requirement
                  )
              )
            }
            className="text-zinc-500 transition-colors hover:text-red-500"
          >
            <FiX
              size={14}
            />
          </button>
        </div>
      )
    )}
  </div>
)}
</div>

{/* Invite Friends */}
<div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="flex items-center gap-2 font-bold">
      <FiUsers
        size={18}
        className="text-[#0042B2]"
      />
      Mời bạn bè
    </h3>

    {invites.length >
      0 && (
      <span className="rounded-full bg-[#0042B2]/10 px-2.5 py-1 text-xs font-bold text-[#0042B2]">
        {invites.length}
      </span>
    )}
  </div>

  <input
    value={searchFriend}
    aria-label="Tìm bạn bè"
    onChange={(e) =>
      setSearchFriend(
        e.target.value
      )
    }
    placeholder="Tìm bạn bè..."
    className="mb-3 h-10 w-full rounded-2xl bg-zinc-50 px-3.5 text-sm outline-none dark:bg-zinc-900"
  />

  <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
    {friendsLoading
      ? [...Array(5)].map(
          (_, i) => (
            <div
              key={i}
              className="h-20 w-16 shrink-0"
            >
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          )
        )
      : filteredFriends.map(
          (
            friend
          ) => (
            <button
              key={
                friend.id
              }
              type="button"
              onClick={() =>
                toggleInvite(
                  friend.id
                )
              }
              className="group relative shrink-0"
            >
              <div
                className={`relative h-16 w-16 overflow-hidden rounded-2xl transition-all ${
                  invites.includes(
                    friend.id
                  )
                    ? "ring-2 ring-[#0042B2] ring-offset-2 dark:ring-offset-black"
                    : "ring-1 ring-zinc-200 dark:ring-zinc-700"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    friend.avatar
                  }
                  alt={
                    friend.name
                  }
                  className="h-full w-full object-cover"
                />

                {friend.online && (
                  <div className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-black" />
                )}
              </div>

              <p className="mt-1.5 w-16 truncate text-center text-xs font-medium">
                {friend.name.split(
                  " "
                )[0]}
              </p>

              {invites.includes(
                friend.id
              ) && (
                <div className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#0042B2]">
                  <FiCheck
                    size={
                      12
                    }
                    strokeWidth={
                      3
                    }
                    className="text-white"
                  />
                </div>
              )}
            </button>
          )
        )}
  </div>
</div>

{/* Age */}
<div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
  <div className="mb-3 flex items-center justify-between">
    <h3 className="font-bold">
      Độ tuổi tối thiểu
    </h3>

    <span className="text-sm font-bold text-[#0042B2]">
      {minAge === 0
        ? "Mọi lứa tuổi"
        : `${minAge}+`}
    </span>
  </div>

  <input
    type="range"
    min={0}
    max={21}
    value={minAge}
    onChange={(e) =>
      setMinAge(
        Number(
          e.target.value
        )
      )
    }
    className="w-full accent-[#0042B2]"
  />

  <div className="mt-1 flex justify-between text-xs text-zinc-400">
    <span>0+</span>
    <span>18+</span>
    <span>21+</span>
  </div>
</div>

{/* Suitable Age */}
<div className="rounded-3xl border border-zinc-200/60 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="font-bold">
      Độ tuổi phù hợp
    </h3>

    <span className="text-sm font-bold text-[#0042B2]">
      {ageRange[0]} -{" "}
      {ageRange[1]} tuổi
    </span>
  </div>

  <div className="space-y-4">
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>
          Tối thiểu
        </span>

        <span>
          {ageRange[0]}+
        </span>
      </div>

      <input
        type="range"
        min={13}
        max={40}
        value={
          ageRange[0] ??
          18
        }
        onChange={(e) =>
          setAgeRange([
            Number(
              e.target
                .value
            ),
            Math.max(
              Number(
                e.target
                  .value
              ),
              ageRange[1] ??
                18
            ),
          ])
        }
        className="w-full accent-[#0042B2]"
      />
    </div>

    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>
          Tối đa
        </span>

        <span>
          {ageRange[1]}
        </span>
      </div>

      <input
        type="range"
        min={18}
        max={60}
        value={
          ageRange[1] ??
          35
        }
        onChange={(e) =>
          setAgeRange([
            ageRange[0] ??
              18,
            Math.max(
              ageRange[0] ??
                18,
              Number(
                e.target
                  .value
              )
            ),
          ])
        }
        className="w-full accent-[#0042B2]"
      />
    </div>
  </div>
</div>
                <div className="grid grid-cols-2 gap-3">
  {/* Cover */}
  <div className="rounded-3xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    <h4 className="mb-3 text-sm font-bold">
      Ảnh bìa
    </h4>

    {cover ? (
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt="Cover"
          className="h-full w-full object-cover"
        />

        <button
          type="button"
          onClick={() => {
            if (
              cover.startsWith(
                "blob:"
              )
            ) {
              URL.revokeObjectURL(
                cover
              );
            }

            setCover(null);

            vibrate(5);
          }}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 backdrop-blur-md transition-transform active:scale-90"
        >
          <FiX
            size={13}
            className="text-white"
          />
        </button>
      </div>
    ) : (
<button
  type="button"
  aria-label="Tải ảnh lên"
  onClick={() =>
    fileRef.current?.click()
        }
        className="group grid aspect-video w-full place-items-center rounded-2xl border-2 border-dashed border-zinc-300 transition-all hover:border-[#0042B2] hover:bg-[#0042B2]/5 active:scale-[0.98] dark:border-zinc-700"
      >
        <FiUpload
          size={22}
          className="text-zinc-400 transition-colors group-hover:text-[#0042B2]"
        />
      </button>
    )}

    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      onChange={handleImage}
      className="hidden"
    />
  </div>

  {/* Privacy */}
  <div className="space-y-3 rounded-3xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
    {/* Public */}
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">
        Công khai
      </span>

      <button
        type="button"
        onClick={() => {
          setPrivacy(
            privacy ===
              "public"
              ? "friends"
              : "public"
          );

          vibrate(5);
        }}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          privacy ===
          "public"
            ? "bg-[#0042B2]"
            : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            privacy ===
            "public"
              ? "translate-x-5"
              : "translate-x-0.5"
          }`}
        />
      </button>
    </div>

    {/* Approval */}
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">
        Duyệt TV
      </span>

      <button
        type="button"
        onClick={() => {
          setNeedApproval(
            !needApproval
          );

          vibrate(5);
        }}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          needApproval
            ? "bg-[#0042B2]"
            : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
            needApproval
              ? "translate-x-5"
              : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  </div>
</div>
</motion.div>
)}

</AnimatePresence>
</motion.div>
</div>

{/* Footer */}
<div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/90 backdrop-blur-2xl dark:border-zinc-800 dark:bg-zinc-950/90">
  <div className="mx-auto max-w-[680px] px-4 py-3">
    <div className="flex items-center gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={() => {
            setStep(
              (prev) =>
                prev - 1
            );

            vibrate(5);
          }}
          className="h-12 rounded-2xl bg-zinc-100 px-5 font-bold transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900"
        >
          Quay lại
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (step < 3) {
            setStep(
              (prev) =>
                prev + 1
            );

            vibrate(5);

            return;
          }

          submit();
        }}
        disabled={
          !canNext ||
          loading
        }
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0042B2] font-bold text-white shadow-lg shadow-[#0042B2]/20 transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? (
          <>
            <LottiePlayer
              animationData={
                L.loadingPull
              }
              loop
              autoplay
              className="h-5 w-5"
            />

            <span>
              Đang tạo...
            </span>
          </>
        ) : step < 3 ? (
          <>
            <span>
              Tiếp tục
            </span>

            <FiChevronRight />
          </>
        ) : (
          <>
            <FiZap />

            <span>
              Tạo kế hoạch
            </span>
          </>
        )}
      </button>
    </div>
  </div>
</div>

{/* Templates Modal */}
<AnimatePresence>
  {showTemplates && (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onClick={() =>
        setShowTemplates(
          false
        )
      }
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-md sm:items-center"
    >
      <motion.div
        initial={{
          y: 100,
        }}
        animate={{
          y: 0,
        }}
        exit={{
          y: 100,
        }}
        onClick={(e) =>
          e.stopPropagation()
        }
        className="max-h-[80vh] w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-950"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300" />

        <h3 className="mb-4 text-xl font-black">
          Mẫu có sẵn
        </h3>

        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {TEMPLATES.map(
            (template) => (
              <button
                key={
                  template.name
                }
                type="button"
                onClick={() =>
                  useTemplate(
                    template
                  )
                }
                className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-3.5 text-left transition-all hover:bg-zinc-100 active:scale-[0.98] dark:bg-zinc-900"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0042B2]/10 text-xl">
                  {CATEGORIES.find(
                    (c) =>
                      c.id ===
                      template.cat
                  )?.emoji}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {
                      template.name
                    }
                  </p>

                  <p className="truncate text-sm text-zinc-500">
                    {
                      template.title
                    }
                  </p>
                </div>
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Preview */}
<AnimatePresence>
  {showPreview && (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      onClick={() =>
        setShowPreview(
          false
        )
      }
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{
          scale: 0.9,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        exit={{
          scale: 0.9,
          opacity: 0,
        }}
        transition={{
          type: "spring",
          damping: 25,
        }}
        onClick={(e) =>
          e.stopPropagation()
        }
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-950"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt="Preview"
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-gradient-to-br from-[#0042B2]/10 to-[#0042B2]/20">
            <span className="text-6xl">
              {
                category.emoji
              }
            </span>
          </div>
        )}

        <div className="p-5">
          <h2 className="text-xl font-black leading-tight">
            {title ||
              "Tên kế hoạch"}
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            {
              category.label
            }{" "}
            • {maxPeople}{" "}
            người
          </p>

          {desc && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {desc}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setShowPreview(
                  false
                )
              }
              className="flex-1 rounded-2xl bg-zinc-100 py-3 font-bold transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900"
            >
              Đóng
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setShowPreview(
                  false
                );

                submit();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0042B2] py-3 font-bold text-white transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <LottiePlayer
                  animationData={
                    L.loadingPull
                  }
                  loop
                  autoplay
                  className="h-5 w-5"
                />
              ) : (
                <>
                  <FiZap
                    size={16}
                  />

                  <span>
                    Tạo ngay
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* Success */}
<AnimatePresence>
  {success && (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      className="fixed inset-0 z-[99999] grid place-items-center bg-white dark:bg-black"
    >
      <motion.div
        initial={{
          scale: 0.9,
          opacity: 0,
        }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 20,
        }}
        className="px-6 text-center"
      >
        <LottiePlayer
          animationData={
            L.successCheck
          }
          loop={false}
          autoplay
          className="mx-auto h-36 w-36"
        />

        <h2 className="mt-4 text-2xl font-black text-zinc-900 dark:text-white">
          Thành công!
        </h2>

        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Kế hoạch của bạn đã được tạo
        </p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* Loading */}
<AnimatePresence>
  {loading &&
    !success && (
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        className="fixed inset-0 z-[9999] grid place-items-center bg-white dark:bg-black"
      >
        <div className="text-center">
          <LottiePlayer
            animationData={
              L.loadingPull
            }
            loop
            autoplay
            className="mx-auto h-24 w-24"
          />

          <p className="mt-4 text-lg font-bold">
            Đang tạo kế hoạch...
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            Vui lòng chờ
            trong giây lát
          </p>
        </div>
      </motion.div>
    )}
</AnimatePresence>
</div>

<style jsx global>{`
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }

  .line-clamp-3 {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  @media (max-width: 640px) {
    input,
    textarea,
    select {
      font-size: 16px !important;
    }
  }
`}</style>
</>
);
}

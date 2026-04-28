"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { FiX, FiCheck, FiPlus, FiChevronRight, FiUpload, FiClock, FiMapPin, FiEye, FiCopy, FiNavigation } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { addDoc } from 'firebase/firestore';
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAuth } from "@/lib/useAuth";

type Category = { id: string; label: string; emoji: string; suggestions: string[] };
type CostType = "free" | "share" | "host" | "ticket";
type Privacy = "public" | "friends" | "friends_except" | "private";

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
const POPULAR_PLACES = [
  // === HÀ NỘI 100 ===
  // Lịch sử - Văn hóa (15)
  "Hồ Hoàn Kiếm", "Văn Miếu Quốc Tử Giám", "Lăng Chủ tịch HCM", "Chùa Một Cột", "Hoàng thành Thăng Long", "Nhà hát Lớn HN", "Cột cờ Hà Nội", "Chùa Trấn Quốc", "Phủ Tây Hồ", "Đền Ngọc Sơn", "Chùa Quán Sứ", "Nhà thờ Lớn", "Bảo tàng HCM", "Bảo tàng Dân tộc học", "Bảo tàng Lịch sử",
  // Phố cổ & Chợ (10)
  "Phố cổ 36 phố phường", "Chợ Đồng Xuân", "Phố Hàng Mã", "Phố Hàng Đào", "Phố Tạ Hiện", "Phố đi bộ Hồ Gươm", "Chợ đêm Hàng Ngang", "Phố Hàng Bạc", "Phố Mã Mây", "Chợ hoa Quảng Bá",
  // Hồ & Công viên (10)
  "Hồ Tây", "Hồ Trúc Bạch", "Hồ Thiền Quang", "Công viên Thống Nhất", "Công viên Thủ Lệ", "Công viên Yên Sở", "Vườn hoa Lý Thái Tổ", "Công viên nước Hồ Tây", "Hồ Bảy Mẫu", "Hồ Giảng Võ",
  // TTTM (15)
  "Vincom Bà Triệu", "Vincom Royal City", "Vincom Times City", "Vincom Metropolis", "Lotte Center", "Lotte Mall Tây Hồ", "Aeon Mall Long Biên", "Aeon Mall Hà Đông", "Tràng Tiền Plaza", "Vincom Smart City", "The Garden", "Indochina Plaza", "Savico Megamall", "Mipec Long Biên", "Keangnam",
  // Cafe nổi tiếng (20)
  "Cafe Giảng", "Cafe Đinh", "Cộng Cà Phê", "Highlands Hàm Cá Mập", "The Note Coffee", "Tranquil Books", "Xofa Cafe", "Nola Cafe", "Cafe Phố Cổ", "All Day Coffee", "Blackbird Coffee", "Kafa Cafe", "L'etape", "Loading T", "Oromia", "Cup of Tea", "Cafe Duy Trí", "Maison de Tet", "Ban Công", "Cafe Nắng",
  // Ăn uống (15)
  "Phở Bát Đàn", "Bún chả Hàng Mành", "Chả cá Lã Vọng", "Bánh cuốn Thanh Trì", "Phở cuốn Ngũ Xã", "Bún thang Cầu Gỗ", "Kem Tràng Tiền", "Bia hơi Tạ Hiện", "Phố ẩm thực Tống Duy Tân", "Chợ ẩm thực Đồng Xuân", "Bún đậu Hàng Khay", "Xôi Yến", "Bánh mì Phố Huế", "Lẩu Phan", "Nướng Gầm Cầu",
  // Vui chơi (10)
  "Thiên Đường Bảo Sơn", "Time City", "Royal City Ice Rink", "CGV Vincom", "BHD Star", "Lotte Cinema", "Hanoi Creative City", "Vinke", "TiniWorld", "Jump Arena",
  // Bar - Pub (5)
  "1900 Le Theatre", "The Unicorn", "Standing Bar", "Mad Botanist", "Nê Cocktail",

  // === TP.HCM 100 ===
  // Lịch sử - Văn hóa (15)
  "Dinh Độc Lập", "Nhà thờ Đức Bà", "Bưu điện Trung tâm", "Bảo tàng Chứng tích CT", "Bảo tàng HCM", "Bảo tàng Lịch sử", "Chùa Vĩnh Nghiêm", "Chùa Xá Lợi", "Đền thờ Đức Thánh Trần", "Nhà thờ Tân Định", "Chợ Bến Thành", "Bến Nhà Rồng", "Địa đạo Củ Chi", "Bảo tàng Mỹ thuật", "Nhà hát Thành phố",
  // Phố đi bộ & Khu vui chơi (10)
  "Phố đi bộ Nguyễn Huệ", "Bùi Viện", "Phạm Ngũ Lão", "Công viên Tao Đàn", "Công viên 23/9", "Phố đi bộ Bùi Hữu Nghĩa", "Cầu Ánh Sao", "Khu Thảo Điền", "Phú Mỹ Hưng", "Landmark 81 Park",
  // Công viên - Thảo cầm viên (8)
  "Thảo Cầm Viên", "Công viên Gia Định", "Công viên Lê Văn Tám", "Công viên Hoàng Văn Thụ", "Đầm Sen", "Suối Tiên", "Khu du lịch Văn Thánh", "Công viên nước Đầm Sen",
  // TTTM (18)
  "Vincom Đồng Khởi", "Takashimaya", "Saigon Centre", "Vincom Landmark 81", "Crescent Mall", "SC VivoCity", "Giga Mall", "Vincom Thảo Điền", "Estella Place", "Pearl Plaza", "Parkson", "Diamond Plaza", "Nowzone", "Union Square", "Vincom Mega Mall", "Aeon Mall Tân Phú", "Aeon Mall Bình Tân", "Lotte Mart Nam Sài Gòn",
  // Cafe hot (22)
  "The Workshop", "Cộng Cà Phê SG", "Highlands Bitexco", "Phúc Long Lê Lợi", "Katinat", "Oromia Coffee", "L'Usine", "The Loft", "Work Saigon", "Bosgaurus", "Shin Coffee", "The Running Bean", "Cafe Apartment 42 Nguyễn Huệ", "Think Cafe", "Soo Kafe", "Cafe EON 51", "Du Miên Garden", "The Dome Kaffe", "Saigon Oi", "Cheese Coffee", "Starbucks Reserve", "% Arabica",
  // Ăn uống (15)
  "Phở Hòa Pasteur", "Bánh mì Huynh Hoa", "Cơm tấm Ba Ghiền", "Hủ tiếu Nam Vang", "Bún bò Huế Đông Ba", "Bánh xèo 46A", "Ốc Đào", "Lẩu cá kèo Bà Huyện", "Bánh tráng Trảng Bàng", "Phố ẩm thực Vĩnh Khánh", "Chợ đêm Bến Thành", "Khu ăn vặt Hồ Con Rùa", "Sushi Hokkaido", "Pizza 4P's", "The Deck",
  // Bar - Pub - Club (10)
  "Chill Skybar", "EON51", "Blanchy Lounge", "Lush", "Apocalypse Now", "Oscar", "The View", "Rooftop Garden", "Pasteur Street Brewing", "Heart of Darkness",
  // Rạp chiếu & Game (7)
  "CGV Landmark", "CGV Vivo", "BHD Bitexco", "Lotte Cinema", "Galaxy Cinema", "Escape Room", "VR Game Park",
  // === ĐÀ NẴNG 100 ===
  // Biển & Cầu (15)
  "Biển Mỹ Khê", "Biển Non Nước", "Biển An Bàng", "Biển Bắc Mỹ An", "Biển Phạm Văn Đồng", "Biển Sơn Trà", "Bãi Rạng", "Bãi Bụt", "Cầu Rồng", "Cầu Sông Hàn", "Cầu Trần Thị Lý", "Cầu Thuận Phước", "Cầu Nguyễn Văn Trỗi", "Cầu Tình Yêu", "Bán đảo Sơn Trà",
  // Núi & Thiên nhiên (12)
  "Bà Nà Hills", "Đỉnh Bàn Cờ", "Chùa Linh Ứng Sơn Trà", "Ngũ Hành Sơn", "Đèo Hải Vân", "Suối Mơ", "Suối Hoa", "Hồ Hòa Trung", "Ghềnh Bàng", "Rừng dừa Bảy Mẫu", "Công viên Biển Đông", "Công viên APEC",
  // Khu du lịch (10)
  "Sun World Bà Nà", "Asia Park", "Công viên nước Mikazuki", "VinWonders Nam Hội An", "Khu du lịch Hòa Phú Thành", "Thác Hòa Phú Thành", "Khu du lịch Sinh thái", "Bảo tàng 3D Art", "Upside Down World", "Helio Center",
  // TTTM (8)
  "Vincom Đà Nẵng", "Lotte Mart", "Big C", "Coopmart", "Parkson", "Indochina Riverside", "GO!", "Chợ Hàn",
  // Cafe view đẹp (20)
  "Cộng Cà Phê Đà Nẵng", "Highlands Bạch Đằng", "Phúc Long", "The Cups Coffee", "Boulevard Galeto", "Mộc Cafe", "43 Factory", "Wonderlust", "Aroi Dessert", "Memory Lounge", "Sky36", "On The Radio", "Cafe Trúc Lâm Viên", "Làng Cafe", "Papa Container", "Cafe 1976", "Ancient Cafe", "Nia Cafe", "Gecko Cafe", "Lighthouse",
  // Ăn uống đặc sản (20)
  "Bánh xèo Bà Dưỡng", "Mì Quảng Bà Mua", "Bún chả cá Hờn", "Bánh tráng cuốn thịt heo", "Hải sản Bé Mặn", "Hải sản Năm Đảnh", "Bê thui Cầu Mống", "Chè Liên", "Bánh bèo Bà Bé", "Mỳ Quảng ếch Bếp Trang", "Bún mắm Vân", "Gỏi cá Nam Ô", "Bánh canh ruộng", "Ốc hút", "Cao lầu", "Bánh đập", "Nem lụi", "Bánh ướt", "Cháo chờ Nam Ô", "Bánh mì Phượng",
  // Chợ & Phố đi bộ (8)
  "Chợ Cồn", "Chợ Hàn", "Chợ đêm Helio", "Chợ đêm Sơn Trà", "Phố đi bộ Bạch Đằng", "Phố An Thượng", "Chợ đêm Lê Duẩn", "Chợ Bắc Mỹ An",
  // Bar - Pub (7)
  "Sky36 Bar", "On The Radio", "Golden Pine", "Bamboo Bar", "New Phương Đông", "Memory Lounge", "The Craftsman"
];
export default function CreatePlanFinal() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [pollLocation, setPollLocation] = useState(false);
  const [pollTime, setPollTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchFriend, setSearchFriend] = useState("");
  const [ageRange, setAgeRange] = useState([18, 35]);
 const [currentAddress, setCurrentAddress] = useState("");

  const [friends, setFriends] = useState<Array<{id: string, name: string, avatar: string, online: boolean}>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
useEffect(() => {
  if (!user?.uid) return;
  setFriendsLoading(true);
  const db = getFirebaseDB();
  const q = query(collection(db, 'friends'), where('userId', '==', user.uid), where('status', '==', 'accepted'), limit(50));

  return onSnapshot(q, async (snap) => {
    const data = await Promise.all(snap.docs.map(async d => {
      const f = d.data();
      const u = await getDoc(doc(db, 'users', f.friendId));
      const ud = u.data();
      return {
        id: f.friendId,
        name: ud?.displayName || 'Unknown',
        avatar: ud?.photoURL || `https://i.pravatar.cc/80?u=${f.friendId}`,
        online: ud?.lastSeen?.toDate() > new Date(Date.now() - 180000)
      };
    }));
    setFriends(data);
    setFriendsLoading(false);
  });
}, [user?.uid]);


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
  if (!user?.uid) return;
  const db = getFirebaseDB();
  const ref = doc(db, 'users', user.uid);
  const update = () => updateDoc(ref, { lastSeen: Timestamp.now() });
  update();
  const id = setInterval(update, 30000);
  return () => clearInterval(id);
}, [user?.uid]);

  useEffect(() => {
    localStorage.setItem("plan_draft", JSON.stringify({ title, desc, cat: category.id, location, time }));
  }, [title, desc, category, location, time]);

useEffect(() => {
  const places = nearbyPlaces.length > 0? nearbyPlaces : POPULAR_PLACES;
  const id = setInterval(() => {
    setNearbyIndex(i => (i + 7) % places.length);
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
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      try {
        // Lấy địa chỉ từ tọa độ
const geoRes = await fetch(
  `/api/places/geocode?lat=${latitude}&lng=${longitude}`
);
        const geoData = await geoRes.json();
        const address = geoData.results?.[0]?.formatted_address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setCurrentAddress(address);
        setLocationDetail(address); // Tự điền vào ô địa chỉ chi tiết

        // Lấy quán gần đó
        const res = await fetch(`/api/places/nearby?lat=${latitude}&lng=${longitude}`);
        const data = await res.json();
        setNearbyPlaces(data.results?.slice(0,8).map((p: any) => p.name) || []);
      } catch {
        setCurrentAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setNearbyPlaces(["Highlands", "Starbucks", "Phúc Long"]);
      }
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
    const db = getFirebaseDB();
    await addDoc(collection(db, 'plans'), {
      title: title.trim(),
      desc: desc.trim(),
      category: category.id,
      location: location.trim(),
      locationDetail: locationDetail.trim(),
      coordinates: userLocation ? {
        lat: userLocation.lat,
        lng: userLocation.lng
      } : null,
      time: Timestamp.fromDate(new Date(time)),
      duration,
      maxPeople,
      costType,
      costAmount: costType === 'free' || costType === 'host' ? 0 : costAmount,
      privacy,
      minAge,
      needApproval,
      pollTime,
      pollLocation,
      invites,
      requirements,
      cover,
      createdBy: user?.uid,
      createdAt: Timestamp.now(),
      status: 'active',
      participants: [user?.uid],
    });
    
    localStorage.removeItem("plan_draft");
    toast.success("Tạo kế hoạch thành công!");
    setTimeout(() => router.push("/"), 600);
  } catch (error) {
    console.error(error);
    toast.error("Tạo thất bại, thử lại");
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
  <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-green-500/10 grid place-items-center"><FiClock className="text-green-600" size={18} /></div><h3 className="font-semibold text-[15px]">Thời gian</h3></div>
  <div className="flex items-center gap-2">
    <button onClick={getCurrentLocation} disabled={locating} className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center hover:bg-zinc-200 active:scale-95 disabled:opacity-50">
      {locating? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : <FiNavigation size={14} className="text-zinc-600 dark:text-zinc-400" />}
    </button>
    <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={pollTime} onChange={e => setPollTime(e.target.checked)} className="w-4 h-4 accent-green-500 rounded" />Bình chọn</label>
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
{currentAddress && (
  <p className="text-[11px] mt-2 px-1 text-green-600 truncate">
    📍 {currentAddress}
  </p>
)}
<div className="mt-2.5">
  <div className="flex items-center justify-between mb-1.5 px-1">
    <p className="text-[11px] text-zinc-500">{nearbyPlaces.length > 0? "Gần bạn" : "Gợi ý"}</p>
  </div>
 <div className="h-8 overflow-hidden">
  <div className="flex gap-1.5">
    {(nearbyPlaces.length > 0 ? nearbyPlaces : POPULAR_PLACES).slice(nearbyIndex, nearbyIndex + 7).map(p => (
      <button 
        key={p} 
        onClick={async () => {
          setLocation(p);
          try {
            const res = await fetch(`/api/places/search?q=${encodeURIComponent(p + ' Vietnam')}`);
            const data = await res.json();
            const loc = data.results?.[0]?.geometry?.location;
            if (loc) {
              const nearby = await fetch(`/api/places/nearby?lat=${loc.lat}&lng=${loc.lng}`);
              const nData = await nearby.json();
              setNearbyPlaces(nData.results?.slice(0,8).map((x:any) => x.name) || []);
              toast.success(`Gần ${p}`);
            }
          } catch {}
        }}
        className={`shrink-0 h-7 px-3 rounded-full text- font-medium whitespace-nowrap transition-all ${location === p ? "bg-green-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200"}`}
      >
        {p}
      </button>
    ))}
  </div>
</div>
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
        <input type="number" value={costAmount || ""} onChange={e => setCostAmount(Number(e.target.value))} className="w-20 h-10 px-3 text-[18px] font-bold bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none text-center" />
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
  <div className="p-4 flex items-center justify-between">
    <span className="text- font-medium">Ai xem được</span>
    <select value={privacy} onChange={e => setPrivacy(e.target.value as Privacy)} className="text- font-medium bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl px-3 py-1.5 outline-none appearance-none">
      <option value="public">Công khai</option>
      <option value="friends">Bạn bè</option>
      <option value="friends_except">Bạn bè (ngoại trừ)</option>
      <option value="private">Riêng tư</option>
    </select>
  </div>

  <div className="p-4">
    <div className="flex items-center justify-between">
      <span className="text- font-medium">Độ tuổi</span>
      <select value={minAge} onChange={e => setMinAge(Number(e.target.value))} className="text- font-medium bg-zinc-100 dark:bg-zinc-800 border-0 rounded-xl px-3 py-1.5 outline-none appearance-none">
        <option value={0}>Mọi tuổi</option>
        <option value={18}>18+</option>
        <option value={21}>21+</option>
        <option value={-1}>Tùy chỉnh</option>
      </select>
    </div>
    {minAge === -1 && (
      <div className="mt-4">
        <div className="flex justify-between text- text-zinc-500 mb-2">
          <span className="font-medium text-green-600">{ageRange[0]}</span>
          <span className="font-medium text-green-600">{ageRange[1]}</span>
        </div>
        <div className="relative">
          <input type="range" min={13} max={65} value={ageRange[0]} onChange={e => setAgeRange([Math.min(Number(e.target.value), ageRange[1]-1), ageRange[1]])} className="absolute w-full h-2 accent-green-500 z-10" />
          <input type="range" min={13} max={65} value={ageRange[1]} onChange={e => setAgeRange([ageRange[0], Math.max(Number(e.target.value), ageRange[0]+1)])} className="absolute w-full h-2 accent-green-500" />
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
        </div>
      </div>
    )}
  </div>

  <div className="p-4 flex items-center justify-between">
    <span className="text- font-medium">Duyệt thành viên</span>
    <button onClick={() => setNeedApproval(!needApproval)} className={`relative w-11 h-6 rounded-full transition-colors ${needApproval? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${needApproval? "left-5" : "left-0.5"}`} />
    </button>
  </div>
</div>

<div className="bg-white dark:bg-zinc-900 rounded- border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
  <h3 className="font-semibold text- mb-3">Cần chuẩn bị</h3>
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
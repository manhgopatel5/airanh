"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import { useRouter } from "next/navigation";

import { onAuthStateChanged, type Auth } from "firebase/auth";

import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  type Firestore,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";

import {
  getFirebaseAuth,
  getFirebaseStorage,
  getFirebaseDB,
} from "@/lib/firebase";

import { createTask } from "@/lib/task";

import { toast, Toaster } from "sonner";

import {
  motion,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";

import LottiePlayer from "@/components/ui/LottiePlayer";

import * as L from "@/components/illustrations";

import {
  FiX,
  FiCheck,
  FiPlus,
  FiMapPin,
  FiEye,
  FiCopy,
  FiZap,
  FiStar,
  FiLayers,
  FiTrendingUp,
  FiLock,
  FiGlobe,
  FiChevronRight,
  FiNavigation,
  FiCalendar,
  FiUserCheck,
} from "react-icons/fi";

// ===== FULL CATEGORIES - 16 ngành =====
const CATEGORIES = [
  {
    id: "delivery", name: "Giao hàng", icon: "🚚", color: "#ff9500", basePrice: 50000,
    suggestions: [
      { title: "Ship hàng nội thành 2h", desc: ["+ Giao trong 2 tiếng kể từ khi nhận", "+ Có ảnh chụp khi giao xong", "+ Ứng tiền trước tối đa 3tr", "+ Gọi báo trước 10 phút", "+ Miễn phí chờ 15 phút"] },
      { title: "Giao đồ ăn sáng tận nơi", desc: ["+ Mua đúng quán bạn chỉ định", "+ Giữ nóng bằng túi giữ nhiệt", "+ Giao trước 8h sáng", "+ Có hóa đơn rõ ràng", "+ Free ship dưới 3km"] },
      { title: "Lấy hàng ship COD", desc: ["+ Đối soát tiền trong ngày", "+ Có biên nhận đầy đủ", "+ Xử lý hàng hoàn nếu có", "+ Báo cáo đơn real-time", "+ Hỗ trợ đóng gói lại"] },
      { title: "Giao tài liệu hỏa tốc", desc: ["+ Bảo mật tuyệt đối", "+ Giao tận tay người nhận", "+ Ký nhận từng trang", "+ Có người trực 24-7", "+ Cam kết đúng giờ"] },
      { title: "Ship quà sinh nhật", desc: ["+ Gói quà đẹp free", "+ Giao đúng khung giờ", "+ Chụp ảnh người nhận", "+ Giấu giá kèm thiệp", "+ Có thể hát chúc mừng"] },
      { title: "Giao hoa tươi trong ngày", desc: ["+ Hoa nhập mới mỗi sáng", "+ Tặng thiệp viết tay", "+ Chụp ảnh trước khi giao", "+ Giao trong 90 phút", "+ Héo hoàn 100%"] },
      { title: "Chuyển nhà mini", desc: ["+ Xe ba gác-xe tải nhỏ", "+ 2 người bốc xếp", "+ Tháo lắp đồ cơ bản", "+ Bọc màng chống trầy", "+ Dọn sạch sau khi chuyển"] },
      { title: "Ship đồ cồng kềnh", desc: ["+ Có xe bán tải-xe tải", "+ Hỗ trợ khiêng lên lầu", "+ Dây ràng chắc chắn", "+ Đi tỉnh được", "+ Báo giá trước khi chở"] },
      { title: "Giao hàng lúc nửa đêm", desc: ["+ Nhận đơn 22h-6h", "+ Phụ phí rõ ràng", "+ Shipper nam có CCCD", "+ Share định vị real-time", "+ Gọi xác nhận 2 lần"] },
      { title: "Giao thuốc khẩn cấp", desc: ["+ Mua đúng đơn bác sĩ", "+ Giữ lạnh nếu cần", "+ Giao trong 60 phút", "+ Có hóa đơn nhà thuốc", "+ Tư vấn liều dùng cơ bản"] }
    ]
  },
  {
    id: "shopping", name: "Mua hộ", icon: "🛒", color: "#34c759", basePrice: 30000,
    suggestions: [
      { title: "Mua đồ siêu thị giúp", desc: ["+ Chọn đồ tươi như cho nhà dùng", "+ Chụp ảnh kệ để bạn duyệt", "+ Hóa đơn + tích điểm cho bạn", "+ Giao trong 3 tiếng", "+ Đổi trả nếu héo hoặc ôi"] },
      { title: "Xếp hàng mua vé concert", desc: ["+ Camp từ 4h sáng", "+ Live update vị trí", "+ Mua đúng khu bạn chọn", "+ Hoàn tiền nếu hết vé", "+ Tặng lightstick nếu có"] },
      { title: "Mua thuốc theo đơn", desc: ["+ Đi 3 nhà thuốc so giá", "+ Dược sĩ tư vấn lại", "+ Giữ toa gốc cẩn thận", "+ Giao + hướng dẫn uống", "+ Mua thêm theo yêu cầu"] },
      { title: "Săn sale hộ Shopee-Lazada", desc: ["+ Canh khung giờ vàng", "+ Áp full mã giảm", "+ Chat shop check hàng", "+ Quay video khui hàng", "+ Hỗ trợ đổi trả 7 ngày"] },
      { title: "Mua đồ chợ truyền thống", desc: ["+ Biết trả giá đúng chợ", "+ Chọn rau thịt tươi nhất", "+ Không độn hàng cũ", "+ Giao trước 10h sáng", "+ Free túi nilon hoặc túi giấy"] },
      { title: "Đặt bánh sinh nhật", desc: ["+ Gửi 5 mẫu cho chọn", "+ Viết chữ theo yêu cầu", "+ Giao đúng giờ cắt bánh", "+ Thêm nến + dao free", "+ Bánh mới trong ngày"] },
      { title: "Mua quà tặng sếp", desc: ["+ Tư vấn theo ngân sách", "+ Gói quà sang trọng", "+ Xuất VAT nếu cần", "+ Giao tận văn phòng", "+ Kèm thiệp doanh nghiệp"] },
      { title: "Mua hộ đồ brand", desc: ["+ Check auth tại store", "+ Quay video mua hàng", "+ Giữ bill và tag đầy đủ", "+ Săn sale outlet 50% trở lên", "+ Ship quốc tế được"] },
      { title: "Đi chợ nấu cơm gia đình", desc: ["+ Lên thực đơn 3 món", "+ Cân đối dinh dưỡng", "+ Sơ chế sẵn nếu cần", "+ Tính toán 40k mỗi người", "+ Dọn bếp sau khi nấu"] },
      { title: "Mua đồ cúng-mâm lễ", desc: ["+ Đủ lễ theo vùng miền", "+ Trái cây loại 1", "+ Hoa tươi không héo", "+ Giao trước giờ cúng", "+ Hỗ trợ bày mâm"] }
    ]
  },
  {
    id: "tutoring", name: "Gia sư", icon: "📚", color: "#0a84ff", basePrice: 200000,
    suggestions: [
      { title: "Dạy Toán cấp 3", desc: ["+ Ôn thi THPT 8+", "+ Lộ trình cá nhân hóa", "+ Đề thi thử mỗi tuần", "+ Báo cáo cho phụ huynh", "+ Học thử 1 buổi free"] },
      { title: "Luyện IELTS 7.0+", desc: ["+ Test 4 kỹ năng đầu vào", "+ Chấm Writing chi tiết", "+ Mock test Speaking 1-1", "+ Cam kết tăng 1.0 band", "+ Tài liệu độc quyền"] },
      { title: "Dạy Piano cho bé", desc: ["+ Giáo trình Method Rose", "+ Vừa học vừa chơi", "+ Biểu diễn sau 3 tháng", "+ Có đàn tại nhà cô", "+ Phụ huynh dự giờ được"] },
      { title: "Kèm code Python cơ bản", desc: ["+ Làm project thực tế", "+ Dạy tư duy không học vẹt", "+ Fix bug cùng học viên", "+ Portfolio sau khóa", "+ Support cả khi học xong"] },
      { title: "Dạy tiếng Trung HSK", desc: ["+ Phát âm chuẩn Bắc Kinh", "+ Luyện 4 kỹ năng", "+ Thi thử HSK mỗi tháng", "+ Giao tiếp chủ đề công sở", "+ Tặng bộ flashcard"] },
      { title: "Ôn thi đại học cấp tốc", desc: ["+ Tổng ôn 2 tháng", "+ Mẹo khoanh trắc nghiệm", "+ Đề các trường top", "+ Học 6 buổi mỗi tuần", "+ Ở lại lớp đến khi hiểu"] },
      { title: "Dạy vẽ cho trẻ em", desc: ["+ Kích thích sáng tạo", "+ Học màu nước-chì-sáp", "+ Triển lãm mini cuối khóa", "+ Lớp tối đa 5 bé", "+ Vật liệu bao gồm"] },
      { title: "Luyện Speaking 1-1", desc: ["+ Sửa phát âm từng từ", "+ Chủ đề công việc hoặc du lịch", "+ Không ngại nói sai", "+ Ghi âm để nghe lại", "+ Linh hoạt giờ học"] },
      { title: "Dạy Excel nâng cao", desc: ["+ Pivot + VBA cơ bản", "+ Bài tập từ file công ty bạn", "+ Dashboard quản lý", "+ Shortcut làm nhanh x3", "+ Cấp chứng nhận"] },
      { title: "Dạy nhảy TikTok", desc: ["+ Trend mới nhất", "+ Quay clip đẹp cho bạn", "+ Dạy tại studio hoặc gia sư", "+ Nhóm 1-3 người", "+ Dáng đẹp sau 1 tháng"] }
    ]
  },
  {
    id: "design", name: "Thiết kế", icon: "🎨", color: "#af52de", basePrice: 500000,
    suggestions: [
      { title: "Logo + bộ nhận diện", desc: ["+ 3 concept khác nhau", "+ Sửa không giới hạn", "+ File AI PSD PNG", "+ Guideline sử dụng", "+ Tặng mockup đẹp"] },
      { title: "Banner Shopee-TikTok", desc: ["+ Đúng size sàn TMĐT", "+ Tối ưu CTR", "+ Text thu hút", "+ Giao trong 24h", "+ Sửa 3 lần free"] },
      { title: "Thiết kế menu quán", desc: ["+ Layout dễ nhìn", "+ Hình chụp món đẹp", "+ Inbox giá in ấn", "+ File in offset", "+ Update giá free 3 tháng"] },
      { title: "Edit video ngắn", desc: ["+ Capcut-Pr chuyên nghiệp", "+ Hiệu ứng trend", "+ Subtitle auto", "+ Nhạc không bản quyền", "+ Xuất 4K nếu cần"] },
      { title: "Avatar thương hiệu", desc: ["+ Nhận diện rõ ngành", "+ 5 option màu", "+ Dùng cho MXH hoặc print", "+ Tặng cover Facebook", "+ File vector"] },
      { title: "Thiệp cưới hiện đại", desc: ["+ Phong cách Hàn-Nhật", "+ In tên khách mời", "+ Giấy mỹ thuật", "+ Có file gửi online", "+ Tư vấn nội dung"] },
      { title: "Poster sự kiện", desc: ["+ A3 A2 A1 đều được", "+ Thông tin rõ ràng", "+ QR code check-in", "+ Giao file in nhanh", "+ Concept theo brief"] },
      { title: "Packaging sản phẩm", desc: ["+ Dieline chuẩn", "+ Mockup 3D", "+ Tư vấn chất liệu", "+ File cho xưởng in", "+ Test in mẫu 1 cái"] },
      { title: "Thiết kế áo đồng phục", desc: ["+ Logo thêu hoặc in đẹp", "+ Phối màu theo brand", "+ Size chart chuẩn", "+ Mockup người mặc", "+ Làm việc với xưởng"] },
      { title: "Slide PowerPoint", desc: ["+ Template riêng", "+ Infographic dễ hiểu", "+ Animation mượt", "+ Không dùng mẫu có sẵn", "+ Giao file edit được"] }
    ]
  },
  {
    id: "content", name: "Content", icon: "✍️", color: "#ffcc00", basePrice: 150000,
    suggestions: [
      { title: "Viết bài SEO website", desc: ["+ Nghiên cứu 20 từ khóa", "+ 1500-2000 từ", "+ Chuẩn Yoast hoặc RankMath", "+ Không AI content", "+ Tặng outline"] },
      { title: "Kịch bản TikTok viral", desc: ["+ Hook 3s đầu", "+ Trend đang lên", "+ Call-to-action mạnh", "+ 30s-60s", "+ Gợi ý diễn viên"] },
      { title: "Viết CV chuyên nghiệp", desc: ["+ ATS friendly", "+ Highlight thành tích", "+ 2 bản Việt-Anh", "+ Template đẹp", "+ Sửa đến khi đậu PV"] },
      { title: "PR báo chí", desc: ["+ Góc nhìn báo chí", "+ Không quảng cáo lộ", "+ Booking báo lớn", "+ Ảnh minh họa", "+ Duyệt nhanh"] },
      { title: "Caption bán hàng", desc: ["+ Đúng insight", "+ 5 version A-B test", "+ Emoji hợp lý", "+ Hashtag chuẩn", "+ Tăng comment"] },
      { title: "Email marketing", desc: ["+ Subject mở cao", "+ Cá nhân hóa tên", "+ Kêu gọi click", "+ Không vào spam", "+ Template Mailchimp"] },
      { title: "Bài đăng Fanpage", desc: ["+ 30 bài mỗi tháng", "+ Hình + text đồng bộ", "+ Đăng giờ vàng", "+ Tương tác comment", "+ Báo cáo reach"] },
      { title: "Review sản phẩm", desc: ["+ Trải nghiệm thật", "+ Ảnh-video tự chụp", "+ Ưu nhược rõ ràng", "+ Không seeder", "+ Đăng hội nhóm"] },
      { title: "Content storytelling", desc: ["+ Câu chuyện cảm xúc", "+ Nhân vật gần gũi", "+ Bài học đọng lại", "+ Phù hợp brand", "+ Series 5 kỳ"] },
      { title: "Dịch + biên tập sách", desc: ["+ Giữ văn phong tác giả", "+ Biên tập mạch lạc", "+ Chú thích thuật ngữ", "+ Đúng deadline", "+ NDA bảo mật"] }
    ]
  },
  {
    id: "marketing", name: "Marketing", icon: "📢", color: "#ff2d55", basePrice: 800000,
    suggestions: [
      { title: "Chạy ads Facebook", desc: ["+ Target chuẩn tệp", "+ Test 5 content", "+ Tối ưu CPM và CPC", "+ Report hằng ngày", "+ Không chạy bùng"] },
      { title: "Tối ưu TikTok Shop", desc: ["+ Setup gian hàng", "+ Livestream khung giờ vàng", "+ Gắn giỏ hàng video", "+ Đẩy GMV", "+ Làm việc với KOC"] },
      { title: "Lên plan 30 ngày", desc: ["+ Content calendar", "+ KPI rõ ràng", "+ Ngân sách chi tiết", "+ Phân bổ kênh", "+ Có backup plan"] },
      { title: "Seeding group", desc: ["+ Nick thật tương tác cao", "+ Không spam link", "+ Comment tự nhiên", "+ Report link bài", "+ Đổi content nếu flop"] },
      { title: "Booking KOC-KOL", desc: ["+ List 50 KOC đúng tệp", "+ Deal giá tốt", "+ Brief + duyệt content", "+ Tracking link", "+ Bảo hành view"] },
      { title: "Audit kênh free", desc: ["+ Check 20 tiêu chí", "+ Chỉ ra lỗi sai", "+ Đề xuất cải thiện", "+ File PDF chi tiết", "+ Gọi tư vấn 30p"] },
      { title: "Setup Google Ads", desc: ["+ Keyword planner", "+ Loại trừ click ảo", "+ Conversion tracking", "+ Tối ưu Quality Score", "+ Báo cáo Search Term"] },
      { title: "Tăng follow thật", desc: ["+ Không tool không ảo", "+ Target đúng ngành", "+ Tương tác hằng ngày", "+ Content hút follow", "+ Cam kết không tụt"] },
      { title: "Chạy Zalo OA", desc: ["+ Tin broadcast", "+ ZNS chăm sóc", "+ Chatbot trả lời", "+ Tích điểm thành viên", "+ Đẩy đơn từ Zalo"] },
      { title: "Làm landing page", desc: ["+ Tốc độ dưới 2s", "+ Chuẩn mobile", "+ Gắn pixel đầy đủ", "+ A-B test 2 bản", "+ Tối ưu CR"] }
    ]
  },
  {
    id: "translate", name: "Dịch thuật", icon: "🌐", color: "#5856d6", basePrice: 200000,
    suggestions: [
      { title: "Dịch hợp đồng Anh-Việt", desc: ["+ Thuật ngữ pháp lý chuẩn", "+ Bảo mật tuyệt đối", "+ Dò 2 lần", "+ Giao file Word", "+ Có dấu công ty nếu cần"] },
      { title: "Phiên dịch hội thảo", desc: ["+ Cabin hoặc đuổi", "+ Kinh nghiệm 3 năm trở lên", "+ Nghiên cứu tài liệu trước", "+ Đúng giờ tác phong tốt", "+ Thiết bị kèm theo"] },
      { title: "Dịch phim-vietsub", desc: ["+ Khớp timecode", "+ Văn nói tự nhiên", "+ Font + hiệu ứng", "+ Giao file SRT hoặc ASS", "+ Demo 2 phút trước"] },
      { title: "Dịch thuật công chứng", desc: ["+ Lấy dấu tư pháp", "+ 1-2 ngày có", "+ Scan gửi trước", "+ Ship tận nơi", "+ Bao đậu hồ sơ"] },
      { title: "Dịch sách kỹ thuật", desc: ["+ Đúng chuyên ngành", "+ Thuật ngữ nhất quán", "+ Vẽ lại hình minh họa", "+ Mục lục tự động", "+ ISBN hỗ trợ"] },
      { title: "Dịch website", desc: ["+ Giữ format HTML", "+ SEO keyword", "+ Đa ngôn ngữ", "+ Không vỡ layout", "+ Update khi web đổi"] },
      { title: "Dịch game", desc: ["+ Tone game thủ", "+ Không dài hơn UI", "+ Test in-game", "+ Glossary riêng", "+ NDA với studio"] },
      { title: "Dịch tiếng Hàn-Nhật", desc: ["+ Topik N2 JLPT N2 trở lên", "+ Thư tín thương mại", "+ Dịch nói qua Zoom", "+ Văn hóa doanh nghiệp", "+ Có người bản xứ check"] },
      { title: "Dịch hồ sơ du học", desc: ["+ SOP LOR", "+ Đúng form trường", "+ Nhấn mạnh điểm mạnh", "+ Nộp trước deadline", "+ Edit đến khi ưng"] },
      { title: "Dịch app mobile", desc: ["+ String file iOS Android", "+ Độ dài phù hợp button", "+ 20 ngôn ngữ", "+ OTA update", "+ Test trên máy thật"] }
    ]
  },
  {
    id: "photo", name: "Chụp ảnh", icon: "📸", color: "#ff3b30", basePrice: 800000,
    suggestions: [
      { title: "Chụp ảnh sản phẩm", desc: ["+ Nền trắng hoặc đổi màu", "+ Chụp 360 độ", "+ Retouch xóa defect", "+ Đúng size sàn TMĐT", "+ Giao 48h"] },
      { title: "Chụp lookbook thời trang", desc: ["+ Concept theo BST", "+ Model có sẵn", "+ Stylist + MUA", "+ Studio hoặc Outdoor", "+ Video hậu trường"] },
      { title: "Chụp ảnh cưới", desc: ["+ 2 máy 2 góc", "+ Flycam nếu cần", "+ Album cao cấp", "+ File gốc không watermark", "+ Chụp phóng sự"] },
      { title: "Chụp sự kiện công ty", desc: ["+ Bắt khoảnh khắc tự nhiên", "+ Chụp lãnh đạo đẹp", "+ Giao ảnh trong ngày", "+ Backup thẻ nhớ", "+ Không làm phiền khách"] },
      { title: "Chụp profile cá nhân", desc: ["+ Tạo dáng hướng dẫn", "+ Nền studio-doanh nhân", "+ Retouch da tự nhiên", "+ 20 ảnh chọn", "+ Phù hợp LinkedIn"] },
      { title: "Chụp món ăn", desc: ["+ Food stylist", "+ Ánh sáng ngon mắt", "+ Khói bay hơi thật", "+ Menu + MXH", "+ Giao file TIFF"] },
      { title: "Chụp nội thất", desc: ["+ Lens góc rộng", "+ HDR đủ sáng", "+ Dọn đồ gọn gàng", "+ Virtual tour 360", "+ Cho Airbnb"] },
      { title: "Quay flycam", desc: ["+ Giấy phép bay", "+ 4K 60fps", "+ Bay an toàn", "+ Edit nhạc", "+ Toàn cảnh BĐS hoặc sự kiện"] },
      { title: "Chụp ảnh cho bé", desc: ["+ Kiên nhẫn dỗ bé", "+ Đạo cụ dễ thương", "+ An toàn studio", "+ Cha mẹ vào cùng", "+ In ảnh tặng"] },
      { title: "Chụp ảnh thẻ lấy ngay", desc: ["+ Đúng quy chuẩn", "+ Sửa tóc-áo", "+ Nền xanh hoặc trắng", "+ File + in 4 tấm", "+ 5 phút có"] }
    ]
  },
  {
    id: "assistant", name: "Trợ lý", icon: "👔", color: "#5ac8fa", basePrice: 300000,
    suggestions: [
      { title: "Trợ lý từ xa theo giờ", desc: ["+ Online 9-18h", "+ Thạo Google Workspace", "+ Báo cáo cuối ngày", "+ Bảo mật NDA", "+ Thử việc 3 ngày"] },
      { title: "Nhập liệu Excel", desc: ["+ 10000 dòng mỗi ngày", "+ Độ chính xác 99%", "+ Check 2 lớp", "+ Công thức tự động", "+ Giao file xlsx"] },
      { title: "Quản lý Fanpage", desc: ["+ Rep inbox 5p", "+ Đăng 2 bài mỗi ngày", "+ Chốt đơn cơ bản", "+ Lọc spam", "+ Báo cáo tuần"] },
      { title: "Đặt lịch hẹn", desc: ["+ Gọi xác nhận", "+ Nhắc trước 1 ngày", "+ Sắp xếp tối ưu", "+ Google Calendar", "+ Dời lịch linh hoạt"] },
      { title: "Nghiên cứu thị trường", desc: ["+ 20 đối thủ", "+ Bảng so sánh giá", "+ Insight khách hàng", "+ File slide đẹp", "+ Nguồn tin cậy"] },
      { title: "Gọi điện CSKH", desc: ["+ Kịch bản có sẵn", "+ Giọng dễ nghe", "+ Ghi âm cuộc gọi", "+ Excel kết quả", "+ Gọi lại lần 2"] },
      { title: "Sắp xếp hồ sơ", desc: ["+ Scan PDF", "+ Đặt tên chuẩn", "+ Upload Drive", "+ Phân thư mục", "+ Bàn giao mục lục"] },
      { title: "Support dự án", desc: ["+ Họp ghi biên bản", "+ Theo dõi deadline", "+ Nhắc việc team", "+ Tổng hợp báo cáo", "+ Tool Notion hoặc Trello"] },
      { title: "Tìm + đặt vé máy bay", desc: ["+ Săn vé rẻ", "+ So 3 hãng", "+ Giờ bay đẹp", "+ Thêm hành lý", "+ Check-in online"] },
      { title: "Quản lý KOL booking", desc: ["+ List KOC phù hợp", "+ Deal giá + hợp đồng", "+ Duyệt content", "+ Thanh toán", "+ Report kết quả"] }
    ]
  },
  {
    id: "event", name: "Sự kiện", icon: "🎉", color: "#ff9f0a", basePrice: 1500000,
    suggestions: [
      { title: "Tổ chức sinh nhật", desc: ["+ Concept riêng", "+ Backdrop + bóng", "+ MC + games", "+ Chụp ảnh", "+ Dọn dẹp sau tiệc"] },
      { title: "MC dẫn chương trình", desc: ["+ Song ngữ nếu cần", "+ Kịch bản tự viết", "+ Hoạt náo tốt", "+ Đúng dresscode", "+ Có demo video"] },
      { title: "Setup workshop", desc: ["+ Thuê địa điểm", "+ Teabreak", "+ Máy chiếu-mic", "+ Check-in QR", "+ Quay recap"] },
      { title: "Thuê PG-PB", desc: ["+ Ngoại hình chuẩn", "+ Đồng phục brand", "+ Training sản phẩm", "+ Đúng giờ", "+ Quản lý tại chỗ"] },
      { title: "Trang trí tiệc cưới", desc: ["+ Hoa tươi", "+ Bảng tên + hashtag", "+ Sân khấu + lối đi", "+ Tháo dỡ gọn", "+ Xem mẫu trước"] },
      { title: "Âm thanh ánh sáng", desc: ["+ Loa đủ công suất", "+ Đèn moving-strobe", "+ Kỹ thuật trực", "+ Test trước 2 tiếng", "+ Backup máy phát"] },
      { title: "Quay phim sự kiện", desc: ["+ 2-3 máy", "+ Highlight 3 phút", "+ Full show", "+ Flycam", "+ Giao trong 72h"] },
      { title: "Lên timeline chi tiết", desc: ["+ Từng phút", "+ Phân công nhân sự", "+ Rủi ro + backup", "+ File Excel + PDF", "+ Họp duyệt trước"] },
      { title: "Thuê mascot-chú hề", desc: ["+ Hoạt náo trẻ em", "+ Bong bóng tạo hình", "+ Chụp ảnh cùng", "+ 2 tiếng", "+ Đồ sạch sẽ"] },
      { title: "Tiệc công ty Year End", desc: ["+ Ý tưởng chủ đề", "+ Games sân khấu", "+ Vinh danh + quà", "+ Ban nhạc hoặc DJ", "+ Trọn gói A-Z"] }
    ]
  },
  {
    id: "legal", name: "Pháp lý", icon: "⚖️", color: "#30d158", basePrice: 1000000,
    suggestions: [
      { title: "Thành lập công ty", desc: ["+ Tư vấn loại hình", "+ GPKD 3 ngày", "+ Con dấu + bảng hiệu", "+ Mở TK ngân hàng", "+ Khai thuế ban đầu"] },
      { title: "Đăng ký nhãn hiệu", desc: ["+ Tra cứu trùng", "+ Nộp Cục SHTT", "+ Theo dõi 12-18 tháng", "+ Phúc đáp nếu bị từ chối", "+ Văn bằng gốc"] },
      { title: "Soạn hợp đồng", desc: ["+ Điều khoản chặt chẽ", "+ Bảo vệ quyền lợi", "+ Song ngữ", "+ Đóng dấu công ty", "+ Tư vấn ký kết"] },
      { title: "Tư vấn ly hôn", desc: ["+ Thuận tình hoặc đơn phương", "+ Chia tài sản-con cái", "+ Soạn đơn", "+ Đi tòa cùng", "+ Bảo mật thông tin"] },
      { title: "Làm visa- work permit", desc: ["+ Check hồ sơ", "+ Dịch công chứng", "+ Nộp Cục QLXNC", "+ Nhanh 7 ngày", "+ Bao đậu 90%"] },
      { title: "Xin giấy phép", desc: ["+ VSATTP-PCCC", "+ Quảng cáo ngoài trời", "+ Bản vẽ + hồ sơ", "+ Làm việc cơ quan", "+ Nghiệm thu"] },
      { title: "Quyết toán thuế", desc: ["+ Rà soát sổ sách", "+ Tối ưu chi phí", "+ Giải trình thanh tra", "+ Nộp online", "+ Chịu trách nhiệm"] },
      { title: "Tranh chấp đất đai", desc: ["+ Đo đạc lại", "+ Hòa giải xã-phường", "+ Khởi kiện ra tòa", "+ Luật sư tranh tụng", "+ Thi hành án"] },
      { title: "Đăng ký mã vạch", desc: ["+ GS1 Việt Nam", "+ 1-2 ngày có", "+ File in tem", "+ Hướng dẫn dán", "+ Không phát sinh"] },
      { title: "Tư vấn thừa kế", desc: ["+ Di chúc hợp pháp", "+ Phân chia theo luật", "+ Công chứng", "+ Sang tên sổ", "+ Tránh tranh chấp"] }
    ]
  },
  {
    id: "repair", name: "Sửa chữa", icon: "🔧", color: "#bf5af2", basePrice: 200000,
    suggestions: [
      { title: "Sửa điện nước tại nhà", desc: ["+ Có mặt 30p", "+ Báo giá trước", "+ Linh kiện chính hãng", "+ Bảo hành 6 tháng", "+ Dọn sạch"] },
      { title: "Sửa laptop-PC", desc: ["+ Vệ sinh + tra keo", "+ Cài Win-Office", "+ Cứu dữ liệu", "+ Nâng cấp SSD-RAM", "+ Test tại chỗ"] },
      { title: "Lắp camera an ninh", desc: ["+ Khảo sát free", "+ Đi dây âm tường", "+ Xem từ xa qua app", "+ Lưu cloud hoặc thẻ nhớ", "+ Bảo trì 12 tháng"] },
      { title: "Sửa máy lạnh", desc: ["+ Vệ sinh 150k", "+ Bơm gas R32-R410", "+ Sửa board", "+ Xì dàn lạnh", "+ Có hóa đơn VAT"] },
      { title: "Thông tắc bồn cầu", desc: ["+ Máy lò xo hoặc máy nén", "+ Không đục phá", "+ Hết mùi", "+ 23h-6h vẫn làm", "+ Bảo hành 3 tháng"] },
      { title: "Sửa khóa tận nơi", desc: ["+ Mở khóa quên chìa", "+ Thay khóa mới", "+ Làm chìa smartkey", "+ Két sắt", "+ 15 phút có mặt"] },
      { title: "Sơn sửa nhà", desc: ["+ Chống thấm", "+ Bả matit", "+ Sơn nước-sơn dầu", "+ Che chắn đồ", "+ Màu chuẩn"] },
      { title: "Lắp đặt nội thất", desc: ["+ Tủ-bàn-ghế", "+ Khoan tường", "+ Cân chỉnh", "+ Vệ sinh sau lắp", "+ Có dụng cụ đủ"] },
      { title: "Sửa máy giặt", desc: ["+ Không vắt hoặc kêu to", "+ Thay board-ty", "+ Vệ sinh lồng", "+ Thay dây curoa", "+ Test 30p"] },
      { title: "Chống dột mái tôn", desc: ["+ Tìm đúng chỗ dột", "+ Bắn silicon-keo", "+ Thay tôn", "+ Làm máng xối", "+ Bảo hành mùa mưa"] }
    ]
  },
  {
    id: "accounting", name: "Kế toán", icon: "🧮", color: "#64d2ff", basePrice: 500000,
    suggestions: [
      { title: "Báo cáo thuế tháng", desc: ["+ GTGT-TNCN", "+ Nộp đúng hạn", "+ Tối ưu khấu trừ", "+ Sổ sách khớp", "+ Chữ ký số"] },
      { title: "Làm sổ sách kế toán", desc: ["+ Misa hoặc Fast", "+ Phiếu thu chi", "+ In sổ đóng cuốn", "+ Lưu file mềm", "+ Quyết toán năm"] },
      { title: "Quyết toán cuối năm", desc: ["+ BCTC", "+ TNDN-TNCN", "+ Thuyết minh", "+ Nộp online", "+ Giải trình"] },
      { title: "Tư vấn tối ưu thuế", desc: ["+ Hợp pháp 100%", "+ Chi phí hợp lý", "+ Hóa đơn đầu vào", "+ Rủi ro thấp", "+ Có văn bản"] },
      { title: "Hoàn thuế TNCN", desc: ["+ Người phụ thuộc", "+ Chứng từ đủ", "+ Nộp online", "+ Theo dõi tiền về", "+ Phí sau khi có tiền"] },
      { title: "Đăng ký BHXH", desc: ["+ Lần đầu cho DN", "+ Báo tăng-giảm", "+ Chốt sổ", "+ Thai sản-ốm đau", "+ Giao dịch điện tử"] },
      { title: "Làm BCTC", desc: ["+ CĐKT-KQKD-LCTT", "+ Chuẩn VAS", "+ Kiểm toán nếu cần", "+ Nộp Thống kê", "+ In 3 bộ"] },
      { title: "Setup phần mềm", desc: ["+ Misa-Amis", "+ Danh mục ban đầu", "+ Phân quyền", "+ Training 2 buổi", "+ Support 3 tháng"] },
      { title: "Rà soát rủi ro thuế", desc: ["+ 50 tiêu chí", "+ Báo cáo đỏ-vàng", "+ Khắc phục", "+ Mô phỏng thanh tra", "+ Cam kết bảo mật"] },
      { title: "Kế toán trưởng", desc: ["+ Ký BCTC", "+ Chịu trách nhiệm PL", "+ Họp với thuế", "+ Ủy quyền", "+ Chứng chỉ BTC"] }
    ]
  },
  {
    id: "care", name: "Chăm sóc", icon: "❤️", color: "#ff375f", basePrice: 400000,
    suggestions: [
      { title: "Chăm người già tại nhà", desc: ["+ Kinh nghiệm 3 năm trở lên", "+ Cho ăn-uống thuốc", "+ Tắm rửa", "+ Đi dạo", "+ Báo cáo hằng ngày"] },
      { title: "Trông trẻ theo giờ", desc: ["+ Cô giáo mầm non", "+ Cho ăn-ngủ", "+ Dạy bé chơi", "+ Sơ cứu cơ bản", "+ Camera nếu cần"] },
      { title: "Chăm sóc thú cưng", desc: ["+ Cho ăn-đi dạo", "+ Tắm sấy", "+ Gửi ảnh-video", "+ Ở lại nhà bạn", "+ Biết xử lý khi ốm"] },
      { title: "Massage trị liệu", desc: ["+ Chứng chỉ YHCT", "+ Đau cổ vai gáy", "+ Bấm huyệt", "+ Tinh dầu", "+ Đến tận nhà"] },
      { title: "Chăm sóc mẹ và bé", desc: ["+ Tắm bé chuẩn Y khoa", "+ Massage bầu", "+ Thông tắc sữa", "+ Nấu đồ ở cữ", "+ 24-24 hoặc theo ca"] },
      { title: "Đi chợ nấu ăn", desc: ["+ Lên menu tuần", "+ Tính 50k mỗi người", "+ Sơ chế sạch", "+ Nấu 3 món + canh", "+ Rửa chén"] },
      { title: "Đưa đón bé đi học", desc: ["+ Đúng giờ", "+ Xe máy-oto", "+ Có ghế trẻ em", "+ Đón 2 chiều", "+ Cô giáo đi cùng"] },
      { title: "Tập vật lý trị liệu", desc: ["+ Sau tai biến", "+ Phục hồi chức năng", "+ Máy móc hỗ trợ", "+ Tại nhà hoặc BV", "+ BS giám sát"] },
      { title: "Chăm người bệnh BV", desc: ["+ Trực đêm", "+ Lật trở-chống loét", "+ Báo BS kịp thời", "+ Mua đồ ăn BV", "+ Ca 12-24h"] },
      { title: "Cắt tóc tại nhà", desc: ["+ Nam-nữ-trẻ em", "+ Dụng cụ khử khuẩn", "+ Tạo kiểu theo ảnh", "+ Gội sấy", "+ Dọn tóc sạch"] }
    ]
  },
  {
    id: "car", name: "Xe cộ", icon: "🚗", color: "#ac8e68", basePrice: 600000,
    suggestions: [
      { title: "Tài xế riêng theo ngày", desc: ["+ B2 5 năm trở lên", "+ Rành đường HCM", "+ Xe 4-7 chỗ", "+ Chờ không tính phí", "+ Lịch sự"] },
      { title: "Rửa xe tận nơi", desc: ["+ Không cần nước nhà bạn", "+ Rửa + hút bụi", "+ Dưỡng nội thất", "+ 60 phút xong", "+ Đặt lịch app"] },
      { title: "Đăng kiểm hộ", desc: ["+ Xếp hàng lấy số", "+ Sửa lỗi nhỏ", "+ Đi 2 lần nếu rớt", "+ Giao xe tận nhà", "+ Phí nhà nước riêng"] },
      { title: "Cứu hộ ắc quy", desc: ["+ Câu bình 5p", "+ Thay bình mới", "+ Thu bình cũ", "+ 24-7", "+ Bảo hành 6-12 tháng"] },
      { title: "Dán phim cách nhiệt", desc: ["+ 3M-Llumar", "+ Bảo hành 10 năm", "+ Đo UV tại chỗ", "+ Không bong mép", "+ Dán tại nhà"] },
      { title: "Thuê xe tự lái", desc: ["+ Giao xe tận nơi", "+ BH 2 chiều", "+ Không thế chấp", "+ Đổi xe nếu hỏng", "+ Hợp đồng rõ"] },
      { title: "Vá vỏ lưu động", desc: ["+ Vá lụi hoặc vá trong", "+ 20 phút có mặt", "+ Đêm vẫn làm", "+ Kích bình free", "+ Có vỏ mới"] },
      { title: "Sang tên đổi chủ", desc: ["+ Công chứng", "+ Nộp thuế", "+ Bấm số nếu cần", "+ Cà số khung máy", "+ 3-5 ngày xong"] },
      { title: "Lắp camera hành trình", desc: ["+ Đi dây gọn", "+ App xem lại", "+ Cảnh báo ADAS", "+ Thẻ nhớ 64GB", "+ BH 12 tháng"] },
      { title: "Đánh bóng xe", desc: ["+ 3 bước chuẩn", "+ Xóa xước xoáy", "+ Phủ ceramic", "+ Sáng như mới", "+ BH 1 năm"] },
    ]
  },
  {
    id: "other", name: "Khác", icon: "📌", color: "#ac8e68", basePrice: 100000,
    suggestions: [
      { title: "Việc gì cũng nhận", desc: ["+ Trao đổi trước", "+ Giá thương lượng", "+ Uy tín", "+ 24-7", "+ Không ngại gian khổ"] },
      { title: "Tư vấn tâm lý", desc: ["+ Lắng nghe 60p", "+ Không phán xét", "+ Giữ bí mật", "+ Online hoặc offline", "+ Chuyên viên"] },
      { title: "Xem tarot-bói bài", desc: ["+ 3 câu hỏi", "+ Ghi âm gửi lại", "+ Trải bài Celtic", "+ Không hù dọa", "+ Định hướng"] },
      { title: "Thuê người yêu", desc: ["+ Đi ăn hoặc đi tiệc", "+ Chụp ảnh", "+ Kịch bản rõ ràng", "+ Giới hạn tiếp xúc", "+ Hợp đồng"] },
      { title: "Xếp hàng mua đồ", desc: ["+ iPhone-Labubu", "+ Camp qua đêm", "+ Live vị trí", "+ Mua đúng size và màu", "+ Hoàn nếu fail"] },
      { title: "Test game-app", desc: ["+ 20 test case", "+ Quay màn hình bug", "+ Báo cáo chi tiết", "+ Đa thiết bị", "+ Bảo mật"] },
      { title: "Tìm người thất lạc", desc: ["+ Check camera khu vực", "+ Đăng hội nhóm", "+ In tờ rơi", "+ Báo công an nếu cần", "+ Cập nhật 24-7"] },
      { title: "Tư vấn phong thủy", desc: ["+ Xem tuổi-hướng nhà", "+ Ngày tốt khai trương", "+ Bố trí bàn làm việc", "+ Vòng tay hợp mệnh", "+ Không mê tín dị đoan"] },
      { title: "Thuê bạn đi nhậu", desc: ["+ Uống được vui vẻ", "+ Biết lắng nghe", "+ Kịch bản rõ ràng", "+ Không qua đêm", "+ Có CCCD"] },
      { title: "Dịch vụ đòi nợ thuê", desc: ["+ Đúng pháp luật", "+ Không giang hồ", "+ Nhắc nợ văn minh", "+ Có giấy ủy quyền", "+ Phí phần trăm sau khi đòi được"] }
    ]
  }
];

const URGENCY = [
  {
    id: "once",
    name: "Một lần",
    time: "Job đơn lẻ",
    color: "emerald",
  },
  {
    id: "weekly",
    name: "Theo tuần",
    time: "Lặp định kỳ",
    color: "amber",
  },
  {
    id: "ongoing",
    name: "Liên tục",
    time: "Cần thường xuyên",
    color: "red",
  },
];

const TEMPLATES = [
  { icon: "🚚", name: "Ship nhanh", cat: "delivery", title: "Giao hàng hỏa tốc nội thành", price: "45000", tags: ["gấp", "trong ngày"] },
  { icon: "🎨", name: "Logo Pro", cat: "design", title: "Thiết kế logo + bộ nhận diện", price: "1500000", tags: ["chuyên nghiệp", "3 concept"] },
  { icon: "📸", name: "Chụp sản phẩm", cat: "photo", title: "Chụp ảnh sản phẩm chuyên nghiệp", price: "800000", tags: ["studio", "retouch"] },
  { icon: "📢", name: "TikTok Ads", cat: "marketing", title: "Chạy quảng cáo TikTok 1 tháng", price: "3000000", tags: ["target", "report"] },
  { icon: "⚖️", name: "Thành lập CTY", cat: "legal", title: "Dịch vụ thành lập công ty trọn gói", price: "3000000", tags: ["pháp lý", "nhanh"] },
  { icon: "🔧", name: "Sửa máy lạnh", cat: "repair", title: "Vệ sinh + bơm gas máy lạnh", price: "200000", tags: ["tại nhà", "bảo hành"] },
];

type FormState = {
  title: string;
  description: string;
  price: string;
  totalSlots: number;
  startDate: string;
  endDate: string;
  category: string;
  tags: string[];
  images: string[];
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  visibility: "public" | "friends" | "private";
  budgetType: "fixed" | "hourly" | "negotiable";
  isRemote: boolean;
  requirements: string;
  urgency: "once" | "weekly" | "ongoing";
  milestones: boolean;
  autoMatch: boolean;
  allowBids: boolean;
  featured: boolean;
  privateNotes: string;
  invites: string[];
  pollPrice: boolean;
  needApproval: boolean;
  nda: boolean;
  attachments: File[];
  recurring: string;
  languages: string[];
  timezone: string;
  hours: number;
};

type TemplateType = {
  icon: string;
  name: string;
  cat: string;
  title: string;
  price: string;
  tags: string[];
};
const formatLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate
    .toISOString()
    .slice(0, 16);
};
export default function CreateTaskProMax() {
  const router = useRouter();

  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const storageRef = useRef<FirebaseStorage | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
  } | null>(null);

  const [step, setStep] = useState<number>(1);
 

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const [savedTasks, setSavedTasks] = useState<number>(0);

  const now = new Date();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    price: "",
    totalSlots: 1,

startDate: formatLocalDate(
  new Date(
    now.getTime() + 60 * 60 * 1000
  )
),

endDate: formatLocalDate(
  new Date(
    now.getTime() +
      3 * 24 * 60 * 60 * 1000
  )
),

    category: "other",

    tags: [],
    images: [],

    address: "",
    city: "Hồ Chí Minh",

    lat: null,
    lng: null,

    visibility: "public",
    budgetType: "fixed",

    isRemote: true,

    requirements: "",

    urgency: "once",

    milestones: true,
    autoMatch: false,
    allowBids: false,
    featured: false,

    privateNotes: "",

    invites: [],

    pollPrice: false,
    needApproval: true,
    nda: false,

    attachments: [],

    recurring: "once",

    languages: ["Tiếng Việt"],

    timezone: "Asia/Ho_Chi_Minh",

    hours: 1,
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const category = useMemo(() => {
    return (
      CATEGORIES.find((c) => c.id === form.category) ??
      CATEGORIES[0]!
    );
  }, [form.category]);

  const progress = (step / 3) * 100;

  const basePrice = useMemo(() => {
    const num = parseInt(
      form.price.replace(/\D/g, "") || "0",
      10
    );

    return Number.isNaN(num) ? 0 : num;
  }, [form.price]);

  const canNext =
    step === 1
      ? form.title.trim().length >= 10 &&
        form.description.trim().length >= 20
      : step === 2
        ? form.budgetType === "negotiable" ||
          basePrice >= 10000
        : true;

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        try {
          navigator.vibrate(pattern);
        } catch (error) {
          console.error("Vibration failed:", error);
        }
      }
    },
    []
  );

  useEffect(() => {
    authRef.current = getFirebaseAuth();
    dbRef.current = getFirebaseDB();
    storageRef.current = getFirebaseStorage();

    const unsub = onAuthStateChanged(
      authRef.current,
      (u) => {
        if (u) {
          setUser({
            uid: u.uid,
            email: u.email,
          });
        } else {
          router.replace("/login");
        }
      }
    );

    return () => unsub();
  }, [router]);

  useEffect(() => {
  return () => {
    form.images.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  };
}, [form.images]);

  
 useEffect(() => {
  let mounted = true;

  const fetchTasks = async () => {
    if (!user?.uid || !dbRef.current) return;

    try {
      const snapshot = await getDocs(
        query(
          collection(dbRef.current, "tasks"),
          where("createdBy", "==", user.uid)
        )
      );

      if (mounted) {
        setSavedTasks(snapshot.size);
      }
    } catch (error) {
      console.error(
        "Failed to fetch tasks:",
        error
      );
    }
  };

  fetchTasks();

  return () => {
    mounted = false;
  };
}, [user?.uid]);
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (Math.abs(info.offset.x) < 50) {
      
      return;
    }

    if (
      info.offset.x < -50 &&
      step < 3 &&
      canNext
    ) {
      setStep((prev) => prev + 1);
    }

    if (
      info.offset.x > 50 &&
      step > 1
    ) {
      setStep((prev) => prev - 1);
    }

  
  };

  const useTemplate = (template: TemplateType) => {
    setForm((prev) => ({
      ...prev,
      category: template.cat,
      title: template.title,
      price: Number(template.price).toLocaleString("vi-VN"),
      tags: template.tags,
    }));

    setShowTemplates(false);

    toast.success("Đã áp dụng mẫu", {
      icon: "✨",
    });

    vibrate(10);
  };
  const handleFiles = (files: FileList | null) => {
  if (!files) return;

  const remaining = 5 - form.images.length;

  if (remaining <= 0) {
    toast.error("Tối đa 5 ảnh");
    return;
  }

  const validFiles = Array.from(files)
    .slice(0, remaining)
    .filter((file) => file.type.startsWith("image/"));

  if (validFiles.length === 0) {
    toast.error("Chỉ chấp nhận file ảnh");
    return;
  }

  setImageFiles((prev) => [...prev, ...validFiles]);

  setForm((prev) => ({
    ...prev,
    images: [
      ...prev.images,
      ...validFiles.map((file) =>
        URL.createObjectURL(file)
      ),
    ],
  }));

  toast.success(`Đã thêm ${validFiles.length} ảnh`);

  vibrate(5);
};

const handleGetLocation = () => {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation
  ) {
    toast.error("Trình duyệt không hỗ trợ định vị");
    return;
  }

  const toastId = toast.loading(
    "Đang lấy vị trí..."
  );

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setForm((prev) => ({
        ...prev,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: "Vị trí hiện tại",
      }));

      toast.dismiss(toastId);

      toast.success("Đã lấy vị trí");

      vibrate(8);
    },
    (error) => {
      console.error(error);

      toast.dismiss(toastId);

      toast.error("Không thể lấy vị trí");

      vibrate(15);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
};

const submit = async () => {
  if (!user || !canNext) {
    toast.error("Vui lòng điền đầy đủ thông tin");
    return;
  }

  if (!dbRef.current || !storageRef.current) {
    toast.error("Chưa kết nối Firebase");
    return;
  }

  if (
    !form.isRemote &&
    !form.address.trim()
  ) {
    toast.error("Vui lòng nhập địa chỉ");
    return;
  }

  setSubmitting(true);

  try {
    const urls = await Promise.all(
      imageFiles.map(async (file) => {
        const storagePath = `tasks/${user.uid}/${Date.now()}-${file.name}`;

        const storageReference = ref(
          storageRef.current as FirebaseStorage,
          storagePath
        );

        await uploadBytes(
          storageReference,
          file
        );

        return await getDownloadURL(
          storageReference
        );
      })
    );

    await createTask(
      {
        type: "task",

        title: form.title.trim(),

        description:
          form.description.trim(),

        price:
          form.budgetType ===
          "negotiable"
            ? 0
            : basePrice,

        currency: "VND",

        budgetType: form.budgetType,

        totalSlots: form.totalSlots,

        visibility: form.visibility,

        deadline: Timestamp.fromDate(
          new Date(form.endDate)
        ),

        applicationDeadline:
          Timestamp.fromDate(
            new Date(form.endDate)
          ),

        startDate: Timestamp.fromDate(
          new Date(form.startDate)
        ),

        category: form.category,

        tags: [
          ...form.tags,
          form.urgency,
        ],

        images: urls,

        attachments: [],

        requirements:
          form.requirements,

        isRemote: form.isRemote,

location: form.isRemote
  ? undefined
  : {
      address:
        form.address.trim(),

      city:
        form.city.trim(),

      ...(form.lat !== null && {
        lat: form.lat,
      }),

      ...(form.lng !== null && {
        lng: form.lng,
      }),
    },

        urgency: form.urgency,

        milestones: form.milestones,

        autoMatch: form.autoMatch,

        allowBids: form.allowBids,

        featured: form.featured,

        nda: form.nda,

        invites: form.invites,

        needApproval:
          form.needApproval,
      },
      user
    );

    setSuccess(true);

    toast.success(
      "🎉 Đăng công việc thành công!"
    );

    vibrate([10, 50, 10]);

    setTimeout(() => {
      router.push("/");
    }, 1800);
  } catch (error) {
    console.error(error);

    toast.error(
      error instanceof Error
        ? error.message
        : "Có lỗi xảy ra"
    );

    vibrate(15);
  } finally {
    setSubmitting(false);
  }
};

 return (
  <>
    <Toaster
      richColors
      position="top-center"
    />

    <div className="min-h-screen select-none bg-[#F2F2F7] text-zinc-900 dark:bg-black dark:text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[#E5E5EA] bg-white/80 backdrop-blur-2xl dark:border-zinc-800 dark:bg-black/80">
        <div className="h-[3px] bg-[#E5E5EA] dark:bg-zinc-800">
          <motion.div
            className="h-full bg-[#0a84ff]"
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

        <div className="mx-auto flex h-[52px] max-w-[680px] items-center gap-3 px-4">
          <button
            type="button"
            aria-label="Quay lại"
            onClick={() => {
              vibrate(5);

              if (step > 1) {
                setStep((prev) => prev - 1);
              } else {
                router.back();
              }
            }}
            className="grid h-8 w-8 place-items-center rounded-full transition-all hover:bg-zinc-900/5 active:scale-90 dark:hover:bg-white/5"
          >
            <FiX
              size={20}
              className="text-zinc-600 dark:text-zinc-400"
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-[#0a84ff] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                BƯỚC {step}
              </span>

              <span className="text-[11px] text-zinc-500">
                /3
              </span>

              {savedTasks > 0 && (
                <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] tabular-nums text-white dark:bg-white dark:text-black">
                  {savedTasks}
                </span>
              )}
            </div>

            <h1 className="mt-0.5 text-[17px] font-semibold leading-tight">
              {
                [
                  "Bạn cần gì?",
                  "Ngân sách & Thời gian",
                  "Tùy chọn",
                ][step - 1]
              }
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Mẫu có sẵn"
              onClick={() => {
                setShowTemplates(true);
                vibrate(5);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-900/5 active:scale-95 dark:hover:bg-white/5"
            >
              <FiCopy size={18} />
            </button>

            <button
              type="button"
              aria-label="Xem trước"
              disabled={!canNext}
              onClick={() => {
                setShowPreview(true);
                vibrate(5);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-900/5 active:scale-95 disabled:opacity-40 dark:hover:bg-white/5"
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
         

          onDragEnd={handleDragEnd}
        >
          <AnimatePresence
            mode="wait"
            initial={false}
          >
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{
                  opacity: 0,
                  x: 16,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -16,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                className="space-y-3 p-4"
              >
                {/* Categories */}
                <div>
                  <div className="mb-2 px-1 text-[13px] text-zinc-500">
                    Chọn danh mục
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            category: c.id,
                            price:
                              c.basePrice.toLocaleString(
                                "vi-VN"
                              ),
                            tags: [],
                          }));

                          vibrate(5);
                        }}
                        className="relative transition-transform active:scale-95"
                      >
                        <div
                          className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2.5 transition-all ${
                            form.category === c.id
                              ? "border-[#0a84ff] bg-[#0a84ff]/5 shadow-sm shadow-[#0a84ff]/10"
                              : "border-[#E5E5EA] bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
                          }`}
                        >
                          <div className="text-[22px] leading-none">
                            {c.icon}
                          </div>

                          <div
                            className={`text-center text-[11px] font-medium leading-tight ${
                              form.category === c.id
                                ? "font-semibold text-[#0a84ff]"
                                : "text-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {c.name}
                          </div>
                        </div>

                        {form.category ===
                          c.id && (
                          <motion.div
                            initial={{
                              scale: 0,
                            }}
                            animate={{
                              scale: 1,
                            }}
                            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0a84ff] shadow-md"
                          >
                            <FiCheck
                              size={12}
                              strokeWidth={3}
                              className="text-white"
                            />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      autoFocus
                      maxLength={100}
                      value={form.title}
                      placeholder="Bạn cần làm gì?"
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          title:
                            e.target.value.slice(
                              0,
                              100
                            ),
                        }))
                      }
                      className="h-12 w-full rounded-2xl border-2 border-[#E5E5EA] bg-white pl-4 pr-16 text-[15px] font-medium outline-none transition-all focus:border-[#0a84ff] focus:ring-4 focus:ring-[#0a84ff]/10 dark:border-zinc-800 dark:bg-zinc-900"
                    />

                    <span
                      className={`absolute right-4 top-1/2 -translate-y-1/2 tabular-nums text-[13px] font-medium ${
                        form.title.trim()
                          .length < 10
                          ? "text-red-500"
                          : "text-zinc-400"
                      }`}
                    >
                      {
                        form.title.trim()
                          .length
                      }
                      /10
                    </span>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap gap-1.5">
                    {category.suggestions
                      .slice(0, 5)
                      .map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            setForm(
                              (prev) => ({
                                ...prev,
                                title:
                                  item.title,
                                description:
                                  item.desc.join(
                                    "\n"
                                  ),
                              })
                            );

                            vibrate(5);
                          }}
                          className="rounded-full border border-[#E5E5EA] bg-white px-3 py-1.5 text-[12px] text-zinc-600 transition-all hover:border-[#0a84ff]/50 hover:bg-[#0a84ff]/5 hover:text-[#0a84ff] active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        >
                          {item.title}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-2xl border-2 border-[#E5E5EA] bg-white transition-all focus-within:border-[#0a84ff] focus-within:ring-4 focus-within:ring-[#0a84ff]/10 dark:border-zinc-800 dark:bg-zinc-900">
                  <textarea
                    rows={5}
                    maxLength={2000}
                    value={form.description}
                    placeholder="Mô tả chi tiết yêu cầu, mục tiêu, kết quả mong muốn..."
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description:
                          e.target.value.slice(
                            0,
                            2000
                          ),
                      }))
                    }
                    className="w-full resize-none rounded-2xl bg-transparent p-4 text-[15px] leading-relaxed outline-none placeholder:text-zinc-400"
                  />

                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(category.suggestions.find(
                        (s) =>
                          s.title ===
                          form.title
                      )?.desc || [])
                        .slice(0, 3)
                        .map((text, index) => (
                          <button
                            key={`${text}-${index}`}
                            type="button"
                            onClick={() => {
                              setForm(
                                (prev) => ({
                                  ...prev,
                                  description:
                                    prev.description +
                                    (prev.description
                                      ? "\n"
                                      : "") +
                                    text,
                                })
                              );

                              vibrate(5);
                            }}
                            className="rounded-lg bg-[#F2F2F7] px-2 py-1 text-[11px] text-zinc-600 transition-colors hover:bg-[#E5E5EA] dark:bg-zinc-800"
                          >
                            {text.slice(
                              0,
                              20
                            )}
                            ...
                          </button>
                        ))}
                    </div>

                    <span
                      className={`tabular-nums text-[12px] ${
                        form.description.trim()
                          .length < 20
                          ? "text-red-500"
                          : "text-zinc-400"
                      }`}
                    >
                      {
                        form.description.trim()
                          .length
                      }
                      /20
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
             {/* STEP 2 */}
{step === 2 && (
  <motion.div
    key="s2"
    initial={{
      opacity: 0,
      x: 16,
    }}
    animate={{
      opacity: 1,
      x: 0,
    }}
    exit={{
      opacity: 0,
      x: -16,
    }}
    className="space-y-3 p-4"
  >
    {/* Budget */}
    <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#0066cc] shadow-md shadow-[#0a84ff]/20">
            <span className="text-[11px] font-bold text-white">
              VNĐ
            </span>
          </div>

          <span className="text-[16px] font-semibold">
            Ngân sách
          </span>
        </div>

        <div className="flex rounded-xl bg-[#F2F2F7] p-1 dark:bg-zinc-800">
          {[
            "fixed",
            "hourly",
            "negotiable",
          ].map((type, index) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  budgetType:
                    type as FormState["budgetType"],
                }));

                vibrate(5);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                form.budgetType === type
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                  : "text-zinc-500"
              }`}
            >
              {
                [
                  "Cố định",
                  "Theo giờ",
                  "Thỏa thuận",
                ][index]
              }
            </button>
          ))}
        </div>
      </div>

      {form.budgetType !==
      "negotiable" ? (
        <>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={form.price}
              onChange={(e) => {
                const value =
                  e.target.value
                    .replace(/\D/g, "")
                    .replace(
                      /\B(?=(\d{3})+(?!\d))/g,
                      "."
                    );

                setForm((prev) => ({
                  ...prev,
                  price: value,
                }));
              }}
              className="h-16 w-full rounded-2xl bg-[#F2F2F7] pl-5 pr-16 text-[32px] font-bold tracking-tight tabular-nums outline-none transition-all focus:ring-4 focus:ring-[#0a84ff]/20 dark:bg-zinc-800"
            />

            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-zinc-400">
              VND
            </span>
          </div>

          <div className="mt-4 flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <span className="text-[14px] text-zinc-600 dark:text-zinc-300">
                Số người:
              </span>

              <div className="flex items-center gap-1 rounded-xl bg-[#F2F2F7] p-1 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      totalSlots:
                        Math.max(
                          1,
                          prev.totalSlots - 1
                        ),
                    }));

                    vibrate(5);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:bg-white active:scale-90 dark:hover:bg-zinc-700"
                >
                  −
                </button>

                <span className="w-8 text-center font-semibold tabular-nums">
                  {form.totalSlots}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      totalSlots:
                        Math.min(
                          20,
                          prev.totalSlots + 1
                        ),
                    }));

                    vibrate(5);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg transition-all hover:bg-white active:scale-90 dark:hover:bg-zinc-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid h-24 place-items-center rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800">
          <div className="flex items-center gap-2 text-zinc-500">
            <LottiePlayer
              animationData={
                L.loadingPull
              }
              loop
              autoplay
              className="h-6 w-6 opacity-60"
              aria-hidden="true"
            />

            <span className="text-[14px]">
              Thương lượng sau
            </span>
          </div>
        </div>
      )}
    </div>

    {/* Priority */}
    <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10">
          <FiZap
            size={18}
            className="text-amber-600"
          />
        </div>

        <span className="text-[15px] font-semibold">
          Mức độ ưu tiên
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {URGENCY.map((u) => (
          <motion.button
            key={u.id}
            type="button"
            whileTap={{
              scale: 0.96,
            }}
            aria-pressed={
              form.urgency === u.id
            }
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                urgency:
                  u.id as FormState["urgency"],
              }));

              vibrate(5);
            }}
            className={`relative rounded-2xl border-2 p-3.5 text-left transition-all ${
              form.urgency === u.id
                ? "border-[#0a84ff] bg-[#0a84ff]/5 shadow-sm"
                : "border-[#E5E5EA] hover:border-zinc-300 dark:border-zinc-800"
            }`}
          >
            <div
              className={`text-[14px] font-semibold ${
                form.urgency === u.id
                  ? "text-[#0a84ff]"
                  : ""
              }`}
            >
              {u.name}
            </div>

            <div className="mt-1 text-[12px] text-zinc-500">
              {u.time}
            </div>

            {form.urgency ===
              u.id && (
              <motion.div
                layoutId="urgency"
                className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#0a84ff]"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>

    {/* Time */}
    <div className="grid grid-cols-1 gap-3">
      <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2">
          <FiCalendar
            size={16}
            className="text-zinc-500"
          />

          <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
            Thời gian
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] text-zinc-500">
              Bắt đầu
            </label>

            <input
              type="datetime-local"
              value={form.startDate}
              min={new Date()
                .toISOString()
                .slice(0, 16)}
              onChange={(e) => {
                const value =
                  e.target.value;

                setForm((prev) => ({
                  ...prev,
                  startDate: value,
                  endDate:
                    value >
                    prev.endDate
                      ? value
                      : prev.endDate,
                }));
              }}
              className="h-11 w-full rounded-xl border-2 border-transparent bg-[#F2F2F7] px-3 text-[14px] font-medium outline-none transition-all focus:border-[#0a84ff] dark:bg-zinc-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] text-zinc-500">
              Kết thúc
            </label>

            <input
              type="datetime-local"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  endDate:
                    e.target.value,
                }))
              }
              className="h-11 w-full rounded-xl border-2 border-transparent bg-[#F2F2F7] px-3 text-[14px] font-medium outline-none transition-all focus:border-[#0a84ff] dark:bg-zinc-800"
            />
          </div>
        </div>

        {form.startDate &&
          form.endDate &&
          new Date(
            form.endDate
          ) <=
            new Date(
              form.startDate
            ) && (
            <p className="mt-2 text-[13px] text-red-500">
              Kết thúc phải sau
              bắt đầu
            </p>
          )}
      </div>
    </div>

    {/* Location */}
    <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiMapPin
            size={16}
            className="text-zinc-500"
          />

          <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
            Làm việc từ xa
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={
            form.isRemote
          }
          aria-label={
            form.isRemote
              ? "Tắt làm việc từ xa"
              : "Bật làm việc từ xa"
          }
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              isRemote:
                !prev.isRemote,
            }));

            vibrate(5);
          }}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            form.isRemote
              ? "bg-[#0a84ff]"
              : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <motion.div
            animate={{
              x: form.isRemote
                ? 20
                : 2,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
            className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!form.isRemote && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            className="flex gap-2 overflow-hidden"
          >
            <input
              maxLength={200}
              value={form.address}
              placeholder="Nhập địa chỉ..."
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  address:
                    e.target.value,
                }))
              }
              className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[14px] outline-none dark:bg-zinc-800"
            />

            <button
              type="button"
              aria-label="Lấy vị trí hiện tại"
              onClick={() => {
                handleGetLocation();

                vibrate(5);
              }}
              className="grid h-11 w-11 place-items-center rounded-xl bg-[#0a84ff]/10 text-[#0a84ff] transition-all hover:bg-[#0a84ff]/20 active:scale-95"
            >
              <FiNavigation
                size={16}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
)}

              {/* STEP 3 */}
{step === 3 && (
  <motion.div
    key="s3"
    initial={{
      opacity: 0,
      x: 16,
    }}
    animate={{
      opacity: 1,
      x: 0,
    }}
    exit={{
      opacity: 0,
      x: -16,
    }}
    className="space-y-3 p-4"
  >
    {/* Options */}
    <div className="grid grid-cols-2 gap-3">
      {[
        {
          k: "autoMatch",
          icon: FiZap,
          label: "Duyệt tự động",
          desc: "Nhận ngay",
          color: "blue",
        },
        {
          k: "needApproval",
          icon: FiUserCheck,
          label: "Duyệt tay",
          desc: "Chọn lọc",
          color: "green",
        },
        {
          k: "milestones",
          icon: FiLayers,
          label: "Chia giai đoạn",
          desc: "An toàn",
          color: "purple",
        },
        {
          k: "allowBids",
          icon: FiTrendingUp,
          label: "Đấu thầu",
          desc: "Giá tốt",
          color: "amber",
        },
        {
          k: "nda",
          icon: FiLock,
          label: "Bảo mật NDA",
          desc: "Riêng tư",
          color: "red",
        },
        {
          k: "featured",
          icon: FiStar,
          label: "Ghim PRO",
          desc: "+50k",
          color: "amber",
          pro: true,
        },
      ].map((item) => {
        const Icon = item.icon;

        const active = Boolean(
          form[
            item.k as keyof FormState
          ]
        );

        const isDisabled =
          (item.k ===
            "autoMatch" &&
            form.needApproval) ||
          (item.k ===
            "needApproval" &&
            form.autoMatch);

        return (
          <motion.button
            key={item.k}
            type="button"
            whileTap={{
              scale: 0.96,
            }}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) {
                toast.info(
                  "Không thể bật cùng lúc với tùy chọn kia"
                );

                vibrate(10);

                return;
              }

              vibrate(5);

              if (
                item.k ===
                "autoMatch"
              ) {
                setForm(
                  (prev) => ({
                    ...prev,
                    autoMatch:
                      !prev.autoMatch,
                    needApproval:
                      false,
                  })
                );

                return;
              }

              if (
                item.k ===
                "needApproval"
              ) {
                setForm(
                  (prev) => ({
                    ...prev,
                    needApproval:
                      !prev.needApproval,
                    autoMatch:
                      false,
                  })
                );

                return;
              }

              setForm((prev) => ({
                ...prev,
                [item.k]:
                  !active,
              }));
            }}
            className={`relative rounded-3xl border-2 p-4 text-left transition-all ${
              isDisabled
                ? "cursor-not-allowed opacity-40"
                : active
                  ? "border-[#0a84ff] bg-[#0a84ff]/5 shadow-md shadow-[#0a84ff]/10"
                  : "border-[#E5E5EA] bg-white hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div
              className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl ${
                active
                  ? "bg-[#0a84ff]"
                  : "bg-[#F2F2F7] dark:bg-zinc-800"
              }`}
            >
              <Icon
                size={20}
                className={
                  active
                    ? "text-white"
                    : "text-zinc-500"
                }
              />
            </div>

            <div className="flex items-center gap-1.5">
              <div className="text-[14px] font-semibold">
                {item.label}
              </div>

              {item.pro && (
                <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  PRO
                </span>
              )}
            </div>

            <div className="mt-0.5 text-[12px] text-zinc-500">
              {item.desc}
            </div>

            {active && (
              <motion.div
                initial={{
                  scale: 0,
                }}
                animate={{
                  scale: 1,
                }}
                className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[#0a84ff]"
              >
                <FiCheck
                  size={12}
                  strokeWidth={3}
                  className="text-white"
                />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>

    {/* Images */}
    <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">
          Hình ảnh minh họa
        </span>

        <span className="rounded-full bg-[#F2F2F7] px-2.5 py-1 text-[12px] font-medium tabular-nums dark:bg-zinc-800">
          {form.images.length}/5
        </span>
      </div>

      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
        {form.images.map(
          (url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh ${
                  index + 1
                }`}
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                aria-label={`Xóa ảnh ${
                  index + 1
                }`}
                onClick={() => {
  const imageUrl =
    form.images[index];

  if (
    imageUrl?.startsWith(
      "blob:"
    )
  ) {
    URL.revokeObjectURL(
      imageUrl
    );
  }

  const nextImages = [
    ...form.images,
  ];

  nextImages.splice(
    index,
    1
  );

  setForm((prev) => ({
    ...prev,
    images: nextImages,
  }));

  const nextFiles = [
    ...imageFiles,
  ];

  nextFiles.splice(
    index,
    1
  );

  setImageFiles(nextFiles);

  vibrate(5);
}}
                className="absolute inset-0 grid place-items-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <FiX
                  size={20}
                  className="text-white"
                />
              </button>
            </div>
          )
        )}

        {form.images.length <
          5 && (
          <button
            type="button"
            onClick={() =>
              fileRef.current?.click()
            }
            className="group grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-[#E5E5EA] transition-all hover:border-[#0a84ff] hover:bg-[#0a84ff]/5 active:scale-95 dark:border-zinc-700"
          >
            <FiPlus
              size={24}
              className="text-zinc-400 transition-colors group-hover:text-[#0a84ff]"
            />
          </button>
        )}
      </div>

      <input
        hidden
        multiple
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) =>
          handleFiles(
            e.target.files
          )
        }
      />
    </div>

    {/* Visibility */}
    <div className="rounded-3xl border-2 border-[#E5E5EA] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800">
            <FiGlobe
              size={18}
              className="text-zinc-600"
            />
          </div>

          <div>
            <div className="font-semibold">
              Chế độ hiển thị
            </div>

            <div className="text-[12px] text-zinc-500">
              Ai có thể xem bài
              đăng
            </div>
          </div>
        </div>

        <select
          value={form.visibility}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              visibility:
                e.target
                  .value as FormState["visibility"],
            }));

            vibrate(5);
          }}
          className="rounded-xl border-2 border-transparent bg-[#F2F2F7] px-3.5 py-2 font-medium outline-none transition-all focus:border-[#0a84ff] dark:bg-zinc-800"
        >
          <option value="public">
            🌍 Công khai
          </option>

          <option value="friends">
            👥 Bạn bè
          </option>

          <option value="private">
            🔒 Riêng tư
          </option>
        </select>
      </div>
    </div>
  </motion.div>
)}
         </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E5EA] bg-white/90 backdrop-blur-2xl dark:border-zinc-800 dark:bg-black/90">
        <div className="mx-auto max-w-[680px] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <motion.button
                whileTap={{
                  scale: 0.96,
                }}
                onClick={() =>
                  setStep(
                    (prev) =>
                      prev - 1
                  )
                }
                className="h-12 rounded-2xl bg-[#F2F2F7] px-6 text-[14px] font-semibold transition-all hover:bg-[#E5E5EA] dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Quay lại
              </motion.button>
            )}

            <motion.button
              whileTap={{
                scale: 0.98,
              }}
              disabled={
                !canNext ||
                submitting
              }
              onClick={() => {
                if (step < 3) {
                  setStep(
                    (prev) =>
                      prev + 1
                  );

                  return;
                }

                submit();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0a84ff] text-[14px] font-semibold text-white shadow-lg shadow-[#0a84ff]/25 transition-all hover:bg-[#0071e3] active:shadow-md disabled:opacity-40"
            >
              {submitting ? (
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
                    Đang đăng...
                  </span>
                </>
              ) : step < 3 ? (
                <>
                  Tiếp tục

                  <FiChevronRight
                    size={18}
                  />
                </>
              ) : (
                <>
                  <FiZap
                    size={16}
                  />

                  Đăng công việc
                </>
              )}
            </motion.button>
          </div>

          {/* Progress dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className={`h-1 rounded-full transition-all ${
                    item === step
                      ? "w-6 bg-[#0a84ff]"
                      : item < step
                        ? "w-1.5 bg-[#0a84ff]/60"
                        : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              )
            )}
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
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              exit={{
                y: 100,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                damping: 25,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
              className="max-h-[80vh] w-full max-w-[480px] overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-zinc-900"
            >
              <div className="sticky top-0 border-b border-[#E5E5EA] bg-white/80 p-5 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />

                <h3 className="text-xl font-bold">
                  Mẫu có sẵn
                </h3>

                <p className="mt-1 text-[13px] text-zinc-500">
                  Chọn để bắt đầu
                  nhanh hơn
                </p>
              </div>

              <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-4">
                {TEMPLATES.map(
                  (template) => (
                    <motion.button
                      key={
                        template.name
                      }
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={() =>
                        useTemplate(
                          template
                        )
                      }
                      className="group flex w-full items-center gap-3.5 rounded-2xl border-2 border-transparent bg-[#F2F2F7] p-4 text-left transition-all hover:border-[#E5E5EA] hover:bg-white dark:bg-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm transition-transform group-hover:scale-110 dark:bg-zinc-900">
                        {
                          template.icon
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {
                            template.name
                          }
                        </div>

                        <div className="mt-0.5 truncate text-[13px] text-zinc-500">
                          {
                            template.title
                          }
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-[#0a84ff]">
                          {(
                            parseInt(
                              template.price,
                              10
                            ) /
                            1000
                          ).toFixed(
                            0
                          )}
                          k
                        </div>

                        <div className="text-[12px] text-zinc-400">
                          VND
                        </div>
                      </div>
                    </motion.button>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
              className="w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-zinc-900"
            >
              <div className="relative">
                {form.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      form.images[0]
                    }
                    alt="Preview"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-[#0a84ff]/20 to-purple-500/20">
                    <span className="text-6xl">
                      {
                        category.icon
                      }
                    </span>
                  </div>
                )}

                <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md">
                  {category.name}
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-xl font-bold leading-tight">
                  {form.title ||
                    "Tiêu đề công việc"}
                </h2>

                <div className="mt-2 flex items-center gap-3">
                  <span className="text-lg font-bold text-[#0a84ff]">
                    {form.price
                      ? `${form.price}đ`
                      : "Thỏa thuận"}
                  </span>

                  <span className="text-zinc-500">
                    •
                  </span>

                  <span className="text-[13px] text-zinc-500">
                    {
                      form.totalSlots
                    }{" "}
                    người
                  </span>
                </div>

                <p className="line-clamp-3 mt-3 text-[14px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {form.description ||
                    "Mô tả chi tiết công việc sẽ hiển thị ở đây..."}
                </p>

                <div className="mt-5 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPreview(
                        false
                      )
                    }
                    className="h-11 flex-1 rounded-2xl bg-[#F2F2F7] font-medium transition-transform active:scale-95 dark:bg-zinc-800"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !canNext
                    }
                    onClick={() => {
                      setShowPreview(
                        false
                      );

                      submit();
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#0a84ff] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <LottiePlayer
                        animationData={
                          L.loadingPull
                        }
                        loop
                        autoplay
                        className="h-4 w-4"
                      />
                    ) : (
                      <FiZap
                        size={16}
                      />
                    )}

                    Đăng ngay
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {submitting &&
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
              className="fixed inset-0 z-[100] grid place-items-center bg-white dark:bg-black"
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

                <p className="mt-4 text-lg font-semibold">
                  Đang tạo công
                  việc...
                </p>

                <p className="mt-1 text-zinc-500">
                  Vui lòng chờ
                  trong giây lát
                </p>
              </div>
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
            className="fixed inset-0 z-[101] grid place-items-center bg-white dark:bg-black"
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
                stiffness: 200,
                damping: 20,
              }}
              className="px-6 text-center"
            >
              <LottiePlayer
                animationData={
                  L.successCheck
                }
                autoplay
                className="mx-auto h-32 w-32"
              />

              <h2 className="mt-2 text-2xl font-bold">
                Đăng thành công
                🎉
              </h2>

              <p className="mt-2 text-zinc-500">
                Công việc của bạn
                đang được hiển
                thị
              </p>
            </motion.div>
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

      input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        opacity: 0.6;
        filter: invert(0.5);
      }

      .dark
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
        filter: invert(0.8);
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

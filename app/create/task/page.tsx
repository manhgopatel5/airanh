"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseStorage, getFirebaseDB } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, query, where, onSnapshot, getDocs, Timestamp } from "firebase/firestore";
import { createTask } from "@/lib/task";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  FiX, FiCheck, FiPlus, FiMapPin, FiEye, FiCopy,
  FiZap, FiStar, FiTarget, FiLayers,
  FiTrendingUp, FiLock, FiGlobe,
  FiChevronRight, FiNavigation, FiCalendar, FiUserCheck
} from "react-icons/fi";

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
      { title: "Việc gì cũng nhận", desc: ["+ Trao đổi trước", "+ Giá thương lượng", "+ Uy tín", "+ 24-7", "+ Không ngại khó"] },
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


export default function CreateTaskProMax() {
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const db = getFirebaseDB();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [savedTasks, setSavedTasks] = useState(0);

  const now = new Date();
const [form, setForm] = useState({
    title: "", description: "", price: "", totalSlots: "1",
    startDate: new Date(now.getTime() + 3600000).toISOString().slice(0, 16),
    endDate: new Date(now.getTime() + 86400000 * 3).toISOString().slice(0, 16),
    category: "other", tags: [] as string[], images: [] as string[],
    address: "", city: "Hồ Chí Minh", lat: null as number | null, lng: null as number | null,
    visibility: "public", budgetType: "fixed", isRemote: true, requirements: "",
    urgency: "once", milestones: true,
    autoMatch: true, allowBids: false, featured: false, privateNotes: "",
    invites: [] as string[], pollPrice: false, needApproval: true,
    nda: false, attachments: [] as File[], recurring: "once",
    languages: ["Tiếng Việt"], timezone: "Asia/Ho_Chi_Minh",
    hours: 1, 
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const category = useMemo(() => CATEGORIES.find(c => c.id === form.category)!, [form.category]);

  
  const progress = (step / 3) * 100;
  const basePrice = parseInt(form.price.replace(/\./g, "") || "0");
  const urgencyFee = 0;
  const featuredFee = form.featured ? 50000 : 0;
  const serviceFee = Math.round((basePrice + urgencyFee) * 0.05);
  const totalPrice = basePrice + urgencyFee + featuredFee + serviceFee;

  const canNext = step === 1
    ? form.title.length >= 10 && form.description.length >= 20
    : step === 2
    ? form.budgetType === "negotiable" || basePrice >= 10000
    : true;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => u ? setUser({ uid: u.uid, email: u.email }) : router.replace("/login"));
    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, 'tasks'), where('createdBy', '==', user.uid))).then(s => setSavedTasks(s.size));
    const q = query(collection(db, 'friends'), where('userId', '==', user.uid));
    return onSnapshot(q, snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data(), name: d.data().friendName || d.data().name || "Bạn" }))));
  }, [user, db]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50) return setDragX(0);
    if (info.offset.x < -50 && step < 3 && canNext) setStep(s => s + 1);
    if (info.offset.x > 50 && step > 1) setStep(s => s - 1);
    setDragX(0);
  };

  const useTemplate = (t: any) => {
    setForm(f => ({...f, category: t.cat, title: t.title, price: parseInt(t.price).toLocaleString('vi-VN'), tags: t.tags }));
    setShowTemplates(false);
    toast.success("Đã áp dụng mẫu");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - form.images.length;
    const f = Array.from(files).slice(0, remaining).filter(file => file.type.startsWith('image/'));
    if (f.length === 0) return;
    setImageFiles(prev => [...prev, ...f]);
    setForm(prev => ({...prev, images: [...prev.images, ...f.map(x => URL.createObjectURL(x))] }));
    toast.success(`Đã thêm ${f.length} ảnh`);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }
    const id = toast.loading("Đang lấy vị trí...");
    navigator.geolocation.getCurrentPosition(
      p => {
        setForm(prev => ({...prev, lat: p.coords.latitude, lng: p.coords.longitude, address: "Vị trí hiện tại" }));
        toast.dismiss(id);
        toast.success("Đã lấy vị trí");
      },
      () => {
        toast.dismiss(id);
        toast.error("Không thể lấy vị trí");
      }
    );
  };

  const submit = async () => {
    if (!user) return;
    if (!canNext) {
      toast.error("Vui lòng điền đủ thông tin");
      return;
    }
    setSubmitting(true);
    try {
      const urls = await Promise.all(imageFiles.map(async file => {
        const r = ref(storage, `tasks/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        return getDownloadURL(r);
      }));

      await createTask({
        type: "task",
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.budgetType === "negotiable" ? 0 : basePrice,
        currency: "VND",
        budgetType: form.budgetType,
        totalSlots: parseInt(form.totalSlots),
        visibility: form.visibility,
        deadline: Timestamp.fromDate(new Date(form.endDate)),
        applicationDeadline: Timestamp.fromDate(new Date(form.endDate)),
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        category: form.category,
        tags: [...form.tags, form.urgency],
        images: urls,
        attachments: [],
        requirements: form.requirements,
        isRemote: form.isRemote,
        location: form.isRemote ? {} : { address: form.address, city: form.city, lat: form.lat, lng: form.lng },
        urgency: form.urgency,
      
        
        milestones: form.milestones,
        autoMatch: form.autoMatch,
        allowBids: form.allowBids,
        featured: form.featured,
        nda: form.nda,
        
        invites: form.invites,
        needApproval: form.needApproval,
      } as any, user);

      toast.success("🎉 Đăng thành công!");
      setTimeout(() => router.push("/"), 800);
    } catch (e: any) {
      toast.error(e.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-zinc-900 dark:text-zinc-100 select-none">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800">
          <div className="h-[3px] bg-[#E5E5EA] dark:bg-zinc-800">
            <motion.div className="h-full bg-[#0a84ff]" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
          </div>
          <div className="h-[52px] px-4 flex items-center gap-3 max-w-[680px] mx-auto">
            <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()} className="w-8 h-8 -ml-1 grid place-items-center rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
              <FiX size={20} className="text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-md bg-[#0a84ff] text-white">BƯỚC {step}</span>
                <span className="text-[11px] text-zinc-500">/3</span>
                {savedTasks > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black tabular-nums">{savedTasks}</span>}
              </div>
              <h1 className="text-[17px] font-semibold leading-tight mt-0.5">{["Bạn muốn làm gì?", "Ngân sách & Thời gian", "Tùy chọn nâng cao"][step - 1]}</h1>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowTemplates(true)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-zinc-900/5 dark:hover:bg-white/5 text-zinc-500 active:scale-95 transition-all">
                <FiCopy size={18} />
              </button>
              <button onClick={() => setShowPreview(true)} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-zinc-900/5 dark:hover:bg-white/5 text-zinc-500 active:scale-95 transition-all">
                <FiEye size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[680px] mx-auto pb-28">
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} onDrag={(_, i) => setDragX(i.offset.x)} onDragEnd={handleDragEnd} style={{ x: dragX }}>
            <AnimatePresence mode="wait" initial={false}>
{step === 1 && (
  <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-4 space-y-3">
    <div>
      <div className="text-[13px] text-zinc-500 mb-2 px-1">Chọn loại hoạt động</div>
      <div className="grid grid-cols-4 gap-2">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setForm({...form, category: c.id, price: c.basePrice.toLocaleString('vi-VN'), tags: [] })} className="relative active:scale-95 transition-transform">
    <div className={`flex flex-col rounded-xl border p-2 items-center justify-center gap-1 min-h-[60px] transition-all ${form.category === c.id? "border-[#0a84ff] bg-[#0a84ff]/5" : "border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
  <div className="text-[20px] leading-none">{c.icon}</div>
  <div className={`text-[11px] font-medium leading-tight text-center ${form.category === c.id? "text-[#0a84ff]" : "text-zinc-700 dark:text-zinc-300"}`}>{c.name}</div>
</div>
            {form.category === c.id && (
           <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0a84ff] rounded-full grid place-items-center shadow-sm">
  <FiCheck size={10} className="text-white" strokeWidth={3} />
</div>
            )}
          </button>
        ))}
      </div>
    </div>

 <div className="space-y-3">
<div className="relative">
    <input 
      value={form.title} 
      onChange={e => setForm({...form, title: e.target.value.slice(0, 100) })} 
      placeholder="Bạn cần làm gì?" 
      className="w-full h-11 pl-3 pr-14 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 text-[15px] font-medium outline-none placeholder:text-zinc-400" 
      autoFocus 
    />
    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] tabular-nums ${form.title.length < 10? "text-red-500" : "text-zinc-400"}`}>
      {form.title.length}/10
    </span>
</div>
<div className="flex gap-1.5 flex-wrap">
  {category.suggestions.map(item => (
    <button
      key={item.title}
      onClick={() => setForm(f => ({...f, title: item.title, description: "" }))}
      className="px-2.5 py-1 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#0a84ff]/10 hover:text-[#0a84ff] text-[12px] text-zinc-600 dark:text-zinc-400 transition-colors active:scale-95"
    >
      {item.title}
    </button>
  ))}
</div>
    </div>

<div className="space-y-3">
  <textarea
    value={form.description}
    onChange={e => setForm({...form, description: e.target.value.slice(0, 2000) })}
    placeholder="Mô tả chi tiết yêu cầu, mục tiêu, kết quả mong muốn..."
    rows={5}
    className="w-full p-3 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 outline-none resize-none text-[15px] leading-relaxed placeholder:text-zinc-400"
  />
  <div className="flex items-center justify-between pt-3 border-t border-[#E5E5EA] dark:border-zinc-800">
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
      {(category.suggestions.find(s => s.title === form.title)?.desc || category.suggestions[0]?.desc || []).map(t => (
        <button
          key={t}
          onClick={() =>
            setForm(f => ({
             ...f,
              description: f.description + (f.description? "\n" : "") + t
            }))
          }
          className="px-2.5 py-1 rounded-lg bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#E5E5EA] dark:hover:bg-zinc-700 text-[12px] text-zinc-600 dark:text-zinc-400 transition-colors active:scale-95 whitespace-nowrap"
        >
          {t}
        </button>
      ))}
    </div>
{form.description.length < 20 && (
  <span className="text-[12px] text-red-500 tabular-nums ml-2 shrink-0">
    {form.description.length}/20
  </span>
)}
  </div>
</div>
  </motion.div>

)}

{step === 2 && (
  <motion.div
    key="s2"
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.2 }}
    className="p-4 space-y-3"
  >
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0a84ff]/10 grid place-items-center">
            <span className="text-[11px] font-bold tracking-tight text-[#0a84ff]">
              VNĐ
            </span>
          </div>

          <span className="font-medium text-[15px]">Ngân sách</span>
        </div>

        <div className="flex bg-[#F2F2F7] dark:bg-zinc-800 p-0.5 rounded-lg">
          {["fixed", "hourly", "negotiable"].map((t, i) => (
            <button
              key={t}
              onClick={() => setForm({ ...form, budgetType: t as any })}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all active:scale-95 ${
                form.budgetType === t
                  ? "bg-white dark:bg-zinc-700 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              {["Cố định", "Theo giờ", "Thỏa thuận"][i]}
            </button>
          ))}
        </div>
      </div>

      {form.budgetType !== "negotiable" ? (
        <>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={e =>
                setForm({
                  ...form,
                  price: e.target.value
                    .replace(/\D/g, "")
                    .replace(/\B(?=(\d{3})+(?!\d))/g, "."),
                })
              }
              placeholder="0"
              className="w-full h-[52px] pl-4 pr-14 bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[#0a84ff]/20 text-[24px] font-semibold tracking-tight transition-all tabular-nums"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-zinc-400">
              VND
            </span>
          </div>

          <div className="flex items-center gap-4 mt-3 flex-wrap">

            <div className="flex items-center gap-2">
              <span className="text-[14px] text-zinc-500">
                Số người:
              </span>

              <div className="flex items-center gap-2 bg-[#F2F2F7] dark:bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      totalSlots: Math.max(
                        1,
                        parseInt(form.totalSlots) - 1
                      ).toString(),
                    })
                  }
                  className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95"
                >
                  −
                </button>

                <span className="w-8 text-center text-[14px] font-medium tabular-nums">
                  {form.totalSlots}
                </span>

                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      totalSlots: Math.min(
                        20,
                        parseInt(form.totalSlots) + 1
                      ).toString(),
                    })
                  }
                  className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {form.budgetType === "hourly" && (
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-zinc-500">
                  Số giờ:
                </span>

                <div className="flex items-center gap-2 bg-[#F2F2F7] dark:bg-zinc-800 rounded-lg p-0.5">
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        hours: Math.max(1, form.hours - 1),
                      })
                    }
                    className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95"
                  >
                    −
                  </button>

                  <span className="w-8 text-center text-[14px] font-medium tabular-nums">
                    {(form as any).hours || 1}
                  </span>

                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        hours: Math.min(24, form.hours + 1),
                      })
                    }
                    className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="h-[52px] grid place-items-center bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl text-zinc-500 text-[15px]">
          Sẽ thỏa thuận sau
        </div>
      )}
    </div>

    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 grid place-items-center">
          <FiZap size={16} className="text-amber-600" />
        </div>

<span className="font-medium text-[15px]">
  Tần suất công việc
</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {URGENCY.map(u => (
          <button
            key={u.id}
            onClick={() => setForm({ ...form, urgency: u.id })}
            className={`relative p-3 rounded-2xl border text-left transition-all active:scale-95 ${
              form.urgency === u.id
                ? "border-[#0a84ff] bg-[#0a84ff]/5"
                : "border-[#E5E5EA] dark:border-zinc-800 bg-[#F2F2F7]/50 dark:bg-zinc-800/30"
            }`}
          >
            <div
              className={`text-[13px] font-semibold ${
                form.urgency === u.id
                  ? "text-[#0a84ff]"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {u.name}
            </div>

            <div className="text-[13px] text-zinc-500 mt-0.5">
              {u.time}
            </div>


          </button>
        ))}
      </div>
    </div>

    <div className="space-y-3">

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiCalendar size={16} className="text-zinc-400" />

          <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
            Thời gian thực hiện
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[12px] text-zinc-500 mb-1.5">
              Bắt đầu
            </div>

            <input
              type="datetime-local"
              value={form.startDate}
              onChange={e =>
                setForm({ ...form, startDate: e.target.value })
              }
              className="w-full h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] font-medium border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
            />
          </div>

          <div>
            <div className="text-[12px] text-zinc-500 mb-1.5">
              Kết thúc
            </div>

            <input
              type="datetime-local"
              value={form.endDate}
              onChange={e =>
                setForm({ ...form, endDate: e.target.value })
              }
              className="w-full h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] font-medium border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiMapPin size={16} className="text-zinc-400" />

            <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">
              Địa điểm
            </span>
          </div>

          <button
            onClick={() =>
              setForm({ ...form, isRemote: !form.isRemote })
            }
            className={`relative w-11 h-[26px] rounded-full transition-colors ${
              form.isRemote
                ? "bg-[#0a84ff]"
                : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <div
              className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform ${
                form.isRemote
                  ? "translate-x-[20px]"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {form.isRemote ? (
          <div className="h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl flex items-center gap-2 text-[14px] text-zinc-600 dark:text-zinc-400">
            <FiGlobe size={15} />
            Làm việc từ xa
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={form.address}
              onChange={e =>
                setForm({ ...form, address: e.target.value })
              }
              placeholder="Nhập địa chỉ..."
              className="flex-1 h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
            />

            <button
              onClick={handleGetLocation}
              className="w-10 h-10 grid place-items-center bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl active:scale-95 transition-all"
            >
              <FiNavigation size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  </motion.div>
)}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
{[
  { k: "autoMatch", icon: FiZap, label: "Duyệt tự động", desc: "Ứng viên tự động được nhận" },
  { k: "milestones", icon: FiLayers, label: "Chia giai đoạn", desc: "Thanh toán theo tiến độ" },
  { k: "allowBids", icon: FiTrendingUp, label: "Đấu thầu", desc: "Nhận nhiều báo giá" },
  { k: "needApproval", icon: FiUserCheck, label: "Duyệt tay", desc: "Chọn người làm" },
  { k: "nda", icon: FiLock, label: "Bảo mật NDA", desc: "Ký thỏa thuận" },
].map(item => {
  const Icon = item.icon;
  const active = (form as any)[item.k];
  
  const isDisabled = 
    (item.k === "autoMatch" && form.needApproval) || 
    (item.k === "needApproval" && form.autoMatch);
  
  const handleClick = () => {
    if (isDisabled) return;
    if (item.k === "autoMatch") {
      setForm({...form, autoMatch: !active, needApproval: false });
    } else if (item.k === "needApproval") {
      setForm({...form, needApproval: !active, autoMatch: false });
    } else {
      setForm({...form, [item.k]: !active });
    }
  };
  
  return (
    <button 
      key={item.k} 
      onClick={handleClick}
      disabled={isDisabled}
      className={`group relative p-4 rounded-2xl border text-left transition-all ${
        isDisabled 
          ? "border-[#E5E5EA] dark:border-zinc-800 bg-[#F2F2F7] dark:bg-zinc-800/50 opacity-50 cursor-not-allowed" 
          : active 
            ? "border-[#0a84ff] bg-[#0a84ff]/5 active:scale-[0.98]" 
            : "border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900 active:scale-[0.98]"
      }`}
    >
      <Icon size={20} className={isDisabled ? "text-zinc-300 dark:text-zinc-600" : active ? "text-[#0a84ff]" : "text-zinc-400"} />
      <div className={`text-[14px] font-medium mt-2.5 leading-tight ${isDisabled ? "text-zinc-400 dark:text-zinc-600" : ""}`}>
        {item.label}
      </div>
      <div className={`text-[12px] leading-snug mt-0.5 ${isDisabled ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500"}`}>
        {item.desc}
      </div>
      {active && !isDisabled && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#0a84ff] rounded-full grid place-items-center">
          <FiCheck size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
})}
                  </div>

                  

                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[14px] font-medium">Tài liệu đính kèm</span>
                      <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 text-zinc-600 tabular-nums">{form.images.length}/5</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {form.images.map((url, i) => (
                        <div key={i} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 ring-1 ring-[#E5E5EA] dark:ring-zinc-800">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { const n = [...form.images]; n.splice(i, 1); setForm({...form, images: n }); const f = [...imageFiles]; f.splice(i, 1); setImageFiles(f); }} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 grid place-items-center transition-opacity">
                            <FiX size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {form.images.length < 5 && (
                        <button onClick={() => fileRef.current?.click()} className="w-[72px] h-[72px] rounded-xl border-[1.5px] border-dashed border-[#E5E5EA] dark:border-zinc-700 grid place-items-center hover:border-[#0a84ff]/50 hover:bg-[#0a84ff]/5 transition-colors shrink-0 group active:scale-95">
                          <FiPlus size={18} className="text-zinc-400 group-hover:text-[#0a84ff] transition-colors" />
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 divide-y divide-[#E5E5EA] dark:divide-zinc-800 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 grid place-items-center"><FiEye size={15} className="text-zinc-600" /></div>
                        <div>
                          <div className="text-[14px] font-medium">Hiển thị</div>
                          <div className="text-[12px] text-zinc-500">Ai có thể xem</div>
                        </div>
                      </div>
                      <select value={form.visibility} onChange={e => setForm({...form, visibility: e.target.value as any })} className="text-[14px] font-medium bg-[#F2F2F7] dark:bg-zinc-800 border-0 rounded-lg px-3 py-1.5 outline-none">
                        <option value="public">Công khai</option>
                        <option value="friends">Bạn bè</option>
                        <option value="private">Riêng tư</option>
                      </select>
                    </div>
                    {form.visibility !== "public" && friends.length > 0 && (
                      <div className="p-4">
                        <div className="text-[12px] text-zinc-500 mb-2">Mời bạn bè ({form.invites.length})</div>
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                          {friends.slice(0, 8).map(f => (
                            <button key={f.id} onClick={() => setForm({...form, invites: form.invites.includes(f.id) ? form.invites.filter(x => x !== f.id) : [...form.invites, f.id] })} className={`px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap border transition-all active:scale-95 ${form.invites.includes(f.id) ? "bg-[#0a84ff] text-white border-[#0a84ff]" : "bg-[#F2F2F7] dark:bg-zinc-800 border-[#E5E5EA] dark:border-zinc-700"}`}>{f.name}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={() => setForm({...form, featured: !form.featured })} className={`w-full p-4 rounded-2xl border transition-all text-left active:scale-[0.99] ${form.featured ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-2xl grid place-items-center ${form.featured ? "bg-amber-500" : "bg-[#F2F2F7] dark:bg-zinc-800"}`}><FiStar size={18} className={form.featured ? "text-white" : "text-zinc-400"} /></div>
                        <div>
                          <div className="font-medium text-[15px] flex items-center gap-1.5">Ghim lên đầu <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">PRO</span></div>
                          <div className="text-[13px] text-zinc-500 mt-0.5 leading-snug">Hiển thị ưu tiên • Gấp 5x lượt xem • 24h đầu</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 grid place-items-center transition-all ${form.featured ? "border-amber-500 bg-amber-500" : "border-zinc-300 dark:border-zinc-600"}`}>{form.featured && <FiCheck size={10} className="text-white" strokeWidth={3} />}</div>
                    </div>
                    {form.featured && <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between"><span className="text-[13px] text-amber-700 dark:text-amber-400">Phí dịch vụ</span><span className="text-[15px] font-semibold text-amber-600 tabular-nums">+50.000đ</span></div>}
                  </button>

     
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-zinc-800">
          <div className="max-w-[680px] mx-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-12 px-5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 font-medium text-[15px] active:scale-95 transition-all hover:bg-[#E5E5EA] dark:hover:bg-zinc-700">Quay lại</button>}
              <button onClick={() => step < 3 ? setStep(s => s + 1) : submit()} disabled={!canNext || submitting} className="flex-1 h-12 rounded-2xl bg-[#0a84ff] hover:bg-[#0071e3] active:bg-[#0066cc] text-white font-semibold text-[15px] disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-[#0a84ff]/20 active:scale-[0.98] transition-all disabled:cursor-not-allowed">
                {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang đăng...</> : step < 3 ? <>Tiếp tục<FiChevronRight size={18} /></> : <>Đăng công việc<FiZap size={16} /></>}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-3" onClick={() => setShowTemplates(false)}>
              <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-[28px] p-5 max-h-[75vh] overflow-auto shadow-2xl">
                <div className="w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
                <h3 className="text-[20px] font-bold">Mẫu có sẵn</h3>
                <p className="text-[13px] text-zinc-500 mt-0.5 mb-4">Chọn để bắt đầu nhanh</p>
                <div className="grid gap-2.5">
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => useTemplate(t)} className="group w-full p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800/50 hover:bg-[#E5E5EA] dark:hover:bg-zinc-800 flex items-center gap-3 text-left transition-all active:scale-[0.98]">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 shadow-sm grid place-items-center text-[20px] group-hover:scale-110 transition-transform">{t.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[14px]">{t.name}</div>
                        <div className="text-[12px] text-zinc-500 truncate">{t.title}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold text-[#0a84ff] tabular-nums">{(parseInt(t.price)/1000).toFixed(0)}k</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPreview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-[380px] bg-white dark:bg-zinc-900 rounded-[24px] overflow-hidden shadow-2xl">
                {form.images[0] && <img src={form.images[0]} alt="" className="w-full aspect-[16/9] object-cover" />}
                <div className="p-5">
                  <h2 className="text-[18px] font-bold leading-snug">{form.title || "Tiêu đề công việc"}</h2>
                  <p className="text-[13px] text-zinc-500 mt-1">{category.name} • {form.price ? `${form.price}đ` : 'Thỏa thuận'}</p>
                  <p className="text-[14px] mt-3 line-clamp-3 text-zinc-600 dark:text-zinc-400 leading-relaxed">{form.description || "Mô tả chi tiết công việc..."}</p>
                  <div className="flex gap-2.5 mt-5">
                    <button onClick={() => setShowPreview(false)} className="flex-1 h-11 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 font-medium active:scale-95 transition-all">Đóng</button>
                    <button onClick={() => { setShowPreview(false); submit(); }} disabled={submitting || !canNext} className="flex-1 h-11 rounded-2xl bg-[#0a84ff] text-white font-medium active:scale-95 transition-all disabled:opacity-50">Đăng ngay</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        *{ -webkit-tap-highlight-color: transparent; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        .dark input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(0.8); }
      `}</style>
    </>
  );
}

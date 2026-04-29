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
  FiZap, FiShield, FiStar, FiLayers,
  FiTrendingUp, FiLock, FiGlobe, FiDollarSign,
  FiChevronRight, FiNavigation, FiCalendar, FiUserCheck
} from "react-icons/fi";

const CATEGORIES = [
  { 
    id: "delivery", name: "Giao hàng", icon: "🚚", color: "#ff9500", basePrice: 50000,
    suggestions: ["Ship hàng nội thành 2h", "Giao đồ ăn sáng tận nơi", "Lấy hàng ship COD", "Giao tài liệu hỏa tốc", "Ship quà sinh nhật", "Giao hoa tươi trong ngày", "Chuyển nhà mini", "Ship đồ cồng kềnh", "Giao thuốc tây", "Ship hàng đêm", "Giao đồ điện tử", "Ship trái cây", "Giao hồ sơ công ty", "Ship cây cảnh", "Giao bánh kem", "Ship đồ dễ vỡ", "Giao thú cưng", "Ship nước uống", "Giao văn phòng phẩm", "Ship hàng quốc tế"],
    descQuick: ["+ Giao trong 2 tiếng", "+ Có chụp ảnh xác nhận", "+ Ứng tiền trước được", "+ Gọi trước khi giao", "+ Hỗ trợ bốc xếp", "+ Giữ hàng cẩn thận", "+ Giao đúng địa chỉ", "+ Liên hệ 24/7", "+ Phí rẻ cạnh tranh"]
  },
  { 
    id: "shopping", name: "Mua hộ", icon: "🛒", color: "#34c759", basePrice: 30000,
    suggestions: ["Mua đồ siêu thị giúp", "Xếp hàng mua vé concert", "Mua thuốc theo đơn", "Săn sale hộ Shopee", "Mua đồ chợ truyền thống", "Đặt bánh sinh nhật", "Mua quà tặng sếp", "Mua hộ đồ brand", "Mua trái cây nhập khẩu", "Mua đồ gia dụng", "Mua sách vở", "Mua mỹ phẩm", "Mua đồ điện máy", "Mua đồ ăn vặt", "Mua hoa tươi", "Mua đồ trang trí", "Mua đồ cho bé", "Mua đồ tập gym", "Mua vé máy bay", "Mua sim số đẹp"],
    descQuick: ["+ Hóa đơn rõ ràng", "+ Chọn hàng kỹ như cho mình", "+ Báo giá trước khi mua", "+ Có thể video call chọn đồ", "+ Giao luôn trong ngày", "+ Không lấy phí phát sinh", "+ Mua đúng ý khách", "+ Kiểm tra chất lượng", "+ Hoàn tiền nếu sai"]
  },
  { 
    id: "tutoring", name: "Gia sư", icon: "📚", color: "#0a84ff", basePrice: 200000,
    suggestions: ["Dạy Toán cấp 3", "Luyện IELTS 7.0+", "Dạy Piano cho bé", "Kèm code Python cơ bản", "Dạy tiếng Trung HSK", "Ôn thi đại học", "Dạy vẽ cho trẻ em", "Luyện speaking 1-1", "Dạy tiếng Nhật N3", "Kèm Lý Hóa", "Dạy Guitar cơ bản", "Luyện thi SAT", "Dạy Excel nâng cao", "Kèm Văn nghị luận", "Dạy tiếng Hàn", "Ôn thi vào 10", "Dạy cờ vua", "Luyện thi TOEIC", "Dạy Photoshop", "Kèm Sinh học"],
    descQuick: ["+ Test trình độ miễn phí", "+ Giáo trình riêng", "+ Linh hoạt giờ học", "+ Có cam kết đầu ra", "+ Dạy online được", "+ Kiên nhẫn tận tâm", "+ Theo sát tiến độ", "+ Báo cáo phụ huynh", "+ Học thử miễn phí"]
  },
  { 
    id: "design", name: "Thiết kế", icon: "🎨", color: "#af52de", basePrice: 500000,
    suggestions: ["Logo + bộ nhận diện", "Banner Shopee/TikTok", "Thiết kế menu quán", "Edit video ngắn", "Avatar thương hiệu", "Thiệp cưới hiện đại", "Poster sự kiện", "Packaging sản phẩm", "Thiết kế CV", "Backdrop sân khấu", "Standee quảng cáo", "Catalog sản phẩm", "Thiết kế web UI", "Icon app mobile", "Infographic", "Thiết kế áo thun", "Tem nhãn sản phẩm", "Brochure du lịch", "Thiết kế phong bì", "Layout tạp chí"],
    descQuick: ["+ Sửa đến khi ưng ý", "+ Gửi file gốc AI/PSD", "+ Concept đa dạng", "+ Giao trong 48h", "+ Tư vấn branding free", "+ Đúng brief yêu cầu", "+ Style hiện đại", "+ Tối ưu in ấn", "+ Bảo mật ý tưởng"]
  },
  { 
    id: "cleaning", name: "Dọn dẹp", icon: "🧹", color: "#ffcc00", basePrice: 250000,
    suggestions: ["Dọn nhà theo giờ", "Tổng vệ sinh nhà mới", "Giặt sofa tại nhà", "Lau kính tòa nhà", "Dọn văn phòng cuối tuần", "Giặt rèm cửa", "Khử khuẩn phòng", "Dọn tủ quần áo", "Vệ sinh máy lạnh", "Dọn kho bãi", "Rửa xe tận nơi", "Chăm cây cảnh", "Dọn sau tiệc", "Vệ sinh hồ cá", "Hút bụi nệm", "Đánh bóng sàn gỗ", "Dọn nhà xưởng", "Vệ sinh bể bơi", "Giặt thảm văn phòng", "Dọn chung cư"],
    descQuick: ["+ Mang đủ dụng cụ", "+ Không ngại việc dơ", "+ Dọn sạch sẽ gọn gàng", "+ Làm theo yêu cầu", "+ Có hóa chất chuyên dụng", "+ Trung thực cẩn thận", "+ Xong mới thanh toán", "+ Linh hoạt giờ giấc", "+ Bảo quản đồ đạc"]
  },
  { 
    id: "cooking", name: "Nấu ăn", icon: "🍳", color: "#ff2d55", basePrice: 300000,
    suggestions: ["Nấu tiệc tại nhà", "Đầu bếp theo ngày", "Làm cơm văn phòng", "Nấu đồ ăn kiêng", "Làm bánh sinh nhật", "Nấu cỗ giỗ", "Meal prep cả tuần", "Dạy nấu món Việt", "Nấu tiệc BBQ", "Làm xôi chè", "Nấu cháo dinh dưỡng", "Pha chế tiệc", "Làm sushi tại nhà", "Nấu món chay", "Làm lẩu tận nơi", "Nấu tiệc tất niên", "Làm giỏ quà Tết", "Nấu món Hàn/Nhật", "Làm bánh trung thu", "Đi chợ nấu ăn"],
    descQuick: ["+ Nguyên liệu tươi sạch", "+ Nêm nếm vừa miệng", "+ Đúng giờ đãi khách", "+ Dọn bếp sạch sẽ", "+ Có thể đi chợ hộ", "+ Thực đơn theo yêu cầu", "+ Đảm bảo vệ sinh", "+ Nấu món gia đình", "+ Giá cả hợp lý"]
  },
  { 
    id: "beauty", name: "Làm đẹp", icon: "💅", color: "#5856d6", basePrice: 200000,
    suggestions: ["Makeup cô dâu", "Làm nail tại nhà", "Nối mi tận nơi", "Gội đầu dưỡng sinh", "Massage body", "Trang điểm dự tiệc", "Uốn tóc tại nhà", "Triệt lông vĩnh viễn", "Chăm sóc da mặt", "Xăm chân mày", "Gội đầu thảo dược", "Nối tóc", "Makeup kỷ yếu", "Waxing tại nhà", "Tắm trắng phi thuyền", "Nặn mụn chuẩn y khoa", "Makeup cho mẹ bầu", "Duỗi tóc keratin", "Trang điểm nam", "Tư vấn skincare"],
    descQuick: ["+ Dụng cụ khử trùng", "+ Mỹ phẩm chính hãng", "+ Làm tại nhà tiện lợi", "+ Tư vấn kiểu phù hợp", "+ Giữ được lâu", "+ Không gây kích ứng", "+ Thợ có tay nghề", "+ Giá mềm hơn tiệm", "+ Đúng hẹn"]
  },
  { 
    id: "photo", name: "Chụp ảnh", icon: "📸", color: "#ff3b30", basePrice: 800000,
    suggestions: ["Chụp ảnh sản phẩm", "Chụp lookbook thời trang", "Chụp ảnh cưới", "Chụp sự kiện công ty", "Chụp profile cá nhân", "Chụp món ăn", "Chụp nội thất", "Quay flycam", "Chụp ảnh thẻ", "Chụp kỷ yếu", "Chụp newborn", "Chụp ảnh gia đình", "Quay TVC quảng cáo", "Chụp kiến trúc", "Chụp beauty", "Chụp ảnh cưới phim trường", "Quay MV ca nhạc", "Chụp pet", "Chụp ảnh du lịch", "Livestream sự kiện"],
    descQuick: ["+ Retouch da đẹp", "+ Giao full file gốc", "+ Concept theo brief", "+ Có studio/di chuyển", "+ Trả ảnh trong 3 ngày", "+ Máy ảnh chuyên nghiệp", "+ Ánh sáng chuẩn", "+ Tư vấn tạo dáng", "+ Chỉnh màu điện ảnh"]
  },
  { 
    id: "assistant", name: "Trợ lý", icon: "👔", color: "#5ac8fa", basePrice: 300000,
    suggestions: ["Trợ lý từ xa theo giờ", "Nhập liệu Excel", "Quản lý Fanpage", "Đặt lịch hẹn", "Nghiên cứu thị trường", "Gọi điện CSKH", "Sắp xếp hồ sơ", "Support dự án", "Soạn hợp đồng", "Dịch tài liệu", "Quản lý email", "Lên lịch content", "Tìm kiếm thông tin", "Đặt vé máy bay", "Quản lý shop online", "Nhập liệu kế toán", "Trả lời tin nhắn", "Tóm tắt cuộc họp", "Làm slide thuyết trình", "Quản lý kho"],
    descQuick: ["+ Online 24/7 nếu cần", "+ Bảo mật thông tin", "+ Báo cáo mỗi ngày", "+ Thạo công cụ văn phòng", "+ Chủ động công việc", "+ Giao tiếp tốt", "+ Xử lý đa nhiệm", "+ Đúng deadline", "+ Tiếng Anh lưu loát"]
  },
  { 
    id: "event", name: "Sự kiện", icon: "🎉", color: "#ff9f0a", basePrice: 1500000,
    suggestions: ["Tổ chức sinh nhật", "MC dẫn chương trình", "Setup workshop", "Thuê PG/PB", "Trang trí tiệc cưới", "Âm thanh ánh sáng", "Quay phim sự kiện", "Lên timeline chi tiết", "Thuê chú hề", "Trang trí bóng bay", "Tổ chức team building", "Thuê mascot", "Biểu diễn ảo thuật", "Thuê ca sĩ", "Tổ chức khai trương", "Thuê nhóm nhảy", "Trang trí Tết", "Tổ chức họp lớp", "Thuê xe hoa", "Làm backdrop"],
    descQuick: ["+ Trọn gói từ A-Z", "+ Có hợp đồng rõ ràng", "+ Đúng concept yêu cầu", "+ Backup rủi ro", "+ Kinh nghiệm 5 năm+", "+ Sáng tạo độc đáo", "+ Chi phí minh bạch", "+ Đúng tiến độ", "+ Hậu cần chu đáo"]
  },
  { 
    id: "legal", name: "Pháp lý", icon: "⚖️", color: "#30d158", basePrice: 1000000,
    suggestions: ["Thành lập công ty", "Đăng ký nhãn hiệu", "Soạn hợp đồng", "Tư vấn ly hôn", "Làm visa/ work permit", "Xin giấy phép", "Quyết toán thuế", "Tranh chấp đất đai", "Công chứng giấy tờ", "Đăng ký bản quyền", "Tư vấn thừa kế", "Làm hộ chiếu", "Xin giấy phép xây dựng", "Đăng ký kết hôn", "Tư vấn lao động", "Làm lý lịch tư pháp", "Khai nhận di sản", "Đăng ký mã vạch", "Tư vấn đầu tư", "Làm giấy phép lái xe"],
    descQuick: ["+ Luật sư có thẻ hành nghề", "+ Tư vấn miễn phí lần đầu", "+ Phí trọn gói không phát sinh", "+ Đúng quy trình pháp luật", "+ Hỗ trợ toàn quốc", "+ Bảo mật tuyệt đối", "+ Xử lý nhanh", "+ Giải thích dễ hiểu", "+ Đồng hành đến cùng"]
  },
  { 
    id: "repair", name: "Sửa chữa", icon: "🔧", color: "#bf5af2", basePrice: 200000,
    suggestions: ["Sửa điện nước tại nhà", "Sửa laptop/PC", "Lắp camera an ninh", "Sửa máy lạnh", "Thông tắc bồn cầu", "Sửa khóa tận nơi", "Sơn sửa nhà", "Lắp đặt nội thất", "Sửa máy giặt", "Sửa tủ lạnh", "Sửa điện thoại", "Hàn cửa sắt", "Sửa máy bơm nước", "Lắp quạt trần", "Sửa TV", "Chống thấm", "Sửa bếp từ", "Lắp vòi sen", "Sửa xe máy", "Bảo trì thang máy"],
    descQuick: ["+ Có mặt sau 30 phút", "+ Báo giá trước khi làm", "+ Bảo hành 6 tháng", "+ Thợ lành nghề", "+ Dọn dẹp sạch sẽ", "+ Phụ tùng chính hãng", "+ Không chặt chém", "+ Làm cả ngày lễ", "+ Xử lý triệt để"]
  },
  { 
    id: "accounting", name: "Kế toán", icon: "🧮", color: "#64d2ff", basePrice: 500000,
    suggestions: ["Báo cáo thuế tháng", "Làm sổ sách kế toán", "Quyết toán cuối năm", "Tư vấn tối ưu thuế", "Hoàn thuế TNCN", "Đăng ký BHXH", "Làm BCTC", "Setup phần mềm", "Đăng ký MST cá nhân", "Kê khai thuế GTGT", "Làm bảng lương", "Tư vấn hóa đơn điện tử", "Quyết toán thuế TNDN", "Đăng ký kinh doanh", "Làm báo cáo tài chính", "Tư vấn BHXH", "Kiểm toán nội bộ", "Làm hồ sơ vay vốn", "Tư vấn thuế nhà thầu", "Đăng ký địa điểm KD"],
    descQuick: ["+ Kế toán trưởng duyệt", "+ Đúng hạn cơ quan thuế", "+ Bảo mật số liệu", "+ Giải trình khi thanh tra", "+ Chứng chỉ đại lý thuế", "+ Cập nhật luật mới", "+ Tối ưu chi phí", "+ Hỗ trợ online", "+ Phí hợp lý"]
  },
  { 
    id: "care", name: "Chăm sóc", icon: "❤️", color: "#ff375f", basePrice: 400000,
    suggestions: ["Chăm người già tại nhà", "Trông trẻ theo giờ", "Chăm sóc thú cưng", "Massage trị liệu", "Chăm sóc mẹ & bé", "Đi chợ nấu ăn", "Đưa đón bé đi học", "Tập vật lý trị liệu", "Chăm người bệnh", "Tắm bé sơ sinh", "Dắt chó đi dạo", "Chăm sóc cây cảnh", "Đọc sách cho bé", "Tập yoga tại nhà", "Chăm sóc sau sinh", "Trông nhà", "Cắt tỉa lông chó mèo", "Dạy bé tập nói", "Chăm sóc người khuyết tật", "Tiêm thuốc tại nhà"],
    descQuick: ["+ Có chứng chỉ nghiệp vụ", "+ Lý lịch rõ ràng", "+ Yêu nghề, tận tâm", "+ Cập nhật tình hình hằng ngày", "+ Xử lý tình huống tốt", "+ Kiên nhẫn nhẹ nhàng", "+ Kinh nghiệm lâu năm", "+ Yêu trẻ/thú cưng", "+ Đáng tin cậy"]
  },
  { 
    id: "car", name: "Xe cộ", icon: "🚗", color: "#ac8e68", basePrice: 600000,
    suggestions: ["Tài xế riêng theo ngày", "Rửa xe tận nơi", "Đăng kiểm hộ", "Cứu hộ ắc quy", "Dán phim cách nhiệt", "Thuê xe tự lái", "Vá vỏ lưu động", "Sang tên đổi chủ", "Bảo dưỡng xe", "Phủ ceramic", "Độ đèn xe", "Lắp camera hành trình", "Thay nhớt tại nhà", "Dán decal xe", "Cứu hộ giao thông", "Rút hồ sơ gốc", "Lắp định vị GPS", "Sơn xe", "Bọc ghế da", "Kiểm tra xe cũ"],
    descQuick: ["+ Lái xe kinh nghiệm 5 năm+", "+ Xe đời mới, sạch sẽ", "+ Đúng giờ, đúng hẹn", "+ Có bảo hiểm đầy đủ", "+ Rành đường TP.HCM", "+ Thái độ phục vụ tốt", "+ Giá công khai", "+ Hỗ trợ 24/7", "+ Thợ chuyên nghiệp"]
  },
  { 
    id: "other", name: "Khác", icon: "📌", color: "#8e8e93", basePrice: 100000,
    suggestions: ["Việc gì cũng nhận", "Tư vấn tâm lý", "Xem tarot/bói bài", "Thuê người yêu", "Xếp hàng mua đồ", "Test game/app", "Tìm người thất lạc", "Việc theo yêu cầu", "Dẫn tour du lịch", "Phiên dịch tiếng lạ", "Làm mẫu ảnh", "Thuê bạn đi chơi", "Viết thư tình", "Tìm đồ thất lạc", "Tư vấn phong thủy", "Làm MC đám cưới", "Dạy khiêu vũ", "Thuê người bê tráp", "Tư vấn khởi nghiệp", "Làm YouTuber thuê"],
    descQuick: ["+ Trao đổi cụ thể nhé", "+ Giá thương lượng", "+ Uy tín là đầu", "+ Hỗ trợ 24/7", "+ Không ngại việc khó", "+ Bảo mật thông tin", "+ Nhiệt tình trách nhiệm", "+ Linh hoạt mọi thứ", "+ Làm được mới nhận"]
  },
];

const URGENCY = [
  { id: "normal", name: "Thường", time: "3-7 ngày", bonus: 0, color: "emerald" },
  { id: "urgent", name: "Gấp", time: "24-48h", bonus: 25, color: "amber" },
  { id: "express", name: "Hỏa tốc", time: "< 12h", bonus: 60, color: "red" },
];

const TEMPLATES = [
  { icon: "🚚", name: "Ship hỏa tốc", cat: "delivery", title: "Giao hàng trong 2h nội thành HCM", price: "45000", tags: ["gấp", "2h", "COD"] },
  { icon: "🛒", name: "Đi chợ hộ", cat: "shopping", title: "Đi chợ mua đồ theo list, giao tận nhà", price: "50000", tags: ["siêu thị", "chợ", "hóa đơn"] },
  { icon: "📚", name: "Gia sư Toán", cat: "tutoring", title: "Dạy kèm Toán lớp 12, ôn thi THPTQG", price: "250000", tags: ["cấp 3", "1-1", "online"] },
  { icon: "🎨", name: "Logo Pro", cat: "design", title: "Thiết kế logo + bộ nhận diện thương hiệu", price: "1500000", tags: ["3 concept", "file gốc"] },
  { icon: "🧹", name: "Dọn nhà 4h", cat: "cleaning", title: "Tổng vệ sinh nhà 2PN, 2WC trong 4 tiếng", price: "350000", tags: ["theo giờ", "sạch sẽ"] },
  { icon: "🍳", name: "Nấu tiệc 10 mâm", cat: "cooking", title: "Nấu tiệc tại nhà cho 10 mâm, 6 món/mâm", price: "3000000", tags: ["tại nhà", "dọn bếp"] },
  { icon: "💅", name: "Nail tại nhà", cat: "beauty", title: "Làm nail + nối mi tại nhà, gel Hàn", price: "300000", tags: ["tại nhà", "bền đẹp"] },
  { icon: "📸", name: "Chụp sản phẩm", cat: "photo", title: "Chụp ảnh sản phẩm 20 tấm, retouch cơ bản", price: "800000", tags: ["studio", "retouch"] },
  { icon: "👔", name: "Trợ lý ảo", cat: "assistant", title: "Trợ lý cá nhân online 8h/ngày trong 1 tuần", price: "2000000", tags: ["từ xa", "báo cáo"] },
  { icon: "🎉", name: "Trang trí sinh nhật", cat: "event", title: "Trang trí tiệc sinh nhật tone hồng cho bé", price: "2500000", tags: ["trọn gói", "bóng bay"] },
  { icon: "⚖️", name: "Thành lập CTY", cat: "legal", title: "Dịch vụ thành lập công ty TNHH trọn gói", price: "3000000", tags: ["pháp lý", "nhanh"] },
  { icon: "🔧", name: "Sửa máy lạnh", cat: "repair", title: "Vệ sinh + bơm gas máy lạnh 1.5HP", price: "200000", tags: ["tại nhà", "bảo hành"] },
  { icon: "🧮", name: "Báo cáo thuế", cat: "accounting", title: "Làm báo cáo thuế tháng cho hộ kinh doanh", price: "500000", tags: ["đúng hạn", "online"] },
  { icon: "❤️", name: "Trông trẻ", cat: "care", title: "Trông bé 3 tuổi tại nhà từ 8h-17h", price: "400000", tags: ["theo ngày", "kinh nghiệm"] },
  { icon: "🚗", name: "Tài xế ngày", cat: "car", title: "Thuê tài xế riêng lái xe theo ngày 8 tiếng", price: "700000", tags: ["nội thành", "an toàn"] },
  { icon: "📢", name: "Chạy Ads FB", cat: "marketing", title: "Chạy quảng cáo Facebook ngân sách 5tr/tháng", price: "1000000", tags: ["target chuẩn", "report"] },
  { icon: "✍️", name: "Viết content", cat: "content", title: "Viết 10 bài content SEO cho website", price: "1500000", tags: ["chuẩn SEO", "unique"] },
  { icon: "🎹", name: "Dạy Piano", cat: "tutoring", title: "Dạy Piano cơ bản cho người mới bắt đầu", price: "300000", tags: ["tại nhà", "1-1"] },
  { icon: "🎬", name: "Edit video", cat: "design", title: "Edit video TikTok 60s, chèn hiệu ứng", price: "300000", tags: ["trending", "nhanh"] },
  { icon: "🐕", name: "Tắm chó mèo", cat: "care", title: "Tắm + cắt tỉa lông cho chó Poodle tại nhà", price: "250000", tags: ["tận nơi", "sạch sẽ"] },
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
  urgency: "normal", skillLevel: 2, revisions: 3, 
  milestoneEnabled: false,
  milestones: [
    { id: 1, name: "Đặt cọc", percent: 30, desc: "Chuyển khoản trước khi làm", deadline: "" },
    { id: 2, name: "Thanh toán cuối", percent: 70, desc: "CK sau khi bàn giao", deadline: "" },
  ],
  instantHire: false, allowBids: false, featured: false, privateNotes: "",
  invites: [] as string[], pollPrice: false, needApproval: true,
  nda: false, warranty: 7, attachments: [] as File[], recurring: "once",
  languages: ["Tiếng Việt"], timezone: "Asia/Ho_Chi_Minh",
});

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const category = useMemo(() => CATEGORIES.find(c => c.id === form.category)!, [form.category]);
  const urgencyLevel = URGENCY.find(u => u.id === form.urgency)!;
  const progress = (step / 3) * 100;
  const basePrice = parseInt(form.price.replace(/\./g, "") || "0");
  const urgencyFee = Math.round(basePrice * urgencyLevel.bonus / 100);
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

const addMilestone = () => {
  const newId = Math.max(...form.milestones.map(m => m.id), 0) + 1;
  setForm({...form, milestones: [...form.milestones, { id: newId, name: `Giai đoạn ${form.milestones.length + 1}`, percent: 0, desc: "", deadline: "" }]});
};

const updateMilestone = (id: number, field: string, value: any) => {
  setForm({...form, milestones: form.milestones.map(m => m.id === id? {...m, [field]: value} : m)});
};

const removeMilestone = (id: number) => {
  if (form.milestones.length <= 1) return toast.error("Phải có ít nhất 1 giai đoạn");
  setForm({...form, milestones: form.milestones.filter(m => m.id!== id)});
};

const totalPercent = form.milestones.reduce((sum, m) => sum + (m.percent || 0), 0);
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
        skillLevel: form.skillLevel,
        revisions: form.revisions,
        milestones: form.milestoneEnabled? form.milestones : [],
        instantHire: form.instantHire,
        allowBids: form.allowBids,
        featured: form.featured,
        nda: form.nda,
        warranty: form.warranty,
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
    <div className={`rounded-xl border p-2 flex-col items-center justify-center gap-1 min-h-[60px] transition-all ${form.category === c.id? "border-[#0a84ff] bg-[#0a84ff]/5" : "border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
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
<div className="flex items-center gap-3">
  <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${category.color}15` }}>
    <span className="text-">{category.icon}</span>
  </div>
  <div className="flex-1 relative">
    <input value={form.title} onChange={e => setForm({...form, title: e.target.value.slice(0, 100) })} placeholder="Bạn cần làm gì?" className="w-full h-11 px-3 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 text- font-medium outline-none placeholder:text-zinc-400 border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all" autoFocus />
    {form.title.length > 0 && form.title.length < 10 && (
      <span className="absolute -bottom-5 right-0 text-[11px] text-amber-600">Cần tối thiểu 10 ký tự</span>
    )}
  </div>
</div>
  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {category.suggestions.map(tag => (
          <button key={tag} onClick={() => setForm(f => ({...f, title: tag }))} className="px-2.5 py-1 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#0a84ff]/10 hover:text-[#0a84ff] text-[12px] text-zinc-600 dark:text-zinc-400 transition-colors active:scale-95">{tag}</button>
        ))}
      </div>
    </div>

<div className="space-y-3">
<textarea
  value={form.description}
  onChange={e => setForm({...form, description: e.target.value.slice(0, 2000) })}
  placeholder="Mô tả chi tiết yêu cầu, mục tiêu, kết quả mong muốn..."
  rows={5}
  className="w-full p-3 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 outline-none resize-none text- leading- placeholder:text-zinc-400"
/>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E5EA] dark:border-zinc-800">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {category.descQuick.map(t => (
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
{form.description.length > 0 && form.description.length < 20 && (
  <span className="text-[11px] tabular-nums ml-2 text-amber-600">
    Cần tối thiểu 20 ký tự
  </span>
)}
      </div>
    </div>

  </motion.div>
)}

             {step === 2 && (
  <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-4 space-y-3">
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0a84ff]/10 grid place-items-center"><FiDollarSign size={16} className="text-[#0a84ff]" /></div>
          <span className="font-medium text-[15px]">Ngân sách</span>
        </div>
        <div className="flex bg-[#F2F2F7] dark:bg-zinc-800 p-0.5 rounded-lg">
          {["fixed", "hourly", "negotiable"].map((t, i) => (
            <button key={t} onClick={() => setForm({...form, budgetType: t as any })} className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all active:scale-95 ${form.budgetType === t? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"}`}>{["Cố định", "Theo giờ", "Thỏa thuận"][i]}</button>
          ))}
        </div>
      </div>

      {form.budgetType!== "negotiable"? (
        <>
          <div className="relative">
            <input type="text" inputMode="numeric" value={form.price} onChange={e => setForm({...form, price: e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") })} placeholder="0" className="w-full h-[52px] pl-4 pr-14 bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-[#0a84ff]/20 text-[24px] font-semibold tracking-tight transition-all tabular-nums" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-zinc-400">VND</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[14px] text-zinc-500">Số người:</span>
            <div className="flex items-center gap-2 bg-[#F2F2F7] dark:bg-zinc-800 rounded-lg p-0.5">
              <button onClick={() => setForm({...form, totalSlots: Math.max(1, parseInt(form.totalSlots) - 1).toString() })} className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95">−</button>
              <span className="w-8 text-center text-[14px] font-medium tabular-nums">{form.totalSlots}</span>
              <button onClick={() => setForm({...form, totalSlots: Math.min(20, parseInt(form.totalSlots) + 1).toString() })} className="w-7 h-7 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 active:scale-95">+</button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-[52px] grid place-items-center bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl text-zinc-500 text-[15px]">Sẽ thỏa thuận sau</div>
      )}
    </div>

    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 grid place-items-center"><FiZap size={16} className="text-amber-600" /></div>
        <span className="font-medium text-[15px]">Độ ưu tiên</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {URGENCY.map(u => (
          <button key={u.id} onClick={() => setForm({...form, urgency: u.id })} className={`relative p-3 rounded-2xl border text-left transition-all active:scale-95 ${form.urgency === u.id? "border-[#0a84ff] bg-[#0a84ff]/5" : "border-[#E5E5EA] dark:border-zinc-800 bg-[#F2F2F7]/50 dark:bg-zinc-800/30"}`}>
            <div className={`text-[14px] font-semibold ${form.urgency === u.id? "text-[#0a84ff]" : "text-zinc-700 dark:text-zinc-300"}`}>{u.name}</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">{u.time}</div>
            {u.bonus > 0 && <div className={`text-[12px] font-medium mt-1 tabular-nums ${form.urgency === u.id? "text-[#0a84ff]" : "text-zinc-500"}`}>+{u.bonus}%</div>}
          </button>
        ))}
      </div>
    </div>

    <div className="space-y-3">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiCalendar size={16} className="text-zinc-400" />
          <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">Thời gian thực hiện</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[12px] text-zinc-500 mb-1.5">Bắt đầu</div>
            <input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value })} className="w-full h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] font-medium border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all" />
          </div>
          <div>
            <div className="text-[12px] text-zinc-500 mb-1.5">Kết thúc</div>
            <input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value })} className="w-full h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] font-medium border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiMapPin size={16} className="text-zinc-400" />
            <span className="text-[14px] font-medium text-zinc-600 dark:text-zinc-400">Địa điểm</span>
          </div>
          <button onClick={() => setForm({...form, isRemote:!form.isRemote })} className={`relative w-11 h-[26px] rounded-full transition-colors ${form.isRemote? "bg-[#0a84ff]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
            <div className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform ${form.isRemote? "translate-x-[20px]" : "translate-x-0.5"}`} />
          </button>
        </div>
        {form.isRemote? (
          <div className="h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl flex items-center gap-2 text-[14px] text-zinc-600 dark:text-zinc-400">
            <FiGlobe size={15} /> Làm việc từ xa
          </div>
        ) : (
          <div className="flex gap-2">
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value })} placeholder="Nhập địa chỉ..." className="flex-1 h-10 px-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl outline-none text-[14px] border border-[#E5E5EA] dark:border-zinc-800 focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all" />
            <button onClick={handleGetLocation} className="w-10 h-10 grid place-items-center bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl active:scale-95 transition-all">
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
               { k: "instantHire", icon: FiZap, label: "Giao việc ngay", desc: "Người đầu tiên nhận sẽ làm luôn" },
  { k: "allowBids", icon: FiTrendingUp, label: "Đấu thầu", desc: "Nhận nhiều báo giá" },
  { k: "needApproval", icon: FiUserCheck, label: "Duyệt tay", desc: "Chọn người làm" },
  { k: "nda", icon: FiLock, label: "Bảo mật NDA", desc: "Ký thỏa thuận" },
  { k: "warranty", icon: FiShield, label: "Bảo hành", desc: "7-30 ngày" },
].map(item => {
  const Icon = item.icon;
  const active = (form as any)[item.k];
  const disabled = (item.k === "needApproval" && form.instantHire) || (item.k === "instantHire" && form.needApproval);
  return (
    <button
      key={item.k}
      onClick={() =>!disabled && setForm({...form, [item.k]:!active })}
      disabled={disabled}
      className={`group relative p-4 rounded-2xl border text-left transition-all active:scale-[0.98] ${
        disabled? "opacity-40 cursor-not-allowed" : ""
      } ${
        active? "border-[#0a84ff] bg-[#0a84ff]/5" : "border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <Icon size={20} className={active? "text-[#0a84ff]" : "text-zinc-400"} />
      <div className="text-[14px] font-medium mt-2.5 leading-tight">{item.label}</div>
      <div className="text-[12px] text-zinc-500 leading-snug mt-0.5">{item.desc}</div>
      {active && <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#0a84ff] rounded-full grid place-items-center"><FiCheck size={12} className="text-white" strokeWidth={3} /></div>}
    </button>
  );
})}
                  </div>
{/* Chia giai đoạn - Bản hoàn hảo */}
<div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 overflow-hidden">
  <div className="p-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-[#af52de]/10 grid place-items-center"><FiLayers size={16} className="text-[#af52de]" /></div>
      <div>
        <div className="font-medium text-[14px]">Chia giai đoạn</div>
        <div className="text-[12px] text-zinc-500">Lên lịch thanh toán theo tiến độ</div>
      </div>
    </div>
<button onClick={() => setForm({...form, milestoneEnabled:!form.milestoneEnabled})} className={`relative w-11 h-[26px] rounded-full transition-colors ${form.milestoneEnabled? "bg-[#0a84ff]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
  <div className={`absolute top-0.5 w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform ${form.milestoneEnabled? "translate-x-[20px]" : "translate-x-0.5"}`} />
</button>
  </div>

  <AnimatePresence>
    {form.milestoneEnabled && (
      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-[#E5E5EA] dark:border-zinc-800">
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-2">
            <FiZap size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[12px] text-blue-700 dark:text-blue-400 leading-snug">
              <b>Lưu ý:</b> Đây là lịch thanh toán thỏa thuận giữa 2 bên. Web không giữ tiền, khách và freelancer tự chuyển khoản trực tiếp theo từng giai đoạn.
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {form.milestones.map((m, idx) => (
            <div key={m.id} className="p-3 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#af52de] text-white text-[12px] font-bold grid place-items-center">{idx + 1}</div>
                <input
                  value={m.name}
                  onChange={e => updateMilestone(m.id, "name", e.target.value)}
                  placeholder="Tên giai đoạn"
                  className="flex-1 bg-transparent text-[14px] font-medium outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={m.percent}
                    onChange={e => updateMilestone(m.id, "percent", Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    className="w-14 h-7 text-center bg-white dark:bg-zinc-900 rounded-lg text-[13px] font-semibold tabular-nums outline-none border border-[#E5E5EA] dark:border-zinc-700 focus:border-[#0a84ff]"
                  />
                  <span className="text-[13px] text-zinc-500">%</span>
                </div>
                {form.milestones.length > 1 && (
                  <button onClick={() => removeMilestone(m.id)} className="w-6 h-6 grid place-items-center rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 active:scale-95">
                    <FiX size={14} />
                  </button>
                )}
              </div>
              <input
                value={m.desc}
                onChange={e => updateMilestone(m.id, "desc", e.target.value)}
                placeholder="VD: Chuyển khoản 30% khi bắt đầu làm..."
                className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 rounded-lg text-[13px] outline-none border border-[#E5E5EA] dark:border-zinc-700 focus:border-[#0a84ff]"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiCalendar size={14} className="text-zinc-400" />
                  <input
                    type="date"
                    value={m.deadline}
                    onChange={e => updateMilestone(m.id, "deadline", e.target.value)}
                    className="h-8 px-2 bg-white dark:bg-zinc-900 rounded-lg text-[13px] outline-none border border-[#E5E5EA] dark:border-zinc-700 focus:border-[#0a84ff]"
                  />
                </div>
                <span className="text-[13px] font-semibold text-[#0a84ff] tabular-nums">
                  {basePrice > 0? `${Math.round(basePrice * m.percent / 100).toLocaleString('vi-VN')}đ` : ""}
                </span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <button onClick={addMilestone} className="flex items-center gap-1.5 text-[13px] font-medium text-[#0a84ff] hover:bg-[#0a84ff]/5 px-2 py-1.5 rounded-lg active:scale-95">
              <FiPlus size={14} /> Thêm giai đoạn
            </button>
            <div className={`text-[13px] font-semibold tabular-nums ${totalPercent === 100? "text-emerald-600" : "text-amber-600"}`}>
              Tổng: {totalPercent}%
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>

                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[13px] text-zinc-500 mb-2">Cấp độ yêu cầu</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(l => (
                            <button key={l} onClick={() => setForm({...form, skillLevel: l })} className={`flex-1 h-9 rounded-lg text-[13px] font-medium transition-all active:scale-95 ${form.skillLevel === l ? "bg-[#0a84ff] text-white shadow-sm" : "bg-[#F2F2F7] dark:bg-zinc-800 text-zinc-600 hover:bg-[#E5E5EA]"}`}>{["New", "TB", "Pro", "Exp"][l - 1]}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[13px] text-zinc-500 mb-2">Số lần sửa</div>
                        <div className="flex items-center gap-2">
                          <input type="range" min="1" max="10" value={form.revisions} onChange={e => setForm({...form, revisions: parseInt(e.target.value) })} className="flex-1 h-1.5 accent-[#0a84ff]" />
                          <span className="w-6 text-center text-[14px] font-medium tabular-nums">{form.revisions}</span>
                        </div>
                      </div>
                    </div>
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

                  {basePrice > 0 && (
                    <div className="bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl p-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[11px] opacity-60 uppercase tracking-wide font-medium">Tổng thanh toán</div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-[28px] font-bold tracking-tight leading-none tabular-nums">{totalPrice.toLocaleString('vi-VN')}</span>
                            <span className="text-[14px] opacity-70">đ</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] opacity-60">Bao gồm</div>
                          <div className="text-[12px] font-medium mt-0.5">Phí dịch vụ 5%</div>
                        </div>
                      </div>
                      {(urgencyFee > 0 || featuredFee > 0) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          <div className="flex justify-between text-[12px] opacity-70"><span>Giá gốc</span><span className="tabular-nums">{basePrice.toLocaleString('vi-VN')}đ</span></div>
                          {urgencyFee > 0 && <div className="flex justify-between text-[12px] opacity-70"><span>Phí ưu tiên ({urgencyLevel.bonus}%)</span><span className="tabular-nums">+{urgencyFee.toLocaleString('vi-VN')}đ</span></div>}
                          {featuredFee > 0 && <div className="flex justify-between text-[12px] opacity-70"><span>Ghim PRO</span><span className="tabular-nums">+{featuredFee.toLocaleString('vi-VN')}đ</span></div>}
                        </div>
                      )}
                    </div>
                  )}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-3" onClick={() => setShowTemplates(false)}>
      <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-[28px] p-5 max-h-[calc(100vh-8rem)] flex flex-col shadow-2xl">
        <div className="w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 shrink-0" />
        <h3 className="text-[20px] font-bold shrink-0">Mẫu có sẵn</h3>
        <p className="text-[13px] text-zinc-500 mt-0.5 mb-4 shrink-0">Chọn để bắt đầu nhanh</p>
        <div className="grid gap-2.5 overflow-y-auto scrollbar-hide -mx-1 px-1 pb-2">
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

"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPhone, FiMail, FiUser, FiShield, FiAlertTriangle } from "react-icons/fi";
import { motion } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import * as L from "@/components/illustrations";


export default function TermsPage() {
  const router = useRouter();
  const lastUpdated = "18/05/2026";
  const version = "2.2";
  const effectiveDate = "01/06/2026";

  return (
    <div className="h-dvh bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOFMwIDguMDYgMCAxOGMwIDkuOTQgOC4wNiAxOCAxOCAxOHM5LjM4LTMuNTcgMTItOS4xOGMxLjU1LTIuNzYgMy40OC01LjE4IDUuNjgtNy4xOEwzNiAxOHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

      <div className="w-full max-w-2xl my-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, type: "spring", damping: 22 }}
          className="glass rounded-3xl shadow-2xl p-6 border border-border"
        >
          <button
            onClick={() => {
              if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(5);
              router.back();
            }}
            className="mb-4 w-10 h-10 bg-secondary rounded-xl flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
            aria-label="Quay lại"
          >
            <FiArrowLeft className="text-foreground" size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-xl opacity-40" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-xl">
                <LottiePlayer
                  animationData={L.task}
                  loop
                  autoplay
                  className="w-11 h-11"
                  aria-label="Điều khoản"
                />
              </div>
            </div>
            <h1 className="text-2xl font-black text-foreground mb-1.5 tracking-tight">
              Điều khoản sử dụng HUHA
            </h1>
            <p className="text-sm text-muted-foreground">
              Phiên bản {version} | Cập nhật: {lastUpdated} | Hiệu lực: {effectiveDate}
            </p>
          </div>

          <div className="space-y-5 text-sm text-foreground max-h- overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">1. Giới thiệu & Chấp thuận</h2>
              <p className="leading-relaxed text-muted-foreground">
                HUHA là nền tảng kết nối công việc vặt do <b className="text-primary">Nguyễn Quốc Mạnh</b> phát triển và vận hành. Bằng việc tạo tài khoản, truy cập hoặc sử dụng HUHA, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi Điều khoản này, Chính sách bảo mật và Quy tắc cộng đồng. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">2. Điều kiện tài khoản</h2>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-muted-foreground">
                <li>Bạn phải từ 13 tuổi trở lên và đủ năng lực hành vi dân sự theo pháp luật Việt Nam.</li>
                <li>Thông tin đăng ký phải chính xác, cập nhật. Email/sđt dùng để xác thực và khôi phục.</li>
                <li>Mỗi cá nhân chỉ sở hữu 01 tài khoản. Tài khoản giả mạo, trùng lặp sẽ bị vô hiệu hóa.</li>
                <li>Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản.</li>
                <li>Chúng tôi có quyền tạm khóa/xóa vĩnh viễn tài khoản vi phạm mà không cần báo trước.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">3. Quyền & Nghĩa vụ người dùng</h2>
              <p className="mb-2 font-semibold text-foreground">Bạn được quyền:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3 text-muted-foreground">
                <li>Sử dụng đầy đủ tính năng HUHA miễn phí.</li>
                <li>Đăng tải, chia sẻ nội dung do bạn tạo ra.</li>
                <li>Yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân theo luật.</li>
              </ul>
              <p className="mb-2 font-semibold text-foreground">Bạn cam kết KHÔNG:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Đăng tải nội dung vi phạm pháp luật VN: đồi trụy, bạo lực, phân biệt, khủng bố.</li>
                <li>Xâm phạm bản quyền, nhãn hiệu, bí mật kinh doanh.</li>
                <li>Spam, lừa đảo, phát tán mã độc, tấn công hệ thống.</li>
                <li>Mạo danh cá nhân, tổ chức. Thu thập dữ liệu trái phép.</li>
                <li>Sử dụng HUHA cho mục đích thương mại khi chưa được phép.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">4. Giao dịch & Thanh toán</h2>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-muted-foreground">
                <li>HUHA là nền tảng trung gian kết nối. Chúng tôi không phải bên tham gia hợp đồng giữa người thuê và người làm.</li>
                <li>Người dùng tự thỏa thuận giá, phương thức thanh toán. HUHA không chịu trách nhiệm về tranh chấp thanh toán.</li>
                <li>Phí dịch vụ nếu có sẽ được thông báo rõ ràng trước khi bạn sử dụng tính năng trả phí.</li>
                <li>Bạn có trách nhiệm kê khai và nộp thuế theo quy định pháp luật từ thu nhập phát sinh trên HUHA.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">5. Nội dung & Quyền sở hữu trí tuệ</h2>
              <p className="leading-relaxed text-muted-foreground">
                Bạn giữ toàn bộ quyền với nội dung bạn đăng. Khi đăng, bạn cấp cho HUHA giấy phép toàn cầu, miễn phí, không độc quyền để lưu trữ, hiển thị, phân phối nội dung đó nhằm vận hành dịch vụ. Mã nguồn, logo, thương hiệu "HUHA" thuộc sở hữu của Nguyễn Quốc Mạnh. Nghiêm cấm sao chép, chỉnh sửa khi chưa có văn bản đồng ý.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">6. Bảo mật & Dữ liệu cá nhân</h2>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-muted-foreground">
                <li>Chúng tôi thu thập: email, tên, ảnh, vị trí, thiết bị để cung cấp dịch vụ. Xem chi tiết tại Chính sách bảo mật.</li>
                <li>Dữ liệu được mã hóa, lưu trữ tại máy chủ đạt chuẩn. Chúng tôi không bán dữ liệu cho bên thứ ba.</li>
                <li>Bạn có quyền yêu cầu xuất/sửa/xóa dữ liệu qua email hỗ trợ.</li>
                <li>Trường hợp rò rỉ dữ liệu, chúng tôi sẽ thông báo trong 72h theo NĐ 13/2023/NĐ-CP.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">7. Giới hạn trách nhiệm</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex gap-3">
                <FiAlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
                <p className="leading-relaxed text-muted-foreground text-xs">
                  HUHA cung cấp "nguyên trạng". Chúng tôi không đảm bảo dịch vụ không gián đoạn, không lỗi. Chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp, mất dữ liệu, mất lợi nhuận từ việc sử dụng hoặc không thể sử dụng HUHA. Trách nhiệm tối đa không vượt quá 100.000 VNĐ.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-foreground mb-2 text-base">8. Chấm dứt & Sửa đổi</h2>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-muted-foreground">
                <li>Bạn có thể xóa tài khoản bất cứ lúc nào trong Cài đặt.</li>
                <li>Chúng tôi có quyền chấm dứt tài khoản vi phạm nghiêm trọng.</li>
                <li>Điều khoản có thể cập nhật. Thay đổi quan trọng sẽ thông báo qua email/in-app 7 ngày trước khi có hiệu lực.</li>
                <li>Tiếp tục sử dụng sau ngày hiệu lực nghĩa là bạn chấp nhận điều khoản mới.</li>
              </ul>
            </section>

            <section className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-3xl p-5">
              <h2 className="font-bold text-foreground mb-3 flex items-center gap-2 text-base">
                <FiUser size={18} className="text-primary" />
                9. Thông tin Nhà phát hành & Liên hệ
              </h2>
              <div className="space-y-2.5 text-muted-foreground">
                <p><b className="text-foreground">Đơn vị:</b> Cá nhân</p>
                <p><b className="text-foreground">Họ tên:</b> Nguyễn Quốc Mạnh</p>
                <p className="flex items-center gap-2">
                  <FiPhone className="text-primary" size={16} />
                  <b className="text-foreground">Hotline:</b> 0359872122
                </p>
                <p className="flex items-center gap-2">
                  <FiMail className="text-primary" size={16} />
                  <b className="text-foreground">Email:</b> Manhgopatel5@gmail.com
                </p>
                <p><b className="text-foreground">Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
                <p className="text-xs pt-2 border-t border-border">
                  <FiShield className="inline mr-1" /> Mọi tranh chấp ưu tiên giải quyết thương lượng. Nếu không được, đưa ra Tòa án có thẩm quyền tại TP.HCM.
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background: hsl(var(--muted-foreground) / 0.3); 
          border-radius: 3px; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: hsl(var(--muted-foreground) / 0.5); 
        }
      `}</style>
    </div>
  );
}
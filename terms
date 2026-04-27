"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiFileText, FiPhone, FiMail, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";

export default function TermsPage() {
  const router = useRouter();
  const lastUpdated = "27/04/2026";
  const version = "2.1";

  return (
    <div className="h-dvh bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6"
        >
          <button
            onClick={() => router.back()}
            className="mb-4 w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <FiArrowLeft className="text-gray-700" size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <FiFileText className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Điều khoản sử dụng Airanh</h1>
            <p className="text-sm text-gray-600">Phiên bản {version} | Cập nhật: {lastUpdated}</p>
          </div>

          <div className="space-y-5 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
            <section>
              <h2 className="font-bold text-gray-900 mb-2">1. Giới thiệu</h2>
              <p>Airanh là ứng dụng mạng xã hội do <b>Nguyễn Quốc Mạnh</b> phát triển và vận hành. Bằng việc tạo tài khoản và sử dụng Airanh, bạn đồng ý bị ràng buộc bởi Điều khoản này và Chính sách bảo mật.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">2. Điều kiện tài khoản</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Bạn phải từ 13 tuổi trở lên, đủ năng lực hành vi dân sự theo pháp luật Việt Nam.</li>
                <li>Thông tin đăng ký phải chính xác. Email dùng để xác thực và khôi phục tài khoản.</li>
                <li>Mỗi cá nhân chỉ sở hữu 01 tài khoản. Tài khoản trùng lặp, giả mạo sẽ bị vô hiệu hóa.</li>
                <li>Bạn chịu hoàn toàn trách nhiệm bảo mật mật khẩu. Thông báo ngay cho chúng tôi nếu nghi ngờ tài khoản bị xâm phạm.</li>
                <li>Chúng tôi có quyền từ chối cung cấp dịch vụ, tạm khóa hoặc xóa vĩnh viễn tài khoản vi phạm mà không cần báo trước.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">3. Quyền và nghĩa vụ của bạn</h2>
              <p className="mb-2"><b>Bạn được quyền:</b></p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Sử dụng đầy đủ tính năng của Airanh miễn phí.</li>
                <li>Đăng tải, chia sẻ nội dung do bạn tạo ra.</li>
                <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân.</li>
              </ul>
              <p className="mb-2"><b>Bạn cam kết KHÔNG:</b></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Đăng tải nội dung vi phạm pháp luật VN: đồi trụy, bạo lực, cờ bạc, ma túy, vũ khí, thù địch, phân biệt chủng tộc, tôn giáo.</li>
                <li>Xâm phạm bản quyền, nhãn hiệu, bí mật kinh doanh của bên thứ ba.</li>
                <li>Spam, lừa đảo, phishing, phát tán mã độc, tấn công DDoS.</li>
                <li>Thu thập dữ liệu người dùng khác bằng bot, crawl trái phép.</li>
                <li>Mạo danh cá nhân, tổ chức. Lạm dụng tính năng báo cáo.</li>
                <li>Sử dụng Airanh cho mục đích thương mại khi chưa được phép bằng văn bản.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">4. Quyền sở hữu trí tuệ</h2>
              <p>Bạn giữ toàn bộ quyền với nội dung bạn đăng. Khi đăng lên Airanh, bạn cấp cho chúng tôi giấy phép toàn cầu, miễn phí, không độc quyền để lưu trữ, hiển thị, phân phối nội dung đó nhằm vận hành dịch vụ. Mã nguồn, logo, thương hiệu "Airanh" thuộc sở hữu của Nguyễn Quốc Mạnh.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">5. Dịch vụ trả phí</h2>
              <p>Hiện tại Airanh miễn phí. Nếu sau này có gói Pro, chúng tôi sẽ cập nhật điều khoản thanh toán, hoàn tiền rõ ràng trước khi áp dụng. Bạn có quyền từ chối và tiếp tục dùng bản miễn phí.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">6. Giới hạn trách nhiệm</h2>
              <p>Airanh cung cấp dịch vụ "AS IS". Chúng tôi không đảm bảo: dịch vụ không gián đoạn, không lỗi, dữ liệu không mất mát. Trong phạm vi luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp, ngẫu nhiên, do mất dữ liệu hoặc uy tín từ việc sử dụng app.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">7. Chấm dứt</h2>
              <p>Bạn có thể xóa tài khoản trong Cài đặt. Chúng tôi có thể chấm dứt dịch vụ nếu bạn vi phạm nghiêm trọng. Sau khi xóa, dữ liệu cá nhân sẽ bị xóa khỏi server trong 30 ngày, trừ dữ liệu cần lưu trữ theo luật.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">8. Luật áp dụng</h2>
              <p>Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền tại TP. Hồ Chí Minh.</p>
            </section>

            <section className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FiUser size={18} className="text-sky-600" />
                9. Thông tin Nhà phát hành
              </h2>
              <div className="space-y-2">
                <p><b>Đơn vị:</b> Cá nhân</p>
                <p><b>Họ tên:</b> Nguyễn Quốc Mạnh</p>
                <p className="flex items-center gap-2"><FiPhone className="text-sky-600" size={16} /><b>Hotline:</b> 0359872122</p>
                <p className="flex items-center gap-2"><FiMail className="text-sky-600" size={16} /><b>Email:</b> Manhgopatel5@gmail.com</p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
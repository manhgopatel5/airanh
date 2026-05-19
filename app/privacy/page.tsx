"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShield, FiPhone, FiMail, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";

export default function PrivacyPage() {
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
              <FiShield className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Chính sách bảo mật Airanh</h1>
            <p className="text-sm text-gray-600">Phiên bản {version} | Cập nhật: {lastUpdated}</p>
          </div>

          <div className="space-y-5 text-sm text-gray-700 max-h-[60vh] overflow-y-auto pr-2">
            <section>
              <h2 className="font-bold text-gray-900 mb-2">1. Phạm vi áp dụng</h2>
              <p>Chính sách này mô tả cách Airanh thu thập, sử dụng, lưu trữ dữ liệu cá nhân của bạn khi dùng app và website airanh.vercel.app. Chúng tôi tuân thủ Luật An ninh mạng 2018, Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân của Việt Nam.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">2. Dữ liệu chúng tôi thu thập</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border-b">Loại dữ liệu</th>
                      <th className="p-2 border-b">Ví dụ</th>
                      <th className="p-2 border-b">Mục đích</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">Định danh</td>
                      <td className="p-2">Tên, email, userId AIRxxxxxx, avatar</td>
                      <td className="p-2">Tạo tài khoản, hiển thị hồ sơ</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Xác thực</td>
                      <td className="p-2">Mật khẩu đã hash, token Google</td>
                      <td className="p-2">Đăng nhập an toàn</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Hoạt động</td>
                      <td className="p-2">Thời gian online, lần cuối truy cập</td>
                      <td className="p-2">Hiển thị trạng thái, chống spam</td>
                    </tr>
                    <tr>
                      <td className="p-2">Kỹ thuật</td>
                      <td className="p-2">IP, loại trình duyệt, OS</td>
                      <td className="p-2">Bảo mật, phân tích lỗi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2"><b>KHÔNG thu thập:</b> Số điện thoại, CMND/CCCD, vị trí GPS, danh bạ, tin nhắn SMS, ảnh trong máy.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">3. Cơ sở pháp lý & Mục đích sử dụng</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Thực hiện hợp đồng:</b> Cung cấp tính năng đăng nhập, mạng xã hội bạn đã đăng ký.</li>
                <li><b>Đồng ý:</b> Gửi email xác thực, marketing nếu bạn tick chọn.</li>
                <li><b>Lợi ích hợp pháp:</b> Chống gian lận, bảo mật hệ thống, phân tích ẩn danh để cải thiện app.</li>
                <li><b>Tuân thủ pháp luật:</b> Lưu log 2 năm theo Nghị định 72/2013/NĐ-CP.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">4. Chia sẻ với bên thứ ba</h2>
              <p>Chúng tôi chỉ chia sẻ với:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Google Firebase:</b> Lưu trữ dữ liệu, xác thực. Server tại Singapore. Tuân thủ GDPR, ISO 27001.</li>
                <li><b>Vercel:</b> Hosting website. Server tại Mỹ.</li>
                <li><b>Cơ quan nhà nước:</b> Khi có văn bản yêu cầu hợp pháp.</li>
                <li><b>KHÔNG bán dữ liệu.</b> KHÔNG chia sẻ cho công ty quảng cáo.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">5. Lưu trữ & Bảo mật</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Mã hóa TLS 1.3 khi truyền. AES-256 khi lưu trữ.</li>
                <li>Mật khẩu hash bằng scrypt của Firebase, chúng tôi không đọc được.</li>
                <li>Rate limit: 60s/lần gửi email, 30s/lần đăng nhập sai.</li>
                <li>Backup hàng ngày, có khả năng khôi phục khi sự cố.</li>
                <li>Dữ liệu người dùng VN được lưu tại Singapore theo yêu cầu Nghị định 53/2022/NĐ-CP.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">6. Thời gian lưu trữ</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Tài khoản hoạt động:</b> Lưu đến khi bạn xóa.</li>
                <li><b>Sau khi xóa:</b> Ẩn ngay lập tức, xóa khỏi backup sau 30 ngày.</li>
                <li><b>Log bảo mật:</b> Lưu 2 năm theo luật.</li>
                <li><b>Tài khoản không hoạt động 2 năm:</b> Gửi mail nhắc, sau 30 ngày sẽ xóa.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">7. Quyền của chủ thể dữ liệu</h2>
              <p>Theo Nghị định 13/2023, bạn có quyền:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Truy cập:</b> Vào Cài đặt &gt; Hồ sơ để xem dữ liệu.</li>
                <li><b>Chỉnh sửa:</b> Sửa tên, avatar trực tiếp.</li>
                <li><b>Xóa:</b> Cài đặt &gt; Xóa tài khoản hoặc mail cho chúng tôi.</li>
                <li><b>Rút lại đồng ý:</b> Xóa tài khoản để dừng xử lý.</li>
                <li><b>Khiếu nại:</b> Gửi về Cục An toàn thông tin - Bộ TTTT nếu chúng tôi vi phạm.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">8. Cookie</h2>
              <p>Airanh chỉ dùng cookie kỹ thuật bắt buộc để duy trì đăng nhập. Không dùng cookie quảng cáo, không dùng Google Analytics, Facebook Pixel.</p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">9. Trẻ em</h2>
              <p>Airanh dành cho người từ 13 tuổi. Chúng tôi không cố ý thu thập dữ liệu trẻ dưới 13. Nếu phụ huynh phát hiện, liên hệ để xóa ngay.</p>
            </section>

            <section className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
              <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FiUser size={18} className="text-sky-600" />
                10. Liên hệ Kiểm soát viên dữ liệu
              </h2>
              <div className="space-y-2">
                <p><b>Đơn vị kiểm soát:</b> Nguyễn Quốc Mạnh</p>
                <p className="flex items-center gap-2"><FiPhone className="text-sky-600" size={16} /><b>Hotline:</b> 0359872122</p>
                <p className="flex items-center gap-2"><FiMail className="text-sky-600" size={16} /><b>Email DPO:</b> Manhgopatel5@gmail.com</p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
                <p className="text-xs text-gray-600 mt-2">Thời gian phản hồi: 72h làm việc</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
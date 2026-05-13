"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShield, FiPhone, FiMail, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const router = useRouter();
  const lastUpdated = "13/05/2026";
  const version = "3.0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-white/20">
          <button onClick={() => router.back()} className="mb-4 w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-all">
            <FiArrowLeft className="text-zinc-700" size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>
              <FiShield className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-1.5">Chính sách bảo mật HUHA</h1>
            <p className="text-sm text-zinc-600">Phiên bản {version} | Cập nhật: {lastUpdated}</p>
          </div>

          <div className="space-y-5 text-sm text-zinc-700 max-h-[60vh] overflow-y-auto pr-2">
            <section>
              <h2 className="font-bold text-zinc-900 mb-2">1. Phạm vi áp dụng</h2>
              <p>Chính sách này mô tả cách HUHA thu thập, sử dụng, lưu trữ dữ liệu cá nhân khi dùng app. Tuân thủ Luật An ninh mạng 2018, Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân Việt Nam.</p>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">2. Dữ liệu thu thập</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border border-zinc-200 rounded-xl overflow-hidden">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr><th className="p-2 border-b">Loại</th><th className="p-2 border-b">Ví dụ</th><th className="p-2 border-b">Mục đích</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b"><td className="p-2">Định danh</td><td className="p-2">Tên, email, userId HUHAxxxxxx, avatar</td><td className="p-2">Tạo tài khoản</td></tr>
                    <tr className="border-b"><td className="p-2">Xác thực</td><td className="p-2">Mật khẩu hash, token Google</td><td className="p-2">Đăng nhập an toàn</td></tr>
                    <tr className="border-b"><td className="p-2">Hoạt động</td><td className="p-2">Thời gian online, lần cuối</td><td className="p-2">Hiển thị trạng thái</td></tr>
                    <tr><td className="p-2">Kỹ thuật</td><td className="p-2">IP, trình duyệt, OS</td><td className="p-2">Bảo mật</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2"><b>KHÔNG thu thập:</b> SĐT, CMND/CCCD, GPS, danh bạ, SMS.</p>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">3. Cơ sở pháp lý</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Thực hiện hợp đồng:</b> Cung cấp tính năng bạn đăng ký</li>
                <li><b>Đồng ý:</b> Gửi email xác thực</li>
                <li><b>Lợi ích hợp pháp:</b> Chống gian lận, bảo mật</li>
                <li><b>Tuân thủ pháp luật:</b> Lưu log 2 năm</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">4. Chia sẻ bên thứ ba</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Google Firebase:</b> Lưu trữ, xác thực. Server Singapore</li>
                <li><b>Vercel:</b> Hosting</li>
                <li><b>Cơ quan nhà nước:</b> Khi có yêu cầu hợp pháp</li>
                <li><b>KHÔNG bán dữ liệu</b></li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">5. Bảo mật</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Mã hóa TLS 1.3, AES-256</li>
                <li>Mật khẩu hash scrypt</li>
                <li>Rate limit 60s/lần</li>
                <li>Backup hàng ngày</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">6. Thời gian lưu trữ</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Hoạt động:</b> Đến khi xóa</li>
                <li><b>Sau xóa:</b> Ẩn ngay, xóa backup sau 30 ngày</li>
                <li><b>Log:</b> 2 năm</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 mb-2">7. Quyền của bạn</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><b>Truy cập:</b> Cài đặt {'>'} Hồ sơ</li>
                <li><b>Chỉnh sửa:</b> Sửa trực tiếp</li>
                <li><b>Xóa:</b> Cài đặt {'>'} Xóa tài khoản</li>
                <li><b>Khiếu nại:</b> Cục ATTT - Bộ TTTT</li>
              </ul>
            </section>

            <section className="bg-[#E8F1FF] border border-[#0042B2]/20 rounded-2xl p-4">
              <h2 className="font-bold text-zinc-900 mb-3 flex items-center gap-2"><FiUser size={18} style={{color:'#0042B2'}} />10. Liên hệ</h2>
              <div className="space-y-2">
                <p><b>Đơn vị:</b> HUHA Team</p>
                <p className="flex items-center gap-2"><FiPhone style={{color:'#0042B2'}} size={16} /><b>Hotline:</b> 0359872122</p>
                <p className="flex items-center gap-2"><FiMail style={{color:'#0042B2'}} size={16} /><b>Email:</b> support@huha.vn</p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh</p>
                <p className="text-xs text-zinc-600 mt-2">Phản hồi: 72h</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiFileText, FiPhone, FiMail, FiUser, FiAlertTriangle, FiBriefcase, FiAward } from "react-icons/fi";
import { motion } from "framer-motion";
import HuhaLogo from "@/components/brand/HuhaLogo";

export default function TermsPage() {
  const router = useRouter();
  const lastUpdated = "31/05/2026";
  const version = "3.0";

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-8 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl">
        <button
          onClick={() => router.back()}
          className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <FiArrowLeft size={20} />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8">
            <HuhaLogo />
          </div>

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] shadow-lg shadow-[#0A84FF]/25">
              <FiFileText className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Điều khoản sử dụng</h1>
            <p className="mt-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">
              Phiên bản {version} | Cập nhật: {lastUpdated}
            </p>
          </div>

          <div className="space-y-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <section className="rounded-2xl bg-[#0A84FF]/5 p-4 dark:bg-[#0A84FF]/10">
              <p className="text-zinc-800 dark:text-zinc-200">
                Chào mừng đến với Huha. Bằng việc tạo tài khoản và sử dụng dịch vụ, bạn đồng ý bị ràng buộc bởi Điều khoản này, Chính sách bảo mật và pháp luật Việt Nam.
              </p>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiBriefcase className="text-[#0A84FF]" /> 1. Giới thiệu & Chấp nhận
              </h2>
              <p>
                Huha là nền tảng kết nối công việc do <b>Nguyễn Quốc Mạnh</b> phát triển. Dịch vụ gồm: ứng dụng mobile, website huha.vn, API. 
                Khi bạn click "Tạo tài khoản" hoặc "Đăng nhập" là đã đọc, hiểu và chấp nhận toàn bộ điều khoản. Nếu không đồng ý, vui lòng ngừng sử dụng.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">2. Điều kiện sử dụng tài khoản</h2>
              <ul className="space-y-2">
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#0A84FF]" /><span>Bạn từ 13 tuổi trở lên, đủ năng lực hành vi dân sự theo Bộ luật Dân sự 2015</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#0A84FF]" /><span>Thông tin đăng ký chính xác. Email dùng để xác thực và khôi phục</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#0A84FF]" /><span>Mỗi cá nhân 01 tài khoản. Tài khoản trùng lặp, giả mạo sẽ bị khóa vĩnh viễn</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#0A84FF]" /><span>Bảo mật mật khẩu. Báo ngay cho DPO nếu nghi ngờ bị xâm phạm qua Manhgopatel5@gmail.com</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#0A84FF]" /><span>Huha có quyền từ chối, tạm khóa hoặc xóa tài khoản vi phạm mà không cần báo trước</span></li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">3. Quyền và Nghĩa vụ của bạn</h2>
              <div className="mb-3 rounded-xl bg-[#34C759]/10 p-3 dark:bg-[#34C759]/20">
                <div className="mb-1 font-black text-[#34C759]">BẠN ĐƯỢC QUYỀN:</div>
                <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
                  <li>• Sử dụng đầy đủ tính năng Huha miễn phí: tạo task, nhận việc, chat</li>
                  <li>• Đăng tải nội dung do bạn tạo, giữ bản quyền</li>
                  <li>• Yêu cầu xuất dữ liệu JSON hoặc xóa tài khoản bất kỳ lúc nào</li>
                </ul>
              </div>
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
                <div className="mb-1 font-black text-red-600 dark:text-red-400">BẠN CAM KẾT KHÔNG:</div>
                <ul className="space-y-1 text-red-700 dark:text-red-300">
                  <li>• Đăng nội dung vi phạm pháp luật VN: đồi trụy, bạo lực, cờ bạc, ma túy, vũ khí, thù địch, phân biệt đối xử</li>
                  <li>• Xâm phạm bản quyền, nhãn hiệu, bí mật kinh doanh của bên thứ ba</li>
                  <li>• Spam, lừa đảo, phishing, phát tán mã độc, tấn công DDOS</li>
                  <li>• Thu thập dữ liệu người khác bằng bot, crawl trái phép</li>
                  <li>• Mạo danh cá nhân/tổ chức. Lạm dụng tính năng báo cáo</li>
                  <li>• Dùng Huha cho mục đích thương mại khi chưa có văn bản cho phép</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">4. Nội dung & Sở hữu trí tuệ</h2>
              <p className="mb-2">
                <b>Bạn giữ bản quyền</b> với mọi nội dung bạn đăng: text, ảnh, video. Khi đăng lên Huha, bạn cấp cho chúng tôi giấy phép toàn cầu, miễn phí, không độc quyền để lưu trữ, hiển thị, phân phối nội dung đó nhằm vận hành dịch vụ.
              </p>
              <p>
                <b>Huha giữ bản quyền</b> với: mã nguồn, logo, thương hiệu "Huha", thiết kế UI/UX. Nghiêm cấm sao chép, dịch ngược, bán lại khi chưa được phép bằng văn bản.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">5. Dịch vụ trả phí & Hoàn tiền</h2>
              <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="mb-2"><b>Hiện tại:</b> Huha 100% miễn phí cho người dùng cá nhân.</p>
                <p><b>Tương lai:</b> Nếu ra mắt gói Huha Pro cho doanh nghiệp, chúng tôi sẽ cập nhật điều khoản thanh toán, chính sách hoàn tiền 7 ngày rõ ràng trước khi áp dụng. Bạn có quyền từ chối và tiếp tục dùng bản miễn phí.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiAlertTriangle className="text-[#0A84FF]" /> 6. Giới hạn trách nhiệm
              </h2>
              <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
                <p className="mb-2">Huha cung cấp dịch vụ "AS IS" - nguyên trạng. Trong phạm vi luật cho phép, chúng tôi <b>KHÔNG chịu trách nhiệm</b> cho:</p>
                <ul className="space-y-1">
                  <li>• Thiệt hại gián tiếp, ngẫu nhiên do gián đoạn dịch vụ</li>
                  <li>• Mất dữ liệu do lỗi người dùng: xóa nhầm, quên mật khẩu</li>
                  <li>• Tranh chấp giữa người dùng với nhau</li>
                  <li>• Nội dung do người dùng đăng tải</li>
                </ul>
                <p className="mt-2 text-xs text-zinc-500">Trách nhiệm tối đa của Huha không vượt quá số tiền bạn đã trả trong 12 tháng gần nhất.</p>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">7. Chấm dứt dịch vụ</h2>
              <ul className="space-y-1.5">
                <li><b>Bạn:</b> Vào Cài đặt → Xóa tài khoản. Dữ liệu ẩn ngay, xóa backup sau 30 ngày</li>
                <li><b>Huha:</b> Có thể khóa tạm thời nếu nghi ngờ vi phạm. Xóa vĩnh viễn nếu vi phạm nghiêm trọng Điều 3</li>
                <li><b>Hậu quả:</b> Mất quyền truy cập, dữ liệu không khôi phục được sau 30 ngày</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiAward className="text-[#0A84FF]" /> 8. Luật áp dụng & Giải quyết tranh chấp
              </h2>
              <p>
                Điều khoản này điều chỉnh bởi <b>pháp luật Việt Nam</b>. Mọi tranh chấp ưu tiên giải quyết qua thương lượng. 
                Nếu không đạt thỏa thuận, tranh chấp sẽ đưa ra <b>Tòa án nhân dân TP. Hồ Chí Minh</b> giải quyết.
              </p>
            </section>

            <section className="rounded-2xl border-2 border-[#0A84FF]/20 bg-[#0A84FF]/5 p-4 dark:bg-[#0A84FF]/10">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiUser size={18} className="text-[#0A84FF]" />
                9. Thông tin Nhà phát hành
              </h2>
              <div className="space-y-2.5 text-zinc-800 dark:text-zinc-200">
                <p><b>Đơn vị:</b> Cá nhân - Nguyễn Quốc Mạnh</p>
                <p><b>Thương hiệu:</b> Huha</p>
                <p className="flex items-center gap-2"><FiPhone className="text-[#0A84FF]" size={16} /><b>Hotline:</b> 0359872122 (8h-22h)</p>
                <p className="flex items-center gap-2"><FiMail className="text-[#0A84FF]" size={16} /><b>Email:</b> Manhgopatel5@gmail.com</p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
                <div className="mt-3 rounded-lg bg-white/60 p-2 text-xs dark:bg-zinc-900/60">
                  <b>Hỗ trợ:</b> Phản hồi trong 24h làm việc. Khiếu nại xử lý 72h theo NĐ 13/2023.
                </div>
              </div>
            </section>

            <section className="text-xs text-zinc-500 dark:text-zinc-500">
              <p><b>Thay đổi điều khoản:</b> Khi cập nhật, Huha thông báo qua email + banner in-app 30 ngày trước khi áp dụng. Tiếp tục sử dụng sau ngày hiệu lực = chấp nhận điều khoản mới.</p>
              <p className="mt-2"><b>Hiệu lực:</b> Từ {lastUpdated}. Thay thế mọi phiên bản trước đó.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
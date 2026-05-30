"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShield, FiPhone, FiMail, FiUser, FiLock, FiGlobe, FiDatabase } from "react-icons/fi";
import { motion } from "framer-motion";
import HuhaLogo from "@/components/brand/HuhaLogo";

export default function PrivacyPage() {
  const router = useRouter();
  const lastUpdated = "31/05/2026";
  const version = "3.0";

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-8 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl bg-white shadow-xl dark:bg-zinc-900"
        >
          <div className="sticky top-0 z-10 rounded-t-3xl bg-white/80 px-6 pb-4 pt-5 backdrop-blur-xl dark:bg-zinc-900/80">
            <button
              onClick={() => router.back()}
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <FiArrowLeft size={20} />
            </button>

            <div className="mb-4">
              <HuhaLogo />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] shadow-lg shadow-[#0A84FF]/25">
                <FiShield className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Chính sách bảo mật</h1>
              <p className="mt-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">
                Phiên bản {version} | Cập nhật: {lastUpdated}
              </p>
            </div>
          </div>

          <div className="space-y-6 px-6 pb-8 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <section className="rounded-2xl bg-[#0A84FF]/5 p-4 dark:bg-[#0A84FF]/10">
              <p className="text-zinc-800 dark:text-zinc-200">
                Huha cam kết bảo vệ dữ liệu cá nhân của bạn. Chính sách này tuân thủ Nghị định 13/2023/NĐ-CP của Việt Nam và GDPR của EU.
              </p>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiGlobe className="text-[#0A84FF]" /> 1. Phạm vi áp dụng
              </h2>
              <p>
                Chính sách áp dụng cho toàn bộ dịch vụ Huha: ứng dụng mobile, website huha.vn, API và các dịch vụ liên quan. 
                Khi bạn tạo tài khoản là đã đồng ý với chính sách này.
              </p>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiDatabase className="text-[#0A84FF]" /> 2. Dữ liệu chúng tôi thu thập
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="p-3 text-xs font-black uppercase text-zinc-500">Loại dữ liệu</th>
                      <th className="p-3 text-xs font-black uppercase text-zinc-500">Ví dụ</th>
                      <th className="p-3 text-xs font-black uppercase text-zinc-500">Cơ sở pháp lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tr>
                      <td className="p-3 font-bold">Định danh</td>
                      <td className="p-3">Tên, email, userId HUxxxxx, avatar</td>
                      <td className="p-3">Thực hiện hợp đồng</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Xác thực</td>
                      <td className="p-3">Mật khẩu hash scrypt, token Google, JWT</td>
                      <td className="p-3">Lợi ích hợp pháp: bảo mật</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Hoạt động</td>
                      <td className="p-3">Task đã tạo, lần cuối online, IP login</td>
                      <td className="p-3">Lợi ích hợp pháp: chống spam</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Kỹ thuật</td>
                      <td className="p-3">Device ID, OS, trình duyệt, timezone</td>
                      <td className="p-3">Tuân thủ pháp luật: log 2 năm</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Thanh toán</td>
                      <td className="p-3">Mã giao dịch, không lưu số thẻ</td>
                      <td className="p-3">Thực hiện hợp đồng</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <b>KHÔNG thu thập:</b> CMND/CCCD, số điện thoại, vị trí GPS chính xác, danh bạ, SMS, ảnh/video trong máy, sinh trắc học.
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">3. Mục đích sử dụng</h2>
              <ul className="space-y-2">
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#34C759]" /><span><b>Cung cấp dịch vụ:</b> Đăng nhập, tạo task, sync đa thiết bị, thông báo</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#34C759]" /><span><b>Bảo mật:</b> Phát hiện đăng nhập lạ, chống DDOS, rate limit 60s/email</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#34C759]" /><span><b>Cải thiện sản phẩm:</b> Phân tích ẩn danh để tối ưu UX, không định danh cá nhân</span></li>
                <li className="flex gap-2"><span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[#34C759]" /><span><b>Pháp lý:</b> Lưu log theo NĐ 72/2013, cung cấp cho cơ quan nhà nước khi có lệnh</span></li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">4. Chia sẻ dữ liệu</h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-black text-zinc-900 dark:text-white">Google Firebase (Singapore)</div>
                  <div className="text-xs text-zinc-500">Lưu trữ, xác thực, push notification. Tuân thủ GDPR, ISO 27001, SOC 2.</div>
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-black text-zinc-900 dark:text-white">Vercel (Mỹ/EU)</div>
                  <div className="text-xs text-zinc-500">Hosting website. DPA ký theo SCC của EU.</div>
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="font-black text-zinc-900 dark:text-white">Cơ quan nhà nước</div>
                  <div className="text-xs text-zinc-500">Chỉ khi có văn bản hợp pháp từ Bộ TTTT, Bộ Công an.</div>
                </div>
                <div className="rounded-xl bg-[#34C759]/10 p-3 text-[#34C759] dark:bg-[#34C759]/20">
                  <b>CAM KẾT:</b> Không bán, không cho thuê, không chia sẻ dữ liệu cho bên quảng cáo. Không dùng Facebook Pixel, Google Analytics.
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiLock className="text-[#0A84FF]" /> 5. Bảo mật kỹ thuật
              </h2>
              <ul className="space-y-1.5">
                <li>• Mã hóa TLS 1.3 + HSTS khi truyền, AES-256-GCM khi lưu</li>
                <li>• Mật khẩu hash scrypt N=16384, r=8, p=1. Không thể giải ngược</li>
                <li>• 2FA tùy chọn qua TOTP. Session JWT hết hạn 7 ngày</li>
                <li>• Rate limit: 3 lần sai/30s khóa tạm, 60s/gửi mail</li>
                <li>• Backup mã hóa hàng ngày tại Singapore, RPO 24h, RTO 4h</li>
                <li>• Pentest định kỳ 6 tháng, bug bounty qua email DPO</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">6. Thời gian lưu trữ</h2>
              <div className="space-y-2">
                <div className="flex justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                  <span>Tài khoản hoạt động</span>
                  <span className="font-black">Đến khi bạn xóa</span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                  <span>Sau khi xóa tài khoản</span>
                  <span className="font-black">Ẩn ngay, xóa backup sau 30 ngày</span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                  <span>Log bảo mật</span>
                  <span className="font-black">2 năm theo NĐ 72/2013</span>
                </div>
                <div className="flex justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                  <span>Tài khoản không hoạt động</span>
                  <span className="font-black">2 năm → mail nhắc → xóa sau 30 ngày</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">7. Quyền của bạn theo NĐ 13/2023</h2>
              <div className="grid gap-2">
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <b>Quyền truy cập & sao chép:</b> Vào Cài đặt → Xuất dữ liệu để tải file JSON
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <b>Quyền chỉnh sửa:</b> Sửa tên, avatar trực tiếp trong app
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <b>Quyền xóa:</b> Cài đặt → Xóa tài khoản. Hoặc mail DPO, xử lý 72h
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <b>Quyền hạn chế xử lý:</b> Tắt "Cho phép phân tích ẩn danh" trong Cài đặt
                </div>
                <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <b>Quyền khiếu nại:</b> Gửi Cục An toàn thông tin - Bộ TTTT nếu Huha vi phạm
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">8. Cookie & LocalStorage</h2>
              <p>Huha chỉ dùng:</p>
              <ul className="mt-1 space-y-1">
                <li>• <b>Cookie bắt buộc:</b> `session` để duy trì đăng nhập. Không có cookie quảng cáo</li>
                <li>• <b>LocalStorage:</b> `last_email`, `theme`, `remember` để UX mượt hơn</li>
                <li>• <b>Không dùng:</b> Google Analytics, Facebook Pixel, TikTok Pixel</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">9. Chuyển dữ liệu quốc tế</h2>
              <p>
                Server chính đặt tại Singapore (Firebase). Khi bạn truy cập từ VN, dữ liệu đi qua đường truyền quốc tế được mã hóa. 
                Chúng tôi ký SCC với Google theo quyết định của Ủy ban EU, đảm bảo mức bảo vệ tương đương GDPR.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-black text-zinc-900 dark:text-white">10. Trẻ em</h2>
              <p>
                Huha dành cho người từ 13 tuổi theo COPPA và luật VN. Chúng tôi không cố ý thu thập dữ liệu trẻ dưới 13. 
                Nếu phụ huynh phát hiện, mail DPO để xóa ngay trong 24h.
              </p>
            </section>

            <section className="rounded-2xl border-2 border-[#0A84FF]/20 bg-[#0A84FF]/5 p-4 dark:bg-[#0A84FF]/10">
              <h2 className="mb-3 flex items-center gap-2 text-base font-black text-zinc-900 dark:text-white">
                <FiUser size={18} className="text-[#0A84FF]" />
                11. Liên hệ DPO - Kiểm soát viên dữ liệu
              </h2>
              <div className="space-y-2.5 text-zinc-800 dark:text-zinc-200">
                <p><b>Đơn vị kiểm soát:</b> Nguyễn Quốc Mạnh - Huha</p>
                <p className="flex items-center gap-2"><FiPhone className="text-[#0A84FF]" size={16} /><b>Hotline:</b> 0359872122 (8h-22h)</p>
                <p className="flex items-center gap-2"><FiMail className="text-[#0A84FF]" size={16} /><b>Email DPO:</b> Manhgopatel5@gmail.com</p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
                <div className="mt-3 rounded-lg bg-white/60 p-2 text-xs dark:bg-zinc-900/60">
                  <b>Thời gian phản hồi:</b> 72h làm việc cho yêu cầu xóa/sửa. 30 ngày cho yêu cầu phức tạp theo NĐ 13.
                </div>
              </div>
            </section>

            <section className="text-xs text-zinc-500 dark:text-zinc-500">
              <p><b>Thay đổi chính sách:</b> Khi cập nhật, chúng tôi thông báo qua email + banner trong app 30 ngày trước khi áp dụng. Tiếp tục dùng Huha = đồng ý phiên bản mới.</p>
              <p className="mt-2"><b>Hiệu lực:</b> Từ {lastUpdated}. Thay thế mọi phiên bản trước.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
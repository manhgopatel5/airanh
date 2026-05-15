"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiShield, FiPhone, FiMail, FiUser, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function PrivacyPage() {
  const router = useRouter();
  const lastUpdated = "13/05/2026";
  const version = "3.0";

  const sections = [
    { title: "1. Phạm vi áp dụng", content: "Chính sách này mô tả cách HUHA thu thập, sử dụng, lưu trữ dữ liệu cá nhân khi dùng app. Tuân thủ Luật An ninh mạng 2018, Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân Việt Nam." },
    { title: "2. Dữ liệu thu thập", content: null },
    { title: "3. Cơ sở pháp lý", list: ["Thực hiện hợp đồng: Cung cấp tính năng bạn đăng ký", "Đồng ý: Gửi email xác thực", "Lợi ích hợp pháp: Chống gian lận, bảo mật", "Tuân thủ pháp luật: Lưu log 2 năm"] },
    { title: "4. Chia sẻ bên thứ ba", list: ["Google Firebase: Lưu trữ, xác thực. Server Singapore", "Vercel: Hosting", "Cơ quan nhà nước: Khi có yêu cầu hợp pháp", "KHÔNG bán dữ liệu"] },
    { title: "5. Bảo mật", list: ["Mã hóa TLS 1.3, AES-256", "Mật khẩu hash scrypt", "Rate limit 60s/lần", "Backup hàng ngày"] },
    { title: "6. Thời gian lưu trữ", list: ["Hoạt động: Đến khi xóa", "Sau xóa: Ẩn ngay, xóa backup sau 30 ngày", "Log: 2 năm"] },
    { title: "7. Quyền của bạn", list: ["Truy cập: Cài đặt > Hồ sơ", "Chỉnh sửa: Sửa trực tiếp", "Xóa: Cài đặt > Xóa tài khoản", "Khiếu nại: Cục ATTT - Bộ TTTT"] },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-lg font-black tracking-tight">Chính sách bảo mật</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-xl shadow-[#0042B2]/25">
            <FiShield className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-1">HUHA Privacy</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Phiên bản {version} • Cập nhật {lastUpdated}</p>
        </motion.div>

        {/* Content */}
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
              <h3 className="font-bold text-base mb-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#E8F1FF] dark:bg-[#0042B2]/20 text-[#0042B2] flex items-center justify-center text-xs font-black">{idx + 1}</span>
                {section.title.split('. ')[1]}
              </h3>

              {section.title.includes("Dữ liệu")? (
                <>
                  <div className="overflow-hidden rounded-2xl border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900">
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="text-left p-3 font-semibold">Loại</th>
                          <th className="text-left p-3 font-semibold">Ví dụ</th>
                          <th className="text-left p-3 font-semibold">Mục đích</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {[
                          ["Định danh", "Tên, email, userId", "Tạo tài khoản"],
                          ["Xác thực", "Mật khẩu hash", "Đăng nhập"],
                          ["Hoạt động", "Thời gian online", "Trạng thái"],
                          ["Kỹ thuật", "IP, trình duyệt", "Bảo mật"],
                        ].map((row) => (
                          <tr key={row[0]} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-3 font-medium">{row[0]}</td>
                            <td className="p-3 text-zinc-600 dark:text-zinc-400">{row[1]}</td>
                            <td className="p-3 text-zinc-600 dark:text-zinc-400">{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">KHÔNG thu thập: SĐT, CCCD, GPS, danh bạ</p>
                </>
              ) : section.content? (
                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{section.content}</p>
              ) : (
                <ul className="space-y-2">
                  {section.list?.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0042B2] mt-1.5 flex-shrink-0" />
                      <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          ))}

          {/* Contact */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-[#E8F1FF] to-[#D6E8FF] dark:from-[#0042B2]/20 dark:to-[#1A5FFF]/20 rounded-3xl border-[#0042B2]/20 p-5 shadow-sm">
            <h3 className="font-black text-base mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0042B2] flex items-center justify-center">
                <FiUser className="w-4 h-4 text-white" />
              </div>
              Liên hệ
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: FiShield, label: "Đơn vị", value: "HUHA Team" },
                { icon: FiPhone, label: "Hotline", value: "0359872122", action: () => window.open("tel:0359872122") },
                { icon: FiMail, label: "Email", value: "support@huha.vn", action: () => window.open("mailto:support@huha.vn") },
              ].map((item) => (
                <button key={item.label} onClick={item.action} className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors group">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-[#0042B2]" />
                    <div className="text-left">
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  </div>
                  {item.action && <FiChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-zinc-600 dark:text-zinc-400 mt-3">Phản hồi trong 72h • TP. Hồ Chí Minh</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
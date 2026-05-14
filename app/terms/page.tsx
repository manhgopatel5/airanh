"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPhone, FiMail, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import plan from "@/public/lotties/huha-task.json";

export default function TermsPage() {
  const router = useRouter();
  const lastUpdated = "27/04/2026";
  const version = "2.1";

  return (
    <div className="h-dvh bg-gradient-to-br from-[#0042B2] via-[#1A5FFF] to-[#0066FF] flex items-center justify-center px-4 py-8 overflow-y-auto">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOFMwIDguMDYgMCAxOGMwIDkuOTQgOC4wNiAxOCAxOCAxOHM5LjM4LTMuNTcgMTItOS4xOGMxLjU1LTIuNzYgMy40OC01LjE4IDUuNjgtNy4xOEwzNiAxOHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAzIi8+PC9nPjwvc3ZnPg==')] opacity-30" />

      <div className="w-full max-w-2xl my-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, type: "spring", damping: 22 }}
          className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 border border-white/20"
        >
          <button
            onClick={() => {
              if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(5);
              router.back();
            }}
            className="mb-4 w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            aria-label="Quay lại"
          >
            <FiArrowLeft className="text-zinc-700 dark:text-zinc-300" size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-3xl blur-xl opacity-40" />
              <div className="relative w-full h-full bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-3xl flex items-center justify-center shadow-xl">
                <LottiePlayer
                  animationData={plan}
                  loop
                  autoplay
                  className="w-11 h-11"
                  aria-label="Điều khoản"
                  pauseWhenHidden={false}
                />
              </div>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white mb-1.5 tracking-tight">
              Điều khoản sử dụng HUHA
            </h1>
            <p className="text-sm text-zinc-500">
              Phiên bản {version} | Cập nhật: {lastUpdated}
            </p>
          </div>

          <div className="space-y-5 text-sm text-zinc-700 dark:text-zinc-300 max-h- overflow-y-auto pr-2 custom-scrollbar">
            <section>
              <h2 className="font-bold text-zinc-900 dark:text-white mb-2 text-base">1. Giới thiệu</h2>
              <p className="leading-relaxed">
                HUHA là ứng dụng mạng xã hội do <b className="text-[#0042B2]">Nguyễn Quốc Mạnh</b> phát triển và vận hành. Bằng việc tạo tài khoản và sử dụng HUHA, bạn đồng ý bị ràng buộc bởi Điều khoản này và Chính sách bảo mật.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 dark:text-white mb-2 text-base">2. Điều kiện tài khoản</h2>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
                <li>Bạn phải từ 13 tuổi trở lên, đủ năng lực hành vi dân sự theo pháp luật Việt Nam.</li>
                <li>Thông tin đăng ký phải chính xác. Email dùng để xác thực và khôi phục tài khoản.</li>
                <li>Mỗi cá nhân chỉ sở hữu 01 tài khoản. Tài khoản trùng lặp, giả mạo sẽ bị vô hiệu hóa.</li>
                <li>Bạn chịu hoàn toàn trách nhiệm bảo mật mật khẩu.</li>
                <li>Chúng tôi có quyền tạm khóa hoặc xóa vĩnh viễn tài khoản vi phạm.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 dark:text-white mb-2 text-base">3. Quyền và nghĩa vụ</h2>
              <p className="mb-2 font-semibold">Bạn được quyền:</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                <li>Sử dụng đầy đủ tính năng của HUHA miễn phí.</li>
                <li>Đăng tải, chia sẻ nội dung do bạn tạo ra.</li>
                <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân.</li>
              </ul>
              <p className="mb-2 font-semibold">Bạn cam kết KHÔNG:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Đăng tải nội dung vi phạm pháp luật VN.</li>
                <li>Xâm phạm bản quyền, spam, lừa đảo.</li>
                <li>Mạo danh cá nhân, tổ chức.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-zinc-900 dark:text-white mb-2 text-base">4. Quyền sở hữu trí tuệ</h2>
              <p className="leading-relaxed">
                Bạn giữ toàn bộ quyền với nội dung bạn đăng. Mã nguồn, logo, thương hiệu "HUHA" thuộc sở hữu của Nguyễn Quốc Mạnh.
              </p>
            </section>

            <section className="bg-[#0042B2]/5 dark:bg-[#0042B2]/10 border border-[#0042B2]/20 rounded-3xl p-5">
              <h2 className="font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2 text-base">
                <FiUser size={18} className="text-[#0042B2]" />
                9. Thông tin Nhà phát hành
              </h2>
              <div className="space-y-2.5">
                <p><b>Đơn vị:</b> Cá nhân</p>
                <p><b>Họ tên:</b> Nguyễn Quốc Mạnh</p>
                <p className="flex items-center gap-2">
                  <FiPhone className="text-[#0042B2]" size={16} />
                  <b>Hotline:</b> 0359872122
                </p>
                <p className="flex items-center gap-2">
                  <FiMail className="text-[#0042B2]" size={16} />
                  <b>Email:</b> Manhgopatel5@gmail.com
                </p>
                <p><b>Địa chỉ:</b> TP. Hồ Chí Minh, Việt Nam</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
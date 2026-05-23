"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";
import { useState, useMemo } from "react";
import { ChevronLeft, Mail, MessageSquare, Phone, FileText, AlertCircle, ChevronRight, HelpCircle, Search, Send, Copy, Check } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function HelpPage() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  const accentGradient = isPlan
 ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";

  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const handleContact = (type: "email" | "phone" | "chat") => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    if (type === "email") window.open("mailto:manhgopatel5@gmail.com?subject=Hỗ trợ Airanh", "_blank");
    if (type === "phone") window.open("tel:0359872122", "_blank");
    if (type === "chat") toast.info("Tính năng chat trực tiếp sắp ra mắt");
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("manhgopatel5@gmail.com");
    setCopied(true);
    toast.success("Đã sao chép email");
    setTimeout(() => setCopied(false), 2000);
  };

  const faqs = [
    {
      q: "Làm sao đổi mật khẩu?",
      a: "Vào Cài đặt → Đổi mật khẩu. Cần nhập mật khẩu cũ để xác nhận. Nếu quên mật khẩu, dùng 'Quên mật khẩu' ở màn đăng nhập.",
    },
    {
      q: "Quên mật khẩu phải làm sao?",
      a: "Tại màn đăng nhập, bấm 'Quên mật khẩu'. Nhập email, check hộp thư và làm theo link đặt lại mật khẩu. Link có hiệu lực 15 phút.",
    },
    {
      q: "Xóa tài khoản có khôi phục được không?",
      a: "Không. Sau khi xác nhận xóa, toàn bộ dữ liệu task, plan, tin nhắn sẽ bị xóa vĩnh viễn sau 30 ngày và không thể khôi phục.",
    },
    {
      q: "Airanh có thu phí không?",
      a: "Hiện tại Airanh miễn phí 100% cho tất cả tính năng. Gói Pro với AI nâng cao, dung lượng 50GB sẽ ra mắt Q2/2027.",
    },
    {
      q: "Làm sao mời bạn vào Plan?",
      a: "Mở Plan → bấm icon Share → Gửi link hoặc mã QR. Người được mời cần có tài khoản Airanh để tham gia.",
    },
    {
      q: "Task đã xóa có lấy lại được không?",
      a: "Có. Vào Cài đặt → Thùng rác → Khôi phục. Task bị xóa sau 30 ngày sẽ mất vĩnh viễn.",
    },
    {
      q: "Đồng bộ dữ liệu giữa điện thoại và web?",
      a: "Có. Airanh đồng bộ realtime qua Firebase. Chỉ cần đăng nhập cùng tài khoản trên mọi thiết bị.",
    },
    {
      q: "Bị mất kết nối có dùng được không?",
      a: "Airanh hỗ trợ offline mode. Bạn vẫn tạo/sửa task được. Dữ liệu sẽ tự sync khi có mạng lại.",
    },
    {
      q: "Làm sao báo cáo người dùng xấu?",
      a: "Vào Profile người đó → bấm ⋯ → Báo cáo. Hoặc gửi email với ID người dùng về support@air.vn.",
    },
    {
      q: "Dữ liệu của tôi có an toàn không?",
      a: "Có. Airanh mã hóa end-to-end, lưu trên server Firebase đạt chuẩn ISO 27001. Xem Chính sách bảo mật để biết chi tiết.",
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(f =>
      f.q.toLowerCase().includes(query) ||
      f.a.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button onClick={() => router.back()} className="absolute left-4 p-1 active:opacity-60 transition">
            <ChevronLeft className="w-6 h-6 text-[#0F172A] dark:text-white" />
          </button>
          <h1 className="text-lg font-bold text-[#0F172A] dark:text-white">Trung tâm hỗ trợ</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-7">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] dark:from-zinc-900 dark:to-zinc-900/50 rounded-3xl p-6 border border-gray-100 dark:border-zinc-800">
          <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-2 text-center">
            Cần giúp đỡ?
          </h2>
          <p className="text-base text-[#64748B] dark:text-zinc-400 leading-relaxed mb-4 text-center">
            Đội ngũ Airanh phản hồi trong vòng 24h. Chọn kênh phù hợp với bạn.
          </p>
          <button
            onClick={() => handleContact("email")}
            className={`w-full h-12 bg-gradient-to-r ${accentGradient} text-white rounded-2xl font-semibold active:scale-95 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20`}
          >
            <Send className="w-5 h-5" />
            Gửi email ngay
          </button>
        </div>

        {/* Liên hệ nhanh */}
        <Section title="LIÊN HỆ TRỰC TIẾP">
          <SettingItem
            label="Email hỗ trợ"
            subtitle="manhgopatel5@gmail.com"
            icon={Mail}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            rightIcon={copied? Check : Copy}
            onClick={copyEmail}
          />
          <SettingItem
            label="Hotline"
            subtitle="035 987 2122 · 8:00 - 22:00"
            icon={Phone}
            iconColor="text-green-500"
            iconBg="bg-green-50 dark:bg-green-950/30"
            onClick={() => handleContact("phone")}
          />
          <SettingItem
            label="Chat trực tiếp"
            subtitle="Sắp ra mắt Q2/2027"
            icon={MessageSquare}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-950/30"
            onClick={() => handleContact("chat")}
            disabled
          />
        </Section>

        {/* Tài liệu - Đẩy lên trên FAQ */}
        <Section title="TÀI LIỆU & PHÁP LÝ">
          <SettingItem
            label="Điều khoản dịch vụ"
            subtitle="Cập nhật 28/04/2026"
            icon={FileText}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            onClick={() => router.push("/terms")}
          />
          <SettingItem
            label="Chính sách bảo mật"
            subtitle="Cập nhật 28/04/2026"
            icon={FileText}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            onClick={() => router.push("/privacy")}
          />
          <SettingItem
            label="Báo cáo sự cố"
            subtitle="Gửi log và ảnh chụp màn hình"
            icon={AlertCircle}
            iconColor="text-red-500"
            iconBg="bg-red-50 dark:bg-red-950/30"
            onClick={() => window.open("mailto:manhgopatel5@gmail.com?subject=Báo cáo sự cố Airanh&body=Mô tả lỗi:%0A%0ACác bước tái hiện:%0A%0AThiết bị:%0A", "_blank")}
          />
        </Section>

        {/* FAQ */}
        <Section title="CÂU HỎI THƯỜNG GẶP">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Tìm câu hỏi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 outline-none text-base text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-zinc-500 focus:border-blue-500 transition"
              />
            </div>
          </div>
          {filteredFaqs.length > 0? (
            filteredFaqs.map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <HelpCircle className="w-12 h-12 text-[#CBD5E1] dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-base text-[#64748B] dark:text-zinc-500">Không tìm thấy câu hỏi phù hợp</p>
            </div>
          )}
        </Section>

        {/* Footer */}
        <div className="pt-2 pb-8">
          <div className="flex flex-col items-center gap-2 text-[#94A3B8] dark:text-zinc-600">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="text-base font-medium">Airanh v1.0.0 · Build 2026.04.28</span>
            </div>
            <p className="text-base">Made with ❤️ in Vietnam</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text- font-bold text-[#64748B] dark:text-zinc-400 tracking-wider mb-2 px-1">{title}</div>
      <div className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}

function SettingItem({
  label,
  subtitle,
  icon: Icon,
  iconColor = "text-[#0F172A]",
  iconBg = "bg-[#F1F5F9] dark:bg-zinc-800",
  rightIcon,
  onClick,
  disabled,
}: {
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  rightIcon?: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const RightIcon = rightIcon || ChevronRight;

  return (
    <button
      onClick={() => {
        if (disabled) return;
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white dark:active:bg-zinc-800 transition border-b border-gray-100 dark:border-zinc-800 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-base font-semibold text-[#0F172A] dark:text-white">{label}</div>
        {subtitle && <div className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">{subtitle}</div>}
      </div>
      <RightIcon className="w-5 h-5 text-[#CBD5E1] dark:text-zinc-600 flex-shrink-0" />
    </button>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3.5 active:bg-white dark:active:bg-zinc-800 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <span className="text-base font-semibold text-[#0F172A] dark:text-white">{question}</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-[#CBD5E1] dark:text-zinc-600 transition flex-shrink-0 mt-0.5 ${open? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3.5">
          <p className="text-base text-[#64748B] dark:text-zinc-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
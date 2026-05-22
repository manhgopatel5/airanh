"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";
import { ChevronLeft, Mail, MessageSquare, Phone, FileText, ExternalLink, AlertCircle, ChevronRight, HelpCircle } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function HelpPage() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  const accentGradient = isPlan
  ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";

  const handleContact = (type: "email" | "phone" | "chat") => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    if (type === "email") window.open("mailto:support@air.vn?subject=Hỗ trợ Airanh", "_blank");
    if (type === "phone") window.open("tel:0359872122", "_blank");
    if (type === "chat") toast.info("Tính năng chat trực tiếp sắp ra mắt");
  };

  const faqs = [
    {
      q: "Làm sao đổi mật khẩu?",
      a: "Vào Cài đặt → Đổi mật khẩu. Cần nhập mật khẩu cũ để xác nhận.",
    },
    {
      q: "Quên mật khẩu phải làm sao?",
      a: "Tại màn đăng nhập, bấm 'Quên mật khẩu' và làm theo hướng dẫn gửi về email.",
    },
    {
      q: "Xóa tài khoản có khôi phục được không?",
      a: "Không. Sau khi xóa, toàn bộ dữ liệu sẽ bị xóa vĩnh viễn sau 30 ngày.",
    },
    {
      q: "Airanh có thu phí không?",
      a: "Hiện tại Airanh miễn phí 100%. Các tính năng Pro sẽ ra mắt sau.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-800">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button onClick={() => router.back()} className="absolute left-4 p-1 active:opacity-60 transition">
            <ChevronLeft className="w-6 h-6 text-[#0F172A] dark:text-white" />
          </button>
          <h1 className="text- font-bold text-[#0F172A] dark:text-white">Hỗ trợ</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-7">
        {/* Hero Card */}
        <div className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl p-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentGradient} flex items-center justify-center mb-4`}>
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white mb-2">
            Chúng tôi luôn sẵn sàng
          </h2>
          <p className="text- text-[#64748B] dark:text-zinc-400 leading-relaxed">
            Gặp vấn đề? Liên hệ đội ngũ Airanh qua các kênh bên dưới. Phản hồi trong vòng 24h.
          </p>
        </div>

        {/* Liên hệ nhanh */}
        <Section title="LIÊN HỆ NHANH">
          <SettingItem
            label="Gửi email"
            subtitle="support@air.vn"
            icon={Mail}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-950/30"
            onClick={() => handleContact("email")}
          />
          <SettingItem
            label="Gọi hotline"
            subtitle="035 987 2122 - 8:00 đến 22:00"
            icon={Phone}
            iconColor="text-green-500"
            iconBg="bg-green-50 dark:bg-green-950/30"
            onClick={() => handleContact("phone")}
          />
          <SettingItem
            label="Chat trực tiếp"
            subtitle="Sắp ra mắt"
            icon={MessageSquare}
            iconColor="text-purple-500"
            iconBg="bg-purple-50 dark:bg-purple-950/30"
            onClick={() => handleContact("chat")}
          />
        </Section>

        {/* FAQ */}
        <Section title="CÂU HỎI THƯỜNG GẶP">
          {faqs.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </Section>

        {/* Tài liệu */}
        <Section title="TÀI LIỆU">
          <SettingItem
            label="Điều khoản dịch vụ"
            icon={FileText}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            onClick={() => router.push("/terms")}
          />
          <SettingItem
            label="Chính sách bảo mật"
            icon={FileText}
            iconColor="text-gray-500"
            iconBg="bg-gray-50 dark:bg-zinc-800"
            onClick={() => router.push("/privacy")}
          />
          <SettingItem
            label="Báo cáo sự cố"
            icon={AlertCircle}
            iconColor="text-red-500"
            iconBg="bg-red-50 dark:bg-red-950/30"
            onClick={() => window.open("mailto:support@air.vn?subject=Báo cáo sự cố", "_blank")}
          />
        </Section>

        {/* Phiên bản */}
        <div className="pt-4 pb-8">
          <div className="flex items-center justify-center gap-2 text-[#94A3B8] dark:text-zinc-600">
            <HelpCircle className="w-4 h-4" />
            <span className="text- font-medium">Airanh v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text- font-bold text-[#64748B] dark:text-zinc-400 tracking-wider mb-1">{title}</div>
      <div className="bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl overflow-hidden">
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
  onClick,
}: {
  label: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white dark:active:bg-zinc-800 transition border-b border-gray-100 dark:border-zinc-800 last:border-0"
    >
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text- font-semibold text-[#0F172A] dark:text-white">{label}</div>
        {subtitle && <div className="text- text-[#64748B] dark:text-zinc-400 mt-0.5">{subtitle}</div>}
      </div>
      <ChevronRight className="w-5 h-5 text-[#CBD5E1] dark:text-zinc-600 flex-shrink-0" />
    </button>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white dark:active:bg-zinc-800 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="text- font-semibold text-[#0F172A] dark:text-white">{question}</div>
        </div>
        <ChevronRight className={`w-5 h-5 text-[#CBD5E1] dark:text-zinc-600 transition flex-shrink-0 ${open? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3.5 pl-4">
          <p className="text- text-[#64748B] dark:text-zinc-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
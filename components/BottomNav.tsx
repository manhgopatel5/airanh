"use client";
import { useRouter, usePathname } from "next/navigation";
import { FiMessageSquare, FiClipboard, FiUser, FiClock, FiDollarSign, FiUsers } from "react-icons/fi";
import { HiHome, HiPlus, HiBolt } from "react-icons/hi2";
import { LuCalendarDays } from "react-icons/lu";
import { useEffect, useTransition, useCallback, useState } from "react";
import { useAppStore } from "@/store/app";

const COLORS = {
  task: {
    from: "from-[#0A84FF]",
    to: "to-[#0057D9]",
    solid: "bg-[#0A84FF]",
    light: "bg-[#EAF4FF]",
    text: "text-[#0A84FF]",
    ring: "ring-[#0A84FF]/20",
    chip: "bg-[#EAF4FF] text-[#0057D9]",
  },
  plan: {
    from: "from-[#10B981]",
    to: "to-[#059669]",
    solid: "bg-[#10B981]",
    light: "bg-[#E6F7F0]",
    text: "text-[#10B981]",
    ring: "ring-[#10B981]/20",
    chip: "bg-[#E6F7F0] text-[#047857]",
  },
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  const theme = isPlan? COLORS.plan : COLORS.task;

  useEffect(() => {
    ["/", "/messages", "/tasks", "/profile", "/create/task", "/create/plan"].forEach(p => router.prefetch(p));
  }, [router]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", esc); };
  }, [open]);

  const go = useCallback((path: string) => {
    if (pathname === path) return;
    navigator.vibrate?.(8);
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const choose = (type: "task" | "plan") => {
    setOpen(false);
    navigator.vibrate?.([8, 12]);
    setTimeout(() => go(`/create/${type}`), 120);
  };

  const isActive = useCallback((p: string) => p === "/"? pathname === "/" : pathname.startsWith(p), [pathname]);

  const Item = ({ path, icon: Icon, label }: any) => {
    const active = isActive(path);
    return (
      <button onClick={() => go(path)} className="relative flex-1 h-[64px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all" style={{ WebkitTapHighlightColor: "transparent" }}>
        <div className={`absolute inset-2 rounded-2xl transition-all duration-300 ${active? `${theme.light} scale-100` : "scale-90 opacity-0"}`} />
        <Icon className={`w-[22px] h-[22px] relative z-10 transition-all ${active? `${theme.text} scale-110` : "text-zinc-400 dark:text-zinc-500"}`} strokeWidth={active? 2.3 : 1.8} />
        <span className={`text-[11px] relative z-10 transition-all ${active? `${theme.text} font-semibold` : "text-zinc-500"}`}>{label}</span>
      </button>
    );
  };

  const Card = ({ type }: { type: "task" | "plan" }) => {
    const c = COLORS[type];
    const data = type === "task"? {
      icon: <HiBolt className="w-7 h-7" />,
      title: "Đăng Task",
      desc: "Việc cần làm ngay, tìm người giúp trong ngày",
      features: [
        { icon: FiClock, text: "Xong trong 30 phút – 4 giờ" },
        { icon: FiDollarSign, text: "Bạn tự đề xuất giá" },
        { icon: FiUsers, text: "1-1, làm xong là xong" },
      ],
      examples: ["Chạy deadline giùm 😰","Tuyển 5 người bắt ngoại tình 😭","Giả người yêu 1 buổi 🙃","Dọn phòng gấp 😭"],
    } : {
      icon: <LuCalendarDays className="w-7 h-7" />,
      title: "Đăng Plan",
      desc: "Tạo kèo đi chơi, hẹn hò, cần bạn đồng hành",
      features: [
        { icon: FiClock, text: "Lên lịch trước, không gấp" },
        { icon: FiDollarSign, text: "Chia đều chi phí" },
        { icon: FiUsers, text: "Nhóm 2-10 người" },
      ],
      examples: ["Boardgame thua trả tiền 😆","Cafe sáng chill ☕","Phượt Vũng Tàu 🏍️","Đi ăn chung đỡ ngại 🍜"],
    };

    return (
      <button onClick={() => choose(type)} className="group relative text-left w-full rounded-[28px] overflow-hidden active:scale-[0.99] transition-all duration-300 focus:outline-none focus-visible:ring-4 ${c.ring}">
        <div className={`absolute inset-0 bg-gradient-to-br ${c.from} ${c.to}`} />
        {/* glass highlight */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{backgroundImage:`radial-gradient(600px circle at 0% 0%, white, transparent 40%)`}} />

        <div className="relative p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-hover:-rotate-3 transition-transform">
              {data.icon}
            </div>
            <div className="flex-1 text-white">
              <h3 className="text-[24px] font-extrabold leading-tight">{data.title}</h3>
              <p className="text-[14px] text-white/85 mt-0.5">{data.desc}</p>
            </div>
          </div>

          {/* Chi tiết */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {data.features.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/20 p-2.5">
                <f.icon className="w-4 h-4 text-white/90 mb-1" />
                <p className="text-[11px] leading-snug text-white/90 font-medium">{f.text}</p>
              </div>
            ))}
          </div>

          {/* Ví dụ */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar">
            {data.examples.map(e => (
              <span key={e} className="shrink-0 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[12px] text-white font-medium">{e}</span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-[13px] text-white/80">Nhấn để tạo ngay</span>
            <div className="w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto relative backdrop-blur-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 rounded-[28px] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="flex items-center h-[68px] px-1.5">
              <Item path="/" icon={HiHome} label="Trang chủ" />
              <Item path="/messages" icon={FiMessageSquare} label="Tin nhắn" />
              <div className="w-[76px] flex justify-center">
                <button onClick={() => setOpen(true)} className="group relative -mt-5 active:scale-95 transition-transform">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} blur-2xl opacity-50 group-hover:opacity-70 transition-opacity`} />
                  <div className={`relative w-[60px] h-[60px] rounded-full bg-gradient-to-br ${theme.from} ${theme.to} shadow-lg flex items-center justify-center ring-4 ring-white dark:ring-zinc-950`}>
                    <HiPlus className="w-7 h-7 text-white transition-transform group-hover:rotate-90" strokeWidth={2.5} />
                  </div>
                </button>
              </div>
              <Item path="/tasks" icon={FiClipboard} label="Nhiệm vụ" />
              <Item path="/profile" icon={FiUser} label="Hồ sơ" />
            </div>
          </div>
        </div>
      </nav>

      {/* Picker hiện đại */}
      <div className={`fixed inset-0 z-[100] ${open? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-300 ${open? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute inset-x-0 bottom-0 max-h-[92vh] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open? "translate-y-0" : "translate-y-full"}`}>
          <div className="mx-auto max-w-[480px] bg-zinc-50 dark:bg-zinc-950 rounded-t-[36px] shadow-2xl overflow-hidden">
            <div className="sticky top-0 z-10 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
              <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-3" />
              <div className="px-6 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-bold tracking-tight">Tạo mới</h2>
                  <p className="text-[13px] text-zinc-500 mt-0.5">Chọn đúng loại, AI sẽ gợi ý tốt hơn</p>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center">✕</button>
              </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(92vh-88px)]">
              <Card type="task" />
              <Card type="plan" />
              <p className="text-[11px] text-center text-zinc-400 pb-2">Mẹo: Task màu xanh dương, Plan màu xanh lá — đồng bộ với tab trên cùng</p>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </>
  );
}
"use client";
import { useRouter, usePathname } from "next/navigation";
import { FiMessageSquare, FiClipboard, FiUser } from "react-icons/fi";
import { HiHome, HiPlus } from "react-icons/hi2";
import { useEffect, useTransition, useCallback, useState } from "react";
import { useAppStore } from "@/store/app";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  // Prefetch
  useEffect(() => {
    ["/", "/messages", "/tasks", "/profile", "/create/task", "/create/plan"].forEach(p => router.prefetch(p));
  }, [router]);

  // Lock scroll + ESC
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = useCallback((path: string) => {
    if (pathname === path) return;
    if (navigator.vibrate) navigator.vibrate(8);
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const choose = (type: "task" | "plan") => {
    setOpen(false);
    if (navigator.vibrate) navigator.vibrate([8, 12]);
    setTimeout(() => go(type === "task"? "/create/task" : "/create/plan"), 150);
  };

  const isActive = useCallback((p: string) => p === "/"? pathname === "/" : pathname.startsWith(p), [pathname]);

  const activeBg = isPlan? "bg-emerald-500/12 dark:bg-emerald-500/18" : "bg-sky-500/12 dark:bg-sky-500/18";
  const activeText = isPlan? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400";
  const fabGradient = isPlan? "from-emerald-500 via-green-500 to-teal-500" : "from-sky-500 via-blue-500 to-indigo-500";

  const Item = ({ path, icon: Icon, label }: any) => {
    const active = isActive(path);
    return (
      <button onClick={() => go(path)} className="relative flex-1 h-[64px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all duration-200" style={{ WebkitTapHighlightColor: "transparent" }}>
        <div className={`absolute inset-2 rounded-2xl transition-all duration-300 ${active? `${activeBg} scale-100 opacity-100` : "scale-90 opacity-0"}`} />
        <Icon className={`w-[22px] h-[22px] transition-all duration-300 relative z-10 ${active? `${activeText} scale-110` : "text-zinc-400 dark:text-zinc-500"}`} strokeWidth={active? 2.2 : 1.8} />
        <span className={`text-[11px] font-medium tracking-tight transition-all duration-300 relative z-10 ${active? `${activeText} font-semibold` : "text-zinc-500 dark:text-zinc-500"}`}>{label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Bottom Nav - Glass */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto relative backdrop-blur-2xl bg-white/85 dark:bg-zinc-900/85 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[28px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]">
            <div className="flex items-center h-[68px] px-1.5">
              <Item path="/" icon={HiHome} label="Trang chủ" />
              <Item path="/messages" icon={FiMessageSquare} label="Tin nhắn" />

              {/* FAB */}
              <div className="w-[76px] flex justify-center">
                <button onClick={() => setOpen(true)} aria-label="Tạo mới" className="group relative -mt-5 active:scale-92 transition-transform duration-200" style={{ WebkitTapHighlightColor: "transparent" }}>
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${fabGradient} blur-xl opacity-60 group-hover:opacity-80 transition-opacity`} />
                  <div className={`relative w-[60px] h-[60px] rounded-full bg-gradient-to-br ${fabGradient} shadow-[0_8px_24px_-4px_rgba(14,165,233,0.5)] flex items-center justify-center ring-4 ring-white dark:ring-zinc-950 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_32px_-4px_rgba(14,165,233,0.6)]`}>
                    <HiPlus className="w-7 h-7 text-white transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              <Item path="/tasks" icon={FiClipboard} label="Nhiệm vụ" />
              <Item path="/profile" icon={FiUser} label="Hồ sơ" />
            </div>
          </div>
        </div>
      </nav>

      {/* PICKER FULL SCREEN */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${open? "pointer-events-auto" : "pointer-events-none"}`}>
        {/* Backdrop */}
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-zinc-950/60 backdrop-blur-2xl transition-opacity duration-500 ${open? "opacity-100" : "opacity-0"}`} />

        {/* Panel */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open? "translate-y-0" : "translate-y-full"}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-[max(16px,env(safe-area-inset-top))] pb-4">
            <div>
              <h2 className="text-[22px] font-bold text-white tracking-tight">Bạn muốn đăng gì?</h2>
              <p className="text-[13px] text-white/70 mt-0.5">Chọn 1 để tiếp tục</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 active:scale-90 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* 2 NỬA */}
          <div className="flex-1 grid grid-rows-2 gap-3 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {/* TASK */}
            <button onClick={() => choose("task")} className="group relative overflow-hidden rounded-[32px] active:scale-[0.98] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600" />
              <div className="absolute inset-0 opacity-[0.15]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />

              <div className="relative h-full flex flex-col items-center justify-center p-8 text-white">
                <div className="w-[88px] h-[88px] rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                </div>
                <h3 className="text-[28px] font-extrabold tracking-tight mb-2">Đăng Task</h3>
                <p className="text-[15px] text-white/85 text-center leading-snug max-w-[300px]">Việc cần làm ngay, tìm người giúp trong ngày</p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                  {["chạy deadline 😰","dọn phòng 🧹","giả người yêu 🙃","bắt ngoại tình 😭"].map(t=>(
                    <span key={t} className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[12px] font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </button>

            {/* PLAN */}
            <button onClick={() => choose("plan")} className="group relative overflow-hidden rounded-[32px] active:scale-[0.98] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600" />
              <div className="absolute inset-0 opacity-[0.12]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />

              <div className="relative h-full flex flex-col items-center justify-center p-8 text-white">
                <div className="w-[88px] h-[88px] rounded-[28px] bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <h3 className="text-[28px] font-extrabold tracking-tight mb-2">Đăng Plan</h3>
                <p className="text-[15px] text-white/85 text-center leading-snug max-w-[300px]">Kế hoạch đi chơi, hẹn hò, cần bạn đồng hành</p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                  {["cafe cuối tuần ☕","đi concert 🎵","du lịch ✈️","học nhóm 📚"].map(t=>(
                    <span key={t} className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[12px] font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
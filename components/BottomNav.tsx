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

  const choose = (t: "task" | "plan") => {
    setOpen(false);
    navigator.vibrate?.([8,12]);
    setTimeout(() => go(`/create/${t}`), 120);
  };

  const isActive = (p: string) => p === "/"? pathname === "/" : pathname.startsWith(p);
  const activeColor = isPlan? "text-[#10B981]" : "text-[#0A84FF]";

  return (
    <>
      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-3 pb-[max(8px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-2xl border border-zinc-200/60 rounded-[28px] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.2)]">
            <div className="flex items-center h-[68px] px-2">
              {[
                {p:"/",Icon:HiHome,l:"Trang chủ"},
                {p:"/messages",Icon:FiMessageSquare,l:"Tin nhắn"},
              ].map(x=>(
                <button key={x.p} onClick={()=>go(x.p)} className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
                  <x.Icon className={`w-[22px] h-[22px] ${isActive(x.p)?activeColor:"text-zinc-400"}`} strokeWidth={isActive(x.p)?2.2:1.8}/>
                  <span className={`text-[11px] ${isActive(x.p)?`${activeColor} font-semibold`:"text-zinc-500"}`}>{x.l}</span>
                </button>
              ))}

              <div className="w-[76px] flex justify-center">
                <button onClick={()=>setOpen(true)} className="relative -mt-6 group active:scale-95 transition">
                  <div className={`absolute inset-0 rounded-full blur-xl opacity-60 ${isPlan?"bg-[#10B981]":"bg-[#0A84FF]"}`} />
                  <div className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-lg ring-4 ring-white ${isPlan?"bg-gradient-to-b from-[#10B981] to-[#059669]":"bg-gradient-to-b from-[#0A84FF] to-[#0057D9]"}`}>
                    <HiPlus className="w-7 h-7 text-white transition group-hover:rotate-90" strokeWidth={2.5}/>
                  </div>
                </button>
              </div>

              {[
                {p:"/tasks",Icon:FiClipboard,l:"Nhiệm vụ"},
                {p:"/profile",Icon:FiUser,l:"Hồ sơ"},
              ].map(x=>(
                <button key={x.p} onClick={()=>go(x.p)} className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
                  <x.Icon className={`w-[22px] h-[22px] ${isActive(x.p)?activeColor:"text-zinc-400"}`} strokeWidth={isActive(x.p)?2.2:1.8}/>
                  <span className={`text-[11px] ${isActive(x.p)?`${activeColor} font-semibold`:"text-zinc-500"}`}>{x.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* PICKER */}
      {open && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <div className="w-full max-w-[480px] bg-[#F9FAFB] rounded-t-[28px] shadow-2xl">
              <div className="w-10 h-1.5 bg-zinc-300 rounded-full mx-auto mt-3" />

              <div className="px-6 pt-4 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">Tạo mới</h2>
                  <p className="text-[15px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                    Chọn đúng loại, AI gợi ý tốt hơn
                    <span className="text-[#0A84FF]">✦</span>
                  </p>
                </div>
                <button onClick={()=>setOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200">✕</button>
              </div>

              <div className="px-4 pb-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* TASK */}
                <button onClick={()=>choose("task")} className="group relative w-full text-left rounded-[28px] overflow-hidden border border-[#D6E8FF] bg-gradient-to-b from-[#EAF3FF] to-[#DCEBFF] p-5 active:scale-[0.99] transition">
                  {/* Animation Rocket */}
                  <div className="absolute right-[-10px] bottom-[-12px] w-[180px] h-[180px] pointer-events-none">
                    <div className="absolute top-5 right-10 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    <svg className="w-full h-full animate-float" viewBox="0 0 200 200" fill="none">
                      <g className="animate-smoke">
                        <ellipse cx="70" cy="165" rx="24" ry="13" fill="white" opacity="0.95"/>
                        <ellipse cx="50" cy="178" rx="18" ry="10" fill="white" opacity="0.7"/>
                      </g>
                      <path d="M120 40 L150 30 L170 62 L140 132 L110 122 Z" fill="white" stroke="#BFDBFE" strokeWidth="3"/>
                      <circle cx="146" cy="72" r="13" fill="#0A84FF" stroke="#0057D9" strokeWidth="3"/>
                      <path d="M110 122 L88 142 L104 152 Z" fill="#0A84FF"/>
                      <path d="M140 132 L162 152 L146 162 Z" fill="#0A84FF"/>
                      <path d="M98 152 Q110 172 94 188 Q105 177 116 192 Q122 172 110 152" fill="#FBBF24" className="animate-flame"/>
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex gap-3">
                      <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-b from-[#2B8CFF] to-[#0066FF] shadow-[0_6px_16px_rgba(10,132,255,0.35)] flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
                      </div>
                      <div>
                        <h3 className="text-[22px] font-extrabold text-[#0066FF] leading-none">Task</h3>
                        <p className="text-[14px] text-slate-600 mt-1">Việc cần làm ngay</p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 divide-x divide-[#C7DDFF] w-[260px]">
                      {[
                        {icon:"M12 6v6l4 2",t:"30 phút",s:"– 4 giờ"},
                        {icon:"M12 2v20M17 5H9.5a3.5 0 0 7h5a3.5 3.5 0 0 1 0 7H6",t:"Bạn tự đề",s:"xuất giá"},
                        {icon:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",t:"1-1,",s:"làm xong là xong"},
                      ].map((x,i)=>(
                        <div key={i} className="text-center px-2">
                          <svg className="mx-auto text-[#0066FF] mb-1.5" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={x.icon} strokeLinecap="round"/></svg>
                          <p className="text-[12px] leading-[1.2] text-slate-700">{x.t}<br/>{x.s}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover:translate-x-0.5 transition">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </button>

                {/* PLAN */}
                <button onClick={()=>choose("plan")} className="group relative w-full text-left rounded-[28px] overflow-hidden border border-[#C8EAD8] bg-gradient-to-b from-[#E8F8EF] to-[#DDF3E7] p-5 active:scale-[0.99] transition">
                  {/* Animation Balloon */}
                  <div className="absolute right-[-8px] bottom-[-10px] w-[170px] h-[170px] pointer-events-none">
                    <div className="absolute top-6 right-14 text-[14px] animate-leaf">🍃</div>
                    <svg className="w-full h-full animate-bob" viewBox="0 0 200 200" fill="none">
                      <ellipse cx="45" cy="165" rx="22" ry="10" fill="white" opacity="0.8" className="animate-drift"/>
                      <path d="M100 32 C128 32 152 56 152 84 C152 104 142 119 128 127 L124 127 L124 144 L106 144 L106 127 L100 127 C86 119 76 104 76 84 C76 56 100 32 100 32 Z" fill="#10B981" stroke="#059669" strokeWidth="3"/>
                      <path d="M100 32 C116 36 126 52 126 70 C126 88 116 102 100 107" fill="white" opacity="0.25"/>
                      <rect x="106" y="144" width="28" height="18" rx="3" fill="#A16207" stroke="#78350F" strokeWidth="2"/>
                      <circle cx="113" cy="139" r="3" fill="#FCD34D"/>
                      <circle cx="123" cy="137" r="3" fill="#FCA5A5"/>
                      <circle cx="129" cy="140" r="3" fill="#93C5FD"/>
                    </svg>
                  </div>

                  <div className="relative z-10">
                    <div className="flex gap-3">
                      <div className="w-[52px] h-[52px] rounded-[16px] bg-gradient-to-b from-[#12C47A] to-[#0A9E5F] shadow-[0_6px_16px_rgba(16,185,129,0.35)] flex items-center justify-center">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      </div>
                      <div>
                        <h3 className="text-[22px] font-extrabold text-[#047857] leading-none">Plan</h3>
                        <p className="text-[14px] text-slate-600 mt-1">Tạo kèo, cần bạn đồng hành</p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 divide-x divide-[#B8E4CF] w-[260px]">
                      {[
                        {icon:"M12 6v6l4 2",t:"Lên lịch trước,",s:"không gấp"},
                        {icon:"M12 2v20M17 5H9.5a3.5 0 0 0 0 7h5a3.5 0 0 1 0 7H6",t:"Chia đều",s:"chi phí"},
                        {icon:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",t:"Nhóm",s:"2 – 10 người"},
                      ].map((x,i)=>(
                        <div key={i} className="text-center px-2">
                          <svg className="mx-auto text-[#059669] mb-1.5" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={x.icon} strokeLinecap="round"/></svg>
                          <p className="text-[12px] leading-[1.2] text-slate-700">{x.t}<br/>{x.s}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover:translate-x-0.5 transition">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </button>

                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-zinc-100">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/></svg>
                  </div>
                  <p className="text-[13px] leading-snug text-slate-600">Task màu <span className="text-[#0A84FF] font-semibold">xanh dương</span>, Plan màu <span className="text-[#10B981] font-semibold">xanh lá</span> đồng bộ với tab trên cùng</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes float {0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
        @keyframes bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes smoke {0%{transform:scale(0.9);opacity:.9}100%{transform:scale(1.15) translateY(6px);opacity:0}}
        @keyframes flame {0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.2)}}
        @keyframes leaf {0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-18px,28px) rotate(160deg);opacity:0}}
        @keyframes drift {0%{transform:translateX(0)}100%{transform:translateX(-20px)}}
       .animate-float{animation:float 3s ease-in-out infinite}
       .animate-bob{animation:bob 4s ease-in-out infinite}
       .animate-smoke{animation:smoke 1.8s ease-out infinite}
       .animate-flame{animation:flame.28s ease-in-out infinite;transform-origin:top}
       .animate-leaf{animation:leaf 4.5s linear infinite}
       .animate-drift{animation:drift 18s linear infinite alternate}
      `}</style>
    </>
  );
}
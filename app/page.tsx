"use client";
export const dynamic = 'force-dynamic';
import MyTasksPage from "./_tabs/MyTasksPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Toaster } from "sonner";
import {
  Home as HomeIcon, MessageSquare, ClipboardList, User, Plus
} from "lucide-react";
import { FiLoader } from "react-icons/fi";

import ChatClient from "./chat/ChatClient";
import ProfileTabContent from "./profile/ProfileTabContent";
import TaskFeedPage from "./_tabs/TaskFeedPage";

type MainTab = "home" | "messages" | "tasks" | "profile";

export default function AppContainer() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);

  const [currentMainTab, setCurrentMainTab] = useState<MainTab>("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Track tab đã mount để lazy load + giữ state
  const [loadedTabs, setLoadedTabs] = useState<Set<MainTab>>(new Set(["home"]));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setLoadedTabs(prev => new Set(prev).add(currentMainTab));
  }, [currentMainTab]);

  const mainNavItems = [
    { id: "home" as MainTab, label: "Home", Icon: HomeIcon },
    { id: "messages" as MainTab, label: "Messages", Icon: MessageSquare },
    { id: "tasks" as MainTab, label: "Tasks", Icon: ClipboardList },
    { id: "profile" as MainTab, label: "Profile", Icon: User },
  ];

  const activeColorClass = mode === "plan"? "text-emerald-500" : "text-blue-600";
  const activeBgClass = mode === "plan"? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = mode === "plan"? "shadow-emerald-500/20" : "shadow-blue-600/20";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className={`animate-spin ${activeColorClass}`} size={32} />
          <p className="text-[14px] text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <LayoutGroup id="app-global-navigation-flow">
      <div className="min-h-screen pb-28 font-sans bg-white dark:bg-zinc-950 select-none relative">
        <Toaster richColors position="top-center" toastOptions={{ duration: 2000, style: { fontSize: "14px" } }} />

        <div className="w-full max-w-2xl mx-auto">
          {/* Giữ component, chỉ ẩn/hiện để không fetch lại */}
          <div className={currentMainTab!== "home"? "hidden" : ""}>
            {loadedTabs.has("home") && <TaskFeedPage />}
          </div>
          <div className={currentMainTab!== "messages"? "hidden" : ""}>
            {loadedTabs.has("messages") && <ChatClient />}
          </div>
          <div className={currentMainTab!== "tasks"? "hidden" : ""}>
            {loadedTabs.has("tasks") && <MyTasksPage />}
          </div>
          <div className={currentMainTab!== "profile"? "hidden" : ""}>
            {loadedTabs.has("profile") && <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />}
          </div>
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center justify-end">
          <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="w-full bg-white/90 backdrop-blur-2xl rounded-[28px] p-2.5 border border-zinc-200/40 shadow-xl pointer-events-auto flex flex-col gap-1"
                >
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/create/task");
                      if ("vibrate" in navigator) navigator.vibrate(8);
                    }}
                    className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <ClipboardList size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Nhiệm vụ mới</h4>
                      <p className="text-xs text-zinc-400">Xử lý ngay đầu việc nhỏ</p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push("/create/plan");
                      if ("vibrate" in navigator) navigator.vibrate(8);
                    }}
                    className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ClipboardList size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Kế hoạch dài hạn</h4>
                      <p className="text-xs text-zinc-400">Lên kế hoạch tuần, tháng chỉn chu</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full pointer-events-auto relative rounded-[26px] border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between h-[64px] px-2 relative">

                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(0, 2).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentMainTab(item.id);
                          if ("vibrate" in navigator) navigator.vibrate(10);
                        }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="w-[64px] flex justify-center h-full items-center relative">
                  <button onClick={() => {
                    setIsMenuOpen(!isMenuOpen);
                    if ("vibrate" in navigator) navigator.vibrate(8);
                  }} className="outline-none z-10 p-2">
                    <motion.div
                      animate={{ rotate: isMenuOpen? 135 : 0 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${isMenuOpen? "bg-zinc-900" : activeBgClass} ${dynamicGlow}`}
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </motion.div>
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(2, 4).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentMainTab(item.id);
                          if ("vibrate" in navigator) navigator.vibrate(10);
                        }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>
    </LayoutGroup>
  );
}
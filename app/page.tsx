"use client";
export const dynamic = 'force-dynamic';
import MyTasksPage from "./_tabs/MyTasksPage";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { Toaster } from "sonner";
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

  const activeColorClass = mode === "plan"? "text-emerald-500" : "text-blue-600";

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

      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>
    </div>
  );
}
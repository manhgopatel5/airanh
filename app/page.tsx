"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAppStore } from "@/store/app";
import {
  collection, query, where, onSnapshot, doc, getDoc, arrayUnion, setDoc, limit,
  updateDoc, arrayRemove, QueryDocumentSnapshot, deleteDoc, Timestamp, Unsubscribe, QuerySnapshot, DocumentData,
  orderBy, writeBatch, serverTimestamp, getDocs, startAfter
} from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { nanoid } from "nanoid";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "sonner";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

import TaskFeed from "@/components/TaskFeed";
import ShareTaskModal from "@/components/ShareTaskModal";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";
import ChatClient from "./chat/ChatClient";
import ProfileTabContent from "./profile/ProfileTabContent";
import TaskFeedPage from "./_tabs/TaskFeedPage";

// Icons
import { FiSearch, FiMessageSquare, FiUserPlus, FiUsers, FiCheck, FiX, FiUpload, FiLoader, FiUserX, FiBell, FiAtSign, FiInbox, FiMapPin } from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import {
  Home as HomeIcon, MessageSquare, ClipboardList, User, Plus, Sparkles as SparklesIcon,
  CalendarRange, HelpCircle, LogOut, Trash2, Shield, Lock, Camera, Check, QrCode,
  Share2, ChevronRight, Settings, Circle, Zap, Star, ScanLine, X
} from "lucide-react";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";
type MainTab = "home" | "messages" | "tasks" | "profile";

export default function AppContainer() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  
  const [currentMainTab, setCurrentMainTab] = useState<MainTab>("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const mainNavItems = [
    { id: "home" as MainTab, label: "Home", Icon: HomeIcon },
    { id: "messages" as MainTab, label: "Messages", Icon: MessageSquare },
    { id: "tasks" as MainTab, label: "Tasks", Icon: ClipboardList },
    { id: "profile" as MainTab, label: "Profile", Icon: User },
  ];

  const activeColorClass = mode === "plan" ? "text-emerald-500" : "text-blue-600";
  const activeBgClass = mode === "plan" ? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = mode === "plan" ? "shadow-emerald-500/20" : "shadow-blue-600/20";

  const renderTabContent = () => {
    switch (currentMainTab) {
      case "messages":
        return <ChatClient />;
      case "tasks":
        return (
          <div className="flex flex-col items-center justify-center pt-32 text-zinc-400 animate-in fade-in duration-300">
            <ClipboardList size={48} className="mb-2 opacity-40" />
            <p className="font-medium text-sm">Trang Quản Lý Nhiệm Vụ</p>
            <p className="text-xs mt-1">Coming soon</p>
          </div>
        );
      case "profile":
        return <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />;
      default:
        return <TaskFeedPage />;
    }
  };

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
          {renderTabContent()}
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
                  className="w-full bg-white/90 backdrop-blur-2xl rounded-[28px] p-2.5 border-zinc-200/40 shadow-xl pointer-events-auto flex-col gap-1"
                >
                  <button onClick={() => { setIsMenuOpen(false); toast.info("Tạo task mới"); }} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><SparklesIcon size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Nhiệm vụ mới</h4><p className="text-xs text-zinc-400">Xử lý ngay đầu việc nhỏ</p></div>
                  </button>
                  <button onClick={() => { setIsMenuOpen(false); toast.info("Tạo plan mới"); }} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarRange size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Kế hoạch dài hạn</h4><p className="text-xs text-zinc-400">Lên kế hoạch tuần, tháng chỉn chu</p></div>
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
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="w-[64px] flex justify-center h-full items-center relative">
                  <button onClick={() => { setIsMenuOpen(!isMenuOpen); if ("vibrate" in navigator) navigator.vibrate(8); }} className="outline-none z-10 p-2">
                    <motion.div
                      animate={{ rotate: isMenuOpen ? 135 : 0 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${isMenuOpen ? "bg-zinc-900" : activeBgClass} ${dynamicGlow}`}
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
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
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
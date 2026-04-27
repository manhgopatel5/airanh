"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc, arrayRemove } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Smartphone, Monitor, Laptop, Trash2, MapPin } from "lucide-react";
import { toast, Toaster } from "sonner";

type Session = {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Date;
  current: boolean;
};

export default function SessionsPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setSessions(snap.data().sessions || []);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const removeSession = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find((s) => s.id === sessionId);
    if (session?.current) {
      toast.error("Không thể xóa phiên hiện tại");
      return;
    }
    await updateDoc(doc(db, "users", user.uid), {
      sessions: arrayRemove(session)
    });
    toast.success("Đã đăng xuất thiết bị");
  };

  const logoutAll = async () => {
    if (!user) return;
    if (!confirm("Đăng xuất tất cả thiết bị khác?")) return;
    const current = sessions.find((s) => s.current);
    await updateDoc(doc(db, "users", user.uid), {
      sessions: current? [current] : []
    });
    toast.success("Đã đăng xuất tất cả");
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes("iPhone") || device.includes("Android")) return Smartphone;
    if (device.includes("Mac") || device.includes("Windows")) return Laptop;
    return Monitor;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Phiên đăng nhập</h1>
      </div>

      <div className="px-6 space-y-4">
        {sessions.map((session) => {
          const Icon = getDeviceIcon(session.device);
          return (
            <div key={session.id} className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="w-5 h-5 text-gray-900 dark:text-white mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {session.device}
                      </p>
                      {session.current && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
                          Hiện tại
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                      {session.browser} ·
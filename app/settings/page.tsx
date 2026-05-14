"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, updateDoc, onSnapshot, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { signOut, deleteUser } from "firebase/auth";
import {
  ChevronLeft, Moon, Sun, Palette, Bell, Clock, Mail,
  Eye, EyeOff, UserX, Shield, Lock, Smartphone, Key, Trash2,
  Globe, Download, Zap, Database, Info, LogOut,
  ChevronRight, Monitor, Languages, MapPin, Calendar,
  MessageSquare, Users, AtSign, Settings as SettingsIcon
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type Settings = {
  theme: "light" | "dark" | "system";
  accentTask: "blue" | "indigo" | "purple";
  accentPlan: "green" | "emerald" | "teal";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  reduceMotion: boolean;
  notiTaskAssigned: boolean;
  notiTaskDue: boolean;
  notiPlanInvite: boolean;
  notiPlanDeadline: boolean;
  notiChatMention: boolean;
  notiChatAll: boolean;
  emailDigest: "off" | "daily" | "weekly";
  quietHours: { enabled: boolean; from: string; to: string };
  hideOnline: boolean;
  hideLastSeen: boolean;
  hidePhone: boolean;
  hideEmail: boolean;
  allowStrangers: "everyone" | "contacts" | "none";
  blockedUsers: string[];
  language: "vi" | "en";
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  currency: "VND" | "USD" | "EUR";
  autoDeleteMsg: "off" | "7d" | "30d" | "90d";
  apiKey?: string;
  webhookUrl?: string;
};

const DEFAULT_SETTINGS: Settings = {
  theme: "system", accentTask: "blue", accentPlan: "green",
  fontSize: "medium", compactMode: false, reduceMotion: false,
  notiTaskAssigned: true, notiTaskDue: true, notiPlanInvite: true, notiPlanDeadline: true,
  notiChatMention: true, notiChatAll: false, emailDigest: "off",
  quietHours: { enabled: true, from: "22:00", to: "07:00" },
  hideOnline: false, hideLastSeen: false, hidePhone: false, hideEmail: false,
  allowStrangers: "everyone", blockedUsers: [],
  language: "vi", timezone: "Asia/Ho_Chi_Minh", dateFormat: "DD/MM/YYYY",
  currency: "VND", autoDeleteMsg: "off",
};

export default function SettingsPage() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<any[]>([]);
  const [storage, setStorage] = useState({ used: 23.5, total: 100 });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({...DEFAULT_SETTINGS,...data.settings });
        setSessions(data.sessions || []);
        setStorage(data.storage || { used: 23.5, total: 100 });
        setTfaEnabled(data.settings?.["2fa"] || false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, db]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!user) return;
    const newSettings = {...settings, [key]: value };
    setSettings(newSettings);
    await updateDoc(doc(db, "users", user.uid), { settings: newSettings });
    toast.success("Đã cập nhật");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1200);
    navigator.vibrate?.(5);
  };

  const clearCache = async () => {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Đã xóa cache");
  };

  const exportData = async () => {
    if (!user) return;
    const data = { user: user.uid, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `huha-data-${user.uid}.json`; a.click();
    toast.success("Đã tải xuống");
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    await updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    await signOut(auth);
    window.location.href = "/login";
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại để xóa");
        await signOut(auth);
        router.push("/login");
      }
    }
  };

  const logoutAllDevices = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { sessions: [] });
    await signOut(auth);
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <LottiePlayer animationData={loadingPull} loop autoplay className="w-24 h-24" />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                <SettingsIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-[20px] font-black tracking-tight">Cài đặt</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          {/* 1. GIAO DIỆN */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-[12px] font-bold text-zinc-500 tracking-wider">GIAO DIỆN</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <SelectItem label="Chế độ" icon={settings.theme === "dark"? Moon : settings.theme === "light"? Sun : Monitor} value={settings.theme === "system"? "Hệ thống" : settings.theme === "dark"? "Tối" : "Sáng"} options={[{ label: "Sáng", value: "light" }, { label: "Tối", value: "dark" }, { label: "Hệ thống", value: "system" }]} onChange={(v) => updateSetting("theme", v as any)} />
              <SelectItem label="Màu Task" icon={Palette} value={settings.accentTask === "blue"? "Xanh dương" : settings.accentTask === "indigo"? "Chàm" : "Tím"} options={[{ label: "Xanh dương", value: "blue" }, { label: "Chàm", value: "indigo" }, { label: "Tím", value: "purple" }]} onChange={(v) => updateSetting("accentTask", v as any)} />
              <SelectItem label="Màu Plan" icon={Palette} value={settings.accentPlan === "green"? "Xanh lá" : settings.accentPlan === "emerald"? "Ngọc lục bảo" : "Xanh mòng két"} options={[{ label: "Xanh lá", value: "green" }, { label: "Ngọc lục bảo", value: "emerald" }, { label: "Xanh mòng két", value: "teal" }]} onChange={(v) => updateSetting("accentPlan", v as any)} />
              <ToggleItem label="Chế độ gọn" icon={Zap} checked={settings.compactMode} onChange={(v) => updateSetting("compactMode", v)} />
              <ToggleItem label="Giảm chuyển động" icon={Zap} checked={settings.reduceMotion} onChange={(v) => updateSetting("reduceMotion", v)} />
            </div>
          </motion.div>

          {/* 2. THÔNG BÁO */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-[12px] font-bold text-zinc-500 tracking-wider">THÔNG BÁO</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <ToggleItem label="Task được giao" icon={Bell} checked={settings.notiTaskAssigned} onChange={(v) => updateSetting("notiTaskAssigned", v)} />
              <ToggleItem label="Task sắp hết hạn" icon={Bell} checked={settings.notiTaskDue} onChange={(v) => updateSetting("notiTaskDue", v)} />
              <ToggleItem label="Mời vào Plan" icon={Bell} checked={settings.notiPlanInvite} onChange={(v) => updateSetting("notiPlanInvite", v)} />
              <ToggleItem label="Nhắc đến trong chat" icon={AtSign} checked={settings.notiChatMention} onChange={(v) => updateSetting("notiChatMention", v)} />
              <SelectItem label="Email tóm tắt" icon={Mail} value={settings.emailDigest === "off"? "Tắt" : settings.emailDigest === "daily"? "Hàng ngày" : "Hàng tuần"} options={[{ label: "Tắt", value: "off" }, { label: "Hàng ngày", value: "daily" }, { label: "Hàng tuần", value: "weekly" }]} onChange={(v) => updateSetting("emailDigest", v as any)} />
              <TimeRangeItem label="Giờ im lặng" icon={Clock} enabled={settings.quietHours.enabled} from={settings.quietHours.from} to={settings.quietHours.to} onChange={(v) => updateSetting("quietHours", v)} />
            </div>
          </motion.div>

          {/* 3. QUYỀN RIÊNG TƯ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-[12px] font-bold text-zinc-500 tracking-wider">QUYỀN RIÊNG TƯ</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <ToggleItem label="Ẩn trạng thái online" icon={settings.hideOnline? EyeOff : Eye} checked={settings.hideOnline} onChange={(v) => updateSetting("hideOnline", v)} />
              <ToggleItem label="Ẩn lần cuối online" icon={settings.hideLastSeen? EyeOff : Eye} checked={settings.hideLastSeen} onChange={(v) => updateSetting("hideLastSeen", v)} />
              <ToggleItem label="Ẩn số điện thoại" icon={settings.hidePhone? EyeOff : Eye} checked={settings.hidePhone} onChange={(v) => updateSetting("hidePhone", v)} />
              <SelectItem label="Ai được nhắn tin" icon={Users} value={settings.allowStrangers === "everyone"? "Mọi người" : settings.allowStrangers === "contacts"? "Danh bạ" : "Không ai"} options={[{ label: "Mọi người", value: "everyone" }, { label: "Danh bạ", value: "contacts" }, { label: "Không ai", value: "none" }]} onChange={(v) => updateSetting("allowStrangers", v as any)} />
              <SettingItem label={`Đã chặn ${settings.blockedUsers.length} người`} icon={UserX} onClick={() => router.push("/settings/blocked")} />
            </div>
          </motion.div>

          {/* --- PART 2 tiếp tục từ đây --- */}
          {/* 4. TÀI KHOẢN */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">TÀI KHOẢN</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <SettingItem label="Đổi email" icon={Mail} value={user?.email || ""} onClick={() => router.push("/settings/change-email")} />
              <SettingItem label="Đổi số điện thoại" icon={Smartphone} onClick={() => router.push("/settings/change-phone")} />
              <SettingItem label="Đổi mật khẩu" icon={Lock} onClick={() => router.push("/settings/change-password")} />
              <SettingItem label="Xác thực 2 lớp" icon={Key} value={tfaEnabled? "Đã bật" : "Tắt"} onClick={() => router.push("/settings/2fa")} />
              <SettingItem label={`Phiên đăng nhập (${sessions.length})`} icon={Shield} onClick={() => router.push("/settings/sessions")} />
              <SettingItem label="Đăng xuất tất cả thiết bị" icon={LogOut} onClick={logoutAllDevices} danger />
              <SettingItem label="Xóa tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
            </div>
          </motion.div>

          {/* 5. DỮ LIỆU & LƯU TRỮ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">DỮ LIỆU & LƯU TRỮ</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <SelectItem label="Ngôn ngữ" icon={Languages} value={settings.language === "vi"? "Tiếng Việt" : "English"} options={[{ label: "Tiếng Việt", value: "vi" }, { label: "English", value: "en" }]} onChange={(v) => updateSetting("language", v as any)} />
              <SettingItem label="Múi giờ" icon={MapPin} value={settings.timezone} onClick={() => toast.info("Sắp ra mắt")} />
              <SelectItem label="Định dạng ngày" icon={Calendar} value={settings.dateFormat} options={[{ label: "DD/MM/YYYY", value: "DD/MM/YYYY" }, { label: "MM/DD/YYYY", value: "MM/DD/YYYY" }, { label: "YYYY-MM-DD", value: "YYYY-MM-DD" }]} onChange={(v) => updateSetting("dateFormat", v as any)} />
              <SelectItem label="Đơn vị tiền" icon={Globe} value={settings.currency} options={[{ label: "VND", value: "VND" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }]} onChange={(v) => updateSetting("currency", v as any)} />
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5" />
                    <span className="text-base font-semibold">Dung lượng</span>
                  </div>
                  <span className="text-sm text-zinc-500">{storage.used.toFixed(1)}MB / {storage.total}MB</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(storage.used / storage.total) * 100}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-to-r from-[#0042B2] to-[#1A5FFF] rounded-full" />
                </div>
              </div>
              <SettingItem label="Xuất dữ liệu của tôi" icon={Download} onClick={exportData} />
              <SettingItem label="Xóa bộ nhớ đệm" icon={Trash2} onClick={clearCache} danger />
            </div>
          </motion.div>

          {/* 6. NÂNG CAO */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">NÂNG CAO</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <SettingItem label="API Key" icon={Key} value={settings.apiKey? "••••••••" : "Chưa tạo"} onClick={() => router.push("/settings/api")} />
              <SettingItem label="Webhook" icon={Zap} value={settings.webhookUrl? "Đã kết nối" : "Chưa kết nối"} onClick={() => router.push("/settings/api")} />
            </div>
          </motion.div>

          {/* 7. VỀ HUHA */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">VỀ HUHA</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
              <SettingItem label="Phiên bản" icon={Info} value="1.0.0 (2026.04.28)" />
              <SettingItem label="Điều khoản dịch vụ" icon={Shield} onClick={() => window.open("https://huha.vn/terms", "_blank")} />
              <SettingItem label="Chính sách bảo mật" icon={Lock} onClick={() => window.open("https://huha.vn/privacy", "_blank")} />
              <SettingItem label="Liên hệ: support@huha.vn" icon={Mail} onClick={() => window.open("mailto:support@huha.vn")} />
              <SettingItem label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
            </div>
          </motion.div>
        </div>

        {/* Success Lottie */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-32 h-32" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {showLogoutModal && (
            <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" />
          )}
          {showDeleteModal && (
            <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ===== COMPONENTS =====
function SettingItem({ label, icon: Icon, value, onClick, danger }: any) {
  return (
    <button onClick={() => { navigator.vibrate?.(5); onClick?.(); }} className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 dark:active:bg-zinc-900 transition">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}`} />
        <span className={`text-[15px] font-medium ${danger? "text-red-500" : "text-zinc-900 dark:text-white"}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-zinc-500">{value}</span>}
        <ChevronRight className="w-4 h-4 text-zinc-400" />
      </div>
    </button>
  );
}

function SelectItem({ label, icon: Icon, value, options, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 dark:active:bg-zinc-900 transition">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <span className="text-[15px] font-medium text-zinc-900 dark:text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">{value}</span>
          <ChevronRight className={`w-4 h-4 text-zinc-400 transition ${open? "rotate-90" : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
            {options.map((opt: any) => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} className="w-full text-left px-12 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm">
                <span className={value === opt.label? "font-semibold text-[#0042B2]" : "text-zinc-700 dark:text-zinc-300"}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleItem({ label, icon: Icon, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        <span className="text-[15px] font-medium text-zinc-900 dark:text-white">{label}</span>
      </div>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition ${checked? "bg-[#0042B2]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
        <motion.div layout className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow ${checked? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function TimeRangeItem({ label, icon: Icon, enabled, from, to, onChange }: any) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <span className="text-[15px] font-medium text-zinc-900 dark:text-white">{label}</span>
        </div>
        <button onClick={() => onChange({ enabled:!enabled, from, to })} className={`relative w-11 h-6 rounded-full transition ${enabled? "bg-[#0042B2]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
          <motion.div layout className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow ${enabled? "left-5" : "left-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <div className="ml-8 flex items-center gap-2">
          <input type="time" value={from} onChange={(e) => onChange({ enabled, from: e.target.value, to })} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm" />
          <span className="text-zinc-500">đến</span>
          <input type="time" value={to} onChange={(e) => onChange({ enabled, from, to: e.target.value })} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm" />
        </div>
      )}
    </div>
  );
}

function Modal({ title, desc, onClose, onConfirm, confirmText, danger }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-t-3xl p-6">
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full h-12 rounded-2xl font-semibold mb-3 ${danger? "bg-red-500 text-white" : "bg-[#0042B2] text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold">Hủy</button>
      </motion.div>
    </motion.div>
  );
}
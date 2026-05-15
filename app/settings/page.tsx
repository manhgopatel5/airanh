"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, memo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, updateDoc, onSnapshot, deleteDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { signOut, deleteUser } from "firebase/auth";
import {
  ChevronLeft, Moon, Sun, Palette, Bell, Clock, Mail,
  Eye, EyeOff, UserX, Shield, Lock, Smartphone, Key, Trash2,
  Globe, Download, Zap, Database, Info, LogOut,
  ChevronRight, Monitor, Languages, MapPin, Calendar, Users, AtSign, Settings as SettingsIcon,
  Copy
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type ThemeValue = "light" | "dark" | "system";
type AccentTask = "blue" | "indigo" | "purple";
type AccentPlan = "green" | "emerald" | "teal";
type FontSize = "small" | "medium" | "large";
type EmailDigest = "off" | "daily" | "weekly";
type AllowStrangers = "everyone" | "contacts" | "none";
type Language = "vi" | "en";
type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
type Currency = "VND" | "USD" | "EUR";
type AutoDeleteMsg = "off" | "7d" | "30d" | "90d";

type Settings = {
  theme: ThemeValue;
  accentTask: AccentTask;
  accentPlan: AccentPlan;
  fontSize: FontSize;
  compactMode: boolean;
  reduceMotion: boolean;
  notiTaskAssigned: boolean;
  notiTaskDue: boolean;
  notiPlanInvite: boolean;
  notiPlanDeadline: boolean;
  notiChatMention: boolean;
  notiChatAll: boolean;
  emailDigest: EmailDigest;
  quietHours: { enabled: boolean; from: string; to: string };
  hideOnline: boolean;
  hideLastSeen: boolean;
  hidePhone: boolean;
  hideEmail: boolean;
  allowStrangers: AllowStrangers;
  blockedUsers: string[];
  language: Language;
  timezone: string;
  dateFormat: DateFormat;
  currency: Currency;
  autoDeleteMsg: AutoDeleteMsg;
  apiKey?: string;
  webhookUrl?: string;
  twoFaEnabled?: boolean;
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
  currency: "VND", autoDeleteMsg: "off", twoFaEnabled: false,
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Apply theme ngay khi load
  useEffect(() => {
    const applyTheme = (theme: ThemeValue) => {
      const root = document.documentElement;
      if (theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", theme === "dark");
      }
    };
    applyTheme(settings.theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => settings.theme === "system" && applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [settings.theme]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({...DEFAULT_SETTINGS,...data.settings });
        setSessions(data.sessions || []);
        setStorage(data.storage || { used: 23.5, total: 100 });
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      toast.error("Không tải được cài đặt");
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, db]);

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!user) return;
    const newSettings = {...settings, [key]: value };
    setSettings(newSettings); // Optimistic

    try {
      await setDoc(doc(db, "users", user.uid), {
        settings: { [key]: value }
      }, { merge: true });
      toast.success("Đã cập nhật");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1200);
      vibrate(5);
    } catch (err: any) {
      setSettings(settings); // Rollback
      vibrate([10, 30, 10]);
      if (err.code === "permission-denied") toast.error("Không có quyền");
      else toast.error("Cập nhật thất bại");
    }
  }, [user, settings, db]);

  const clearCache = useCallback(async () => {
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Đã xóa cache");
      vibrate(5);
    } catch {
      toast.error("Xóa cache thất bại");
    }
  }, []);

  const exportData = useCallback(async () => {
    if (!user) return;
    const data = { user: user.uid, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `huha-data-${user.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải xuống");
    vibrate(5);
  }, [user, settings]);

  const handleLogout = useCallback(async () => {
    if (!user) return;
    setShowLogoutModal(false);
    try {
      await updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() });
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Đăng xuất thất bại");
      vibrate([10, 30, 10]);
    }
  }, [user, db, auth]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: any) {
      vibrate([10, 30, 10]);
      if (err.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại để xóa");
        await signOut(auth);
        router.push("/login");
      } else toast.error("Xóa thất bại");
    }
  }, [user, db, auth, router]);

  const logoutAllDevices = useCallback(async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { sessions: [] });
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Thao tác thất bại");
    }
  }, [user, db, auth]);

  const copyApiKey = useCallback(() => {
    if (!settings.apiKey) return;
    navigator.clipboard.writeText(settings.apiKey);
    toast.success("Đã copy API Key");
    vibrate(5);
  }, [settings.apiKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="w-32 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
              <div className="px-5 pt-4 pb-2"><div className="w-20 h-3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" /></div>
              {[1,2,3].map(j => (
                <div key={j} className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                      <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
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
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label="Quay lại"
            >
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
          <Section title="GIAO DIỆN" delay={0}>
            <SelectItem<ThemeValue>
              label="Chế độ"
              icon={settings.theme === "dark"? Moon : settings.theme === "light"? Sun : Monitor}
              value={settings.theme === "system"? "Hệ thống" : settings.theme === "dark"? "Tối" : "Sáng"}
              options={[
                { label: "Sáng", value: "light" },
                { label: "Tối", value: "dark" },
                { label: "Hệ thống", value: "system" }
              ]}
              onChange={(v) => updateSetting("theme", v)}
            />
            <SelectItem<AccentTask>
              label="Màu Task"
              icon={Palette}
              value={settings.accentTask === "blue"? "Xanh dương" : settings.accentTask === "indigo"? "Chàm" : "Tím"}
              options={[
                { label: "Xanh dương", value: "blue" },
                { label: "Chàm", value: "indigo" },
                { label: "Tím", value: "purple" }
              ]}
              onChange={(v) => updateSetting("accentTask", v)}
            />
            <SelectItem<AccentPlan>
              label="Màu Plan"
              icon={Palette}
              value={settings.accentPlan === "green"? "Xanh lá" : settings.accentPlan === "emerald"? "Ngọc lục bảo" : "Xanh mòng két"}
              options={[
                { label: "Xanh lá", value: "green" },
                { label: "Ngọc lục bảo", value: "emerald" },
                { label: "Xanh mòng két", value: "teal" }
              ]}
              onChange={(v) => updateSetting("accentPlan", v)}
            />
            <ToggleItem label="Chế độ gọn" icon={Zap} checked={settings.compactMode} onChange={(v) => updateSetting("compactMode", v)} />
            <ToggleItem label="Giảm chuyển động" icon={Zap} checked={settings.reduceMotion} onChange={(v) => updateSetting("reduceMotion", v)} />
          </Section>

          {/* 2. THÔNG BÁO */}
          <Section title="THÔNG BÁO" delay={0.05}>
            <ToggleItem label="Task được giao" icon={Bell} checked={settings.notiTaskAssigned} onChange={(v) => updateSetting("notiTaskAssigned", v)} />
            <ToggleItem label="Task sắp hết hạn" icon={Bell} checked={settings.notiTaskDue} onChange={(v) => updateSetting("notiTaskDue", v)} />
            <ToggleItem label="Mời vào Plan" icon={Bell} checked={settings.notiPlanInvite} onChange={(v) => updateSetting("notiPlanInvite", v)} />
            <ToggleItem label="Nhắc đến trong chat" icon={AtSign} checked={settings.notiChatMention} onChange={(v) => updateSetting("notiChatMention", v)} />
            <SelectItem<EmailDigest>
              label="Email tóm tắt"
              icon={Mail}
              value={settings.emailDigest === "off"? "Tắt" : settings.emailDigest === "daily"? "Hàng ngày" : "Hàng tuần"}
              options={[
                { label: "Tắt", value: "off" },
                { label: "Hàng ngày", value: "daily" },
                { label: "Hàng tuần", value: "weekly" }
              ]}
              onChange={(v) => updateSetting("emailDigest", v)}
            />
            <TimeRangeItem label="Giờ im lặng" icon={Clock} enabled={settings.quietHours.enabled} from={settings.quietHours.from} to={settings.quietHours.to} onChange={(v) => updateSetting("quietHours", v)} />
          </Section>

          {/* 3. QUYỀN RIÊNG TƯ */}
          <Section title="QUYỀN RIÊNG TƯ" delay={0.1}>
            <ToggleItem label="Ẩn trạng thái online" icon={settings.hideOnline? EyeOff : Eye} checked={settings.hideOnline} onChange={(v) => updateSetting("hideOnline", v)} />
            <ToggleItem label="Ẩn lần cuối online" icon={settings.hideLastSeen? EyeOff : Eye} checked={settings.hideLastSeen} onChange={(v) => updateSetting("hideLastSeen", v)} />
            <ToggleItem label="Ẩn số điện thoại" icon={settings.hidePhone? EyeOff : Eye} checked={settings.hidePhone} onChange={(v) => updateSetting("hidePhone", v)} />
            <SelectItem<AllowStrangers>
              label="Ai được nhắn tin"
              icon={Users}
              value={settings.allowStrangers === "everyone"? "Mọi người" : settings.allowStrangers === "contacts"? "Danh bạ" : "Không ai"}
              options={[
                { label: "Mọi người", value: "everyone" },
                { label: "Danh bạ", value: "contacts" },
                { label: "Không ai", value: "none" }
              ]}
              onChange={(v) => updateSetting("allowStrangers", v)}
            />
            <SettingItem label={`Đã chặn ${settings.blockedUsers.length} người`} icon={UserX} onClick={() => router.push("/settings/blocked")} />
          </Section>

          {/* 4. TÀI KHOẢN */}
          <Section title="TÀI KHOẢN" delay={0.15}>
            <SettingItem label="Đổi email" icon={Mail} value={user?.email || ""} onClick={() => router.push("/settings/change-email")} />
            <SettingItem label="Đổi số điện thoại" icon={Smartphone} onClick={() => router.push("/settings/change-phone")} />
            <SettingItem label="Đổi mật khẩu" icon={Lock} onClick={() => router.push("/settings/change-password")} />
            <SettingItem label="Xác thực 2 lớp" icon={Key} value={settings.twoFaEnabled? "Đã bật" : "Tắt"} onClick={() => router.push("/settings/2fa")} />
            <SettingItem label={`Phiên đăng nhập (${sessions.length})`} icon={Shield} onClick={() => router.push("/settings/sessions")} />
            <SettingItem label="Đăng xuất tất cả thiết bị" icon={LogOut} onClick={logoutAllDevices} danger />
            <SettingItem label="Xóa tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
          </Section>

          {/* 5. DỮ LIỆU & LƯU TRỮ */}
          <Section title="DỮ LIỆU & LƯU TRỮ" delay={0.2}>
            <SelectItem<Language>
              label="Ngôn ngữ"
              icon={Languages}
              value={settings.language === "vi"? "Tiếng Việt" : "English"}
              options={[{ label: "Tiếng Việt", value: "vi" }, { label: "English", value: "en" }]}
              onChange={(v) => updateSetting("language", v)}
            />
            <SettingItem label="Múi giờ" icon={MapPin} value={settings.timezone} onClick={() => toast.info("Sắp ra mắt")} />
            <SelectItem<DateFormat>
              label="Định dạng ngày"
              icon={Calendar}
              value={settings.dateFormat}
              options={[
                { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
                { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
                { label: "YYYY-MM-DD", value: "YYYY-MM-DD" }
              ]}
              onChange={(v) => updateSetting("dateFormat", v)}
            />
            <SelectItem<Currency>
              label="Đơn vị tiền"
              icon={Globe}
              value={settings.currency}
              options={[{ label: "VND", value: "VND" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }]}
              onChange={(v) => updateSetting("currency", v)}
            />
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
          </Section>

          {/* 6. NÂNG CAO */}
          <Section title="NÂNG CAO" delay={0.25}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5" />
                  <span className="text-base font-semibold">API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500 font-mono">{showApiKey? settings.apiKey : "••••••••"}</span>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" aria-label={showApiKey? "Ẩn" : "Hiện"}>
                    {showApiKey? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {settings.apiKey && (
                    <button onClick={copyApiKey} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" aria-label="Copy">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <SettingItem label="Webhook" icon={Zap} value={settings.webhookUrl? "Đã kết nối" : "Chưa kết nối"} onClick={() => router.push("/settings/api")} />
          </Section>

          {/* 7. VỀ HUHA */}
          <Section title="VỀ HUHA" delay={0.3}>
            <SettingItem label="Phiên bản" icon={Info} value="1.0.0 (2026.04.28)" />
            <SettingItem label="Điều khoản dịch vụ" icon={Shield} onClick={() => window.open("https://huha.vn/terms", "_blank")} />
            <SettingItem label="Chính sách bảo mật" icon={Lock} onClick={() => window.open("https://huha.vn/privacy", "_blank")} />
            <SettingItem label="Liên hệ: support@huha.vn" icon={Mail} onClick={() => window.open("mailto:support@huha.vn")} />
            <SettingItem label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
          </Section>
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
const Section = memo(({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 overflow-hidden">
    <div className="px-5 pt-4 pb-2">
      <h2 className="text-[12px] font-bold text-zinc-500 tracking-wider">{title}</h2>
    </div>
    <div className="divide-y divide-zinc-100 dark:divide-zinc-900">{children}</div>
  </motion.div>
));
Section.displayName = "Section";

interface SettingItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}

const SettingItem = memo(({ label, icon: Icon, value, onClick, danger }: SettingItemProps) => (
  <button onClick={() => { vibrate(5); onClick?.(); }} className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 dark:active:bg-zinc-900 transition">
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${danger? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}`} />
      <span className={`text- font-medium ${danger? "text-red-500" : "text-zinc-900 dark:text-white"}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value && <span className="text-sm text-zinc-500">{value}</span>}
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </div>
  </button>
));
SettingItem.displayName = "SettingItem";

interface SelectItemProps<T extends string> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}

function SelectItem<T extends string>({ label, icon: Icon, value, options, onChange }: SelectItemProps<T>) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 dark:active:bg-zinc-900 transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <span className="text- font-medium text-zinc-900 dark:text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">{value}</span>
          <ChevronRight className={`w-4 h-4 text-zinc-400 transition ${open? "rotate-90" : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); vibrate(5); }}
                className="w-full text-left px-12 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm"
              >
                <span className={value === opt.label? "font-semibold text-[#0042B2]" : "text-zinc-700 dark:text-zinc-300"}>{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
SelectItem.displayName = "SelectItem";

interface ToggleItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleItem = memo(({ label, icon: Icon, checked, onChange }: ToggleItemProps) => (
  <div className="flex items-center justify-between px-5 py-4">
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
      <span className="text- font-medium text-zinc-900 dark:text-white">{label}</span>
    </div>
    <button
      onClick={() => { vibrate(5); onChange(!checked); }}
      className={`relative w-11 h-6 rounded-full transition ${checked? "bg-[#0042B2]" : "bg-zinc-300 dark:bg-zinc-700"}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <motion.div layout className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow ${checked? "left-5" : "left-0.5"}`} />
    </button>
  </div>
));
ToggleItem.displayName = "ToggleItem";

interface TimeRangeValue {
  enabled: boolean;
  from: string;
  to: string;
}

interface TimeRangeItemProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  from: string;
  to: string;
  onChange: (value: TimeRangeValue) => void;
}

const TimeRangeItem = memo(({ label, icon: Icon, enabled, from, to, onChange }: TimeRangeItemProps) => (
  <div className="px-5 py-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        <span className="text- font-medium text-zinc-900 dark:text-white">{label}</span>
      </div>
      <button
        onClick={() => onChange({ enabled:!enabled, from, to })}
        className={`relative w-11 h-6 rounded-full transition ${enabled? "bg-[#0042B2]" : "bg-zinc-300 dark:bg-zinc-700"}`}
        role="switch"
        aria-checked={enabled}
      >
        <motion.div layout className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow ${enabled? "left-5" : "left-0.5"}`} />
      </button>
    </div>
    {enabled && (
      <div className="ml-8 flex items-center gap-2">
        <input
          type="time"
          value={from}
          onChange={(e) => onChange({ enabled, from: e.target.value, to })}
          className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm"
          aria-label="Từ giờ"
        />
        <span className="text-zinc-500">đến</span>
        <input
          type="time"
          value={to}
          onChange={(e) => onChange({ enabled, from, to: e.target.value })}
          className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm"
          aria-label="Đến giờ"
        />
      </div>
    )}
  </div>
));
TimeRangeItem.displayName = "TimeRangeItem";

interface ModalProps {
  title: string;
  desc: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  danger?: boolean;
}

const Modal = memo(({ title, desc, onClose, onConfirm, confirmText, danger }: ModalProps) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={onClose}>
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-t-3xl p-6">
      <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 mb-6">{desc}</p>
      <button onClick={() => { vibrate(5); onConfirm(); }} className={`w-full h-12 rounded-2xl font-semibold mb-3 active:scale-95 transition ${danger? "bg-red-500 text-white" : "bg-[#0042B2] text-white"}`}>{confirmText}</button>
      <button onClick={onClose} className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold active:scale-95 transition">Hủy</button>
    </motion.div>
  </motion.div>
));
Modal.displayName = "Modal";
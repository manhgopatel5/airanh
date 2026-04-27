"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { doc, updateDoc, onSnapshot, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { signOut, deleteUser } from "firebase/auth";
import {
  ChevronLeft, Moon, Sun, Palette, Bell, Clock, Mail,
  Eye, EyeOff, UserX, Shield, Lock, Smartphone, Key, Trash2,
  Globe, DollarSign, Download, Zap, Database, Info, LogOut,
  ChevronRight, Monitor, Languages, MapPin, Calendar,
  MessageSquare, Users, AtSign, UserCheck, SmartphoneNfc
} from "lucide-react";
import { toast, Toaster } from "sonner";

type Settings = {
  // 1. Giao diện
  theme: "light" | "dark" | "system";
  accentTask: "blue" | "indigo" | "purple";
  accentPlan: "green" | "emerald" | "teal";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  reduceMotion: boolean;

  // 2. Thông báo
  notiTaskAssigned: boolean;
  notiTaskDue: boolean;
  notiPlanInvite: boolean;
  notiPlanDeadline: boolean;
  notiChatMention: boolean;
  notiChatAll: boolean;
  emailDigest: "off" | "daily" | "weekly";
  quietHours: { enabled: boolean; from: string; to: string };

  // 3. Quyền riêng tư
  hideOnline: boolean;
  hideLastSeen: boolean;
  hidePhone: boolean;
  hideEmail: boolean;
  allowStrangers: "everyone" | "contacts" | "none";
  blockedUsers: string[];

  // 4. Dữ liệu & Lưu trữ
  language: "vi" | "en";
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  currency: "VND" | "USD" | "EUR";
  autoDeleteMsg: "off" | "7d" | "30d" | "90d";

  // 5. Nâng cao
  apiKey?: string;
  webhookUrl?: string;
};

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accentTask: "blue",
  accentPlan: "green",
  fontSize: "medium",
  compactMode: false,
  reduceMotion: false,
  notiTaskAssigned: true,
  notiTaskDue: true,
  notiPlanInvite: true,
  notiPlanDeadline: true,
  notiChatMention: true,
  notiChatAll: false,
  emailDigest: "off",
  quietHours: { enabled: true, from: "22:00", to: "07:00" },
  hideOnline: false,
  hideLastSeen: false,
  hidePhone: false,
  hideEmail: false,
  allowStrangers: "everyone",
  blockedUsers: [],
  language: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  dateFormat: "DD/MM/YYYY",
  currency: "VND",
  autoDeleteMsg: "off",
};

export default function SettingsPage() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const router = useRouter();
  const { user } = useAuth();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<any[]>([]);
  const [storage, setStorage] = useState({ used: 0, total: 100 });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);

  const accentGradient = isPlan
 ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-500";

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
    });
    return () => unsub();
  }, [user?.uid]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!user) return;
    const newSettings = {...settings, [key]: value };
    setSettings(newSettings);
    await updateDoc(doc(db, "users", user.uid), { settings: newSettings });
    toast.success("Đã cập nhật");
    if ("vibrate" in navigator) navigator.vibrate(5);
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
    a.href = url;
    a.download = `air-data-${user.uid}.json`;
    a.click();
    toast.success("Đã tải xuống");
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    updateDoc(doc(db, "users", user.uid), {
      online: false,
      lastSeen: serverTimestamp(), // FIX: dùng serverTimestamp thay vì new Date()
    }).catch(() => {});
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

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Cài đặt</h1>
      </div>

      <div className="px-6 space-y-7">
        {/* 1. GIAO DIỆN */}
        <Section title="GIAO DIỆN">
          <SelectItem
            label="Chế độ"
            icon={settings.theme === "dark"? Moon : settings.theme === "light"? Sun : Monitor}
            value={settings.theme === "system"? "Hệ thống" : settings.theme === "dark"? "Tối" : "Sáng"}
            options={[
              { label: "Sáng", value: "light" },
              { label: "Tối", value: "dark" },
              { label: "Hệ thống", value: "system" },
            ]}
            onChange={(v) => updateSetting("theme", v as any)}
          />
          <SelectItem
            label="Màu Task"
            icon={Palette}
            value={settings.accentTask === "blue"? "Xanh dương" : settings.accentTask === "indigo"? "Chàm" : "Tím"}
            options={[
              { label: "Xanh dương", value: "blue" },
              { label: "Chàm", value: "indigo" },
              { label: "Tím", value: "purple" },
            ]}
            onChange={(v) => updateSetting("accentTask", v as any)}
          />
          <SelectItem
            label="Màu Plan"
            icon={Palette}
            value={settings.accentPlan === "green"? "Xanh lá" : settings.accentPlan === "emerald"? "Ngọc lục bảo" : "Xanh mòng két"}
            options={[
              { label: "Xanh lá", value: "green" },
              { label: "Ngọc lục bảo", value: "emerald" },
              { label: "Xanh mòng két", value: "teal" },
            ]}
            onChange={(v) => updateSetting("accentPlan", v as any)}
          />
          <SelectItem
            label="Cỡ chữ"
            icon={Globe}
            value={settings.fontSize === "small"? "Nhỏ" : settings.fontSize === "large"? "Lớn" : "Vừa"}
            options={[
              { label: "Nhỏ", value: "small" },
              { label: "Vừa", value: "medium" },
              { label: "Lớn", value: "large" },
            ]}
            onChange={(v) => updateSetting("fontSize", v as any)}
          />
          <ToggleItem
            label="Chế độ gọn"
            icon={Zap}
            checked={settings.compactMode}
            onChange={(v) => updateSetting("compactMode", v)}
          />
          <ToggleItem
            label="Giảm chuyển động"
            icon={Zap}
            checked={settings.reduceMotion}
            onChange={(v) => updateSetting("reduceMotion", v)}
          />
        </Section>

        {/* 2. THÔNG BÁO */}
        <Section title="THÔNG BÁO">
          <ToggleItem
            label="Task được giao"
            icon={Bell}
            checked={settings.notiTaskAssigned}
            onChange={(v) => updateSetting("notiTaskAssigned", v)}
          />
          <ToggleItem
            label="Task sắp hết hạn"
            icon={Bell}
            checked={settings.notiTaskDue}
            onChange={(v) => updateSetting("notiTaskDue", v)}
          />
          <ToggleItem
            label="Mời vào Plan"
            icon={Bell}
            checked={settings.notiPlanInvite}
            onChange={(v) => updateSetting("notiPlanInvite", v)}
          />
          <ToggleItem
            label="Plan sắp deadline"
            icon={Bell}
            checked={settings.notiPlanDeadline}
            onChange={(v) => updateSetting("notiPlanDeadline", v)}
          />
          <ToggleItem
            label="Nhắc đến trong chat"
            icon={AtSign}
            checked={settings.notiChatMention}
            onChange={(v) => updateSetting("notiChatMention", v)}
          />
          <ToggleItem
            label="Tất cả tin nhắn"
            icon={MessageSquare}
            checked={settings.notiChatAll}
            onChange={(v) => updateSetting("notiChatAll", v)}
          />
          <SelectItem
            label="Email tóm tắt"
            icon={Mail}
            value={settings.emailDigest === "off"? "Tắt" : settings.emailDigest === "daily"? "Hàng ngày" : "Hàng tuần"}
            options={[
              { label: "Tắt", value: "off" },
              { label: "Hàng ngày", value: "daily" },
              { label: "Hàng tuần", value: "weekly" },
            ]}
            onChange={(v) => updateSetting("emailDigest", v as any)}
          />
          <TimeRangeItem
            label="Giờ im lặng"
            icon={Clock}
            enabled={settings.quietHours.enabled}
            from={settings.quietHours.from}
            to={settings.quietHours.to}
            onChange={(v) => updateSetting("quietHours", v)}
          />
        </Section>

        {/* 3. QUYỀN RIÊNG TƯ */}
        <Section title="QUYỀN RIÊNG TƯ">
          <ToggleItem
            label="Ẩn trạng thái online"
            icon={settings.hideOnline? EyeOff : Eye}
            checked={settings.hideOnline}
            onChange={(v) => updateSetting("hideOnline", v)}
          />
          <ToggleItem
            label="Ẩn lần cuối online"
            icon={settings.hideLastSeen? EyeOff : Eye}
            checked={settings.hideLastSeen}
            onChange={(v) => updateSetting("hideLastSeen", v)}
          />
          <ToggleItem
            label="Ẩn số điện thoại"
            icon={settings.hidePhone? EyeOff : Eye}
            checked={settings.hidePhone}
            onChange={(v) => updateSetting("hidePhone", v)}
          />
          <ToggleItem
            label="Ẩn email"
            icon={settings.hideEmail? EyeOff : Eye}
            checked={settings.hideEmail}
            onChange={(v) => updateSetting("hideEmail", v)}
          />
          <SelectItem
            label="Ai được nhắn tin"
            icon={Users}
            value={settings.allowStrangers === "everyone"? "Mọi người" : settings.allowStrangers === "contacts"? "Danh bạ" : "Không ai"}
            options={[
              { label: "Mọi người", value: "everyone" },
              { label: "Danh bạ", value: "contacts" },
              { label: "Không ai", value: "none" },
            ]}
            onChange={(v) => updateSetting("allowStrangers", v as any)}
          />
          <SettingItem
            label={`Đã chặn ${settings.blockedUsers.length} người`}
            icon={UserX}
            onClick={() => router.push("/settings/blocked")}
          />
        </Section>

        {/* 4. TÀI KHOẢN */}
        <Section title="TÀI KHOẢN">
          <SettingItem
            label="Đổi email"
            icon={Mail}
            value={user?.email}
            onClick={() => router.push("/settings/change-email")}
          />
          <SettingItem
            label="Đổi số điện thoại"
            icon={Smartphone}
            onClick={() => router.push("/settings/change-phone")}
          />
          <SettingItem
            label="Đổi mật khẩu"
            icon={Lock}
            onClick={() => router.push("/settings/change-password")}
          />
          <SettingItem
            label="Xác thực 2 lớp"
            icon={Key}
            value={tfaEnabled? "Đã bật" : "Tắt"}
            onClick={() => router.push("/settings/2fa")} // FIX: Thêm link
          />
          <SettingItem
            label={`Phiên đăng nhập (${sessions.length})`}
            icon={Shield}
            onClick={() => router.push("/settings/sessions")}
          />
          <SettingItem
            label="Đăng xuất tất cả thiết bị"
            icon={LogOut}
            onClick={logoutAllDevices}
            danger
          />
          <SettingItem
            label="Xóa tài khoản"
            icon={Trash2}
            onClick={() => setShowDeleteModal(true)}
            danger
          />
        </Section>

        {/* 5. DỮ LIỆU & LƯU TRỮ */}
        <Section title="DỮ LIỆU & LƯU TRỮ">
          <SelectItem
            label="Ngôn ngữ"
            icon={Languages}
            value={settings.language === "vi"? "Tiếng Việt" : "English"}
            options={[
              { label: "Tiếng Việt", value: "vi" },
              { label: "English", value: "en" },
            ]}
            onChange={(v) => updateSetting("language", v as any)}
          />
          <SettingItem
            label="Múi giờ"
            icon={MapPin}
            value={settings.timezone}
            onClick={() => toast.info("Sắp ra mắt")}
          />
          <SelectItem
            label="Định dạng ngày"
            icon={Calendar}
            value={settings.dateFormat}
            options={[
              { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
              { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
              { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
            ]}
            onChange={(v) => updateSetting("dateFormat", v as any)}
          />
          <SelectItem
            label="Đơn vị tiền"
            icon={DollarSign}
            value={settings.currency}
            options={[
              { label: "VND", value: "VND" },
              { label: "USD", value: "USD" },
              { label: "EUR", value: "EUR" },
            ]}
            onChange={(v) => updateSetting("currency", v as any)}
          />
          <SelectItem
            label="Tự xóa tin nhắn"
            icon={Trash2}
            value={settings.autoDeleteMsg === "off"? "Tắt" : settings.autoDeleteMsg === "7d"? "7 ngày" : settings.autoDeleteMsg === "30d"? "30 ngày" : "90 ngày"}
            options={[
              { label: "Tắt", value: "off" },
              { label: "7 ngày", value: "7d" },
              { label: "30 ngày", value: "30d" },
              { label: "90 ngày", value: "90d" },
            ]}
            onChange={(v) => updateSetting("autoDeleteMsg", v as any)}
          />
          <SettingItem
            label={`Dung lượng: ${(storage.used).toFixed(1)}MB / ${storage.total}MB`}
            icon={Database}
            onClick={() => router.push("/settings/storage")}
          />
          <SettingItem
            label="Xuất dữ liệu của tôi"
            icon={Download}
            onClick={exportData}
          />
          <SettingItem
            label="Xóa bộ nhớ đệm"
            icon={Trash2}
            onClick={clearCache}
            danger
          />
        </Section>

        {/* 6. NÂNG CAO */}
        <Section title="NÂNG CAO">
          <SettingItem
            label="API Key"
            icon={Key}
            value={settings.apiKey? "••••••••" : "Chưa tạo"}
            onClick={() => router.push("/settings/api")}
          />
          <SettingItem
            label="Webhook"
            icon={Zap}
            value={settings.webhookUrl? "Đã kết nối" : "Chưa kết nối"}
            onClick={() => router.push("/settings/api")}
          />
        </Section>

        {/* 7. VỀ AIRANH */}
        <Section title="VỀ AIRANH">
          <SettingItem
            label="Phiên bản"
            icon={Info}
            value="1.0.0 (Build 2026.04.28)"
          />
          <SettingItem
            label="Điều khoản dịch vụ"
            icon={Shield}
            onClick={() => window.open("https://air.vn/terms", "_blank")}
          />
          <SettingItem
            label="Chính sách bảo mật"
            icon={Lock}
            onClick={() => window.open("https://air.vn/privacy", "_blank")}
          />
          <SettingItem
            label="Liên hệ: support@air.vn"
            icon={Mail}
            onClick={() => window.open("mailto:support@air.vn", "_blank")}
          />
          <SettingItem
            label="Hotline: 1900 1234"
            icon={Smartphone}
            onClick={() => window.open("tel:19001234", "_blank")}
          />
          <SettingItem
            label="Đăng xuất"
            icon={LogOut}
            onClick={() => setShowLogoutModal(true)}
            danger
          />
        </Section>
      </div>

      {showLogoutModal && (
        <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}

      {showDeleteModal && (
        <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">{title}</div>
      {children}
    </div>
  );
}

function SettingItem({
  label,
  icon: Icon,
  value,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ElementType;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      className="w-full flex items-center justify-between py-4 active:opacity-50 transition"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger? "text-red-500" : "text-gray-900 dark:text-white"}`} />
        <span className={`text-base font-semibold ${danger? "text-red-500" : "text-gray-900 dark:text-white"}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-500 dark:text-zinc-400">{value}</span>}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  );
}

function SelectItem({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 active:opacity-50 transition"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
          <span className="text-base font-semibold text-gray-900 dark:text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">{value}</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition ${open? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="ml-8 mb-2 space-y-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 transition"
            >
              <span className={`text-sm ${value === opt.label? "font-bold text-sky-600 dark:text-sky-400" : "text-gray-700 dark:text-zinc-300"}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleItem({
  label,
  icon: Icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="w-full flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
        <span className="text-base font-semibold text-gray-900 dark:text-white">{label}</span>
      </div>
      <button
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(5);
          onChange(!checked);
        }}
        className={`w-11 h-6 rounded-full transition ${checked? "bg-green-500" : "bg-gray-300 dark:bg-zinc-700"}`}
      >
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${checked? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function TimeRangeItem({
  label,
  icon: Icon,
  enabled,
  from,
  to,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  from: string;
  to: string;
  onChange: (v: { enabled: boolean; from: string; to: string }) => void;
}) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
          <span className="text-base font-semibold text-gray-900 dark:text-white">{label}</span>
        </div>
        <button
          onClick={() => onChange({...{ enabled, from, to }, enabled:!enabled })}
          className={`w-11 h-6 rounded-full transition ${enabled? "bg-green-500" : "bg-gray-300 dark:bg-zinc-700"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${enabled? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <div className="ml-8 flex items-center gap-3">
          <input
            type="time"
            value={from}
            onChange={(e) => onChange({ enabled, from: e.target.value, to })}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-sm font-medium text-gray-900 dark:text-white"
          />
          <span className="text-gray-500 dark:text-zinc-400">đến</span>
          <input
            type="time"
            value={to}
            onChange={(e) => onChange({ enabled, from, to: e.target.value })}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-sm font-medium text-gray-900 dark:text-white"
          />
        </div>
      )}
    </div>
  );
}

function Modal({ title, desc, onClose, onConfirm, confirmText, danger }: { title: string; desc: string; onClose: () => void; onConfirm: () => void; confirmText: string; danger?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-t-3xl p-6 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-2xl font-semibold mb-3 active:scale-[0.98] transition ${danger? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full py-3.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl font-semibold">Hủy</button>
      </div>
    </div>
  );
}
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
  Globe, DollarSign, Download, Zap, Database, Info, LogOut,
  ChevronRight, Monitor, Languages, MapPin, Calendar,
  MessageSquare, Users, AtSign, QrCode
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

  // 2. Thông báo - chỉ giữ lại để check bật/tắt ở Settings
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

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<any[]>([]);
  const [storage, setStorage] = useState({ used: 0, total: 100 });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);

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
      lastSeen: serverTimestamp(),
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

  const isNotificationOn = settings.notiTaskAssigned || settings.notiChatMention || settings.notiPlanInvite;

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button onClick={() => router.back()} className="absolute left-4 p-1 active:opacity-60 transition">
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text- font-bold text-[#0F172A]">Cài đặt</h1>
        </div>
      </div>

      <div className="px-4 space-y-7 pt-4">
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

        {/* 2. THÔNG BÁO - CHUYỂN THÀNH LINK */}
        <Section title="THÔNG BÁO">
          <SettingItem
            label="Thông báo"
            icon={Bell}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            value={isNotificationOn? "Bật" : "Tắt"}
            onClick={() => router.push("/settings/notifications")}
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
            {...(user?.email? { value: user.email } : {})}
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
            onClick={() => router.push("/settings/2fa")}
          />
          <SettingItem
            label="Mã QR của tôi"
            icon={QrCode}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            onClick={() => router.push("/settings/qr")}
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
            label={`Dung lượng: ${storage.used.toFixed(1)}MB / ${storage.total}MB`}
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

        {/* 6. VỀ AIRANH */}
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
      <div className="text- font-bold text-[#64748B] tracking-wider mb-1">{title}</div>
      <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingItem({
  label,
  icon: Icon,
  value,
  iconBg = "bg-[#F1F5F9]",
  iconColor = "text-[#0F172A]",
  onClick,
  danger,
}: {
  label: string;
  icon: React.ElementType;
  value?: string;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(5);
        onClick?.();
      }}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white transition border-b border-gray-100 last:border-0"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          danger? "bg-red-50" : iconBg
        }`}
      >
        <Icon className={`w-5 h-5 ${danger? "text-red-500" : iconColor}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div
          className={`text- font-semibold ${
            danger? "text-red-500" : "text-[#0F172A]"
          }`}
        >
          {label}
        </div>
  </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {value && <span className="text- text-[#64748B]">{value}</span>}
        <ChevronRight className="w-5 h-5 text-[#CBD5E1]" />
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
    <div className="w-full border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white transition"
      >
        <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#0F172A]" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text- font-semibold text-[#0F172A]">{label}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text- text-[#64748B]">{value}</span>
          <ChevronRight className={`w-5 h-5 text-[#CBD5E1] transition ${open? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-2 space-y-1 bg-white">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl active:bg-[#F8FAFC] transition"
            >
              <span className={`text- ${value === opt.label? "font-bold text-blue-600" : "font-medium text-[#0F172A]"}`}>
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
    <div className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#0F172A]" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text- font-semibold text-[#0F172A]">{label}</div>
      </div>
      <button
        onClick={() => {
          if ("vibrate" in navigator) navigator.vibrate(5);
          onChange(!checked);
        }}
        className={`w-11 h-6 rounded-full transition flex-shrink-0 ${checked? "bg-green-500" : "bg-gray-300"}`}
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
    <div className="w-full border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#0F172A]" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text- font-semibold text-[#0F172A]">{label}</div>
        </div>
        <button
          onClick={() => onChange({...{ enabled, from, to }, enabled:!enabled })}
          className={`w-11 h-6 rounded-full transition flex-shrink-0 ${enabled? "bg-green-500" : "bg-gray-300"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${enabled? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <div className="px-4 pb-3 flex items-center gap-3 bg-white">
          <input
            type="time"
            value={from}
            onChange={(e) => onChange({ enabled, from: e.target.value, to })}
            className="flex-1 px-3 py-2 rounded-xl bg-[#F8FAFC] text- font-medium text-[#0F172A] outline-none"
          />
          <span className="text-[#64748B] text-">đến</span>
          <input
            type="time"
            value={to}
            onChange={(e) => onChange({ enabled, from, to: e.target.value })}
            className="flex-1 px-3 py-2 rounded-xl bg-[#F8FAFC] text- font-medium text-[#0F172A] outline-none"
          />
        </div>
      )}
    </div>
  );
}

function Modal({ title, desc, onClose, onConfirm, confirmText, danger }: { title: string; desc: string; onClose: () => void; onConfirm: () => void; confirmText: string; danger?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h3 className="text- font-bold text-[#0F172A] mb-2">{title}</h3>
        <p className="text- text-[#64748B] mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full h-12 rounded-2xl font-semibold mb-3 active:scale-95 transition ${danger? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full h-12 bg-[#F1F5F9] text-[#0F172A] rounded-2xl font-semibold active:scale-95 transition">Hủy</button>
      </div>
    </div>
  );
}
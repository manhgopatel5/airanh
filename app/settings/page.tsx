"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

import { doc, updateDoc, onSnapshot, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { signOut, deleteUser, updateProfile } from "firebase/auth";
import {
  ChevronLeft, Moon, Sun, Palette,
  Eye, EyeOff, UserX, Shield, Lock, Smartphone, Trash2,
  Globe, DollarSign, Zap, Info, LogOut,
  ChevronRight, Mail, Monitor, Languages, MapPin, Calendar, Users, User2, X
} from "lucide-react";
import { toast, Toaster } from "sonner";

type Settings = {
  theme: "light" | "dark" | "system";
  accentTask: "blue" | "indigo" | "purple";
  accentPlan: "green" | "emerald" | "teal";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  reduceMotion: boolean;
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
};

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  accentTask: "blue",
  accentPlan: "green",
  fontSize: "medium",
  compactMode: false,
  reduceMotion: false,
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({...DEFAULT_SETTINGS,...data.settings });
        setDisplayName(data.displayName || data.name || user.displayName || "");
      }
    });
    return () => unsub();
  }, [user?.uid, user?.displayName]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!user) return;
    const newSettings = {...settings, [key]: value };
    setSettings(newSettings);
    await updateDoc(doc(db, "users", user.uid), { settings: newSettings });
    toast.success("Đã cập nhật");
    if ("vibrate" in navigator) navigator.vibrate(5);
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

  const saveDisplayName = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      toast.error("Tên phải có ít nhất 2 ký tự");
      return;
    }
    if (trimmed.length > 30) {
      toast.error("Tên không quá 30 ký tự");
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      await updateDoc(doc(db, "users", user.uid), {
        displayName: trimmed,
        name: trimmed,
        nameLower: trimmed.toLowerCase(),
        searchKeywords: trimmed.toLowerCase().split(/\s+/).filter(Boolean),
        updatedAt: serverTimestamp(),
      });
      toast.success("Đã cập nhật tên hiển thị");
      setShowNameModal(false);
      if ("vibrate" in navigator) navigator.vibrate(5);
    } catch {
      toast.error("Không lưu được tên");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button onClick={() => router.back()} className="absolute left-4 p-1 active:opacity-60 transition">
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text- font-bold text-[#0F172A]">Cài đặt</h1>
        </div>
      </div>

      <div className="px-4 space-y-7 pt-4">
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
        </Section>

        <Section title="TÀI KHOẢN">
          <SettingItem
            label="Tên hiển thị"
            icon={User2}
            value={displayName || "Chưa đặt"}
            onClick={() => setShowNameModal(true)}
          />
          <SettingItem
            label="Chỉnh sửa hồ sơ"
            icon={User2}
            onClick={() => router.push("/settings/profile-edit")}
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

        <Section title="VỀ AIRANH">
          <SettingItem
            label="Phiên bản"
            icon={Info}
            value="1.0.0 (Build 2026.04.28)"
          />
        <SettingItem
    label="Điều khoản dịch vụ"
    icon={Shield}
    onClick={() => router.push("/terms")} // Sửa dòng này
  />
  <SettingItem
    label="Chính sách bảo mật"
    icon={Lock}
    onClick={() => router.push("/privacy")} // Sửa dòng này
  />
          <SettingItem
            label="Liên hệ: manhgopatel5@gmail.com"
            icon={Mail}
            onClick={() => window.open("mailto:support@air.vn", "_blank")}
          />
          <SettingItem
            label="Hotline: 035 987 2122"
            icon={Smartphone}
            onClick={() => window.open("tel:0359872122", "_blank")}
          />
        </Section>
      </div>

      {showLogoutModal && (
        <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}

      {showDeleteModal && (
        <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}

      {showNameModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setShowNameModal(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Đổi tên hiển thị</h3>
              <button onClick={() => setShowNameModal(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder="Nhập tên hiển thị"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-4"
              autoFocus
            />
            <button
              onClick={saveDisplayName}
              disabled={savingName}
              className="w-full h-12 rounded-2xl font-semibold bg-blue-500 text-white mb-3 active:scale-95 transition disabled:opacity-50"
            >
              {savingName ? "Đang lưu..." : "Lưu"}
            </button>
            <button onClick={() => setShowNameModal(false)} className="w-full h-12 bg-[#F1F5F9] text-[#0F172A] rounded-2xl font-semibold active:scale-95 transition">
              Hủy
            </button>
          </div>
        </div>
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
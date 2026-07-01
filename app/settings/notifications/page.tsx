"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Bell, Clock, Mail, AtSign, MessageSquare, Zap, Smartphone, UserPlus } from "lucide-react";
import { requestFcmReregister } from "@/components/FCMProvider";
import { enablePushNotifications } from "@/lib/fcmRegister";
import { readPushPermission } from "@/lib/pushPermissions";
import { toast, Toaster } from "sonner";

type NotificationSettings = {
  notiTaskAssigned: boolean;
  notiTaskDue: boolean;
  notiPlanInvite: boolean;
  notiPlanDeadline: boolean;
  notiChatMention: boolean;
  notiChatAll: boolean;
  notiFriendRequest: boolean;
  notiFriendAccepted: boolean;
  emailDigest: "off" | "daily" | "weekly";
  quietHours: { enabled: boolean; from: string; to: string };
};

export default function NotificationsPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    notiTaskAssigned: true,
    notiTaskDue: true,
    notiPlanInvite: true,
    notiPlanDeadline: true,
    notiChatMention: true,
    notiChatAll: false,
    notiFriendRequest: true,
    notiFriendAccepted: true,
    emailDigest: "off",
    quietHours: { enabled: false, from: "22:00", to: "07:00" },
  });
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
  }, []);

  const requestPushPermission = useCallback(async () => {
    const result = await enablePushNotifications();
    const p = readPushPermission();
    setPushPermission(
      p === "granted" || p === "denied" || p === "default" ? p : "unsupported"
    );
    if (result.success) {
      toast.success(result.message);
      requestFcmReregister();
    } else {
      toast.error(result.message, { duration: 5000 });
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data().settings || {};
        setSettings((prev) => ({...prev,...data }));
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const updateSetting = async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    if (!user) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [`settings.${key}`]: value,
      });
      toast.success("Đã cập nhật");
      if ("vibrate" in navigator) navigator.vibrate(5);
    } catch (err) {
      console.error(err);
      toast.error("Không lưu được cài đặt");
      setSettings(settings);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="absolute left-4 p-1 active:opacity-60 transition"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text- font-bold text-[#0F172A]">Thông báo</h1>
        </div>
      </div>

      <div className="px-4 space-y-7 pt-4">
        <Section title="THIẾT BỊ">
          <button
            type="button"
            onClick={requestPushPermission}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 active:bg-white"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-[#0F172A]" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-[#0F172A]">Quyền thông báo đẩy</div>
              <div className="text-xs text-zinc-500">
                {pushPermission === "granted"
                  ? "Đã bật"
                  : pushPermission === "denied"
                    ? "Đã từ chối — bật lại trong cài đặt trình duyệt"
                    : pushPermission === "unsupported"
                      ? "Không hỗ trợ"
                      : "Chưa bật"}
              </div>
            </div>
          </button>
        </Section>

        <Section title="PUSH THÔNG BÁO">
          <ToggleItem
            label="Task được giao cho bạn"
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
            label="Lời mời vào Plan"
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
        </Section>

        <Section title="BẠN BÈ">
          <ToggleItem
            label="Lời mời kết bạn"
            icon={UserPlus}
            checked={settings.notiFriendRequest ?? true}
            onChange={(v) => updateSetting("notiFriendRequest", v)}
          />
          <ToggleItem
            label="Được chấp nhận kết bạn"
            icon={UserPlus}
            checked={settings.notiFriendAccepted ?? true}
            onChange={(v) => updateSetting("notiFriendAccepted", v)}
          />
        </Section>

        <Section title="TIN NHẮN">
          <ToggleItem
            label="Nhắc đến bạn @mention"
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
        </Section>

        <Section title="EMAIL">
          <SelectItem
            label="Email tóm tắt"
            icon={Mail}
            value={
              settings.emailDigest === "off"
               ? "Tắt"
                : settings.emailDigest === "daily"
               ? "Hàng ngày"
                : "Hàng tuần"
            }
            options={[
              { label: "Tắt", value: "off" },
              { label: "Hàng ngày", value: "daily" },
              { label: "Hàng tuần", value: "weekly" },
            ]}
            onChange={(v) => updateSetting("emailDigest", v as any)}
          />
        </Section>

        <Section title="GIỜ IM LẶNG">
          <TimeRangeItem
            label="Không làm phiền"
            icon={Clock}
            enabled={settings.quietHours.enabled}
            from={settings.quietHours.from}
            to={settings.quietHours.to}
            onChange={(v) => updateSetting("quietHours", v)}
          />
        </Section>
      </div>
    </div>
  );
}

// Copy 4 component helper từ file settings/page.tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text- font-bold text-[#64748B] tracking-wider mb-1">{title}</div>
      <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden">{children}</div>
    </div>
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
          <Zap className={`w-5 h-5 text-[#CBD5E1] transition ${open? "rotate-90" : ""}`} />
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
              <span
                className={`text- ${
                  value === opt.label
                   ? "font-bold text-blue-600"
                    : "font-medium text-[#0F172A]"
                }`}
              >
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
        className={`w-11 h-6 rounded-full transition flex-shrink-0 ${
          checked? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
            checked? "translate-x-5" : "translate-x-0.5"
          }`}
        />
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
onClick={() => onChange({ enabled:!enabled, from, to })}
          className={`w-11 h-6 rounded-full transition flex-shrink-0 ${
            enabled? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
              enabled? "translate-x-5" : "translate-x-0.5"
            }`}
          />
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
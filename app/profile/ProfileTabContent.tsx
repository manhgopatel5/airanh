"use client";
import { onProfileUpdate } from "@/lib/xp";
import { useRouter } from "next/navigation";
import { Database, Trophy, Users, Crown, ChevronRight } from "lucide-react";
import { signOut, updateProfile } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";

import {
  HelpCircle,
  LogOut,
  User,
  Shield,
  Lock,
  Camera,
  Check,
  QrCode,
  Share2,
  Settings,
  Circle,
  Bell,
  Mail,
  Phone,
  Monitor,
  Ban,
  HardDrive,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { nanoid } from "nanoid";

import SettingItem from "@/components/common/SettingItem";
import ProfileModal from "@/components/common/ProfileModal";
import AvatarCropModal from "@/components/profile/AvatarCropModal";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

import type { UserData } from "@/types/user";
import { buildGamificationUser } from "@/lib/gamification";
import Image from "next/image";

export default function ProfileTabContent() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const router = useRouter();
  const { user } = useAuth();

  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [showNameModal, setShowNameModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const hasCheckedId = useRef(false);

  const {
    uploading,
    uploadProgress,
    uploadAvatar,
    cancelUpload,
  } = useAvatarUpload(user);

  const accentGradient = isPlan
   ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";
const ADMIN_EMAILS = ["justastormyday@gmail.com", "hongann2210@gmail.com"];
  // Ẩn nav bar khi modal mở - FIX SSR
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldHide = showNameModal || showAvatarModal || showCropModal || showLogoutModal;
    document.body.classList.toggle('modal-open', shouldHide);

    return () => document.body.classList.remove('modal-open');
  }, [showNameModal, showAvatarModal, showCropModal, showLogoutModal]);

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (!snap.exists()) return;

        const data = {
          uid: snap.id,
         ...snap.data(),
        } as UserData;

        setUserData(data);

        setDisplayName(
          data.displayName ||
            user.email?.split("@")[0] ||
            `User${data.userId?.slice(-4) || user.uid.slice(0, 4)}`
        );

        if (
          user &&
         !user.emailVerified &&
         !data.emailVerified
        ) {
          router.replace("/verify-email");
        }
      }
    );

    return () => unsub();
  }, [user?.uid, router, db, user]);

  useEffect(() => {
    if (!user ||!userData || hasCheckedId.current) return;

    if (userData.userId) {
      hasCheckedId.current = true;
      return;
    }

    const createId = async () => {
      hasCheckedId.current = true;

      let newId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;

      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", newId));

        if (!snap.exists()) break;

        newId = `AIR${nanoid(6).toUpperCase()}`;
        attempts++;
      }

      await Promise.all([
        updateDoc(doc(db, "users", user.uid), {
          userId: newId,
        }),

        setDoc(doc(db, "usernames", newId), {
          uid: user.uid,
        }),
      ]);
    };

    createId().catch(() => {});
  }, [user, userData, db]);

  const canChangeName = () => {
    if (!userData?.lastNameChangeAt) {
      return { allowed: true };
    }

    const lastChange =
      userData.lastNameChangeAt.toDate();

    const threeMonthsAgo = new Date();

    threeMonthsAgo.setMonth(
      threeMonthsAgo.getMonth() - 3
    );

    if (lastChange > threeMonthsAgo) {
      const nextChange = new Date(lastChange);

      nextChange.setMonth(
        nextChange.getMonth() + 3
      );

      return {
        allowed: false,
        nextDate: nextChange.toLocaleDateString("vi-VN"),
      };
    }

    return { allowed: true };
  };

  const canChangeAvatar = () => {
    if (!userData?.lastAvatarChangeAt) {
      return { allowed: true };
    }

    const lastChange =
      userData.lastAvatarChangeAt.toDate();

    const threeMonthsAgo = new Date();

    threeMonthsAgo.setMonth(
      threeMonthsAgo.getMonth() - 3
    );

    if (lastChange > threeMonthsAgo) {
      const nextChange = new Date(lastChange);

      nextChange.setMonth(
        nextChange.getMonth() + 3
      );

      return {
        allowed: false,
        nextDate: nextChange.toLocaleDateString("vi-VN"),
      };
    }

    return { allowed: true };
  };

  const validateRealName = (
    name: string
  ): string | null => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      return "Tên tối thiểu 2 ký tự";
    }

    if (trimmed.length > 50) {
      return "Tên tối đa 50 ký tự";
    }

    const regex =
      /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềểếỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s\d]+$/;

    if (!regex.test(trimmed)) {
      return "Tên chỉ được chứa chữ cái, số và dấu cách";
    }

    if (/\s{2,}/.test(trimmed)) {
      return "Không được có 2 dấu cách liên tiếp";
    }

    return null;
  };

  const handleOpenNameModal = () => {
    const check = canChangeName();

    if (!check.allowed) {
      toast.error(
        `Bạn chỉ được đổi tên 1 lần mỗi 3 tháng. Lần đổi tiếp: ${check.nextDate}`
      );

      return;
    }

    setShowNameModal(true);
  };



const handleUpdateName = async () => {
  if (!user) return;

  const error = validateRealName(displayName);
  if (error) {
    toast.error(error);
    return;
  }

  const newName = displayName.trim();
  if (newName === userData?.displayName) {
    setShowNameModal(false);
    return;
  }

  const oldName = userData?.displayName;
  setShowNameModal(false);

  setUserData((prev) =>
    prev
     ? {
         ...prev,
          displayName: newName,
        }
      : null
  );

  try {
    await Promise.all([
      updateProfile(user, {
        displayName: newName,
      }),

      updateDoc(doc(db, "users", user.uid), {
        displayName: newName,
        nameLower: newName.toLowerCase(),
        lastNameChangeAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ]);

    // CỘNG XP KHI SAVE PROFILE THÀNH CÔNG
    await onProfileUpdate(user.uid); // +100 XP

    await user.reload();

    toast.success(
      "Cập nhật tên thành công. +100 XP. Bạn có thể đổi lại sau 3 tháng"
    );

    if ("vibrate" in navigator) {
      navigator.vibrate(8);
    }
  } catch {
    toast.error("Cập nhật thất bại");

    setUserData((prev) =>
      prev
       ? {
           ...prev,
            displayName: oldName || "",
          }
        : null
    );

    setDisplayName(oldName || "");
  }
};

  const handleAvatarClick = (
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    const check = canChangeAvatar();

    if (!check.allowed) {
      toast.error(
        `Bạn chỉ được đổi avatar 1 lần mỗi 3 tháng. Lần đổi tiếp: ${check.nextDate}`
      );

      return;
    }

    setShowAvatarModal(true);
  };

  const handleAvatarFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 20MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setCropImageSrc(objectUrl);
    setShowAvatarModal(false);
    setShowCropModal(true);

    e.target.value = "";
  };

  const handleCropComplete = async (
    croppedBlob: Blob
  ) => {
    setShowCropModal(false);

    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }

    setCropImageSrc(null);

    const file = new File(
      [croppedBlob],
      "avatar.webp",
      {
        type: "image/webp",
      }
    );

    try {
      await uploadAvatar(file);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      cancelUpload();

      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
      }
    };
  }, [cancelUpload, cropImageSrc]);

  const handleLogout = async () => {
    if (!user) return;

    setShowLogoutModal(false);

    updateDoc(doc(db, "users", user.uid), {
      online: false,
      lastSeen: serverTimestamp(),
    }).catch(() => {});

    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const updateOnline = () =>
      updateDoc(doc(db, "users", user.uid), {
        online: true,
      }).catch(() => {});

    const updateOffline = () =>
      updateDoc(doc(db, "users", user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    const handleVisibility = () => {
      if (document.hidden) {
        updateOffline();
      } else {
        updateOnline();
      }
    };

    updateOnline();

    window.addEventListener(
      "beforeunload",
      updateOffline
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      updateOffline();

      window.removeEventListener(
        "beforeunload",
        updateOffline
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [user?.uid, db]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
        setShowNameModal(false);
        setShowAvatarModal(false);
        setShowCropModal(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );
  }, []);

  if (!user ||!userData) {
    return null;
  }

  const finalDisplayName =
    userData.displayName ||
    user.email?.split("@")[0] ||
    `User${
      userData.userId?.slice(-4) ||
      user.uid.slice(0, 4)
    }`;

  const gamification = buildGamificationUser(userData as unknown as Record<string, unknown>, user.uid);
  const xpPercent = gamification.nextLevelExp
    ? Math.min(100, Math.round((gamification.exp / gamification.nextLevelExp) * 100))
    : 0;

  const avatarUrl =
    userData.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      finalDisplayName
    )}&size=176&background=0A84FF&color=fff&bold=true`;

  const quickActions = [
    { label: "Chỉnh sửa hồ sơ", href: "/settings/profile-edit", icon: User, color: "text-blue-500" },
    { label: "Bạn bè", href: "/friends", icon: Users, color: "text-indigo-500" },
    { label: "Thành tích", href: `/profile/${user.uid}`, icon: Trophy, color: "text-amber-500" },
    { label: "VIP", href: "/vip", icon: Crown, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-dvh bg-[#F4F6FA] dark:bg-[#09090B] font-sans text-zinc-950 dark:text-white">
      <div className="pb-32 overflow-y-auto">
        <div className="relative overflow-hidden">
          <div className={`h-36 bg-gradient-to-br ${accentGradient}`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
        </div>

        <div className="px-4 -mt-16 relative z-10">
          <div className="rounded-[1.75rem] bg-white dark:bg-zinc-950 p-5 shadow-xl shadow-black/[0.06] ring-1 ring-black/[0.04] dark:ring-white/10">
            <div className="flex items-end gap-4">
              <div onClick={handleAvatarClick} className="group relative shrink-0 cursor-pointer -mt-12">
                <Image
                  src={avatarUrl}
                  alt={finalDisplayName}
                  width={88}
                  height={88}
                  className="h-[88px] w-[88px] rounded-[1.4rem] object-cover ring-4 ring-white dark:ring-zinc-950 shadow-xl"
                />
                {userData.emailVerified && (
                  <div className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${accentGradient} ring-4 ring-white dark:ring-zinc-950`}>
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-[1.4rem] bg-black/45 opacity-0 transition-opacity group-active:opacity-100">
                  <Camera size={22} className="text-white" />
                </div>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[1.4rem] bg-black/60 backdrop-blur-sm">
                    <span className="text-xs font-black text-white">{uploadProgress}%</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" id="avatar-upload" onChange={handleAvatarFileSelect} disabled={uploading} />
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <button type="button" onClick={handleOpenNameModal} className="text-left w-full">
                  <h1 className="truncate text-2xl font-black tracking-tight">{finalDisplayName}</h1>
                </button>
                <p className="text-sm font-semibold text-zinc-500 truncate">
                  @{userData.username || userData.userId || user.uid.slice(0, 8)}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-xs font-bold">
                  <Circle className={`h-2 w-2 fill-current ${userData.online ? "text-emerald-500" : "text-zinc-400"}`} />
                  {userData.online ? "Đang hoạt động" : "Ngoại tuyến"}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-zinc-500">Cấp {gamification.level}</span>
                <span className="text-zinc-400">{gamification.exp}/{gamification.nextLevelExp} XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${accentGradient} transition-all`}
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Tin cậy", value: `${gamification.trustScore}%` },
                { label: "Hoàn thành", value: String(userData.stats?.completed ?? 0) },
                { label: "Đánh giá", value: (userData.stats?.rating ?? gamification.stats.rating ?? 0).toFixed(1) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-2.5 text-center ring-1 ring-black/[0.03] dark:ring-white/5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{item.label}</p>
                  <p className="mt-0.5 text-base font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => router.push(action.href)}
                  className="flex items-center gap-3 rounded-2xl bg-white dark:bg-zinc-950 p-4 text-left ring-1 ring-black/[0.04] dark:ring-white/10 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <span className="text-sm font-bold flex-1">{action.label}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-300" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 mt-4 space-y-3">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Tài khoản</p>
          <div className="bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/10">
            <SettingItem
              label="Thông tin cá nhân"
              subtitle="Tên, SĐT, Email"
              icon={User}
              iconColor="text-blue-500"
              onClick={() =>
                router.push("/settings/profile-edit")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Đổi email"
              subtitle="Cập nhật địa chỉ email"
              icon={Mail}
              iconColor="text-sky-500"
              onClick={() =>
                router.push("/settings/change-email")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Đổi số điện thoại"
              subtitle="Xác thực SĐT mới"
              icon={Phone}
              iconColor="text-emerald-500"
              onClick={() =>
                router.push("/settings/change-phone")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Đổi mật khẩu"
              subtitle="Cập nhật mật khẩu định kỳ"
              icon={Lock}
              iconColor="text-green-500"
              onClick={() =>
                router.push("/settings/change-password")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Xác thực 2 lớp"
              subtitle="Bật/tắt 2FA cho tài khoản"
              icon={Shield}
              iconColor="text-amber-500"
              onClick={() =>
                router.push("/settings/2fa")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Phiên đăng nhập"
              subtitle="Quản lý thiết bị đang hoạt động"
              icon={Monitor}
              iconColor="text-purple-500"
              onClick={() =>
                router.push("/settings/sessions")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Tài khoản bị chặn"
              subtitle="Danh sách người dùng đã chặn"
              icon={Ban}
              iconColor="text-red-500"
              onClick={() =>
                router.push("/settings/blocked")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Mã QR của tôi"
              subtitle="Chia sẻ & quét mã kết bạn"
              icon={QrCode}
              iconColor="text-amber-500"
              onClick={() =>
                router.push("/settings/qr")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Chia sẻ hồ sơ"
              subtitle="Link và mạng xã hội"
              icon={Share2}
              iconColor="text-purple-500"
              onClick={() =>
                router.push("/settings/share-profile")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Thông báo"
              subtitle="Push, email, giờ im lặng"
              icon={Bell}
              iconColor="text-blue-500"
              onClick={() =>
                router.push("/settings/notifications")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Dung lượng"
              subtitle="Quản lý file và bộ nhớ"
              icon={HardDrive}
              iconColor="text-teal-500"
              onClick={() =>
                router.push("/settings/storage")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Cài đặt chung"
              subtitle="Thông báo, Giao diện, Ngôn ngữ"
              icon={Settings}
              iconColor="text-gray-500"
              onClick={() =>
                router.push("/settings")
              }
            />

            <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

            <SettingItem
              label="Hỗ trợ"
              subtitle="Trung tâm trợ giúp, Báo cáo sự cố"
              icon={HelpCircle}
              iconColor="text-red-500"
              onClick={() =>
                router.push("/settings/help")
              }
            />
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/10 mt-3">
            <SettingItem
              label="Đăng xuất"
              icon={LogOut}
              iconColor="text-gray-500"
              onClick={() => setShowLogoutModal(true)}
            />
          </div>

          {ADMIN_EMAILS.includes(user?.email || "") && (
            <>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1 pt-2">Quản trị</p>
              <div className="bg-white dark:bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-black/[0.04] dark:ring-white/10">
                <SettingItem
                  label="Quản lý Events"
                  subtitle="Tạo và chỉnh sửa sự kiện"
                  icon={Database}
                  iconColor="text-[#0a84ff]"
                  onClick={() => router.push("/admin/events")}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* NAME MODAL */}

      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4 pb-24 sm:pb-6 safe-area-inset-bottom">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Đổi tên hiển thị</h2>
              <button onClick={() => setShowNameModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2 block">Tên mới</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên thật của bạn"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">Lưu ý:</p>
                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                  <li>Mỗi tài khoản chỉ được đổi tên 1 lần mỗi 3 tháng</li>
                  <li>Vui lòng dùng tên thật, không chứa ký tự đặc biệt</li>
                  <li>Tên sẽ hiển thị công khai với mọi người</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNameModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 font-semibold text-gray-700 dark:text-zinc-300 active:scale-95 transition">
                Hủy
              </button>
              <button onClick={handleUpdateName} className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${accentGradient} font-semibold text-white active:scale-95 transition`}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AVATAR MODAL */}

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Đổi ảnh đại diện
              </h2>

              <button
                onClick={() =>
                  setShowAvatarModal(false)
                }
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">
                  Lưu ý:
                </p>

                <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
                  <li>
                    Mỗi tài khoản chỉ được đổi avatar 1 lần mỗi 3 tháng
                  </li>

                  <li>
                    Ảnh sẽ được cắt vuông 1:1 và nén về dưới 1MB
                  </li>

                  <li>
                    Ảnh sẽ hiển thị công khai với mọi người
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setShowAvatarModal(false)
                }
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 font-semibold"
              >
                Hủy
              </button>

              <label
                htmlFor="avatar-upload-modal"
                className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${accentGradient} text-white font-semibold text-center cursor-pointer`}
              >
                Chọn ảnh
              </label>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="avatar-upload-modal"
                onChange={handleAvatarFileSelect}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
      )}

      {/* CROP MODAL */}

      {showCropModal && cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onClose={() => {
            setShowCropModal(false);

            URL.revokeObjectURL(cropImageSrc);

            setCropImageSrc(null);
          }}
          onCropComplete={handleCropComplete}
          accentGradient={accentGradient}
        />
      )}

      {/* LOGOUT MODAL */}

      {showLogoutModal && (
        <ProfileModal
          title="Đăng xuất?"
          desc="Bạn sẽ cần đăng nhập lại để sử dụng app"
          onClose={() =>
            setShowLogoutModal(false)
          }
          onConfirm={handleLogout}
          confirmText="Đăng xuất"
          danger
        />
      )}
    </div>
  );
}
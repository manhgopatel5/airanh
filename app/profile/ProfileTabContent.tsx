"use client";

import { useRouter } from "next/navigation";
import { signOut, updateProfile } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import {
  doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc, Timestamp
} from "firebase/firestore";
import imageCompression from 'browser-image-compression';
import {
  getFirebaseDB,
  getFirebaseAuth,
  getFirebaseStorage
} from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  HelpCircle, LogOut, User, Shield, Lock,
  Camera, Check, QrCode, Share2, Settings,
  Circle, Bell,
  Mail, Phone, Monitor, Ban, HardDrive, X
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { UploadTask } from "firebase/storage";
import { nanoid } from "nanoid";

import SettingItem from "@/components/common/SettingItem";
import ProfileModal from "@/components/common/ProfileModal";

type UserData = {
  uid: string;
  displayName: string;
  email: string | null;
  phone?: string;
  userId: string;
  photoURL: string | null;
  bio?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  emailVerified?: boolean;
  verified: boolean;
  hidePhone?: boolean;
  stats?: { tasks: number; plans: number; completed: number; rating: number };
  nameLower: string;
  username?: string;
  status: "active" | "banned" | "deleted" | "deactivated";
  lastNameChangeAt?: Timestamp;
};

export default function ProfileTabContent() {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const router = useRouter();
  const { user } = useAuth();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [userData, setUserData] = useState<UserData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const accentGradient = isPlan
 ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-600";

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id,...snap.data() } as UserData;
        setUserData(data);
        setDisplayName(data.displayName || user.email?.split('@')[0] || `User${data.userId?.slice(-4) || user.uid.slice(0,4)}`);
        if (user &&!user.emailVerified &&!data.emailVerified) {
          router.replace("/verify-email");
        }
      }
    });
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
        updateDoc(doc(db, "users", user.uid), { userId: newId }),
        setDoc(doc(db, "usernames", newId), { uid: user.uid }),
      ]);
    };
    createId().catch(() => {});
  }, [user, userData, db]);

  const canChangeName = () => {
    if (!userData?.lastNameChangeAt) return { allowed: true };
    const lastChange = userData.lastNameChangeAt.toDate();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (lastChange > threeMonthsAgo) {
      const nextChange = new Date(lastChange);
      nextChange.setMonth(nextChange.getMonth() + 3);
      return {
        allowed: false,
        nextDate: nextChange.toLocaleDateString('vi-VN')
      };
    }
    return { allowed: true };
  };

  const validateRealName = (name: string): string | null => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return "Tên tối thiểu 2 ký tự";
    if (trimmed.length > 50) return "Tên tối đa 50 ký tự";
    const regex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂẾưăạảấầẩẫậắằẳẵặẹẻẽềềểếỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s\d]+$/;
    if (!regex.test(trimmed)) return "Tên chỉ được chứa chữ cái, số và dấu cách";
    if (/\s{2,}/.test(trimmed)) return "Không được có 2 dấu cách liên tiếp";
    return null;
  };

  const handleOpenNameModal = () => {
    const check = canChangeName();
    if (!check.allowed) {
      toast.error(`Bạn chỉ được đổi tên 1 lần mỗi 3 tháng. Lần đổi tiếp: ${check.nextDate}`);
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
    setUserData((prev) => prev? {...prev, displayName: newName } : null);

    try {
      await Promise.all([
        updateProfile(user, { displayName: newName }),
        updateDoc(doc(db, "users", user.uid), {
          displayName: newName,
          nameLower: newName.toLowerCase(),
          lastNameChangeAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      ]);
      await user.reload();
      toast.success("Cập nhật tên thành công. Bạn có thể đổi lại sau 3 tháng");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev? {...prev, displayName: oldName || "" } : null);
      setDisplayName(oldName || "");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận file ảnh");
    if (file.size > 20 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 20MB");

    setUploading(true);
    setUploadProgress(0);

    try {
      toast.loading("Đang nén ảnh...");
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: 'image/webp',
      };

      const compressedFile = await imageCompression(file, options);
      toast.dismiss();

      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, compressedFile);
      uploadTaskRef.current.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (err) => {
          if (err.code!== "storage/canceled") toast.error("Upload thất bại");
          setUploading(false);
        },
        async () => {
          const task = uploadTaskRef.current;
          if (!task) return;
          const url = await getDownloadURL(task.snapshot.ref);
          await Promise.all([
            updateProfile(user, { photoURL: url }),
            updateDoc(doc(db, "users", user.uid), {
              photoURL: url,
              updatedAt: serverTimestamp()
            })
          ]);
          await user.reload();
          toast.success("Cập nhật avatar thành công");
          if ("vibrate" in navigator) navigator.vibrate(8);
          setUploading(false);
        }
      );
    } catch (error) {
      console.error(error);
      toast.error("Nén ảnh thất bại");
      setUploading(false);
    } finally {
      e.target.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (uploadTaskRef.current) uploadTaskRef.current.cancel();
    };
  }, []);

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const updateOnline = () => updateDoc(doc(db, "users", user.uid), { online: true }).catch(() => {});
    const updateOffline = () => updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    const handleVisibility = () => { if (document.hidden) updateOffline(); else updateOnline(); };
    updateOnline();
    window.addEventListener("beforeunload", updateOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      updateOffline();
      window.removeEventListener("beforeunload", updateOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.uid, db]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
        setShowNameModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (!user ||!userData) return null;

  const finalDisplayName = userData.displayName || user.email?.split('@')[0] || `User${userData.userId?.slice(-4) || user.uid.slice(0,4)}`;
  const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalDisplayName)}&size=176&background=0A84FF&color=fff&bold=true`;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <img
              src={avatarUrl}
              className="w-16 h-16 rounded-full object-cover"
              alt="Avatar"
            />
            {userData.emailVerified && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-2 border-white dark:border-black`}>
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs font-bold">{uploadProgress}%</span>
              </div>
            )}
          </label>

          <div className="flex-1 min-w-0">
            <h1 onClick={handleOpenNameModal} className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight cursor-pointer leading-tight active:opacity-70">
              {finalDisplayName}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Circle className={`w-2 h-2 fill-current ${userData.online? "text-green-500" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
                {userData.online? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* List Settings */}
      <div className="px-4 mt-2 space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <SettingItem
            label="Thông tin cá nhân"
            subtitle="Tên, SĐT, Email"
            icon={User}
            iconColor="text-blue-500"
            onClick={() => router.push("/settings/profile-edit")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Đổi email"
            subtitle="Cập nhật địa chỉ email"
            icon={Mail}
            iconColor="text-sky-500"
            onClick={() => router.push("/settings/change-email")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Đổi số điện thoại"
            subtitle="Xác thực SĐT mới"
            icon={Phone}
            iconColor="text-emerald-500"
            onClick={() => router.push("/settings/change-phone")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Đổi mật khẩu"
            subtitle="Cập nhật mật khẩu định kỳ"
            icon={Lock}
            iconColor="text-green-500"
            onClick={() => router.push("/settings/change-password")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Xác thực 2 lớp"
            subtitle="Bật/tắt 2FA cho tài khoản"
            icon={Shield}
            iconColor="text-amber-500"
            onClick={() => router.push("/settings/2fa")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Phiên đăng nhập"
            subtitle="Quản lý thiết bị đang hoạt động"
            icon={Monitor}
            iconColor="text-purple-500"
            onClick={() => router.push("/settings/sessions")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Tài khoản bị chặn"
            subtitle="Danh sách người dùng đã chặn"
            icon={Ban}
            iconColor="text-red-500"
            onClick={() => router.push("/settings/blocked")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Mã QR của tôi"
            subtitle="Chia sẻ & quét mã kết bạn"
            icon={QrCode}
            iconColor="text-amber-500"
            onClick={() => router.push("/settings/qr")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Chia sẻ hồ sơ"
            subtitle="Link và mạng xã hội"
            icon={Share2}
            iconColor="text-purple-500"
            iconBg="bg-purple-50"
            onClick={() => router.push("/settings/share-profile")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Thông báo"
            subtitle="Push, email, giờ im lặng"
            icon={Bell}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
            onClick={() => router.push("/settings/notifications")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Dung lượng"
            subtitle="Quản lý file và bộ nhớ"
            icon={HardDrive}
            iconColor="text-teal-500"
            onClick={() => router.push("/settings/storage")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Cài đặt chung"
            subtitle="Thông báo, Giao diện, Ngôn ngữ"
            icon={Settings}
            iconColor="text-gray-500"
            onClick={() => router.push("/settings")}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Hỗ trợ"
            subtitle="Trung tâm trợ giúp, Báo cáo sự cố"
            icon={HelpCircle}
            iconColor="text-red-500"
            onClick={() => router.push("/settings/help")}
          />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <SettingItem
            label="Đăng xuất"
            icon={LogOut}
            iconColor="text-gray-500"
            onClick={() => setShowLogoutModal(true)}
          />
        </div>
      </div>

      {/* Modal đổi tên */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 space-y-4">
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
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 font-semibold text-gray-700 dark:text-zinc-300 active:scale-95 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateName}
                className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${accentGradient} font-semibold text-white active:scale-95 transition`}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <ProfileModal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}
    </div>
  );
}
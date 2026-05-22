"use client";

import { useRouter } from "next/navigation";
import { signOut, deleteUser } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import {
  doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import {
  getFirebaseDB,
  getFirebaseAuth,
  getFirebaseStorage
} from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  HelpCircle, LogOut, Trash2, User, Shield, Lock,
  Camera, Check, QrCode, Share2, Settings,
  Circle,
  Mail, Phone, Monitor, Ban, Key, HardDrive
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { UploadTask } from "firebase/storage";
import { nanoid } from "nanoid";


import SettingItem from "@/components/common/SettingItem";
import ProfileModal from "@/components/common/ProfileModal";



type UserData = {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  userId: string;
  avatar: string;
  bio?: string;
  online?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  emailVerified?: boolean;
  hidePhone?: boolean;
  stats?: { tasks: number; plans: number; completed: number; rating: number };
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
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
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
        setName(data.name || "");
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

  const handleUpdateName = async () => {
    if (!user ||!name.trim() || name.length < 2) {
      toast.error("Tên tối thiểu 2 ký tự");
      return;
    }
    if (name === userData?.name) {
      setEditingName(false);
      return;
    }
    const oldName = userData?.name;
    setEditingName(false);
    setUserData((prev) => prev? {...prev, name: name.trim() } : null);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast.success("Cập nhật tên thành công");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev? {...prev, name: oldName || "" } : null);
      setName(oldName || "");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận file ảnh");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 5MB");
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, file);
      uploadTaskRef.current.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (err) => {
          if (err.code!== "storage/canceled") toast.error("Upload thất bại");
        },
        async () => {
          const task = uploadTaskRef.current;
          if (!task) return;
          const url = await getDownloadURL(task.snapshot.ref);
          await updateDoc(doc(db, "users", user.uid), { avatar: url });
          toast.success("Cập nhật avatar thành công");
          if ("vibrate" in navigator) navigator.vibrate(8);
          setUploading(false);
        }
      );
    } catch {
      toast.error("Upload lỗi");
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

  const handleShare = async () => {
    if (!userData) return;
    const url = `https://airanh.vercel.app/u/${userData.userId}`;
    if (navigator.share) {
      await navigator.share({ title: userData.name || "Người dùng AIR", text: `Kết nối với tôi`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link hồ sơ");
    }
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid)),
        deleteDoc(doc(db, "usernames", userData?.userId || "")),
      ]);
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại để xóa tài khoản");
        await signOut(auth);
        router.push("/login");
      } else {
        toast.error("Xóa thất bại");
      }
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
        setShowDeleteModal(false);
        setShowQR(false);
        setShowScanQR(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);



  if (!user ||!userData) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      {/* Header - Đã bỏ 3 chip Task/Plan/Star */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <img
              src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176&background=8B5E3C&color=fff`}
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
            {editingName? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                  autoFocus
                  className="text-2xl font-extrabold border-b-2 border-gray-300 dark:border-zinc-700 outline-none bg-transparent text-gray-900 dark:text-white flex-1 tracking-tight"
                />
                <button onClick={handleUpdateName} className={`p-1.5 bg-gradient-to-br ${accentGradient} rounded-full`}>
                  <Check size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <h1 onClick={() => setEditingName(true)} className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight cursor-pointer leading-tight">
                {userData.name}
              </h1>
            )}
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
  onClick={() => router.push("/settings/qr")} // DÙNG DÒNG NÀY
/>
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

          <SettingItem
            label="Chia sẻ hồ sơ"
            subtitle="Link và mạng xã hội"
            icon={Share2}
            iconColor="text-purple-500"
            onClick={handleShare}
          />
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />

          <SettingItem
            label="API Keys"
            subtitle="Quản lý khóa API của bạn"
            icon={Key}
            iconColor="text-indigo-500"
            onClick={() => router.push("/settings/api")}
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
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-14" />
          <SettingItem
            label="Xoá tài khoản"
            icon={Trash2}
            iconColor="text-red-500"
            onClick={() => setShowDeleteModal(true)}
            danger
          />
        </div>
      </div>

      {/* Modals */}


      {showLogoutModal && (
        <ProfileModal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}
      {showDeleteModal && (
        <ProfileModal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}
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
  Camera, Check, QrCode, Share2, ChevronRight, Settings,
  Circle, Zap, ClipboardList, Star, ScanLine, X
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { UploadTask } from "firebase/storage";
import { nanoid } from "nanoid";
import { Html5Qrcode } from "html5-qrcode";

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

export default function Profile() {
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
  const [showQR, setShowQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const accentGradient = isPlan
   ? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-500";

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
  }, [user?.uid, router]);

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
  }, [user, userData]);

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
      await navigator.share({
        title: userData.name || "Người dùng AIR",
        text: `Kết nối với tôi`,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link hồ sơ");
    }
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

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
    const updateOffline = () => updateDoc(doc(db, "users", user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});

    const handleVisibility = () => {
      if (document.hidden) updateOffline();
      else updateOnline();
    };

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

  const stopScan = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setShowScanQR(false);
  };

  useEffect(() => {
    if (!showScanQR) return;

    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            stopScan();
            if (decodedText.includes("/u/")) {
              const targetUserId = decodedText.split("/u/")[1];
              if (targetUserId === userData?.userId) {
                toast.error("Đây là mã của bạn");
                return;
              }
              router.push(`/u/${targetUserId}`);
            } else {
              toast.error("Mã QR không hợp lệ");
            }
          },
          () => {}
        );
      } catch {
        toast.error("Không mở được camera");
        setShowScanQR(false);
      }
    };

    startScan();
    return () => stopScan();
  }, [showScanQR, userData?.userId, router]);

  if (!user ||!userData) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <img
              src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176`}
              className="w-16 h-16 rounded-full"
              alt="Avatar"
            />
            {userData.emailVerified && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-2 border-white dark:border-black`}>
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-active:opacity-100 transition">
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
              <h1 onClick={() => setEditingName(true)} className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight cursor-pointer">
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

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={() => router.push("/tasks")}
            className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <ClipboardList className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.tasks || 0}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-500">Task</span>
          </button>
          <button
            onClick={() => router.push("/plans")}
            className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Zap className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.plans || 0}</span>
            <span className="text-xs text-gray-500 dark:text-zinc-500">Plan</span>
          </button>
          <button className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition">
            <Star className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.rating || 0}</span>
          </button>
        </div>
      </div>

      <div className="px-6 mt-2 space-y-6">
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">HỒ SƠ</div>
          <Item label="Thông tin cá nhân" icon={User} onClick={() => router.push("/profile/edit")} />
          <Item label="Mã QR của tôi" icon={QrCode} onClick={() => setShowQR(true)} />
          <Item label="Quét mã QR" icon={ScanLine} onClick={() => setShowScanQR(true)} />
          <Item label="Chia sẻ hồ sơ" icon={Share2} onClick={handleShare} />
        </div>

        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">BẢO MẬT</div>
          <Item label="Xác thực CCCD" icon={Shield} />
          <Item label="Đổi mật khẩu" icon={Lock} onClick={() => router.push("/settings/change-password")} />
        </div>

        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">HỖ TRỢ</div>
          <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
          <Item label="Cài đặt" icon={Settings} onClick={() => router.push("/settings")} />
          <Item label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
          <Item label="Xoá tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-1 text-gray-900 dark:text-white">@{userData.userId}</h3>
            <p className="text-sm text-center text-gray-500 mb-4">Quét để kết nối với {userData.name}</p>

            <div className="bg-white p-4 rounded-2xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://airanh.vercel.app/u/${userData.userId}&color=000&bgcolor=fff&margin=0`}
                alt="QR Code"
                className="w-full rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={handleShare}
                className="py-3 rounded-2xl font-bold bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white flex items-center justify-center gap-2"
              >
                <Share2 size={18} /> Chia sẻ
              </button>
              <button
                onClick={() => {
                  setShowQR(false);
                  setShowScanQR(true);
                }}
                className={`py-3 rounded-2xl font-bold bg-gradient-to-r ${accentGradient} text-white flex items-center justify-center gap-2`}
              >
                <ScanLine size={18} /> Quét mã
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanQR && (
        <div className="fixed inset-0 bg-black z-50">
          <div id="qr-reader" className="w-full h-full" />
          <button
            onClick={stopScan}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold">Đưa mã QR vào khung</p>
            <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}

      {showDeleteModal && (
        <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}

function Item({
  label,
  onClick,
  danger,
  icon: Icon,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  icon: React.ElementType;
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
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
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
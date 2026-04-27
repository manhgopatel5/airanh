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
  Camera, Check, Copy, Circle, QrCode, Share2, Eye, EyeOff,
  ChevronRight
} from "lucide-react";
import { toast, Toaster } from "sonner";
import type { UploadTask } from "firebase/storage";
import { nanoid } from "nanoid";

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
  const [bio, setBio] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const accentGradient = isPlan
? "from-green-500 to-emerald-500"
    : "from-sky-500 to-blue-500";
  const accentText = isPlan
? "text-green-600 dark:text-green-400"
    : "text-sky-600 dark:text-sky-400";

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
        setBio(data.bio || "");
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

  const handleUpdateBio = async () => {
    if (!user) return;
    if (bio === userData?.bio) {
      setEditingBio(false);
      return;
    }
    const oldBio = userData?.bio;
    setEditingBio(false);
    setUserData((prev) => prev? {...prev, bio: bio.trim() } : null);

    try {
      await updateDoc(doc(db, "users", user.uid), { bio: bio.trim() });
      toast.success("Đã cập nhật");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev? {...prev, bio: oldBio || "" } : null);
      setBio(oldBio || "");
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

  const copyId = () => {
    if (userData?.userId) {
      navigator.clipboard.writeText(userData.userId);
      setCopied(true);
      toast.success("Đã copy ID");
      setTimeout(() => setCopied(false), 2000);
      if ("vibrate" in navigator) navigator.vibrate(5);
    }
  };

  const toggleHidePhone = async () => {
    if (!user) return;
    const newVal =!userData?.hidePhone;
    await updateDoc(doc(db, "users", user.uid), { hidePhone: newVal });
    toast.success(newVal? "Đã ẩn số" : "Đã hiện số");
    if ("vibrate" in navigator) navigator.vibrate(5);
  };

  const handleShare = async () => {
    const url = `https://air.vn/u/${userData?.userId}`;
    if (navigator.share) {
      await navigator.share({ title: userData?.name, text: `Kết nối với tôi`, url });
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
    if (!user) return;
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
  }, [user]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
        setShowDeleteModal(false);
        setShowQR(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (!user ||!userData) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className={`h-[120px] bg-gradient-to-br ${accentGradient} opacity-10 relative`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.3),transparent_50%)]" />
      </div>

      <div className="px-6 -mt-11">
        <div className="flex flex-col items-center">
          <div className="relative">
            <img
              src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176`}
              className="w-[88px] h-[88px] rounded-full border-2 border-white dark:border-black"
              alt="Avatar"
            />
            {userData.emailVerified && (
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-2 border-white dark:border-black`}>
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </div>
            )}
            <label className={`absolute -bottom-1 -right-8 w-8 h-8 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center cursor-pointer active:scale-90 transition shadow-lg`}>
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs font-bold">{uploadProgress}%</span>
              </div>
            )}
          </div>

          {editingName? (
            <div className="flex items-center gap-2 mt-4 w-full max-w-xs">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleUpdateName}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                autoFocus
                className="text-[28px] font-extrabold border-b-2 border-gray-300 dark:border-zinc-700 outline-none bg-transparent text-gray-900 dark:text-white flex-1 text-center tracking-tight"
              />
              <button onClick={handleUpdateName} className={`p-1.5 bg-gradient-to-br ${accentGradient} rounded-full`}>
                <Check size={16} className="text-white" />
              </button>
            </div>
          ) : (
            <h1 onClick={() => setEditingName(true)} className="text-[28px] font-extrabold text-gray-900 dark:text-white mt-4 tracking-tight cursor-pointer">
              {userData.name}
            </h1>
          )}
          <p className="text-[14px] text-gray-500 dark:text-zinc-400 mt-0.5">
            @{userData.userId}
          </p>

          <button
            onClick={copyId}
            className="mt-3 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-900 text-[13px] font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 active:scale-95 transition"
          >
            ID: {userData.userId}
            {copied? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 mt-2">
            <Circle className={`w-2 h-2 fill-current ${userData.online? "text-green-500" : "text-gray-400"}`} />
            <span className="text-[13px] text-gray-500 dark:text-zinc-400 font-medium">
              {userData.online? "Đang hoạt động" : "Ngoại tuyến"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-8 text-center">
          {[
            { label: "TASK", value: userData.stats?.tasks || 0 },
            { label: "PLAN", value: userData.stats?.plans || 0 },
            { label: "HOÀN THÀNH", value: userData.stats?.completed || 0 },
            { label: "RATING", value: userData.stats?.rating || 0 },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[32px] font-black text-gray-900 dark:text-white tracking-tight">
                {stat.value}{stat.label === "RATING" && "★"}
              </div>
              <div className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500 tracking-wider mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-bold text-gray-900 dark:text-white">Giới thiệu</span>
            {!editingBio? (
              <button onClick={() => setEditingBio(true)} className={`text-[13px] font-semibold ${accentText}`}>
                Sửa
              </button>
            ) : (
              <button onClick={handleUpdateBio} className={`text-[13px] font-semibold ${accentText} flex items-center gap-1`}>
                <Check className="w-3 h-3" />Lưu
              </button>
            )}
          </div>
          {editingBio? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết gì đó về bạn..."
              className="w-full text-[14px] text-gray-600 dark:text-zinc-400 bg-transparent border-none outline-none resize-none"
              rows={3}
              maxLength={150}
              autoFocus
            />
          ) : (
            <p className="text-[14px] text-gray-600 dark:text-zinc-400 leading-relaxed">
              {bio || "Chưa có giới thiệu"}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {userData.phone && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-zinc-900">
              <span className="text-[14px] text-gray-500 dark:text-zinc-400">Số điện thoại</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  {userData.hidePhone? "••••••••••" : userData.phone}
                </span>
                <button onClick={toggleHidePhone}>
                  {userData.hidePhone? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className={`w-4 h-4 ${accentText}`} />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-zinc-900">
            <span className="text-[14px] text-gray-500 dark:text-zinc-400">Email</span>
            <span className="text-[14px] font-semibold text-gray-900 dark:text-white">{userData.email}</span>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <div className="text-[12px] font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">HỒ SƠ</div>
            <Item label="Mã QR của tôi" icon={QrCode} onClick={() => setShowQR(true)} />
            <Item label="Chia sẻ hồ sơ" icon={Share2} onClick={handleShare} />
            <Item label="Thông tin cá nhân" icon={User} onClick={() => router.push("/profile/edit")} />
          </div>

          <div>
            <div className="text-[12px] font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">BẢO MẬT</div>
            <Item label="Xác thực CCCD" icon={Shield} />
            <Item label="Đổi mật khẩu" icon={Lock} />
          </div>

          <div>
            <div className="text-[12px] font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1">HỖ TRỢ</div>
            <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
            <Item label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
            <Item label="Xoá tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
          </div>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-4 mt-8 text-[15px] font-bold text-red-500 active:opacity-50 transition"
        >
          Đăng xuất
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-4 text-gray-900 dark:text-white">Quét để kết nối</h3>
            <div className="bg-white p-4 rounded-2xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://air.vn/u/${userData.userId}`}
                alt="QR Code"
                className="w-full"
              />
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-zinc-400 mt-4">
              @{userData.userId}
            </p>
            <button
              onClick={() => setShowQR(false)}
              className={`w-full mt-4 py-3 rounded-2xl font-bold bg-gradient-to-r ${accentGradient} text-white`}
            >
              Đóng
            </button>
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
        <Icon className={`w-[22px] h-[22px] ${danger? "text-red-500" : "text-gray-900 dark:text-white"}`} />
        <span className={`text-[15px] font-semibold ${danger? "text-red-500" : "text-gray-900 dark:text-white"}`}>{label}</span>
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
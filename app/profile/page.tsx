"use client";

import { useRouter } from "next/navigation";
import { signOut, deleteUser } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc
} from "firebase/firestore";
import { LucideIcon } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { HelpCircle, LogOut, Trash2, User, Star, Users, Shield, Lock, Camera, Check, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import type { UploadTask } from "firebase/storage";
import { nanoid } from "nanoid";

type UserData = {
  uid: string;
  name: string;
  email: string;
  userId: string;
  avatar: string;
  online?: boolean;
  lastSeen?: Timestamp;
  createdAt?: Timestamp;
  emailVerified?: boolean;
};

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const hasCheckedId = useRef(false); // ✅ FIX 1
  const uploadTaskRef = useRef<UploadTask | null>(null);

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  /* ================= REALTIME USER ✅ FIX 12 ================= */
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id,...snap.data() } as UserData;
        setUserData(data);
        setName(data.name || "");
        // ✅ FIX 8: Check verify
        if (user && !user.emailVerified && !data.emailVerified) {
          router.replace("/verify-email");
        }
      }
    });
    return () => unsub();
  }, [user?.uid, router]); // ✅ FIX 12: deps uid

  /* ================= AUTO CREATE USERID ✅ FIX 1+7 ================= */
  useEffect(() => {
    if (!user || !userData || hasCheckedId.current) return;
    if (userData.userId) {
      hasCheckedId.current = true;
      return;
    }

    const createId = async () => {
      hasCheckedId.current = true;
      let newId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", newId)); // ✅ FIX 7
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

  /* ================= UPDATE NAME ✅ FIX 11 ================= */
  const handleUpdateName = async () => {
    if (!user ||!name.trim() || name.length < 2) {
      toast.error("Tên tối thiểu 2 ký tự");
      return;
    }
    if (name === userData?.name) {
      setEditing(false);
      return;
    }

    const oldName = userData?.name;
    setEditing(false);
    setUserData((prev) => prev? {...prev, name: name.trim() } : null); // ✅ FIX 11: Optimistic

    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast.success("Cập nhật tên thành công");
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev? {...prev, name: oldName || "" } : null); // Rollback
      setName(oldName || "");
    }
  };

  /* ================= UPLOAD AVATAR ✅ FIX 2 ================= */
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
          const url = await getDownloadURL(uploadTaskRef.current.snapshot.ref);
          await updateDoc(doc(db, "users", user.uid), { avatar: url });
          toast.success("Cập nhật avatar thành công");
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

  // ✅ FIX 2: Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (uploadTaskRef.current) uploadTaskRef.current.cancel();
    };
  }, []);

  /* ================= LOGOUT ✅ FIX 3 ================= */
  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);

    updateDoc(doc(db, "users", user.uid), {
      online: false,
      lastSeen: serverTimestamp(),
    }).catch(() => {});

    try {
      await signOut(auth);
      window.location.href = "/login"; // ✅ FIX 3: Force reload
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  /* ================= DELETE ACCOUNT ✅ FIX 5 ================= */
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

  /* ================= ONLINE STATUS ✅ FIX 6 ================= */
useEffect(() => {
  if (!user) return;

  const updateOnline = () =>
    updateDoc(doc(db, "users", user.uid), { online: true }).catch(() => {});

  const updateOffline = () =>
    updateDoc(doc(db, "users", user.uid), {
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

  /* ================= ESC CLOSE MODAL ✅ FIX 9 ================= */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLogoutModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
      <Toaster richColors position="top-center" />

      {/* HEADER */}
      <div className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-6 shadow-sm dark:shadow-black/20">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-gray-50 dark:ring-zinc-800">
              <img
                src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || "U")}&background=random`}
                className="w-full h-full object-cover"
                alt="Avatar"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-1" />
                    <span className="text-xs font-bold">{uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer active:scale-90 transition" aria-label="Đổi avatar">
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>

          <div className="flex-1 min-w-0">
            {editing? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                  autoFocus
                  disabled={uploading} // ✅ FIX 4
                  className="text-xl font-bold border-b-2 border-blue-500 outline-none bg-transparent text-gray-900 dark:text-gray-100 flex-1 disabled:opacity-50"
                />
                <button onClick={handleUpdateName} className="p-1.5 bg-blue-500 rounded-full" aria-label="Lưu">
                  <Check size={16} className="text-white" />
                </button>
                <button onClick={() => { setEditing(false); setName(userData?.name || ""); }} className="p-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full" aria-label="Hủy">
                  <X size={16} className="text-gray-600 dark:text-zinc-400" />
                </button>
              </div>
            ) : (
              <div>
                <p onClick={() => setEditing(true)} className="font-bold text-xl text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-500 transition">
                  {userData?.name || "Người dùng"}
                </p>
                <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">ID: {userData?.userId || user.uid.slice(0, 8)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MENU */}
      <div className="px-4 mt-6 space-y-4 max-w-xl mx-auto">
        <Group title="Hồ sơ">
          <Item label="Thông tin cá nhân" icon={User} onClick={() => router.push("/profile/edit")} />
          <Item label="Kỹ năng" icon={Star} />
          <Item label="Giới thiệu bạn bè" icon={Users} />
        </Group>

        <Group title="Bảo mật">
          <Item label="Xác thực CCCD" icon={Shield} />
          <Item label="Đổi mật khẩu" icon={Lock} />
        </Group>

        <Group title="Thiết lập & hỗ trợ">
          <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
          <Item label="Đăng xuất" onClick={() => setShowLogoutModal(true)} icon={LogOut} danger />
          <Item label="Xoá tài khoản" onClick={() => setShowDeleteModal(true)} icon={Trash2} danger />
        </Group>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}

      {/* DELETE MODAL ✅ FIX 5 */}
      {showDeleteModal && (
        <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm shadow-gray-100/50 dark:shadow-black/20 p-2 border border-gray-100 dark:border-zinc-800">
      <div className="font-bold px-3 pt-2 pb-3 text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide">{title}</div>
      {children}
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
  icon: LucideIcon;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-3.5 px-3 rounded-2xl cursor-pointer transition-colors ${
        danger
          ? "text-red-500 active:bg-red-50 dark:active:bg-red-950/30"
          : "text-gray-900 dark:text-gray-100 active:bg-gray-50 dark:active:bg-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-gray-400 dark:text-zinc-500">›</span>
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

"use client";

import { useRouter } from "next/navigation";
import { signOut, deleteUser } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import { doc, onSnapshot, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { HelpCircle, LogOut, Trash2, User, Shield, Lock, Camera, Check, QrCode, Share2, ChevronRight, Settings, Circle, Zap, ClipboardList, Star, ScanLine, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { nanoid } from "nanoid";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type UserData = {
  uid: string; name: string; email: string; phone?: string; userId: string; avatar: string; bio?: string;
  online?: boolean; lastSeen?: Timestamp; createdAt?: Timestamp; emailVerified?: boolean; hidePhone?: boolean;
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
  const [showSuccess, setShowSuccess] = useState(false);
  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const accent = isPlan? "#00C853" : "#0042B2";
  const accentGradient = isPlan? "from-[#00C853] to-[#00E676]" : "from-[#0042B2] to-[#1A5FFF]";

  useEffect(() => { if (user === null) router.replace("/login"); }, [user, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id,...snap.data() } as UserData;
        setUserData(data);
        setName(data.name || "");
        if (user &&!user.emailVerified &&!data.emailVerified) router.replace("/verify-email");
      }
    });
    return () => unsub();
  }, [user?.uid, router, user, db]);

  useEffect(() => {
    if (!user ||!userData || hasCheckedId.current) return;
    if (userData.userId) { hasCheckedId.current = true; return; }
    const createId = async () => {
      hasCheckedId.current = true;
      let newId = `HUHA${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", newId));
        if (!snap.exists()) break;
        newId = `HUHA${nanoid(6).toUpperCase()}`;
        attempts++;
      }
      await Promise.all([updateDoc(doc(db, "users", user.uid), { userId: newId }), setDoc(doc(db, "usernames", newId), { uid: user.uid })]);
    };
    createId().catch(() => {});
  }, [user, userData, db]);

  const handleUpdateName = async () => {
    if (!user ||!name.trim() || name.length < 2) return toast.error("Tên tối thiểu 2 ký tự");
    if (name === userData?.name) return setEditingName(false);
    const oldName = userData?.name;
    setEditingName(false);
    setUserData((prev) => prev? {...prev, name: name.trim() } : null);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast.success("Cập nhật tên thành công");
      navigator.vibrate?.(8);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
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
    setUploading(true); setUploadProgress(0);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, file);
      uploadTaskRef.current.on("state_changed",
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (err) => { if (err.code!== "storage/canceled") toast.error("Upload thất bại"); },
        async () => {
          const url = await getDownloadURL(uploadTaskRef.current.snapshot.ref);
          await updateDoc(doc(db, "users", user.uid), { avatar: url });
          toast.success("Cập nhật avatar thành công");
          navigator.vibrate?.(8);
          setUploading(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 1000);
        }
      );
    } catch { toast.error("Upload lỗi"); setUploading(false); } finally { e.target.value = ""; }
  };

  useEffect(() => { return () => { if (uploadTaskRef.current) uploadTaskRef.current.cancel(); }; }, []);

  const handleShare = async () => {
    if (!userData) return;
    const url = `https://airanh.vercel.app/u/${userData.userId}`;
    if (navigator.share) await navigator.share({ title: userData.name, text: `Kết nối với tôi`, url });
    else { navigator.clipboard.writeText(url); toast.success("Đã copy link hồ sơ"); }
    navigator.vibrate?.(8);
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    try { await signOut(auth); window.location.href = "/login"; } catch { toast.error("Đăng xuất thất bại"); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await Promise.all([deleteDoc(doc(db, "users", user.uid)), deleteDoc(doc(db, "usernames", userData?.userId || ""))]);
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") { toast.error("Vui lòng đăng nhập lại"); await signOut(auth); router.push("/login"); }
      else toast.error("Xóa thất bại");
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
    return () => { updateOffline(); window.removeEventListener("beforeunload", updateOffline); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [user?.uid, db]);

  const stopScan = () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {}); setShowScanQR(false); };

  useEffect(() => {
    if (!showScanQR) return;
    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            navigator.vibrate?.(10);
            stopScan();
            if (decodedText.includes("/u/")) {
              const targetUserId = decodedText.split("/u/")[1];
              if (targetUserId === userData?.userId) { toast.error("Đây là mã của bạn"); return; }
              router.push(`/u/${targetUserId}`);
            } else toast.error("Mã QR không hợp lệ");
          }, () => {});
      } catch { toast.error("Không mở được camera"); setShowScanQR(false); }
    };
    startScan();
    return () => stopScan();
  }, [showScanQR, userData?.userId, router]);

  if (!user ||!userData) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <label className="relative cursor-pointer group flex-shrink-0">
              <div className="relative">
                <img src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176&background=${accent.slice(1)}&color=fff`} className="w-20 h-20 rounded-3xl object-cover shadow-lg" alt="Avatar" />
                {userData.emailVerified && (
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-3 border-white dark:border-black shadow-lg`}>
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity backdrop-blur-sm">
                  <Camera size={22} className="text-white" />
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 rounded-3xl flex items-center justify-center backdrop-blur-md">
                    <div className="text-center">
                      <LottiePlayer animationData={loadingPull} loop autoplay className="w-8 h-8 mx-auto" />
                      <span className="text-white text-xs font-bold mt-1 block">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>

            <div className="flex-1 min-w-0">
              {editingName? (
                <div className="flex items-center gap-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleUpdateName} onKeyDown={(e) => e.key === "Enter" && handleUpdateName()} autoFocus className="text-2xl font-black border-b-2 border-zinc-300 dark:border-zinc-700 outline-none bg-transparent flex-1 tracking-tight" />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleUpdateName} className={`p-2 bg-gradient-to-br ${accentGradient} rounded-xl shadow-lg`}>
                    <Check size={16} className="text-white" />
                  </motion.button>
                </div>
              ) : (
                <h1 onClick={() => setEditingName(true)} className="text-2xl font-black tracking-tight cursor-pointer leading-tight">{userData.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <div className={`w-2 h-2 rounded-full ${userData.online? "bg-[#00C853] animate-pulse" : "bg-zinc-400"}`} />
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{userData.online? "Đang hoạt động" : "Ngoại tuyến"}</span>
                <span className="text-zinc-300">·</span>
                <span className="text-sm font-mono text-zinc-500">@{userData.userId}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-2.5 mt-6">
            {[
              { icon: ClipboardList, label: "Task", value: userData.stats?.tasks?? 0, onClick: () => router.push("/tasks") },
              { icon: Zap, label: "Plan", value: userData.stats?.plans?? 0, onClick: () => router.push("/plans") },
              { icon: Star, label: "Rating", value: userData.stats?.rating?? 0, onClick: undefined },
            ].map((stat) => (
              <motion.button key={stat.label} whileTap={{ scale: 0.96 }} onClick={stat.onClick} className="py-3.5 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200/60 dark:border-zinc-900 shadow-sm hover:shadow-md transition-all">
                <stat.icon className="w-4.5 h-4.5 mx-auto mb-1.5 text-zinc-500" />
                <div className="text-lg font-black">{stat.value}</div>
                <div className="text-xs text-zinc-500 font-medium">{stat.label}</div>
              </motion.button>
            ))}
          </motion.div>
        </div>

        <div className="px-6 space-y-5 max-w-xl mx-auto">
          {[
            { title: "HỒ SƠ", items: [
              { label: "Thông tin cá nhân", icon: User, onClick: () => router.push("/profile/edit") },
              { label: "Mã QR của tôi", icon: QrCode, onClick: () => setShowQR(true) },
              { label: "Quét mã QR", icon: ScanLine, onClick: () => setShowScanQR(true) },
              { label: "Chia sẻ hồ sơ", icon: Share2, onClick: handleShare },
            ]},
            { title: "BẢO MẬT", items: [
              { label: "Xác thực CCCD", icon: Shield },
              { label: "Đổi mật khẩu", icon: Lock, onClick: () => router.push("/settings/change-password") },
            ]},
            { title: "HỖ TRỢ", items: [
              { label: "Trung tâm trợ giúp", icon: HelpCircle },
              { label: "Cài đặt", icon: Settings, onClick: () => router.push("/settings") },
              { label: "Đăng xuất", icon: LogOut, onClick: () => setShowLogoutModal(true), danger: true },
              { label: "Xoá tài khoản", icon: Trash2, onClick: () => setShowDeleteModal(true), danger: true },
            ]},
          ].map((section) => (
            <div key={section.title}>
              <p className="text-xs font-bold text-zinc-500 tracking-wider mb-2.5 px-1">{section.title}</p>
              <div className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-900">
                {section.items.map((item) => (
                  <Item key={item.label} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {showQR && userData.userId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-black text-center mb-1">@{userData.userId}</h3>
                <p className="text-sm text-center text-zinc-500 mb-5">Quét để kết nối với {userData.name}</p>
                <div className="bg-white p-5 rounded-2xl flex items-center justify-center shadow-inner">
                  <QRCodeSVG value={`https://airanh.vercel.app/u/${userData.userId}`} size={200} level="H" includeMargin />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleShare} className="h-12 rounded-2xl font-bold bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center gap-2"><Share2 size={18} /> Chia sẻ</motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowQR(false); setShowScanQR(true); }} className={`h-12 rounded-2xl font-bold bg-gradient-to-r ${accentGradient} text-white flex items-center justify-center gap-2 shadow-lg`}><ScanLine size={18} /> Quét mã</motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showScanQR && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50">
              <div id="qr-reader" className="w-full h-full" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={stopScan} className="absolute top-6 right-6 w-11 h-11 rounded-2xl bg-black/60 backdrop-blur-xl flex items-center justify-center border border-white/20"><X className="w-5 h-5 text-white" /></motion.button>
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white text-center px-6">
                <p className="font-bold text-lg">Đưa mã QR vào khung</p>
                <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLogoutModal && <Modal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" accent={accent} />}
          {showDeleteModal && <Modal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />}
        </AnimatePresence>

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
              <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-28 h-28" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function Item({ label, icon: Icon, onClick, danger }: { label: string; icon: any; onClick?: () => void; danger?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.99 }} onClick={() => { navigator.vibrate?.(5); onClick?.(); }} className="w-full flex items-center justify-between px-5 py-4 active:bg-zinc-50 dark:active:bg-zinc-900 transition-colors">
      <div className="flex items-center gap-3.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-100 dark:bg-zinc-900"}`}>
          <Icon className={`w-4.5 h-4.5 ${danger? "text-red-500" : "text-zinc-700 dark:text-zinc-300"}`} />
        </div>
        <span className={`text-[15px] font-semibold ${danger? "text-red-500" : "text-zinc-900 dark:text-white"}`}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </motion.button>
  );
}

function Modal({ title, desc, onClose, onConfirm, confirmText, danger, accent }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end justify-center z-50" onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-t-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">{desc}</p>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onConfirm} className={`w-full h-12 rounded-2xl font-bold mb-3 text-white shadow-lg ${danger? "bg-red-500 shadow-red-500/25" : ""}`} style={!danger? { background: accent, boxShadow: `0 8px 20px ${accent}40` } : {}}>
          {confirmText}
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onClose} className="w-full h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl font-semibold">Hủy</motion.button>
      </motion.div>
    </motion.div>
  );
}
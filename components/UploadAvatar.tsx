"use client";
import { getFirebaseStorage, getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useRef, useState, useEffect, useMemo } from "react";
import { FiCamera, FiLoader, FiCheck, FiX, FiImage, FiTrash2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import LottiePlayer from "@/components/ui/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

export default function UploadAvatar() {
  const storage = useMemo(() => getFirebaseStorage(), []);
  const db = useMemo(() => getFirebaseDB(), []);
  const auth = useMemo(() => getFirebaseAuth(), []);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      uploadTaskRef.current?.cancel();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFile = async (file: File) => {
    const user = auth.currentUser;
    if (!file ||!user?.uid) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    setError("");
    setUploading(true);
    setSuccess(false);
    setProgress(0);
    navigator.vibrate?.(5);

    uploadTaskRef.current?.cancel();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    try {
      if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
        throw new Error("File HEIC chưa hỗ trợ. Dùng JPG/PNG");
      }
      if (!file.type.startsWith("image/")) throw new Error("Chỉ chấp nhận ảnh");
      if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5MB");

      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;
      setPreview(previewUrl);

      const compressed = await compressImage(file);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const oldAvatar = userDoc.data()?.avatar;
      if (oldAvatar?.includes("firebasestorage.googleapis.com")) {
        try { await deleteObject(ref(storage, oldAvatar)); } catch {}
      }

      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}.webp`);
      await uploadWithRetry(storageRef, compressed, user);
    } catch (err: any) {
      setError(err.message || "Lỗi upload");
      toast.error(err.message || "Lỗi upload");
      setUploading(false);
      setPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploadWithRetry = async (storageRef: any, blob: Blob, user: any, attempt = 1): Promise<void> => {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, { contentType: "image/webp" });
      uploadTaskRef.current = task;

      task.on(
        "state_changed",
        (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        async (err) => {
          if (attempt < 2 && err.code!== "storage/canceled") {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            return uploadWithRetry(storageRef, blob, user, attempt + 1).then(resolve).catch(reject);
          }
          setError("Upload thất bại");
          setUploading(false);
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            await Promise.all([updateDoc(doc(db, "users", user.uid), { avatar: url }), updateProfile(auth.currentUser!, { photoURL: url })]);
            setSuccess(true);
            setUploading(false);
            navigator.vibrate?.([10, 20, 10]);
            toast.success("Cập nhật ảnh đại diện thành công");
            setTimeout(() => setSuccess(false), 2500);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const size = Math.min(img.width, img.height, 1024);
          canvas.width = size;
          canvas.height = size;
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
          canvas.toBlob((blob) => (blob? resolve(blob) : reject(new Error("Compress failed"))), "image/webp", 0.88);
        };
        img.onerror = () => reject(new Error("Không đọc được ảnh"));
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleCancel = () => {
    uploadTaskRef.current?.cancel();
    setUploading(false);
    setProgress(0);
    setPreview(null);
    navigator.vibrate?.(5);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const user = auth.currentUser;
  const currentAvatar = preview || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "U")}&background=0a84ff&color=fff&bold=true`;

  return (
    <div className="relative group/avatar">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={uploading} />

      <div className="relative" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
        {/* Avatar */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => inputRef.current?.click()} disabled={uploading} className="relative block">
          {/* Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0a84ff]/20 via-[#5e5ce6]/20 to-[#0a84ff]/20 rounded-full blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity" />

          <div className="relative">
            <img src={currentAvatar} className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900 shadow-xl" alt="avatar" />

            {/* Progress ring */}
            <AnimatePresence>
              {uploading && (
                <motion.svg initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(10,132,255,0.15)" strokeWidth="3" />
                  <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#0a84ff" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress / 100 }} transition={{ duration: 0.3 }} strokeDasharray="289" style={{ filter: "drop-shadow(0 0 8px rgba(10,132,255,0.5))" }} />
                </motion.svg>
              )}
            </AnimatePresence>

            {/* Overlay */}
            <div className={`absolute inset-0 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${isDragging? "bg-[#0a84ff]/80 opacity-100" : uploading || success? "bg-black/60 opacity-100" : "bg-black/0 opacity-0 group-hover/avatar:bg-black/50 group-hover/avatar:opacity-100"}`}>
              <AnimatePresence mode="wait">
                {isDragging? (
                  <motion.div key="drag" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-white text-center">
                    <FiImage size={28} className="mx-auto mb-1" />
                    <span className="text-xs font-bold">Thả ảnh</span>
                  </motion.div>
                ) : uploading? (
                  <motion.div key="uploading" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-white text-center">
                    <FiLoader className="animate-spin mx-auto mb-1" size={24} />
                    <span className="text-sm font-bold">{progress}%</span>
                  </motion.div>
                ) : success? (
                  <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-12 h-12">
                    <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-12 h-12" aria-label="Thành công" />
                  </motion.div>
                ) : (
                  <motion.div key="camera" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-white">
                    <FiCamera size={26} strokeWidth={2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Success badge */}
            <AnimatePresence>
              {success && (
                <>
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.15, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute -inset-3 pointer-events-none">
                    <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-[110px] h-[110px] -ml-3.5 -mt-3.5" />
                  </motion.div>
                  <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 15 }} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00C853] border-3 border-white dark:border-zinc-900 grid place-items-center shadow-lg">
                    <FiCheck size={16} className="text-white" strokeWidth={3} />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Cancel button */}
            <AnimatePresence>
              {uploading && (
                <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full grid place-items-center shadow-lg active:scale-90 transition-all">
                  <FiX size={14} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.button>

        {/* Label */}
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Ảnh đại diện</p>
          <p className="text-xs text-zinc-500 mt-0.5">JPG, PNG, WEBP • Tối đa 5MB</p>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-medium shadow-lg">
              <FiX size={14} />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="h-8 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50">
          <FiCamera size={14} />Đổi ảnh
        </button>
        {user?.photoURL && (
          <button onClick={async () => { if (confirm("Xóa ảnh đại diện?")) { await updateDoc(doc(db, "users", user.uid), { avatar: null }); await updateProfile(user, { photoURL: null }); toast.success("Đã xóa"); } }} className="h-8 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 active:scale-95 transition-all">
            <FiTrash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
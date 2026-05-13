"use client";

import { getFirebaseStorage, getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useRef, useState, useEffect } from "react";
import { FiCamera, FiLoader, FiCheck, FiX } from "react-icons/fi";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadAvatar() {
  const storage = getFirebaseStorage();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const successLottie = "/lotties/huha-celebrate-full.lottie";

  useEffect(() => {
    return () => {
      uploadTaskRef.current?.cancel();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const user = auth.currentUser;
    if (!file ||!user) return;

    if (!user.uid) {
      setError("Vui lòng đăng nhập lại");
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
      let processFile = file;

      if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
        throw new Error("File HEIC chưa được hỗ trợ. Vui lòng chọn JPG/PNG");
      }

      if (!processFile.type.startsWith("image/")) {
        throw new Error("Chỉ chấp nhận file ảnh");
      }
      if (processFile.size > 5 * 1024) {
        throw new Error("Ảnh không được vượt quá 5MB");
      }

      const previewUrl = URL.createObjectURL(processFile);
      previewUrlRef.current = previewUrl;
      setPreview(previewUrl);

      const compressed = await compressImage(processFile);

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const oldAvatar = userDoc.data()?.avatar;
      if (oldAvatar && oldAvatar.includes("firebasestorage.googleapis.com")) {
        try {
          await deleteObject(ref(storage, oldAvatar));
        } catch (e) {
          console.warn("Không xóa được avatar cũ:", e);
        }
      }

      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadWithRetry(storageRef, compressed, user);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra");
      setUploading(false);
      setPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploadWithRetry = async (storageRef: any, blob: Blob, user: any, attempt = 1): Promise<void> => {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob);
      uploadTaskRef.current = task;

      task.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(prog));
        },
        async (err) => {
          if (attempt < 2 && err.code!== "storage/canceled") {
            console.warn(`Upload fail lần ${attempt}, retry...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            return uploadWithRetry(storageRef, blob, user, attempt + 1).then(resolve).catch(reject);
          }
          setError("Upload thất bại");
          setUploading(false);
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);

            await Promise.all([
              updateDoc(doc(db, "users", user.uid), { avatar: url }),
              updateProfile(auth.currentUser!, { photoURL: url }),
            ]);

            setSuccess(true);
            setUploading(false);
            navigator.vibrate?.([10,20,10]);
            setTimeout(() => setSuccess(false), 2200);
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
      if (typeof window === 'undefined') {
        return reject(new Error("Compress chỉ chạy ở client"));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          const size: number = Math.min(img.width, img.height, 800);
          canvas.width = size;
          canvas.height = size;

          const offsetX: number = (img.width - size) / 2;
          const offsetY: number = (img.height - size) / 2;

          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);

          canvas.toBlob(
            (blob) => blob? resolve(blob) : reject(new Error("Compress failed")),
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Không đọc được ảnh"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Không đọc được file"));
      reader.readAsDataURL(file);
    });
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

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleUpload}
        disabled={uploading}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative flex items-center gap-3 text-sm font-semibold transition-colors disabled:opacity-50"
        style={{color:'#0042B2'}}
      >
        <div className="relative">
          <motion.img
            whileHover={{scale:1.03}}
            src={
              preview ||
              user?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "U")}&background=0042B2&color=fff`
            }
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-zinc-950 shadow-xl"
            alt="avatar"
          />

          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
            {uploading? (
              <div className="text-white text-center">
                <FiLoader className="animate-spin mx-auto mb-1" size={20} />
                <span className="text-xs font-bold">{progress}%</span>
              </div>
            ) : success? (
              <div className="w-8 h-8">
                <DotLottieReact src={successLottie} autoplay style={{width:32,height:32}} />
              </div>
            ) : (
              <FiCamera className="text-white" size={24} />
            )}
          </div>

          {uploading && (
            <>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0,66,178,0.2)" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="#0042B2"
                  strokeWidth="4"
                  strokeDasharray={`${progress * 3.01} 301`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                  style={{filter:'drop-shadow(0 0 6px rgba(0,66,178,0.5))'}}
                />
              </svg>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
              >
                <FiX size={12} />
              </button>
            </>
          )}

          <AnimatePresence>
{success && (
  <>
    {/* Lottie burst */}
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1.15, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="absolute -inset-3 pointer-events-none"
    >
      <DotLottieReact
        src={successLottie}
        autoplay
        style={{
          width: 110,
          height: 110,
          marginLeft: -14,
          marginTop: -14,
        }}
      />
    </motion.div>

    {/* Success badge */}
    <motion.div
      initial={{ scale: 0, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 18,
      }}
      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00C853]/95 backdrop-blur-xl border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(0,200,83,0.45)]"
    >
      <FiCheck size={16} className="text-white stroke-[3]" />
    </motion.div>
  </>
)}
          </AnimatePresence>
        </div>

        <span className="hover:underline">Đổi ảnh đại diện</span>
      </button>

      <AnimatePresence>
        {error && (
          <motion.p initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-xs text-red-500 mt-2 absolute max-w-[200px] font-medium">{error}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

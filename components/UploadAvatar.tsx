"use client";

import { useAuth } from "@/lib/AuthContext";
import { storage, db, auth } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useRef, useState, useEffect } from "react";
import { FiCamera, FiLoader, FiCheck, FiX } from "react-icons/fi";
import heic2any from "heic2any"; // ✅ FIX 2: npm i heic2any

export default function UploadAvatar() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null); // ✅ FIX 5
  const previewUrlRef = useRef<string | null>(null); // ✅ FIX 4

  // ✅ FIX 5: Cleanup khi unmount
  useEffect(() => {
    return () => {
      uploadTaskRef.current?.cancel();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!user) return;

    // ✅ FIX 9: Guard
    if (!user.uid) {
      setError("Vui lòng đăng nhập lại");
      return;
    }

    setError("");
    setUploading(true);
    setSuccess(false);
    setProgress(0);

    // Hủy upload cũ nếu có
    uploadTaskRef.current?.cancel();
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    try {
      // ✅ FIX 2: Convert HEIC → JPEG
      let processFile = file;
      if (file.type === "image/heic" || file.type === "image/heif" || file.name.endsWith(".heic")) {
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
        processFile = new File([converted as Blob], file.name.replace(/\.heic$/i, ".jpg"), {
          type: "image/jpeg",
        });
      }

      // Validate
      if (!processFile.type.startsWith("image/")) {
        throw new Error("Chỉ chấp nhận file ảnh");
      }
      if (processFile.size > 5 * 1024) {
        throw new Error("Ảnh không được vượt quá 5MB");
      }

      // Preview
      const previewUrl = URL.createObjectURL(processFile);
      previewUrlRef.current = previewUrl;
      setPreview(previewUrl);

      // Compress
      const compressed = await compressImage(processFile);

      // ✅ FIX 1: Xóa avatar cũ trước
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const oldAvatar = userDoc.data()?.avatar;
      if (oldAvatar && oldAvatar.includes("firebasestorage.googleapis.com")) {
        try {
          await deleteObject(ref(storage, oldAvatar));
        } catch (e) {
          console.warn("Không xóa được avatar cũ:", e);
        }
      }

      // Upload với retry
      const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      await uploadWithRetry(storageRef, compressed);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra");
      setUploading(false);
      setPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // ✅ FIX 7: Upload với retry 2 lần
  const uploadWithRetry = async (storageRef: any, blob: Blob, attempt = 1): Promise<void> => {
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
            return uploadWithRetry(storageRef, blob, attempt + 1).then(resolve).catch(reject);
          }
          setError("Upload thất bại");
          setUploading(false);
          reject(err);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);

            // Update Firestore + Auth
            await Promise.all([
              updateDoc(doc(db, "users", user!.uid), { avatar: url }),
              updateProfile(auth.currentUser!, { photoURL: url }), // ✅ FIX 3
            ]);

            setSuccess(true);
            setUploading(false);
            setTimeout(() => setSuccess(false), 2000);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  };

  // Compress + Crop vuông center
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // ✅ FIX 6: Crop vuông center
          const size = Math.min(img.width, img.height, 800);
          canvas.width = size;
          canvas.height = size;

          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;

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

  // ✅ FIX 5: Cancel khi bấm X
  const handleCancel = () => {
    uploadTaskRef.current?.cancel();
    setUploading(false);
    setProgress(0);
    setPreview(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={handleUpload}
        disabled={uploading}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
      >
        <div className="relative">
          <img
            src={
              preview ||
              user?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "U")}&background=random`
            }
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900 shadow-lg"
            alt="avatar"
          />

          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading? (
              <div className="text-white text-center">
                <FiLoader className="animate-spin mx-auto mb-1" size={20} />
                <span className="text-xs font-bold">{progress}%</span>
              </div>
            ) : success? (
              <FiCheck className="text-white" size={24} />
            ) : (
              <FiCamera className="text-white" size={24} />
            )}
          </div>

          {uploading && (
            <>
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="rgb(59 130 246 / 0.3)" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgb(59 130 246)"
                  strokeWidth="4"
                  strokeDasharray={`${progress * 3.01} 301`}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </svg>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
              >
                <FiX size={14} />
              </button>
            </>
          )}
        </div>

        <span>Đổi ảnh đại diện</span>
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-2 absolute max-w-[200px]">{error}</p>
      )}
    </div>
  );
}

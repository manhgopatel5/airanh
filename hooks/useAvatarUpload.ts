import { useState, useRef } from "react";
import { updateProfile, User } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import imageCompression from 'browser-image-compression';
import { toast } from "sonner";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";

export function useAvatarUpload(user: User | null) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
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

      const storage = getFirebaseStorage();
      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, compressedFile);

      return new Promise<void>((resolve, reject) => {
        uploadTaskRef.current!.on(
          "state_changed",
          (snapshot) => {
            const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(prog));
          },
          (err) => {
            if (err.code!== "storage/canceled") toast.error("Upload thất bại");
            setUploading(false);
            reject(err);
          },
          async () => {
            const task = uploadTaskRef.current;
            if (!task) return;
            const url = await getDownloadURL(task.snapshot.ref);
            const db = getFirebaseDB();
            
            await Promise.all([
              updateProfile(user, { photoURL: url }),
              updateDoc(doc(db, "users", user.uid), {
                photoURL: url,
                lastAvatarChangeAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              })
            ]);
            await user.reload();
            toast.success("Cập nhật avatar thành công. Bạn có thể đổi lại sau 3 tháng");
            if ("vibrate" in navigator) navigator.vibrate(8);
            setUploading(false);
            resolve();
          }
        );
      });
    } catch (error) {
      console.error(error);
      toast.error("Xử lý ảnh thất bại");
      setUploading(false);
      throw error;
    }
  };

  const cancelUpload = () => {
    if (uploadTaskRef.current) uploadTaskRef.current.cancel();
  };

  return { uploading, uploadProgress, uploadAvatar, cancelUpload };
}
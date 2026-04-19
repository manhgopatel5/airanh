"use client";

import { useAuth } from "@/lib/AuthContext";
import { storage, db } from "@/lib/firebase.client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

export default function UploadAvatar() {
  const { user } = useAuth();

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `avatars/${user.uid}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", user.uid), {
      avatar: url,
    });

    alert("Upload thành công!");
  };

  return (
    <label className="cursor-pointer text-blue-500 text-sm">
      📸 Đổi avatar
      <input
        type="file"
        hidden
        onChange={handleUpload}
      />
    </label>
  );
}

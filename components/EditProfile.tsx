"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase.client";
import { doc, updateDoc } from "firebase/firestore";

export default function EditProfile({ currentName }: any) {
  const { user } = useAuth();
  const [name, setName] = useState(currentName);

  const save = async () => {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      name,
    });

    alert("Đã cập nhật!");
  };

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full rounded"
      />

      <button
        onClick={save}
        className="bg-black text-white px-3 py-2 rounded"
      >
        Lưu
      </button>
    </div>
  );
}

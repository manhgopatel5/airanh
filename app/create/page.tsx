"use client";

import { useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { FiImage } from "react-icons/fi";

export default function CreateTaskPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const [mode, setMode] = useState<"hour" | "day">("hour");
  const [time, setTime] = useState("");
  const [days, setDays] = useState(1);

  const [image, setImage] = useState<File | null>(null);

  // upload ảnh
  const uploadImage = async () => {
    if (!image) return "";

    const storageRef = ref(storage, `tasks/${Date.now()}`);
    await uploadBytes(storageRef, image);
    return await getDownloadURL(storageRef);
  };

  const handleCreate = async () => {
    const imageUrl = await uploadImage();

    await addDoc(collection(db, "tasks"), {
      title,
      desc,
      price,
      deadline: mode === "hour" ? time : `${days} ngày`,
      imageUrl,
      likes: [],
      comments: [],
      userId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    alert("Đăng nhiệm vụ thành công");
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">

      {/* 🔥 CARD */}
      <div className="bg-white rounded-3xl shadow p-4">

        <h2 className="text-lg font-bold mb-4">
          Đăng nhiệm vụ
        </h2>

        {/* TITLE */}
        <input
          placeholder="Tiêu đề nhiệm vụ"
          className="w-full border p-3 rounded-xl mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* DESC */}
        <textarea
          placeholder="Mô tả chi tiết"
          className="w-full border p-3 rounded-xl mb-3"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        {/* PRICE */}
        <input
          type="number"
          placeholder="Giá (VNĐ)"
          className="w-full border p-3 rounded-xl mb-3"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {/* 🔥 DEADLINE MODE */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode("hour")}
            className={`flex-1 p-2 rounded-xl ${
              mode === "hour"
                ? "bg-blue-500 text-white"
                : "bg-gray-100"
            }`}
          >
            Theo giờ
          </button>

          <button
            onClick={() => setMode("day")}
            className={`flex-1 p-2 rounded-xl ${
              mode === "day"
                ? "bg-blue-500 text-white"
                : "bg-gray-100"
            }`}
          >
            Theo ngày
          </button>
        </div>

        {/* 🔥 PICK TIME */}
        {mode === "hour" ? (
          <input
            type="datetime-local"
            className="w-full border p-3 rounded-xl mb-3"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        ) : (
          <input
            type="number"
            min={1}
            className="w-full border p-3 rounded-xl mb-3"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            placeholder="Số ngày"
          />
        )}

        {/* 🔥 IMAGE ICON */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer text-gray-600">
          <FiImage size={20} />
          <span>Thêm ảnh</span>
          <input
            type="file"
            hidden
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>

        {/* BUTTON */}
        <button
          onClick={handleCreate}
          className="bg-green-500 text-white w-full p-3 rounded-xl"
        >
          Đăng nhiệm vụ
        </button>
      </div>
    </div>
  );
}
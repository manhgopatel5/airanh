"use client";

import { useState } from "react";
import { db, auth, storage } from "@/lib/firebase.client";
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
import { FiImage, FiMapPin, FiX } from "react-icons/fi";
import imageCompression from "browser-image-compression";

/* 🔥 MOCK DATA VN */
const cities = ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng"];
const districts = ["Quận 1", "Quận 2", "Quận 3"];
const wards = ["Phường 1", "Phường 2"];

const suggestions = ["design", "code", "fixbug", "marketing"];

export default function CreateTaskPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const [mode, setMode] = useState<"hour" | "day">("hour");
  const [time, setTime] = useState("");
  const [days, setDays] = useState(1);

  // 🔥 MULTI IMAGE
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [showLocation, setShowLocation] = useState(false);
  const [locationType, setLocationType] = useState<"gps" | "manual" | "">("");

  const [location, setLocation] = useState<any>({
    city: "",
    district: "",
    ward: "",
    street: "",
    lat: null,
    lng: null,
  });

  /* ================= IMAGE ================= */

  const compressImage = async (file: File) => {
    return await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1024,
    });
  };

  const handleImages = async (files: FileList) => {
    const arr = Array.from(files);

    const compressed = await Promise.all(
      arr.map((f) => compressImage(f))
    );

    setImages(compressed);
    setPreviews(compressed.map((f) => URL.createObjectURL(f)));
  };

  const uploadImages = async () => {
    const urls = [];

    for (let file of images) {
      const refImg = ref(storage, `tasks/${Date.now()}_${file.name}`);
      await uploadBytes(refImg, file);
      const url = await getDownloadURL(refImg);
      urls.push(url);
    }

    return urls;
  };

  /* ================= TAG ================= */

  const addTag = (value?: string) => {
    const t = value || tagInput;
    if (!t) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };

  /* ================= GPS ================= */

  const getGPS = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({
        ...location,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      alert("Đã lấy vị trí");
    });
  };

  /* ================= CREATE ================= */

  const handleCreate = async () => {
    const imageUrls = await uploadImages();

    await addDoc(collection(db, "tasks"), {
      title,
      desc,
      price,
      tags,
      location,
      locationType,
      deadline: mode === "hour" ? time : `${days} ngày`,
      images: imageUrls,
      likes: [],
      comments: [],
      userId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    });

    alert("Đăng nhiệm vụ thành công");
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
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

        {/* TAG */}
        <div className="mb-3">
          <div className="flex gap-2 flex-wrap mb-2">
            {tags.map((t) => (
              <div key={t} className="bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                #{t}
                <FiX size={14} onClick={() => removeTag(t)} />
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-2">
            <input
              placeholder="Thêm tag"
              className="flex-1 border p-2 rounded"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
            />
            <button onClick={() => addTag()}>+</button>
          </div>

          {/* 🔥 SUGGEST */}
          <div className="flex gap-2 flex-wrap">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => addTag(s)}
                className="bg-gray-100 px-2 py-1 rounded"
              >
                #{s}
              </button>
            ))}
          </div>
        </div>

        {/* PRICE */}
        <input
          type="number"
          placeholder="Giá (VNĐ)"
          className="w-full border p-3 rounded-xl mb-3"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {/* DEADLINE */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMode("hour")} className={`flex-1 p-2 rounded-xl ${mode === "hour" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
            Theo giờ
          </button>
          <button onClick={() => setMode("day")} className={`flex-1 p-2 rounded-xl ${mode === "day" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
            Theo ngày
          </button>
        </div>

        {mode === "hour" ? (
          <input type="datetime-local" className="w-full border p-3 rounded-xl mb-3" value={time} onChange={(e) => setTime(e.target.value)} />
        ) : (
          <input type="number" min={1} className="w-full border p-3 rounded-xl mb-3" value={days} onChange={(e) => setDays(Number(e.target.value))} />
        )}

        {/* LOCATION */}
        <div onClick={() => setShowLocation(!showLocation)} className="flex items-center gap-2 mb-3 cursor-pointer">
          <FiMapPin />
          <span>Thêm vị trí</span>
        </div>

        {showLocation && (
          <div className="border p-3 rounded-xl mb-3">

            <div className="flex gap-2 mb-2">
              <button onClick={() => { setLocationType("gps"); getGPS(); }}>
                📍 GPS
              </button>

              <button onClick={() => setLocationType("manual")}>
                🏙 Thủ công
              </button>
            </div>

            {locationType === "manual" && (
              <div className="flex flex-col gap-2">
                <select onChange={(e) => setLocation({ ...location, city: e.target.value })}>
                  <option>Chọn tỉnh</option>
                  {cities.map((c) => <option key={c}>{c}</option>)}
                </select>

                <select onChange={(e) => setLocation({ ...location, district: e.target.value })}>
                  <option>Chọn quận</option>
                  {districts.map((d) => <option key={d}>{d}</option>)}
                </select>

                <select onChange={(e) => setLocation({ ...location, ward: e.target.value })}>
                  <option>Chọn phường</option>
                  {wards.map((w) => <option key={w}>{w}</option>)}
                </select>

                <input placeholder="Đường" className="border p-2 rounded"
                  onChange={(e) => setLocation({ ...location, street: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {/* IMAGE */}
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <FiImage />
          <span>Thêm ảnh</span>
          <input type="file" multiple hidden onChange={(e) => handleImages(e.target.files!)} />
        </label>

        {/* PREVIEW */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {previews.map((p, i) => (
            <img key={i} src={p} className="h-24 object-cover rounded" />
          ))}
        </div>

        {/* BUTTON */}
        <button onClick={handleCreate} className="bg-green-500 text-white w-full p-3 rounded-xl">
          Đăng nhiệm vụ
        </button>

      </div>
    </div>
  );
}
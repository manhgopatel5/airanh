"use client";

import { interestGroups } from "@/data/interests";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { skillGroups } from "@/data/skills";
const modeConfig = {
  task: {
    label: "Kỹ năng yêu cầu",
    data: skillGroups,
    color: "blue",
  },
  plan: {
    label: "Hoạt động & sở thích",
    data: interestGroups,
    color: "green",
  },
};
import {
  FiImage,
  FiMapPin,
  FiX,
  FiHeart,
  FiMessageCircle,
  FiShare2
} from "react-icons/fi";
import imageCompression from "browser-image-compression";





export default function CreateTaskPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [isPlan, setIsPlan] = useState(false);
  const mode = isPlan ? "plan" : "task";
  const config = modeConfig[mode];
  const [desc, setDesc] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [time, setTime] = useState("");
  
  const router = useRouter();
const inputClass =
  `w-full h-12 px-4 rounded-2xl border 
  ${isPlan 
    ? "bg-green-50 border-green-200 focus:border-green-500 focus:ring-green-100" 
    : "bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-100"
  } 
  focus:bg-white focus:ring-4
  transition-all duration-200 outline-none text-[15px] shadow-sm`;
  const [people, setPeople] = useState(0);
  type LocationType = {
  city: string;
  district: string;
  ward: string;
  street: string;
  lat: number | null;
  lng: number | null;
};

const [location, setLocation] = useState<LocationType>({
  city: "",
  district: "",
  ward: "",
  street: "",
  lat: null,
  lng: null,
});

  const [countdown, setCountdown] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = (type: "inc" | "dec") => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setPeople((p) => {
        if (type === "inc") return Math.min(100, (p || 0) + 1);
        return Math.max(0, (p || 0) - 1);
      });
    }, 120);
  };

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  // ===== SKILL SYSTEM =====
const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
const [showSkillPicker, setShowSkillPicker] = useState(false);
const [search, setSearch] = useState("");
const [selectedGroup, setSelectedGroup] = useState("");

const clearDraft = () => {
  localStorage.removeItem("task_draft");
  localStorage.removeItem("task_location");
  localStorage.removeItem("task_skills");
localStorage.removeItem("plan_interests");
  sessionStorage.removeItem("task_temp"); // nếu có dùng
};
  

  const formatPrice = (value: string) => {
    if (!value) return "";
    return Number(value).toLocaleString("vi-VN");
  };

  const compressImage = async (file: File) => {
    return await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1024,
    });
  };

const handleImages = async (files: FileList) => {
  if (images.length + files.length > 3) {
    alert("Tối đa 3 ảnh");
    return;
  }

  const arr = Array.from(files);

  const compressed = await Promise.all(
    arr.map(async (f) => {
      if (f.size > 5 * 1024 * 1024) {
        alert("Ảnh quá lớn (>5MB)");
        return null;
      }

      const blob = await compressImage(f);

      return new File([blob], f.name, {
        type: blob.type,
      });
    })
  );

  const valid = compressed.filter(Boolean) as File[];

  setImages((prev) => [...prev, ...valid]);

  setPreviews((prev) => [
    ...prev,
    ...valid.map((f) => URL.createObjectURL(f)),
  ]);
}; // ✅ QUAN TRỌNG: PHẢI CÓ DẤU NÀY

      // ✅ FIX QUAN TRỌNG: Blob → File
     

const uploadImages = async () => {
  try {
    const uploads = images.map(async (file) => {
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const refImg = ref(
        storage,
        `tasks/${Date.now()}_${crypto.randomUUID()}_${safeName}`
      );

      const snapshot = await uploadBytes(refImg, file);

      const url = await getDownloadURL(snapshot.ref);

      return url;
    });

    return (await Promise.allSettled(uploads))
  .filter(r => r.status === "fulfilled")
  .map((r: any) => r.value);
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    throw err;
  }
};
  const addTag = (value?: string) => {
    let t = value || tagInput;
    if (!t) return;

    t = t.replace(/#/g, "").trim();

    if (!t) return;

    if (tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())) return;

    if (tags.length >= 5) {
      alert("Tối đa 5 tag");
      return;
    }

    setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((tag) => tag !== t));
  };
useEffect(() => {
  if (!time) {
    setCountdown("");
    return;
  }

  const update = () => {
    const target = new Date(time);
    const diff = target.getTime() - Date.now();

    if (diff <= 0) {
      setCountdown("Đã hết hạn");
      return;
    }

    const totalMinutes = Math.floor(diff / 1000 / 60);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      setCountdown(`${days} ngày ${hours} giờ ${minutes} phút`);
    } else {
      setCountdown(`${hours} giờ ${minutes} phút`);
    }
  };

  update();

  const interval = setInterval(update, 60000);

  return () => clearInterval(interval);
}, [time]);

useEffect(() => {
  const saved = localStorage.getItem("task_draft");
  if (!saved) return;

  const data = JSON.parse(saved);

  setTitle(data.title || "");
  setDesc(data.desc || "");
  setPrice(data.price || "");
  setPeople(data.people || 0);
  setTime(data.time || "");
  setIsPlan(data.isPlan || false);
setLocation({
  city: data.location?.city || "",
  district: data.location?.district || "",
  ward: data.location?.ward || "",
  street: data.location?.street || "",
  lat: null,
  lng: null,
});
  setSelectedSkills(data.selectedSkills || []);
  setTags(data.tags || []);
}, []);

useEffect(() => {
  const groups = Object.keys(config.data);
  if (groups.length) {
    setSelectedGroup(groups[0]);
  }
}, [config]);
  
useEffect(() => {
  let unsubscribeSnap: any;

  const unsubscribeAuth = auth.onAuthStateChanged((user) => {
    if (!user) return;

    unsubscribeSnap = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data();
        if (!data) return;

        setUserInfo({
          name: data.name || "User",
          avatar:
            data.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              data.name || "User"
            )}`,
        });
      }
    );
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnap) unsubscribeSnap();
  };
}, []);


// ✅ useEffect 2 (đặt BÊN NGOÀI)
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };
}, []);

useEffect(() => {
  let startX = 0;
  let startTime = 0;

  const handleTouchStart = (e: TouchEvent) => {
    startX = e.touches[0].clientX;

    // ❗ chỉ nhận nếu bắt đầu từ mép trái
    if (startX > 30) return;

    startTime = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (startX > 30) return;

    const endX = e.changedTouches[0].clientX;
    const diffX = endX - startX;
    const time = Date.now() - startTime;

    const velocity = diffX / time;

if (diffX > 80 && velocity > 0.3) {
  clearDraft();
  router.push("/");
}
  };


  window.addEventListener("touchstart", handleTouchStart);
  window.addEventListener("touchend", handleTouchEnd);

  return () => {
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchend", handleTouchEnd);
  };
}, [router]);

// ✅ DÁN NGAY DƯỚI ĐÂY
useEffect(() => {
  const handlePop = () => clearDraft();

  window.addEventListener("popstate", handlePop);

  return () => window.removeEventListener("popstate", handlePop);
}, []);

useEffect(() => {
  const prevent = (e: any) => {
    if (e.touches?.length > 1) {
      e.preventDefault();
    }
  };

  document.addEventListener("gesturestart", prevent as any);
  document.addEventListener("gesturechange", prevent as any);

  return () => {
    document.removeEventListener("gesturestart", prevent as any);
    document.removeEventListener("gesturechange", prevent as any);
  };
}, []);
useEffect(() => {
  if (typeof window === "undefined") return;

  const saved = localStorage.getItem("task_location");

  if (saved) {
    const parsed = JSON.parse(saved);

   setLocation({
  city: parsed.city || "",
  district: parsed.district || "",
  ward: parsed.ward || "",
  street: parsed.street || "",
  lat: null,
  lng: null,
});

    localStorage.removeItem("task_location");
  }
}, []);
useEffect(() => {
  const current = previews;
  return () => {
    current.forEach((p) => URL.revokeObjectURL(p));
  };
}, []);

useEffect(() => {
  if (!title.trim() && !desc.trim()) return;

  const timeout = setTimeout(() => {
    localStorage.setItem(
      "task_draft",
      JSON.stringify({
        title,
        desc,
        price,
        people,
        time,
        location,
        selectedSkills,
        isPlan, // ✅ THÊM
        tags,
      })
    );
  }, 500);


  return () => clearTimeout(timeout);
}, [title, desc, price, people, time, location, selectedSkills, tags, isPlan]);

useEffect(() => {
  if (search) {
    setSelectedGroup("");
  } else {
    const groups = Object.keys(config.data);
    if (groups.length) {
      setSelectedGroup(groups[0]);
    }
  }
}, [search]);

useEffect(() => {
  const key = isPlan ? "plan_interests" : "task_skills";
  const saved = localStorage.getItem(key);

  if (!saved) return;

  setSelectedSkills(JSON.parse(saved));
  localStorage.removeItem(key);
}, [isPlan]);

useEffect(() => {
  if (showSkillPicker) {
    document.body.style.overflow = "hidden";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [showSkillPicker]);
useEffect(() => {
  titleRef.current?.focus();
}, []);

// 👉 DÁN Ở ĐÂY


useEffect(() => {
  if (isPlan) {
    setPrice("");
  }
}, [isPlan]);

useEffect(() => {
  setSelectedSkills([]);
  setSearch("");
}, [isPlan]);

const isFormValid = () => {
if (isPlan) {
  return (
    title.trim() &&
    desc.trim() &&
    people > 0 &&
    time && // ✅ THÊM DÒNG NÀY
    location.city &&
    location.district
  );
}

  return (
    title.trim() &&
    price &&
    people > 0 &&
    time &&
    location.city &&
    location.district &&
    location.ward
  );
};
const finalTags = selectedSkills.length ? selectedSkills : tags;
const shake = (el: HTMLElement) => {
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 300 }
  );
};
const handleCreate = async () => {
  if (loading) return false;

  const user = auth.currentUser;
  if (!user) {
    alert("Bạn chưa đăng nhập");
    return false;
  }

  if (!isFormValid()) {
    alert("Thiếu thông tin");
    return false;
  }

  const priceNumber = Number(price);
  if (!isPlan && (isNaN(priceNumber) || priceNumber <= 0)) {
    alert("Giá không hợp lệ");
    return false;
  }

  setLoading(true);

  try {
    let imageUrls: string[] = [];

    if (images.length > 0) {
      imageUrls = await uploadImages();
    }

    const deadlineDate = new Date(time + ":00");

    await addDoc(collection(db, "tasks"), {
      title,
      desc,
      price: isPlan ? 0 : priceNumber,
      type: isPlan ? "plan" : "paid",
      people,
      tags: finalTags,
      location: {
        city: location.city || "",
        district: location.district || "",
        ward: location.ward || "",
        street: location.street || "",
        lat: location.lat || null,
        lng: location.lng || null,
      },
      deadline: deadlineDate || null,
      images: imageUrls,
      likes: [],
      comments: [],
      userId: user.uid,
      user: {
        name: userInfo?.name || user.displayName || "User",
        avatar:
          userInfo?.avatar ||
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.displayName || "User"
          )}`,
      },
      createdAt: serverTimestamp(),
    });

    localStorage.removeItem("task_draft");

    alert("Đăng nhiệm vụ thành công");

    // reset
    setTitle("");
    setDesc("");
    setPrice("");
    setIsPlan(false);
    setPeople(0);
    setTags([]);
    setSelectedSkills([]);
    setImages([]);
    setPreviews([]);
    setTime("");
    setLocation({
      city: "",
      district: "",
      ward: "",
      street: "",
      lat: null,
      lng: null,
    });

    return true;
  } catch (err: any) {
    console.error(err);
    alert("Lỗi: " + err.message);
    return false;
  } finally {
    setLoading(false);
  }
};

const allSkills = useMemo(
  () => Object.values(config.data).flat(),
  [config]
);

const filteredSkills = useMemo(() => {
  if (search) {
    return allSkills.filter((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (!selectedGroup) return [];

  return config.data[selectedGroup] || [];
}, [search, selectedGroup, allSkills, config]);

return (
  <>
    <div className="p-4 pb-[calc(100px+env(safe-area-inset-bottom))] max-w-xl mx-auto min-h-screen text-[15px] text-gray-800">
{/* TITLE */}
<div className="mb-2">
  <input
    ref={titleRef}
    onFocus={(e) => {
  e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
}}
    placeholder="Bạn cần gì đây?"
    className={inputClass + " text-[16px] font-semibold"}
    value={title}
    onChange={(e) => setTitle(e.target.value)}
  />
</div>
{/* DESC */}
<div className="mb-3">
  <textarea
    placeholder="Mô tả chi tiết..."
className={`${inputClass} min-h-[100px] py-3 text-[14px] text-gray-600 resize-none`}
    value={desc}
    onChange={(e) => setDesc(e.target.value)}
    onFocus={(e) => {
  e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
}}
    onInput={(e) => {
      e.currentTarget.style.height = "auto";
      e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
    }}
  />
</div>
{/* ===== SKILL + LOCATION TOP ===== */}
<div className="flex gap-3 mb-3">

  {/* SKILL */}
<div
  onClick={() => setShowSkillPicker(true)}
  className={inputClass + " flex items-center justify-between cursor-pointer"}
>
  <span className="truncate font-medium text-gray-800">
    {selectedSkills.length > 0
      ? `${selectedSkills[0]}${
          selectedSkills.length > 1
            ? ` +${selectedSkills.length - 1}`
            : ""
        }`
      : (isPlan ? "Hoạt động & sở thích" : "Lĩnh vực")}
  </span>

  <span>⌄</span>
</div>

  {/* LOCATION */}
  <div
    onClick={() => {
  localStorage.setItem(
  isPlan ? "plan_interests" : "task_skills",
  JSON.stringify(selectedSkills)
);
  router.push("/select-location");
}}
    className={inputClass + " flex items-center justify-between cursor-pointer"}
  >
    <span className="truncate font-medium text-gray-800">
      {location.city
        ? `${location.district}, ${location.city}`
        : "Địa điểm"}
    </span>
    <span>⌄</span>
  </div>

</div>

{/* ✅ ĐẶT Ở ĐÂY */}
<div className="flex items-center gap-2 mb-2">
  <input
    type="checkbox"
    checked={isPlan}
    onChange={(e) => setIsPlan(e.target.checked)}
    className="w-4 h-4"
  />
  <span className="text-sm text-gray-600">
    Tìm bạn cùng sở thích
  </span>
</div>
    
{/* PRICE + PEOPLE */}
<div className="flex gap-3 mb-3">


  {/* ===== GIÁ ===== */}
<input
  type="text"
  inputMode="numeric"
  placeholder={isPlan ? "Không cần giá" : "Giá (VNĐ)"}
  disabled={isPlan}
  className={`flex-1 h-12 px-4 rounded-2xl border outline-none text-[15px]
transition-all duration-200
${isPlan ? "opacity-50 scale-[0.98] bg-gray-100 text-gray-400 border-gray-100" 
: "bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}
`}
  value={isPlan ? "" : formatPrice(price)}
  onChange={(e) => {
    if (isPlan) return;
    const raw = e.target.value.replace(/\D/g, "");
    setPrice(raw);
  }}
/>

  {/* ===== PEOPLE ===== */}
  <div className="h-12 w-[150px] px-2 rounded-2xl bg-gray-50 border border-gray-200 
                  flex items-center justify-between">

    {/* - */}
    <button
      type="button"
      onMouseDown={() => startHold("dec")}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={() => startHold("dec")}
      onTouchEnd={stopHold}
      onClick={() => setPeople((p) => Math.max(0, p - 1))}
      className="w-8 h-8 flex items-center justify-center rounded-full 
                 bg-white active:scale-90 transition"
    >
      -
    </button>

    {/* TEXT */}
    <span className={`text-sm ${people === 0 ? "text-gray-400" : "text-gray-800 font-medium"}`}>
      {people === 0 ? "Số người" : people}
    </span>

    {/* + */}
    <button
      type="button"
      onMouseDown={() => startHold("inc")}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={() => startHold("inc")}
      onTouchEnd={stopHold}
      onClick={() => setPeople((p) => Math.min(100, p + 1))}
      className="w-8 h-8 flex items-center justify-center rounded-full 
                 bg-white active:scale-90 transition"
    >
      +
    </button>

  </div>

</div>
<div className="mb-3 relative">

  {/* FAKE PLACEHOLDER */}
  {!time && (
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[15px]">
      Thời hạn đăng
    </span>
  )}

  <input
    type="datetime-local"
   className={`w-full h-12 px-4 pr-10 rounded-2xl bg-gray-50 border border-gray-200 
focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
outline-none text-[15px] ${time ? "text-gray-800" : "text-gray-400"}`}
    value={time}
    onChange={(e) => setTime(e.target.value)}
  />
</div>

 
       {/* IMAGE */}
<label
  className={
    inputClass +
    " flex items-center justify-between cursor-pointer mb-3 shadow-sm hover:shadow-md transition"
  }
>
  <div className="flex items-center gap-2 text-gray-700">
    <FiImage size={18} />
    <span className="text-sm font-medium">
      {images.length > 0
        ? `Đã chọn ${images.length} ảnh`
        : "Thêm ảnh"}
    </span>
  </div>

  <div className="text-xs text-gray-400">
    Tối đa 3 ảnh
  </div>

  <input
    type="file"
    multiple
    hidden
    onChange={(e) => {
      if (!e.target.files) return;
      handleImages(e.target.files);
      e.target.value = "";
    }}
  />
</label>
{/* TAG INPUT */}
<div className="mb-3">
  <div className="flex gap-2 flex-wrap mb-2">
    {tags.map((t) => (
      <div
        key={t}
        className="
bg-gray-100 px-3 py-1 rounded-full 
flex items-center gap-1 text-sm 
shadow-sm hover:bg-gray-200 
transition active:scale-95
"
      >
        #{t}
        <FiX size={14} onClick={() => removeTag(t)} />
      </div>
    ))}
  </div>

  <div className="flex gap-2">
    <input
  placeholder="Thêm tag..."
  className={inputClass}
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={(e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTag();
  }
}}
    />
    <button
      type="button"
      onClick={() => addTag()}
      className="
w-10 h-10 flex items-center justify-center 
rounded-full bg-black text-white 
active:scale-95 transition shadow-md
"
    >
      +
    </button>
  </div>
</div>
</div>  {/* ✅ THÊM DÒNG NÀY — đóng form chính */}
{showSkillPicker && (
  <div className="fixed inset-0 bg-white z-50 flex flex-col animate-[fadeIn_0.2s_ease]">

    {/* HEADER */}
    <div className="p-4 flex justify-between border-b">
      <span className="font-semibold">
        {mode === "plan" ? "Chọn sở thích" : "Chọn kỹ năng"}
      </span>
      <button
        onClick={() => setShowSkillPicker(false)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:scale-90"
      >
        <span className="text-xl font-bold">×</span>
      </button>
    </div>

    {/* SEARCH */}
    <div className="p-3">
      <input
        placeholder="Tìm..."
        className="w-full p-3 bg-gray-100 rounded-xl"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* GROUP */}
    {!search && (
      <div className="flex gap-2 px-3 overflow-x-auto mb-2">
        {Object.keys(config.data).map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shrink-0 ${
              selectedGroup === group
                ? mode === "plan"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
                : "bg-gray-100"
            }`}
          >
            {group}
          </button>
        ))}
      </div>
    )}

    {/* SELECTED */}
    {selectedSkills.length > 0 && (
      <div className="px-3 pb-2 flex gap-2 flex-wrap">
        {selectedSkills.map((s) => (
          <div
            key={s}
            onClick={() =>
              setSelectedSkills((prev) => prev.filter((i) => i !== s))
            }
            className={
              mode === "plan"
                ? "bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm cursor-pointer"
                : "bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm cursor-pointer"
            }
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ✕
          </div>
        ))}
      </div>
    )}

    {/* LIST */}
    <div className="flex-1 overflow-y-auto pb-20">
      {filteredSkills.length === 0 && (
        <div className="p-4 text-center text-gray-400">
          {mode === "plan"
            ? "Không tìm thấy sở thích"
            : "Không tìm thấy kỹ năng"}
        </div>
      )}

      {filteredSkills.map((s) => {
        const active = selectedSkills.includes(s);

        return (
          <div
            key={s}
            onClick={() => {
              if (active) {
                setSelectedSkills((prev) => prev.filter((i) => i !== s));
              } else {
                setSelectedSkills((prev) => [...prev, s]);
              }
            }}
            className="p-4 border-b flex justify-between active:bg-gray-100 transition"
          >
            <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
            {active && <span>✓</span>}
          </div>
        );
      })}
    </div>

    {/* BUTTON */}
    <div className="p-4 border-t">
      <button
        onClick={() => setShowSkillPicker(false)}
        className={`w-full p-3 rounded-xl text-white font-semibold ${
          mode === "plan" ? "bg-green-500" : "bg-blue-500"
        }`}
      >
        Xong
      </button>
    </div>

  </div>
)}
{showPreview && (
  <div className="fixed inset-0 z-50 bg-white flex flex-col animate-[fadeIn_0.2s_ease,slideUp_0.25s_ease]">
    
    {/* SCROLL AREA */}
    <div className="flex-1 overflow-y-auto p-4 pb-32">
      <h3 className="font-bold mb-2">Xem trước</h3>

      <div className="mb-3">
        {title && (
          <div
            className={`rounded-2xl border shadow-sm transition overflow-hidden
            ${isPlan ? "bg-green-50 border-green-100" : "bg-white border-gray-100"}`}
          >

            {/* USER */}
            {userInfo && (
              <div className="flex items-center justify-between p-3 pb-0">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      userInfo.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        userInfo.name || "User"
                      )}`
                    }
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                  <span className="text-sm font-medium">
                    {userInfo.name || "User"}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 space-y-2">

              {/* IMAGE */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {previews.map((src) => (
                    <img
                      key={src}
                      src={src}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 min-w-0">

                  {/* TITLE */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[15px] line-clamp-2">
                      {title}
                    </p>

                    {isPlan ? (
                      <span className="text-green-600 bg-green-100 px-2 py-[2px] rounded-md">
                        PLAN
                      </span>
                    ) : (
                      price && (
                        <span className="text-green-600">
                          {formatPrice(price)}đ
                        </span>
                      )
                    )}
                  </div>

                  {/* DESC */}
                  {desc && (
                    <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">
                      {desc}
                    </p>
                  )}

                  {/* META */}
                  <div className="flex items-center gap-2 mt-2 text-[13px] text-gray-500">
                    <span>⏳ {countdown || "--"}</span>
                    <span>👥 {people}</span>

                    {(selectedSkills.length || tags.length) > 0 && (
                      <>
                        <span
                          className={`px-2 py-[2px] rounded-md text-[12px] ${
                            isPlan
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          #{finalTags[0]}
                        </span>

                        {finalTags.length > 1 && (
                          <span className="text-gray-400 text-[12px]">
                            +{finalTags.length - 1}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* LOCATION */}
                  {(location?.district || location?.city) && (
                    <div className="text-[12px] text-gray-400 mt-1 truncate">
                      {location?.ward ? location.ward + ", " : ""}
                      {location?.district}, {location?.city}
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div> {/* ✅ ĐÓNG flex-1 */}

    {/* ACTION */}
    <div className="sticky bottom-0 bg-white p-4 flex gap-2 border-t">
      <button
        onClick={() => setShowPreview(false)}
        className="flex-1 p-3 bg-gray-200 rounded-xl"
      >
        Chỉnh sửa
      </button>

      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (loading) return;

          const ok = await handleCreate();
          if (ok) setShowPreview(false);
        }}
        disabled={loading || !isFormValid()}
        className="
        flex-1 p-3 rounded-xl 
        bg-gradient-to-r from-green-500 to-green-600 
        text-white font-semibold 
        active:scale-[0.97] transition-all duration-150
        disabled:opacity-40 disabled:scale-100 disabled:shadow-none
        "
      >
        Đăng bài
      </button>
    </div>

  </div>
)}

{!showSkillPicker && !showPreview && (
  <button
    onClick={() => setShowPreview(true)}
    disabled={loading || !isFormValid()}
    className="
    fixed left-4 right-4 z-50
    p-4 rounded-2xl 
    bg-gradient-to-r from-green-500 to-green-600 
    text-white font-semibold 
    active:scale-[0.97] transition-all duration-150
    disabled:opacity-40
    "
    style={{
       bottom: "calc(16px + env(safe-area-inset-bottom))"
        }}
      >
        {loading ? "Đang đăng..." : "Đăng nhiệm vụ"}
      </button>
    )}

  </>
);
}

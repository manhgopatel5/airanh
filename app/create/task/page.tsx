"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createTask } from "@/lib/task";
import { User } from "@/types/task";
import { toast, Toaster } from "sonner";
import type { CreateTaskInput } from "@/types/task";
import {
  FiUpload, FiX, FiMapPin, FiDollarSign, FiUsers, FiClock,
  FiTag, FiFileText, FiEye, FiEyeOff, FiNavigation,
  FiMic, FiLoader, FiZap
} from "react-icons/fi";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "delivery", name: "Giao hàng", icon: "🚚" },
  { id: "shopping", name: "Mua hộ", icon: "🛒" },
  { id: "tutoring", name: "Gia sư", icon: "📚" },
  { id: "design", name: "Thiết kế", icon: "🎨" },
  { id: "dev", name: "Lập trình", icon: "💻" },
  { id: "marketing", name: "Marketing", icon: "📢" },
  { id: "writing", name: "Viết lách", icon: "✍️" },
  { id: "other", name: "Khác", icon: "📌" },
];

const HOT_TAGS = ["gấp", "trong ngày", "part-time", "remote", "sinh viên", "cuối tuần"];

const formatCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  if (!number) return "";
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function CreateTaskPage() {
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    totalSlots: "1",
    durationHours: "24",
    category: "other",
    tags: [] as string[],
    images: [] as string[],
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
    visibility: "public" as "public" | "friends" | "private",
    budgetType: "fixed" as "fixed" | "hourly" | "negotiable",
    currency: "VND" as "VND" | "USD" | "EUR",
    isRemote: false,
    requirements: "",
    attachments: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const titleParam = searchParams.get("title");
    if (titleParam) {
      setForm(prev => ({...prev, title: decodeURIComponent(titleParam) }));
    }
  }, [searchParams]);

  // Load draft
  useEffect(() => {
    const draft = localStorage.getItem("task_draft");
    if (draft &&!searchParams.get("title")) {
      try {
        const parsed = JSON.parse(draft);
        setForm(prev => ({...prev,...parsed, images: [] }));
      } catch {}
    }
  }, []);

  // Auto save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      const { images,...rest } = form;
      localStorage.setItem("task_draft", JSON.stringify(rest));
    }, 1000);
    return () => clearTimeout(timer);
  }, [form]);

  // 5. Fetch price range
  useEffect(() => {
    if (!form.category) return;
    fetch(`/api/price-range?category=${form.category}&city=${form.city || 'HCM'}`)
     .then(r => r.json())
     .then(data => setPriceRange([data.min, data.max]))
     .catch(() => setPriceRange(null));
  }, [form.category, form.city]);

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        toast.error("Bạn cần đăng nhập");
        router.replace("/login");
        return;
      }
      if (!firebaseUser.emailVerified) {
        toast.warning("Vui lòng xác thực email");
        router.replace("/verify-email");
        return;
      }
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
      setLoading(false);
    });
    return () => unsub();
  }, [auth, router]);

  /* ================= 1. AI GỢI Ý ================= */
  const suggestWithAI = async () => {
    if (!form.title) return toast.error("Nhập tiêu đề trước");
    if ("vibrate" in navigator) navigator.vibrate(5);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, category: form.category })
      });
      if (!res.ok) throw new Error();
      const { description, price, tags } = await res.json();
      setForm(prev => ({
       ...prev,
        description: description || prev.description,
        price: price? formatCurrency(price.toString()) : prev.price,
        tags: [...new Set([...prev.tags,...tags])].slice(0, 10)
      }));
      toast.success("AI đã gợi ý xong");
    } catch {
      toast.error("AI đang bận, thử lại sau");
    } finally {
      setAiLoading(false);
    }
  };

  /* ================= 7. VOICE INPUT ================= */
  const startVoice = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return toast.error("Trình duyệt không hỗ trợ");

    if ("vibrate" in navigator) navigator.vibrate(10);
    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
      toast.info("Đang nghe... Nói mô tả công việc");
    };

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setForm(prev => ({...prev, description: (prev.description + " " + text).trim() }));
      toast.success("Đã thêm vào mô tả");
    };

    recognition.onerror = () => {
      toast.error("Lỗi ghi âm");
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognition.start();
  };

  /* ================= VALIDATE ================= */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    else if (form.title.length < 10) newErrors.title = "Tiêu đề tối thiểu 10 ký tự";
    else if (form.title.length > 100) newErrors.title = "Tiêu đề tối đa 100 ký tự";

    if (!form.description.trim()) newErrors.description = "Vui lòng nhập mô tả";
    else if (form.description.length < 20) newErrors.description = "Mô tả tối thiểu 20 ký tự";
    else if (form.description.length > 5000) newErrors.description = "Mô tả tối đa 5000 ký tự";

    const price = parseInt(form.price.replace(/\./g, ""));
    if (form.budgetType!== "negotiable") {
      if (!form.price || isNaN(price)) newErrors.price = "Vui lòng nhập giá";
      else if (price < 1000) newErrors.price = "Giá tối thiểu 1.000đ";
      else if (price > 100000000) newErrors.price = "Giá tối đa 100.000.000đ";
    }

    const slots = parseInt(form.totalSlots);
    if (!form.totalSlots || isNaN(slots)) newErrors.totalSlots = "Vui lòng nhập số người";
    else if (slots < 1) newErrors.totalSlots = "Tối thiểu 1 người";
    else if (slots > 100) newErrors.totalSlots = "Tối đa 100 người";

    const hours = parseInt(form.durationHours);
    if (!form.durationHours || isNaN(hours)) newErrors.durationHours = "Vui lòng nhập thời gian";
    else if (hours < 1) newErrors.durationHours = "Tối thiểu 1 giờ";
    else if (hours > 720) newErrors.durationHours = "Tối đa 30 ngày";

    if (!form.category) newErrors.category = "Vui lòng chọn danh mục";
    if (!form.isRemote &&!form.address.trim()) newErrors.address = "Vui lòng nhập địa điểm hoặc chọn làm từ xa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= UPLOAD IMAGES ================= */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 5) {
      toast.error("Tối đa 5 ảnh");
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} vượt quá 5MB`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`File ${file.name} không phải ảnh`);
        return;
      }
    }

    if ("vibrate" in navigator) navigator.vibrate(5);
    setImageFiles([...imageFiles,...files]);
    const urls = files.map(f => URL.createObjectURL(f));
    setForm({...form, images: [...form.images,...urls] });
  };

  const removeImage = (index: number) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    const newImages = [...form.images];
    const newFiles = [...imageFiles];
    newImages.splice(index, 1);
    newFiles.splice(index, 1);
    setForm({...form, images: newImages });
    setImageFiles(newFiles);
  };

  /* ================= TAGS ================= */
  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    if (form.tags.length >= 10) {
      toast.error("Tối đa 10 tag");
      return;
    }
    if (form.tags.includes(tag)) {
      toast.error("Tag đã tồn tại");
      return;
    }
    if ("vibrate" in navigator) navigator.vibrate(5);
    setForm({...form, tags: [...form.tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if ("vibrate" in navigator) navigator.vibrate(5);
    setForm({...form, tags: form.tags.filter(t => t!== tag) });
  };

  /* ================= GET LOCATION ================= */
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }
    if ("vibrate" in navigator) navigator.vibrate(10);
    toast.loading("Đang lấy vị trí...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
       ...form,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: "Vị trí hiện tại",
          isRemote: false,
        });
        toast.dismiss();
        toast.success("Đã lấy vị trí");
      },
      () => {
        toast.dismiss();
        toast.error("Không lấy được vị trí");
      }
    );
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      formRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const lastCreate = localStorage.getItem("last_task_create");
    if (lastCreate && Date.now() - parseInt(lastCreate) < 30000) {
      toast.error("Vui lòng chờ 30 giây trước khi tạo công việc mới");
      return;
    }

    try {
      setSubmitting(true);
      setUploadingImage(true);

      // Upload images
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileRef = ref(storage, `tasks/${user.uid}/${fileName}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }
      setUploadingImage(false);

      const deadline = Timestamp.fromMillis(
        Date.now() + parseInt(form.durationHours) * 60 * 60 * 1000
      );

      const payload: CreateTaskInput = {
        type: "task",
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.budgetType === "negotiable"? 0 : parseInt(form.price.replace(/\./g, ""), 10),
        currency: form.currency,
        budgetType: form.budgetType,
        totalSlots: parseInt(form.totalSlots, 10),
        visibility: form.visibility,
        deadline,
        applicationDeadline: deadline,
        startDate: Timestamp.now(),
        category: form.category,
        tags: form.tags,
        images: imageUrls,
        attachments: [],
        requirements: form.requirements.trim(),
        isRemote: form.isRemote,
        location: form.isRemote
     ? {}
          : {
              address: form.address.trim(),
              city: form.city.trim(),
       ...(form.lat!= null && { lat: form.lat }),
       ...(form.lng!= null && { lng: form.lng }),
            },
      };

      const result = await createTask(payload, user);
      localStorage.removeItem("task_draft");
      localStorage.setItem("last_task_create", Date.now().toString());
      toast.success("Đăng công việc thành công!");
      router.push(`/task/${result.slug}`);
    } catch (err: any) {
      console.error("Create task error:", err);
      if (err.code === "storage/unauthorized") {
        toast.error("Không có quyền upload ảnh. Kiểm tra Storage Rules");
      } else {
        toast.error(err.message || "Tạo công việc thất bại");
      }
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-28">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-20 safe-top">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tạo công việc</h1>
            <button onClick={() => router.back()} className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* 6. PREVIEW CARD */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-900">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">XEM TRƯỚC</p>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800">
              <h4 className="font-bold text-gray-900 dark:text-gray-100">{form.title || "Tiêu đề việc"}</h4>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{form.description || "Mô tả công việc..."}</p>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="font-bold text-green-600 dark:text-green-400">
                  {form.budgetType === "negotiable"? "Thương lượng" : `${form.price || "0"}đ`}
                </span>
                <span className="text-gray-500">{form.isRemote? "Làm từ xa" : form.address || "Chưa có địa điểm"}</span>
              </div>
            </div>
          </div>

          {/* Tiêu đề + AI */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: Giao hàng quận 1 trong 2h"
                value={form.title}
                onChange={(e) => {
                  setForm({...form, title: e.target.value });
                  if (errors.title) setErrors({...errors, title: "" });
                }}
                className={`flex-1 px-4 py-3 rounded-xl border ${
                  errors.title? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
                maxLength={100}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={suggestWithAI}
                disabled={aiLoading}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {aiLoading? <FiLoader className="animate-spin" /> : "✨ AI"}
              </motion.button>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-red-500 text-xs">{errors.title}</span>
              <span className="text-xs text-gray-500">{form.title.length}/100</span>
            </div>
          </div>

          {/* Mô tả + Voice */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                Mô tả chi tiết <span className="text-red-500">*</span>
              </label>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={startVoice}
                className={`p-2 rounded-lg ${listening? "bg-red-500 text-white animate-pulse" : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"}`}
              >
                <FiMic size={18} />
              </motion.button>
            </div>
            <textarea
              placeholder="Mô tả yêu cầu công việc, địa điểm, thời gian, kỹ năng cần có..."
              value={form.description}
              onChange={(e) => {
                setForm({...form, description: e.target.value });
                if (errors.description) setErrors({...errors, description: "" });
              }}
              rows={5}
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.description? "border-red-500" : "border-gray-200 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all`}
              maxLength={5000}
            />
            <div className="flex justify-between mt-1">
              <span className="text-red-500 text-xs">{errors.description}</span>
              <span className="text-xs text-gray-500">{form.description.length}/5000</span>
            </div>
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if ("vibrate" in navigator) navigator.vibrate(5);
                    setForm({...form, category: cat.id });
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    form.category === cat.id
             ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">{cat.name}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Loại ngân sách */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Loại ngân sách
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { id: "fixed", name: "Cố định" },
                { id: "hourly", name: "Theo giờ" },
                { id: "negotiable", name: "Thương lượng" },
              ].map((type) => (
                <motion.button
                  key={type.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if ("vibrate" in navigator) navigator.vibrate(5);
                    setForm({...form, budgetType: type.id as any });
                  }}
                  className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.budgetType === type.id
             ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {type.name}
                </motion.button>
              ))}
            </div>

            {form.budgetType!== "negotiable" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1.5">
                    <FiDollarSign className="inline mr-1" />Giá <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="50.000"
                    value={form.price}
                    onChange={(e) => {
                      setForm({...form, price: formatCurrency(e.target.value) });
                      if (errors.price) setErrors({...errors, price: "" });
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      errors.price? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  {/* 5. PRICE RANGE */}
                  {priceRange && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      💡 Giá phổ biến: {formatCurrency(priceRange[0]+"")} - {formatCurrency(priceRange[1]+"")}đ
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1.5">Đơn vị</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({...form, currency: e.target.value as any })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Số người + Thời gian */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                <FiUsers className="inline mr-1" />Số người <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.totalSlots}
                onChange={(e) => {
                  setForm({...form, totalSlots: e.target.value });
                  if (errors.totalSlots) setErrors({...errors, totalSlots: "" });
                }}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.totalSlots? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.totalSlots && <p className="text-red-500 text-xs mt-1">{errors.totalSlots}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                <FiClock className="inline mr-1" />Thời gian (giờ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.durationHours}
                onChange={(e) => {
                  setForm({...form, durationHours: e.target.value });
                  if (errors.durationHours) setErrors({...errors, durationHours: "" });
                }}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.durationHours? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.durationHours && <p className="text-red-500 text-xs mt-1">{errors.durationHours}</p>}
            </div>
          </div>

          {/* Địa điểm */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                <FiMapPin className="inline mr-1" />Địa điểm
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(e) => setForm({...form, isRemote: e.target.checked })}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span className="text-sm text-gray-600 dark:text-zinc-400">Làm từ xa</span>
              </label>
            </div>
            {!form.isRemote && (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Địa chỉ cụ thể"
                    value={form.address}
                    onChange={(e) => {
                      setForm({...form, address: e.target.value });
                      if (errors.address) setErrors({...errors, address: "" });
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl border ${
                      errors.address? "border-red-500" : "border-gray-200 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={getCurrentLocation}
                    className="px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300"
                  >
                    <FiNavigation />
                  </motion.button>
                </div>
                <input
                  type="text"
                  placeholder="Thành phố"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiTag className="inline mr-1" />Thẻ tag
            </label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[2.5rem] p-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <AnimatePresence>
                {form.tags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <FiX size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <input
                ref={tagInputRef}
                type="text"
                placeholder={form.tags.length === 0? "VD: gấp, part-time" : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-900 dark:text-gray-100 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {HOT_TAGS.filter(t =>!form.tags.includes(t)).map(t => (
                <button key={t} type="button" onClick={() => setForm({...form, tags: [...form.tags, t]})}
                  className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-xs rounded text-gray-600 dark:text-zinc-400">
                  +{t}
                </button>
              ))}
            </div>
          </div>

          {/* Yêu cầu */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiFileText className="inline mr-1" />Yêu cầu (không bắt buộc)
            </label>
            <textarea
              placeholder="Kỹ năng cần có, kinh nghiệm..."
              value={form.requirements}
              onChange={(e) => setForm({...form, requirements: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              maxLength={1000}
            />
          </div>

          {/* Ai có thể xem */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiEye className="inline mr-1" />Ai có thể xem
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", name: "Công khai", icon: FiUsers },
                { id: "friends", name: "Bạn bè", icon: FiUsers },
                { id: "private", name: "Riêng tư", icon: FiEyeOff },
              ].map((vis) => (
                <motion.button
                  key={vis.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if ("vibrate" in navigator) navigator.vibrate(5);
                    setForm({...form, visibility: vis.id as any });
                  }}
                  className={`py-3 rounded-xl border-2 transition-all ${
                    form.visibility === vis.id
             ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <vis.icon className="mx-auto mb-1" size={20} />
                  <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">{vis.name}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Ảnh đính kèm */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Ảnh đính kèm (tối đa 5, mỗi ảnh &lt; 5MB)
            </label>
            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {form.images.map((url, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border-gray-200 dark:border-zinc-700"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 active:scale-90"
                    >
                      <FiX size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {form.images.length < 5 && (
                <motion.label
                  whileTap={{ scale: 0.95 }}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <FiUpload className="text-gray-400" size={24} />
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </motion.label>
              )}
            </div>
          </div>
        </form>

        {/* Sticky bottom button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-4 safe-bottom">
          <div className="max-w-2xl mx-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploadingImage? "Đang tải ảnh..." : submitting? "Đang tạo..." : "Đăng công việc"}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
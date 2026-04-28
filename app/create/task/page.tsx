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
  FiUpload, FiX, FiUsers, FiClock,
  FiEyeOff, FiNavigation,
  FiCalendar, FiTag, FiMapPin, FiEye, FiFileText, FiCheck, FiChevronRight
} from "react-icons/fi";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { id: "delivery", name: "Giao hàng", icon: "🚚", color: "bg-orange-500" },
  { id: "shopping", name: "Mua hộ", icon: "🛒", color: "bg-green-500" },
  { id: "tutoring", name: "Gia sư", icon: "📚", color: "bg-blue-500" },
  { id: "design", name: "Thiết kế", icon: "🎨", color: "bg-purple-500" },
  { id: "dev", name: "Lập trình", icon: "💻", color: "bg-indigo-500" },
  { id: "marketing", name: "Marketing", icon: "📢", color: "bg-pink-500" },
  { id: "writing", name: "Viết lách", icon: "✍️", color: "bg-yellow-500" },
  { id: "other", name: "Khác", icon: "📌", color: "bg-gray-500" },
];

const HOT_TAGS = ["gấp", "trong ngày", "part-time", "remote", "sinh viên", "cuối tuần"];

const formatCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  if (!number) return "";
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatDateTimeLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [showAllTags, setShowAllTags] = useState(false);

  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    totalSlots: "1",
    startDate: formatDateTimeLocal(now),
    endDate: formatDateTimeLocal(defaultEnd),
    category: "other",
    tags: [] as string[],
    images: [] as string[],
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
    visibility: "public" as "public" | "friends" | "private",
    budgetType: "fixed" as "fixed" | "hourly" | "negotiable",
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

  useEffect(() => {
    const draft = localStorage.getItem("task_draft");
    if (draft && !searchParams.get("title")) {
      try {
        const parsed = JSON.parse(draft);
        setForm(prev => ({...prev, ...parsed, images: [] }));
      } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { images, ...rest } = form;
      localStorage.setItem("task_draft", JSON.stringify(rest));
    }, 1000);
    return () => clearTimeout(timer);
  }, [form]);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    else if (form.title.length < 10) newErrors.title = "Tiêu đề tối thiểu 10 ký tự";
    else if (form.title.length > 100) newErrors.title = "Tiêu đề tối đa 100 ký tự";

    if (!form.description.trim()) newErrors.description = "Vui lòng nhập mô tả";
    else if (form.description.length < 20) newErrors.description = "Mô tả tối thiểu 20 ký tự";
    else if (form.description.length > 5000) newErrors.description = "Mô tả tối đa 5000 ký tự";

    const price = parseInt(form.price.replace(/\./g, ""));
    if (form.budgetType !== "negotiable") {
      if (!form.price || isNaN(price)) newErrors.price = "Vui lòng nhập giá";
      else if (price < 1000) newErrors.price = "Giá tối thiểu 1.000";
      else if (price > 100000000) newErrors.price = "Giá tối đa 100.000.000";
    }

    const slots = parseInt(form.totalSlots);
    if (!form.totalSlots || isNaN(slots)) newErrors.totalSlots = "Vui lòng nhập số người";
    else if (slots < 1) newErrors.totalSlots = "Tối thiểu 1 người";
    else if (slots > 100) newErrors.totalSlots = "Tối đa 100 người";

    if (!form.startDate) newErrors.startDate = "Chọn ngày bắt đầu";
    if (!form.endDate) newErrors.endDate = "Chọn ngày kết thúc";
    if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
      newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }

    if (!form.category) newErrors.category = "Vui lòng chọn danh mục";
    if (!form.isRemote && !form.address.trim()) newErrors.address = "Vui lòng nhập địa điểm hoặc chọn làm từ xa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    setImageFiles([...imageFiles, ...files]);
    const urls = files.map(f => URL.createObjectURL(f));
    setForm({...form, images: [...form.images, ...urls] });
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
    setForm({...form, tags: form.tags.filter(t => t !== tag) });
  };

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

      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileRef = ref(storage, `tasks/${user.uid}/${fileName}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }
      setUploadingImage(false);

      const deadline = Timestamp.fromDate(new Date(form.endDate));
      const startDate = Timestamp.fromDate(new Date(form.startDate));

      const payload: CreateTaskInput = {
        type: "task",
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.budgetType === "negotiable" ? 0 : parseInt(form.price.replace(/\./g, ""), 10),
        currency: "VND",
        budgetType: form.budgetType,
        totalSlots: parseInt(form.totalSlots, 10),
        visibility: form.visibility,
        deadline,
        applicationDeadline: deadline,
        startDate,
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
      ...(form.lat != null && { lat: form.lat }),
      ...(form.lng != null && { lng: form.lng }),
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[#8e8e93]">Đang tải...</p>
        </div>
      </div>
    );
  }

  const displayTags = showAllTags ? form.tags : form.tags.slice(0, 3);
  const hiddenCount = form.tags.length - 3;
  const selectedCategory = CATEGORIES.find(c => c.id === form.category);

  return (
    <>
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000 }} />
      <div className="min-h-screen bg-[#f2f2f7] dark:bg-black pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="max-w-[640px] mx-auto px-4 h-[52px] flex items-center justify-between">
            <h1 className="text-[17px] font-semibold">Tạo công việc</h1>
            <button onClick={() => router.back()} className="w-8 h-8 -mr-1 flex items-center justify-center text-[#8e8e93] active:opacity-60">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="max-w-[640px] mx-auto px-3 py-3 space-y-3">
          {/* Title & Description */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] overflow-hidden">
            <div className="p-4 space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Tiêu đề công việc"
                  value={form.title}
                  onChange={(e) => {
                    setForm({...form, title: e.target.value });
                    if (errors.title) setErrors({...errors, title: "" });
                  }}
                  className="w-full bg-transparent text-[17px] placeholder-[#c7c7cc] dark:placeholder-zinc-600 outline-none"
                  maxLength={100}
                />
                <div className="flex justify-between mt-1.5">
                  {errors.title && <span className="text-[12px] text-[#ff3b30]">{errors.title}</span>}
                  <span className="text-[12px] text-[#8e8e93] ml-auto">{form.title.length}/100</span>
                </div>
              </div>
              
              <div className="h-px bg-black/[0.06] dark:bg-white/[0.06] -mx-4" />
              
              <div>
                <textarea
                  placeholder="Mô tả chi tiết..."
                  value={form.description}
                  onChange={(e) => {
                    setForm({...form, description: e.target.value });
                    if (errors.description) setErrors({...errors, description: "" });
                  }}
                  rows={4}
                  className="w-full bg-transparent text-[15px] leading-[20px] placeholder-[#c7c7cc] dark:placeholder-zinc-600 outline-none resize-none"
                  maxLength={5000}
                />
                <div className="flex justify-between mt-1.5">
                  {errors.description && <span className="text-[12px] text-[#ff3b30]">{errors.description}</span>}
                  <span className="text-[12px] text-[#8e8e93] ml-auto">{form.description.length}/5000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiTag className="text-[#8e8e93]" size={14} />
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Danh mục</p>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setForm({...form, category: cat.id });
                    if ("vibrate" in navigator) navigator.vibrate(5);
                  }}
                  className={`relative p-3 rounded-[10px] border-2 transition-all ${
                    form.category === cat.id
                      ? "border-[#0a84ff] bg-[#0a84ff]/5"
                      : "border-transparent bg-[#f2f2f7] dark:bg-black"
                  }`}
                >
                  <div className="text-[24px] mb-1">{cat.icon}</div>
                  <div className="text-[11px] font-medium leading-tight">{cat.name}</div>
                  {form.category === cat.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#0a84ff] rounded-full flex items-center justify-center">
                      <FiCheck size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider mb-3">Ngân sách</p>
            
            <div className="flex gap-1.5 p-1 bg-[#f2f2f7] dark:bg-black rounded-[8px] mb-3">
              {[
                { id: "fixed", name: "Cố định" },
                { id: "hourly", name: "Theo giờ" },
                { id: "negotiable", name: "Thương lượng" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({...form, budgetType: type.id as any })}
                  className={`flex-1 py-1.5 rounded-[6px] text-[13px] font-medium transition-all ${
                    form.budgetType === type.id
                      ? "bg-white dark:bg-zinc-800 shadow-sm"
                      : "text-[#8e8e93]"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>

            {form.budgetType !== "negotiable" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Giá"
                    value={form.price}
                    onChange={(e) => {
                      setForm({...form, price: formatCurrency(e.target.value) });
                      if (errors.price) setErrors({...errors, price: "" });
                    }}
                    className="w-full h-[44px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[10px] text-[17px] font-[450] outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                  />
                  {errors.price && <p className="text-[11px] text-[#ff3b30] mt-1">{errors.price}</p>}
                  {!errors.price && <p className="text-[11px] text-[#8e8e93] mt-1">VND</p>}
                </div>
                <div>
                  <div className="relative">
                    <FiUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={16} />
                    <input
                      type="number"
                      placeholder="Số người"
                      value={form.totalSlots}
                      onChange={(e) => {
                        setForm({...form, totalSlots: e.target.value });
                        if (errors.totalSlots) setErrors({...errors, totalSlots: "" });
                      }}
                      className="w-full h-[44px] pl-9 pr-3 bg-[#f2f2f7] dark:bg-black rounded-[10px] text-[17px] font-[450] outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                    />
                  </div>
                  {errors.totalSlots && <p className="text-[11px] text-[#ff3b30] mt-1">{errors.totalSlots}</p>}
                  {!errors.totalSlots && <p className="text-[11px] text-[#8e8e93] mt-1">Người cần</p>}
                </div>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiClock className="text-[#8e8e93]" size={14} />
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Thời gian</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] text-[#8e8e93] mb-1.5 flex items-center gap-1">
                  <FiCalendar size={12} /> Bắt đầu
                </p>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({...form, startDate: e.target.value })}
                  className="w-full h-[40px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[8px] text-[14px] outline-none"
                />
              </div>
              <div>
                <p className="text-[12px] text-[#8e8e93] mb-1.5 flex items-center gap-1">
                  <FiClock size={12} /> Kết thúc
                </p>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({...form, endDate: e.target.value })}
                  className="w-full h-[40px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[8px] text-[14px] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FiMapPin className="text-[#8e8e93]" size={14} />
                <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Địa điểm</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[13px]">Làm từ xa</span>
                <button
                  type="button"
                  onClick={() => setForm({...form, isRemote: !form.isRemote})}
                  className={`relative w-[44px] h-[26px] rounded-full transition-colors ${form.isRemote ? "bg-[#0a84ff]" : "bg-[#e5e5ea] dark:bg-zinc-700"}`}
                >
                  <div className={`absolute top-[2px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-transform ${form.isRemote ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
                </button>
              </label>
            </div>
            
            {!form.isRemote && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Địa chỉ cụ thể"
                    value={form.address}
                    onChange={(e) => {
                      setForm({...form, address: e.target.value });
                      if (errors.address) setErrors({...errors, address: "" });
                    }}
                    className="flex-1 h-[40px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[8px] text-[15px] outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                  />
                  <button type="button" onClick={getCurrentLocation} className="w-[40px] h-[40px] bg-[#f2f2f7] dark:bg-black rounded-[8px] flex items-center justify-center active:scale-95">
                    <FiNavigation size={18} className="text-[#0a84ff]" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Thành phố"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value })}
                  className="w-full h-[40px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[8px] text-[15px] outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                />
                {errors.address && <p className="text-[12px] text-[#ff3b30]">{errors.address}</p>}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <FiFileText className="text-[#8e8e93]" size={14} />
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Yêu cầu</p>
              <span className="text-[11px] text-[#8e8e93]">(không bắt buộc)</span>
            </div>
            <textarea
              placeholder="Kỹ năng cần có, kinh nghiệm..."
              value={form.requirements}
              onChange={(e) => setForm({...form, requirements: e.target.value })}
              rows={3}
              className="w-full bg-[#f2f2f7] dark:bg-black rounded-[8px] px-3 py-2.5 text-[15px] outline-none resize-none placeholder-[#c7c7cc]"
              maxLength={1000}
            />
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiTag className="text-[#8e8e93]" size={14} />
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Tags</p>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
              <AnimatePresence>
                {displayTags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="flex items-center gap-1 pl-2.5 pr-1 py-1 bg-[#0a84ff]/10 dark:bg-[#0a84ff]/20 text-[#0a84ff] rounded-full"
                  >
                    <span className="text-[13px]">{tag}</span>
                    <button type="button" onClick={() => removeTag(tag)} className="w-4 h-4 flex items-center justify-center hover:bg-black/10 rounded-full">
                      <FiX size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!showAllTags && hiddenCount > 0 && (
                <button type="button" onClick={() => setShowAllTags(true)} className="px-2.5 py-1 bg-[#f2f2f7] dark:bg-black text-[#8e8e93] rounded-full text-[13px]">
                  +{hiddenCount}
                </button>
              )}
            </div>
            
            <div className="flex gap-2 mb-2.5">
              <input
                ref={tagInputRef}
                type="text"
                placeholder="Thêm tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 h-[36px] px-3 bg-[#f2f2f7] dark:bg-black rounded-[8px] text-[14px] outline-none"
              />
              <button type="button" onClick={addTag} className="px-4 h-[36px] bg-[#0a84ff] text-white rounded-[8px] text-[14px] font-medium active:scale-95">Thêm</button>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {HOT_TAGS.filter(t => !form.tags.includes(t)).map(t => (
                <button key={t} type="button" onClick={() => setForm({...form, tags: [...form.tags, t]})} className="px-2.5 py-1 bg-[#f2f2f7] dark:bg-black rounded-full text-[12px] text-[#8e8e93] active:scale-95">
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility & Images */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiEye className="text-[#8e8e93]" size={14} />
                <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider">Quyền riêng tư</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "public", name: "Công khai", icon: FiUsers },
                  { id: "friends", name: "Bạn bè", icon: FiUsers },
                  { id: "private", name: "Riêng tư", icon: FiEyeOff },
                ].map((vis) => (
                  <button
                    key={vis.id}
                    type="button"
                    onClick={() => setForm({...form, visibility: vis.id as any })}
                    className={`py-2.5 rounded-[8px] border-2 transition-all ${
                      form.visibility === vis.id
                        ? "border-[#0a84ff] bg-[#0a84ff]/5"
                        : "border-[#f2f2f7] dark:border-zinc-800 bg-[#f2f2f7] dark:bg-black"
                    }`}
                  >
                    <vis.icon className={`mx-auto mb-1 ${form.visibility === vis.id ? "text-[#0a84ff]" : "text-[#8e8e93]"}`} size={18} />
                    <div className="text-[12px] font-medium">{vis.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

            <div>
              <p className="text-[13px] font-medium text-[#8e8e93] uppercase tracking-wider mb-3">Ảnh ({form.images.length}/5)</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {form.images.map((url, i) => (
                  <div key={i} className="relative w-[80px] h-[80px] rounded-[10px] overflow-hidden bg-[#f2f2f7] dark:bg-black shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/70 backdrop-blur rounded-full flex items-center justify-center">
                      <FiX size={12} className="text-white" />
                    </button>
                  </div>
                ))}
                {form.images.length < 5 && (
                  <label className="w-[80px] h-[80px] rounded-[10px] border-2 border-dashed border-[#c7c7cc] dark:border-zinc-700 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shrink-0 hover:border-[#0a84ff]/50 transition-colors">
                    <FiUpload size={20} className="text-[#8e8e93]" />
                    <span className="text-[10px] text-[#8e8e93]">Thêm</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-zinc-900 rounded-[12px] p-3.5 border border-[#0a84ff]/20">
            <p className="text-[11px] font-medium text-[#0a84ff] uppercase tracking-wider mb-2.5">Xem trước</p>
            <div className="flex gap-3">
              {form.images[0] ? (
                <img src={form.images[0]} alt="" className="w-16 h-16 rounded-[8px] object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-[8px] bg-[#f2f2f7] dark:bg-black flex items-center justify-center shrink-0">
                  <span className="text-[24px]">{selectedCategory?.icon}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-[550] leading-[20px] line-clamp-1">{form.title || "Tiêu đề công việc"}</h4>
                <p className="text-[13px] text-[#8e8e93] leading-[18px] line-clamp-2 mt-0.5">{form.description || "Mô tả sẽ hiện ở đây..."}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[14px] font-semibold text-[#0a84ff]">
                    {form.budgetType === "negotiable" ? "Thương lượng" : form.price ? `${form.price}đ` : "0đ"}
                  </span>
                  <span className="w-1 h-1 bg-[#c7c7cc] rounded-full" />
                  <span className="text-[12px] text-[#8e8e93] truncate">{form.isRemote ? "Từ xa" : form.city || form.address || "Chưa có địa điểm"}</span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-t border-black/[0.08] dark:border-white/[0.08]">
          <div className="max-w-[640px] mx-auto px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title || !form.description}
              className="w-full h-[44px] bg-[#0a84ff] hover:bg-[#007aff] active:bg-[#0051d5] text-white rounded-[10px] font-semibold text-[17px] transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              {uploadingImage ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang tải ảnh...
                </span>
              ) : submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng...
                </span>
              ) : (
                "Đăng công việc"
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
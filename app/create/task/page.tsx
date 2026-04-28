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
  FiCalendar,
  FiMapPin
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
    if (draft &&!searchParams.get("title")) {
      try {
        const parsed = JSON.parse(draft);
        setForm(prev => ({...prev,...parsed, images: [] }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { images,...rest } = form;
      localStorage.setItem("task_draft", JSON.stringify(rest));
    }, 1000);
    return () => clearTimeout(timer);
  }, );

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
    if (form.budgetType!== "negotiable") {
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
    if (!form.isRemote &&!form.address.trim()) newErrors.address = "Vui lòng nhập địa điểm hoặc chọn làm từ xa";

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
        price: form.budgetType === "negotiable"? 0 : parseInt(form.price.replace(/\./g, ""), 10),
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
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  const displayTags = showAllTags? form.tags : form.tags.slice(0, 3);
  const hiddenCount = form.tags.length - 3;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-28">
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tạo công việc</h1>
            <button onClick={() => router.back()} className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95">
              <FiX size={22} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Giao hàng quận 1 trong 2h"
              value={form.title}
              onChange={(e) => {
                setForm({...form, title: e.target.value });
                if (errors.title) setErrors({...errors, title: "" });
              }}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                errors.title? "border-red-500" : "border-gray-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
              maxLength={100}
            />
            <div className="flex justify-between mt-1">
              <span className="text-red-500 text-xs">{errors.title}</span>
              <span className="text-xs text-gray-500">{form.title.length}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Mô tả yêu cầu công việc, địa điểm, thời gian, kỹ năng cần có..."
              value={form.description}
              onChange={(e) => {
                setForm({...form, description: e.target.value });
                if (errors.description) setErrors({...errors, description: "" });
              }}
              rows={4}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                errors.description? "border-red-500" : "border-gray-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none resize-none`}
              maxLength={5000}
            />
            <div className="flex justify-between mt-1">
              <span className="text-red-500 text-xs">{errors.description}</span>
              <span className="text-xs text-gray-500">{form.description.length}/5000</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
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
                  className={`p-2.5 rounded-lg border transition-all ${
                    form.category === cat.id
            ? "border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-zinc-800"
                      : "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="text-xl mb-0.5">{cat.icon}</div>
                  <div className="text- font-medium text-gray-700 dark:text-zinc-300">{cat.name}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Loại ngân sách
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
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
                  className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                    form.budgetType === type.id
            ? "border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                      : "border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {type.name}
                </motion.button>
              ))}
            </div>

            {form.budgetType!== "negotiable" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    Giá <span className="text-red-500">*</span>
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
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.price? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    <FiUsers className="inline mr-1" />Số người <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.totalSlots}
                    onChange={(e) => {
                      setForm({...form, totalSlots: e.target.value });
                      if (errors.totalSlots) setErrors({...errors, totalSlots: "" });
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.totalSlots? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
                  />
                  {errors.totalSlots && <p className="text-red-500 text-xs mt-1">{errors.totalSlots}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                <FiCalendar className="inline mr-1" />Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => {
                  setForm({...form, startDate: e.target.value });
                  if (errors.startDate) setErrors({...errors, startDate: "" });
                }}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                  errors.startDate? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                <FiClock className="inline mr-1" />Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => {
                  setForm({...form, endDate: e.target.value });
                  if (errors.endDate) setErrors({...errors, endDate: "" });
                }}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                  errors.endDate? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                <FiMapPin className="inline mr-1" />Địa điểm
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={(e) => setForm({...form, isRemote: e.target.checked })}
                  className="w-4 h-4 text-gray-600 rounded"
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
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm ${
                      errors.address? "border-red-500" : "border-gray-300 dark:border-zinc-700"
                    } bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none`}
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={getCurrentLocation}
                    className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300"
                  >
                    <FiNavigation size={16} />
                  </motion.button>
                </div>
                <input
                  type="text"
                  placeholder="Thành phố"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none text-sm"
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              <FiFileText className="inline mr-1" />Yêu cầu (không bắt buộc)
            </label>
            <textarea
              placeholder="Kỹ năng cần có, kinh nghiệm..."
              value={form.requirements}
              onChange={(e) => setForm({...form, requirements: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none resize-none text-sm"
              maxLength={1000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              <FiTag className="inline mr-1" />Thẻ tag
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[2.25rem] p-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <AnimatePresence>
                {displayTags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-full text-xs"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <FiX size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!showAllTags && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTags(true)}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-full text-xs"
                >
                  +{hiddenCount}
                </button>
              )}
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
                className="flex-1 min-w-[100px] bg-transparent outline-none text-gray-900 dark:text-gray-100 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {HOT_TAGS.filter(t =>!form.tags.includes(t)).map(t => (
                <button key={t} type="button" onClick={() => setForm({...form, tags: [...form.tags, t]})}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text- rounded text-gray-600 dark:text-zinc-400">
                  +{t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
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
                  className={`py-2 rounded-lg border transition-all ${
                    form.visibility === vis.id
            ? "border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-zinc-800"
                      : "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <vis.icon className="mx-auto mb-0.5" size={18} />
                  <div className="text- font-medium text-gray-700 dark:text-zinc-300">{vis.name}</div>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Ảnh đính kèm (tối đa 5, mỗi ảnh &lt; 5MB)
            </label>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {form.images.map((url, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-zinc-700"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 active:scale-90"
                    >
                      <FiX size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {form.images.length < 5 && (
                <motion.label
                  whileTap={{ scale: 0.95 }}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <FiUpload className="text-gray-400" size={20} />
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </motion.label>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-zinc-800">
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-500 mb-2">Xem trước</p>
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 border border-gray-200 dark:border-zinc-800">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{form.title || "Tiêu đề việc"}</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{form.description || "Mô tả công việc..."}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {form.budgetType === "negotiable"? "Thương lượng" : `${form.price || "0"}`}
                </span>
                <span className="text-gray-500">{form.isRemote? "Làm từ xa" : form.address || "Chưa có địa điểm"}</span>
                <span className="text-gray-500">{form.totalSlots} người</span>
              </div>
            </div>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-3">
          <div className="max-w-2xl mx-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-gray-900 dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage? "Đang tải ảnh..." : submitting? "Đang tạo..." : "Đăng công việc"}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
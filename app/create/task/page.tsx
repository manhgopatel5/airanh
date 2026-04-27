"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createTask } from "@/lib/task";
import { toast, Toaster } from "sonner";
import type { CreateTaskInput } from "@/types/task";
import {
  FiUpload, FiX, FiMapPin, FiUsers, FiClock,
  FiTag, FiEyeOff, FiNavigation,
  FiCalendar
} from "react-icons/fi";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

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
  const storage = getFirebaseStorage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

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
      <div className="h-dvh bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const displayTags = showAllTags? form.tags : form.tags.slice(0, 3);
  const hiddenCount = form.tags.length - 3;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="h-dvh bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-sm my-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tạo công việc</h1>
              <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Tiêu đề việc"
                  value={form.title}
                  onChange={(e) => {
                    setForm({...form, title: e.target.value });
                    if (errors.title) setErrors({...errors, title: "" });
                  }}
                  className={`w-full pl-3 pr-3 py-2.5 rounded-lg border text-sm ${
                    errors.title? "border-red-500" : "border-gray-300"
                  } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none transition-all`}
                  maxLength={100}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-red-500 text-xs">{errors.title}</span>
                  <span className="text-xs text-gray-500">{form.title.length}/100</span>
                </div>
              </div>

              <div>
                <textarea
                  placeholder="Mô tả yêu cầu công việc, địa điểm, thời gian, kỹ năng cần có..."
                  value={form.description}
                  onChange={(e) => {
                    setForm({...form, description: e.target.value });
                    if (errors.description) setErrors({...errors, description: "" });
                  }}
                  rows={4}
                  className={`w-full pl-3 pr-3 py-2.5 rounded-lg border text-sm ${
                    errors.description? "border-red-500" : "border-gray-300"
                  } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none resize-none transition-all`}
                  maxLength={5000}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-red-500 text-xs">{errors.description}</span>
                  <span className="text-xs text-gray-500">{form.description.length}/5000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Danh mục</label>
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
                      className={`p-2.5 rounded-lg border-2 transition-all ${
                        form.category === cat.id
           ? "border-sky-500 bg-sky-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="text-xl mb-0.5">{cat.icon}</div>
                      <div className="text- font-medium text-gray-700">{cat.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <FiCalendar className="inline mr-1" />Ngày bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => {
                      setForm({...form, startDate: e.target.value });
                      if (errors.startDate) setErrors({...errors, startDate: "" });
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.startDate? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                  />
                  {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <FiClock className="inline mr-1" />Ngày kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => {
                      setForm({...form, endDate: e.target.value });
                      if (errors.endDate) setErrors({...errors, endDate: "" });
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.endDate? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại ngân sách</label>
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
                      className={`py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        form.budgetType === type.id
           ? "border-sky-500 bg-sky-50 text-sky-600"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {type.name}
                    </motion.button>
                  ))}
                </div>

                {form.budgetType!== "negotiable" && (
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
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                          errors.price? "border-red-500" : "border-gray-300"
                        } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                      />
                      {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Số người"
                        value={form.totalSlots}
                        onChange={(e) => {
                          setForm({...form, totalSlots: e.target.value });
                          if (errors.totalSlots) setErrors({...errors, totalSlots: "" });
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                          errors.totalSlots? "border-red-500" : "border-gray-300"
                        } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                      />
                      {errors.totalSlots && <p className="text-red-500 text-xs mt-1">{errors.totalSlots}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">
                    <FiMapPin className="inline mr-1" />Địa điểm
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isRemote}
                      onChange={(e) => setForm({...form, isRemote: e.target.checked })}
                      className="w-4 h-4 text-sky-500 rounded"
                    />
                    <span className="text-sm text-gray-600">Làm từ xa</span>
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
                          errors.address? "border-red-500" : "border-gray-300"
                        } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={getCurrentLocation}
                        className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700"
                      >
                        <FiNavigation size={16} />
                      </motion.button>
                    </div>
                    <input
                      type="text"
                      placeholder="Thành phố"
                      value={form.city}
                      onChange={(e) => setForm({...form, city: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none text-sm"
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Yêu cầu (không bắt buộc)
                </label>
                <textarea
                  placeholder="Kỹ năng cần có, kinh nghiệm..."
                  value={form.requirements}
                  onChange={(e) => setForm({...form, requirements: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none resize-none text-sm"
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <FiTag className="inline mr-1" />Thẻ tag
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[2.25rem] p-2 rounded-lg border border-gray-300 bg-white">
                  <AnimatePresence>
                    {displayTags.map((tag) => (
                      <motion.div
                        key={tag}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs"
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
                      className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      +{hiddenCount}
                    </button>
                  )}
                  <input
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
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-gray-900 text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {HOT_TAGS.filter(t =>!form.tags.includes(t)).map(t => (
                    <button key={t} type="button" onClick={() => setForm({...form, tags: [...form.tags, t]})}
                      className="px-2 py-0.5 bg-gray-100 text- rounded text-gray-600">
                      +{t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ai có thể xem</label>
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
                      className={`py-2 rounded-lg border-2 transition-all ${
                        form.visibility === vis.id
           ? "border-sky-500 bg-sky-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <vis.icon className="mx-auto mb-0.5" size={18} />
                      <div className="text- font-medium text-gray-700">{vis.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300"
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
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-sky-500 transition-colors"
                    >
                      <FiUpload className="text-gray-400" size={20} />
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </motion.label>
                  )}
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-gradient-to-r from-sky-500 to-sky-600 shadow-lg shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage? "Đang tải ảnh..." : submitting? "Đang tạo..." : "Đăng công việc"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}
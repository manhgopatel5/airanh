"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createPlan } from "@/lib/task";
import { toast, Toaster } from "sonner";
import type { CreatePlanInput } from "@/types/task";
import {
  FiUpload, FiX, FiMapPin, FiUsers, FiClock,
  FiTag, FiEyeOff, FiNavigation,
  FiCalendar
} from "react-icons/fi";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const CATEGORIES = [
  { id: "food", name: "Ăn uống", icon: "🍜" },
  { id: "nightlife", name: "Nightlife", icon: "🍻" },
  { id: "travel", name: "Du lịch", icon: "✈️" },
  { id: "sport", name: "Thể thao", icon: "⚽" },
  { id: "music", name: "Âm nhạc", icon: "🎵" },
  { id: "workshop", name: "Workshop", icon: "🛠️" },
  { id: "volunteer", name: "Tình nguyện", icon: "❤️" },
  { id: "other", name: "Khác", icon: "📌" },
];

const HOT_TAGS = ["gấp", "trong ngày", "part-time", "remote", "sinh viên", "cuối tuần"];

const formatCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  if (!number) return "";
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function CreatePlanPage() {
  const storage = getFirebaseStorage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "food",
    eventDate: "",
    eventTime: "",
    endDate: "",
    endTime: "",
    maxParticipants: "10",
    costType: "free" as "free" | "share" | "host",
    costAmount: "",
    costDescription: "",
    allowInvite: true,
    autoAccept: false,
    requireApproval: false,
    visibility: "public" as "public" | "friends" | "private",
    tags: [] as string[],
    images: [] as string[],
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
    attachments: [] as string[],
    isRemote: false, // ✅ THÊM DÒNG NÀY
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
    const draft = localStorage.getItem("plan_draft");
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
      localStorage.setItem("plan_draft", JSON.stringify(rest));
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

    if (!form.eventDate) newErrors.eventDate = "Vui lòng chọn ngày diễn ra";
    else if (new Date(form.eventDate).getTime() < Date.now()) newErrors.eventDate = "Ngày diễn ra đã qua";

    const max = parseInt(form.maxParticipants);
    if (!form.maxParticipants || isNaN(max)) newErrors.maxParticipants = "Vui lòng nhập số người";
    else if (max < 2) newErrors.maxParticipants = "Tối thiểu 2 người";
    else if (max > 1000) newErrors.maxParticipants = "Tối đa 1000 người";

    if (form.costType!== "free") {
      const cost = parseInt(form.costAmount);
      if (!form.costAmount || isNaN(cost)) newErrors.costAmount = "Vui lòng nhập chi phí";
      else if (cost < 0) newErrors.costAmount = "Chi phí không hợp lệ";
    }

    if (!form.category) newErrors.category = "Vui lòng chọn danh mục";
    if (form.images.length > 10) newErrors.images = "Tối đa 10 ảnh";
    if (!form.isRemote &&!form.address.trim()) newErrors.address = "Vui lòng nhập địa điểm hoặc chọn làm từ xa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 10) {
      toast.error("Tối đa 10 ảnh");
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

    setImageFiles([...imageFiles,...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setForm({...form, images: [...form.images,...urls] });
  };

  const removeImage = (index: number) => {
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
    setForm({...form, tags: [...form.tags, tag] });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm({...form, tags: form.tags.filter(t => t!== tag) });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }
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

    const lastCreate = localStorage.getItem("last_plan_create");
    if (lastCreate && Date.now() - parseInt(lastCreate) < 30000) {
      toast.error("Vui lòng chờ 30 giây trước khi tạo kế hoạch mới");
      return;
    }

    try {
      setSubmitting(true);
      setUploadingImage(true);

      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileRef = ref(storage, `plans/${user.uid}/${fileName}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }
      setUploadingImage(false);

      const eventDateTime = new Date(`${form.eventDate}T${form.eventTime || "00:00"}`);
      const endDateTime = form.endDate? new Date(`${form.endDate}T${form.endTime || "23:59"}`) : undefined;

      const payload: CreatePlanInput = {
        type: "plan",
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        eventDate: Timestamp.fromDate(eventDateTime),
   ...(endDateTime && { endDate: Timestamp.fromDate(endDateTime) }),
        maxParticipants: parseInt(form.maxParticipants, 10),
        costType: form.costType,
   ...(form.costType!== "free" && { costAmount: parseInt(form.costAmount, 10) }),
   ...(form.costDescription && { costDescription: form.costDescription.trim() }),
        allowInvite: form.allowInvite,
        autoAccept: form.autoAccept,
        requireApproval: form.requireApproval,
        visibility: form.visibility,
        tags: form.tags,
        images: imageUrls,
        attachments: [],
        location: {
          address: form.address.trim(),
          city: form.city.trim(),
     ...(form.lat!= null && { lat: form.lat }),
     ...(form.lng!= null && { lng: form.lng }),
        },
      };

      const result = await createPlan(payload, user);
      localStorage.removeItem("plan_draft");
      localStorage.setItem("last_plan_create", Date.now().toString());
      toast.success("Tạo kế hoạch thành công!");
      router.push(`/task/${result.slug}`);
    } catch (err: any) {
      console.error("Create plan error:", err);
      if (err.code === "storage/unauthorized") {
        toast.error("Không có quyền upload ảnh. Kiểm tra Storage Rules");
      } else {
        toast.error(err.message || "Tạo kế hoạch thất bại");
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
              <h1 className="text-2xl font-bold text-gray-900">Tạo kế hoạch</h1>
              <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Tiêu đề"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value })}
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
                  placeholder="Mô tả chi tiết"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value })}
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
                      onClick={() => setForm({...form, category: cat.id })}
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
                    <FiCalendar className="inline mr-1" />Bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm({...form, eventDate: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.eventDate? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                  />
                  {errors.eventDate && <p className="text-red-500 text-xs mt-1">{errors.eventDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <FiClock className="inline mr-1" />Kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({...form, endDate: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                      errors.endDate? "border-red-500" : "border-gray-300"
                    } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <FiUsers className="inline mr-1" />Số người tối đa
                </label>
                <input
                  type="number"
                  value={form.maxParticipants}
                  onChange={(e) => setForm({...form, maxParticipants: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                    errors.maxParticipants? "border-red-500" : "border-gray-300"
                  } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none`}
                />
                {errors.maxParticipants && <p className="text-red-500 text-xs mt-1">{errors.maxParticipants}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loại chi phí</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    { id: "free", name: "Miễn phí" },
                    { id: "share", name: "Share" },
                    { id: "host", name: "Host trả" },
                  ].map((type) => (
                    <motion.button
                      key={type.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setForm({...form, costType: type.id as any })}
                      className={`py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        form.costType === type.id
             ? "border-sky-500 bg-sky-50 text-sky-600"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {type.name}
                    </motion.button>
                  ))}
                </div>

                {form.costType!== "free" && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Số tiền mỗi người"
                      value={form.costAmount}
                      onChange={(e) => setForm({...form, costAmount: formatCurrency(e.target.value) })}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                        errors.costAmount? "border-red-500" : "border-gray-300"
                      } bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none mb-2`}
                    />
                    {errors.costAmount && <p className="text-red-500 text-xs mt-1">{errors.costAmount}</p>}
                    <textarea
                      placeholder="Mô tả chi phí (không bắt buộc)"
                      value={form.costDescription}
                      onChange={(e) => setForm({...form, costDescription: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-sky-400 outline-none resize-none text-sm"
                    />
                  </>
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
                        onChange={(e) => setForm({...form, address: e.target.value })}
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

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowInvite}
                    onChange={(e) => setForm({...form, allowInvite: e.target.checked })}
                    className="w-4 h-4 text-sky-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Cho phép thành viên mời bạn bè</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoAccept}
                    onChange={(e) => setForm({...form, autoAccept: e.target.checked })}
                    className="w-4 h-4 text-sky-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Tự động chấp nhận khi tham gia</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requireApproval}
                    onChange={(e) => setForm({...form, requireApproval: e.target.checked })}
                    className="w-4 h-4 text-sky-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Cần duyệt trước khi tham gia</span>
                </label>
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
                      onClick={() => setForm({...form, visibility: vis.id as any })}
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
                  Ảnh đính kèm (tối đa 10, mỗi ảnh &lt; 5MB)
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
                  {form.images.length < 10 && (
                    <motion.label
                      whileTap={{ scale: 0.95 }}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-sky-500 transition-colors"
                    >
                      <FiUpload className="text-gray-400" size={20} />
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </motion.label>
                  )}
                </div>
                {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm bg-gradient-to-r from-sky-500 to-sky-600 shadow-lg shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage? "Đang tải ảnh..." : submitting? "Đang tạo..." : "Đăng kế hoạch"}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}
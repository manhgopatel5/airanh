"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createTask } from "@/lib/task";
import { User } from "@/types/task";
import { toast, Toaster } from "sonner";
import { FiUpload, FiX, FiMapPin, FiDollarSign, FiUsers, FiClock, FiTag, FiFileText, FiEye, FiEyeOff, FiUsers as FiGlobe } from "react-icons/fi";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

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

export default function CreateTaskPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    totalSlots: "1",
    durationHours: "24",
    category: "other",
    tags: "",
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
  }, [router]);

  /* ================= VALIDATE ================= */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    else if (form.title.length < 10) newErrors.title = "Tiêu đề tối thiểu 10 ký tự";
    else if (form.title.length > 100) newErrors.title = "Tiêu đề tối đa 100 ký tự";

    if (!form.description.trim()) newErrors.description = "Vui lòng nhập mô tả";
    else if (form.description.length < 20) newErrors.description = "Mô tả tối thiểu 20 ký tự";
    else if (form.description.length > 5000) newErrors.description = "Mô tả tối đa 5000 ký tự";

    const price = parseInt(form.price);
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
    if (form.images.length > 5) newErrors.images = "Tối đa 5 ảnh";
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

    // Check file size < 5MB
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} vượt quá 5MB`);
        return;
      }
    }

    setImageFiles([...imageFiles,...files]);
    const urls = files.map(f => URL.createObjectURL(f));
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

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validate()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    // Rate limit: 30s giữa 2 lần tạo
    const lastCreate = localStorage.getItem("last_task_create");
    if (lastCreate && Date.now() - parseInt(lastCreate) < 30000) {
      toast.error("Vui lòng chờ 30 giây trước khi tạo công việc mới");
      return;
    }

    try {
      setSubmitting(true);
      setUploadingImage(true);

      // 1. Upload images to Firebase Storage
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const fileRef = ref(storage, `tasks/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }
      setUploadingImage(false);

      // 2. Create task
      const deadline = Timestamp.fromMillis(
        Date.now() + parseInt(form.durationHours) * 60 * 60 * 1000
      );

      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean).slice(0, 10);

      const result = await createTask(
        {
          title: form.title,
          description: form.description,
          price: form.budgetType === "negotiable"? 0 : parseInt(form.price),
          currency: form.currency,
          budgetType: form.budgetType,
          totalSlots: parseInt(form.totalSlots),
          visibility: form.visibility,
          deadline,
          applicationDeadline: deadline, // Mặc định bằng deadline
          category: form.category,
          tags,
          images: imageUrls,
          requirements: form.requirements || undefined,
          location: form.isRemote? undefined : {
            address: form.address,
            city: form.city,
            lat: form.lat || 0,
            lng: form.lng || 0,
          },
          isRemote: form.isRemote,
        },
        user
      );

      localStorage.setItem("last_task_create", Date.now().toString());
      toast.success("Tạo công việc thành công!");
      router.push(`/task/${result.slug}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Tạo công việc thất bại");
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
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tạo công việc</h1>
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Giao hàng quận 1 trong 2h"
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Mô tả yêu cầu công việc, địa điểm, thời gian, kỹ năng cần có..."
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{errors.description && <span className="text-red-500">{errors.description}</span>}</span>
              <span>{form.description.length}/5000</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({...form, category: cat.id })}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    form.category === cat.id
                     ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">{cat.name}</div>
                </button>
              ))}
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Budget Type + Price */}
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
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({...form, budgetType: type.id as any })}
                  className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.budgetType === type.id
                     ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>

            {form.budgetType!== "negotiable" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    <FiDollarSign className="inline mr-1" />Giá <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-zinc-400 mb-1">Đơn vị</label>
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

          {/* Slots + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                <FiUsers className="inline mr-1" />Số người <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.totalSlots}
                onChange={(e) => setForm({...form, totalSlots: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
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
                onChange={(e) => setForm({...form, durationHours: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.durationHours && <p className="text-red-500 text-xs mt-1">{errors.durationHours}</p>}
            </div>
          </div>

          {/* Location */}
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
                <input
                  type="text"
                  placeholder="Địa chỉ cụ thể"
                  value={form.address}
                  onChange={(e) => setForm({...form, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                />
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
              <FiTag className="inline mr-1" />Thẻ tag (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="VD: gấp, part-time, remote"
              value={form.tags}
              onChange={(e) => setForm({...form, tags: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Requirements */}
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
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiEye className="inline mr-1" />Ai có thể xem
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", name: "Công khai", icon: FiGlobe },
                { id: "friends", name: "Bạn bè", icon: FiUsers },
                { id: "private", name: "Riêng tư", icon: FiEyeOff },
              ].map((vis) => (
                <button
                  key={vis.id}
                  type="button"
                  onClick={() => setForm({...form, visibility: vis.id as any })}
                  className={`py-3 rounded-xl border-2 transition-all ${
                    form.visibility === vis.id
                     ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <vis.icon className="mx-auto mb-1" size={20} />
                  <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">{vis.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Ảnh đính kèm (tối đa 5, mỗi ảnh &lt; 5MB)
            </label>
            <div className="flex flex-wrap gap-3">
              {form.images.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              {form.images.length < 5 && (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  <FiUpload className="text-gray-400" size={24} />
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImage? "Đang tải ảnh..." : submitting? "Đang tạo..." : "Đăng công việc"}
          </button>
        </form>
      </div>
    </>
  );
}

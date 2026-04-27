"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createPlan } from "@/lib/task";
import { User } from "@/types/task";
import { toast, Toaster } from "sonner";
import type { CreatePlanInput } from "@/types/task";
import {
  FiUpload,
  FiX,
  FiMapPin,
  FiUsers,
  FiClock,
  FiTag,
  FiCalendar,
  FiShare2,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { Timestamp } from "firebase/firestore";

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

export default function CreatePlanPage() {
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    tags: "",
    images: [] as string[],
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
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
  }, [auth, router]);

  /* ================= VALIDATE ================= */
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

    if (form.costType !== "free") {
      const cost = parseInt(form.costAmount);
      if (!form.costAmount || isNaN(cost)) newErrors.costAmount = "Vui lòng nhập chi phí";
      else if (cost < 0) newErrors.costAmount = "Chi phí không hợp lệ";
    }

    if (!form.category) newErrors.category = "Vui lòng chọn danh mục";
    if (form.images.length > 10) newErrors.images = "Tối đa 10 ảnh";
    if (!form.address.trim()) newErrors.address = "Vui lòng nhập địa điểm";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ================= UPLOAD IMAGES ================= */
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

    setImageFiles([...imageFiles, ...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setForm({ ...form, images: [...form.images, ...urls] });
  };

  const removeImage = (index: number) => {
    const newImages = [...form.images];
    const newFiles = [...imageFiles];
    newImages.splice(index, 1);
    newFiles.splice(index, 1);
    setForm({ ...form, images: newImages });
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

    const lastCreate = localStorage.getItem("last_plan_create");
    if (lastCreate && Date.now() - parseInt(lastCreate) < 30000) {
      toast.error("Vui lòng chờ 30 giây trước khi tạo kế hoạch mới");
      return;
    }

    try {
      setSubmitting(true);
      setUploadingImage(true);

      // Upload images
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
      const endDateTime = form.endDate ? new Date(`${form.endDate}T${form.endTime || "23:59"}`) : undefined;
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);

      const payload: CreatePlanInput = {
        type: "plan",
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        eventDate: Timestamp.fromDate(eventDateTime),
        ...(endDateTime && { endDate: Timestamp.fromDate(endDateTime) }),
        maxParticipants: parseInt(form.maxParticipants, 10),
        costType: form.costType,
        ...(form.costType !== "free" && { costAmount: parseInt(form.costAmount, 10) }),
        ...(form.costDescription && { costDescription: form.costDescription.trim() }),
        allowInvite: form.allowInvite,
        autoAccept: form.autoAccept,
        requireApproval: form.requireApproval,
        visibility: form.visibility,
        tags,
        images: imageUrls,
        attachments: [],
        location: {
          address: form.address.trim(),
          city: form.city.trim(),
          ...(form.lat != null && { lat: form.lat }),
          ...(form.lng != null && { lng: form.lng }),
        },
      };

      const result = await createPlan(payload, user);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10 safe-top">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tạo kế hoạch</h1>
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              <FiX size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Offline ăn uống cuối tuần tại Q1"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Mô tả hoạt động, lịch trình, lưu ý cho người tham gia..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{errors.description && <span className="text-red-500">{errors.description}</span>}</span>
              <span>{form.description.length}/5000</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Danh mục <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.id })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                <FiCalendar className="inline mr-1" />Ngày diễn ra <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.eventDate && <p className="text-red-500 text-xs mt-1">{errors.eventDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                <FiClock className="inline mr-1" />Giờ bắt đầu
              </label>
              <input
                type="time"
                value={form.eventTime}
                onChange={(e) => setForm({ ...form, eventTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiUsers className="inline mr-1" />Số người tối đa <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.maxParticipants}
              onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.maxParticipants && <p className="text-red-500 text-xs mt-1">{errors.maxParticipants}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiShare2 className="inline mr-1" />Loại chi phí
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { id: "free", name: "Miễn phí" },
                { id: "share", name: "Share" },
                { id: "host", name: "Host trả" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, costType: type.id as any })}
                  className={`py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.costType === type.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>

            {form.costType !== "free" && (
              <>
                <input
                  type="number"
                  placeholder="Số tiền mỗi người"
                  value={form.costAmount}
                  onChange={(e) => setForm({ ...form, costAmount: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                />
                {errors.costAmount && <p className="text-red-500 text-xs mt-1">{errors.costAmount}</p>}
                <textarea
                  placeholder="Mô tả chi phí (không bắt buộc)"
                  value={form.costDescription}
                  onChange={(e) => setForm({ ...form, costDescription: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiMapPin className="inline mr-1" />Địa điểm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Địa chỉ cụ thể"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
            />
            <input
              type="text"
              placeholder="Thành phố"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowInvite}
                onChange={(e) => setForm({ ...form, allowInvite: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Cho phép thành viên mời bạn bè</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoAccept}
                onChange={(e) => setForm({ ...form, autoAccept: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Tự động chấp nhận khi tham gia</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireApproval}
                onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">Cần duyệt trước khi tham gia</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              <FiTag className="inline mr-1" />Thẻ tag (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="VD: cuối tuần, chill, nhóm nhỏ"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

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
                <button
                  key={vis.id}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: vis.id as any })}
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
              Ảnh đính kèm (tối đa 10, mỗi ảnh &lt; 5MB)
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
              {form.images.length < 10 && (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                  <FiUpload className="text-gray-400" size={24} />
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingImage ? "Đang tải ảnh..." : submitting ? "Đang tạo..." : "Đăng kế hoạch"}
          </button>
        </form>
      </div>
    </>
  );
}
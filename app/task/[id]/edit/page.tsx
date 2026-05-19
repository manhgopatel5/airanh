"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { FiArrowLeft, FiSave, FiX, FiPlus } from "react-icons/fi";
import type { Task } from "@/types/task";

const CATEGORIES = [
  { value: "design", label: "Thiết kế" },
  { value: "dev", label: "Lập trình" },
  { value: "marketing", label: "Marketing" },
  { value: "writing", label: "Viết lách" },
  { value: "tutor", label: "Gia sư" },
  { value: "other", label: "Khác" },
];

export default function EditTaskPage() {
  const { id: taskId } = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: 0,
    totalSlots: 1,
    category: "",
    tags: [] as string[],
    images: [] as string[],
    requirements: "",
    location: { address: "", city: "" },
    isRemote: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!taskId || typeof taskId!== "string" || authLoading) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "tasks", taskId));
        if (!snap.exists()) {
          toast.error("Không tìm thấy công việc");
          router.push("/tasks");
          return;
        }

        const data = { id: snap.id,...snap.data() } as Task;

        if (!user) {
          toast.error("Bạn cần đăng nhập");
          router.push("/login");
          return;
        }

        if (data.userId!== user.uid) {
          toast.error("Bạn không có quyền sửa");
          router.push(`/task/${taskId}`);
          return;
        }

        setTask(data);
        setForm({
          title: data.title,
          description: data.description || "",
          price: "price" in data? data.price : 0,
          totalSlots: "totalSlots" in data? data.totalSlots : 1,
          category: data.category || "",
          tags: data.tags || [],
          images: data.images || [],
          requirements: "requirements" in data? data.requirements : "",
          location: {
            address: data.location?.address || "",
            city: data.location?.city || "",
          },
          isRemote: "isRemote" in data? data.isRemote : false,
        });
      } catch (err) {
        console.error(err);
        toast.error("Lỗi tải dữ liệu");
        router.push("/tasks");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId, user, authLoading, db, router]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag &&!form.tags.includes(tag)) {
      setForm({...form, tags: [...form.tags, tag] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm({...form, tags: form.tags.filter((t) => t!== tag) });
  };

  const handleSave = async () => {
    if (!task ||!user) return;
    if (!form.title.trim()) return toast.error("Tiêu đề không được trống");
    if (form.price < 0) return toast.error("Giá không hợp lệ");
    if (form.totalSlots < 1) return toast.error("Số lượng phải >= 1");

    setSaving(true);
    try {
      const updateData: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags,
        images: form.images,
        location: form.location,
        updatedAt: serverTimestamp(),
        edited: true,
        editedAt: serverTimestamp(),
      };

      // Chỉ update field có trong type task
      if (task.type === "task") {
        updateData.price = form.price;
        updateData.totalSlots = form.totalSlots;
        updateData.requirements = form.requirements.trim();
        updateData.isRemote = form.isRemote;
      }

      await updateDoc(doc(db, "tasks", task.id), updateData);
      toast.success("Đã cập nhật");
      router.push(`/task/${task.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <EditSkeleton />;
  if (!task) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            >
              <FiArrowLeft size={22} className="text-zinc-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              Sửa công việc
            </h1>
 <motion.button
  whileTap={{ scale: 0.95 }}
  onClick={handleSave}
  disabled={saving}
  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#0A84FF] to-[#0066CC] text-white text-sm font-semibold disabled:opacity-50 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
>
  <FiSave size={16} />
  {saving? "Đang lưu..." : "Lưu"}
</motion.button>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto pb-28">
          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value })}
              placeholder="VD: Trông trẻ theo giờ"
              maxLength={100}
              className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all"
            />
            <p className="text-xs text-zinc-500 mt-1.5">{form.title.length}/100</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Mô tả chi tiết
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value })}
              placeholder="Mô tả công việc, yêu cầu, thời gian..."
              rows={6}
              maxLength={1000}
              className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all resize-none"
            />
            <p className="text-xs text-zinc-500 mt-1.5">{form.description.length}/1000</p>
          </div>

          {task.type === "task" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    Giá tiền
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({...form, price: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                      đ
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    Số lượng
                  </label>
                  <input
                    type="number"
                    value={form.totalSlots}
                    onChange={(e) => setForm({...form, totalSlots: Number(e.target.value) })}
                    min={1}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  Yêu cầu
                </label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({...form, requirements: e.target.value })}
                  placeholder="VD: Có kinh nghiệm, biết nấu ăn..."
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all resize-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Danh mục
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({...form, category: e.target.value })}
              className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all"
            >
              <option value="">Chọn danh mục</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Nhập tag và Enter"
                className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-[#0A84FF] focus:border-transparent transition-all"
              />
              <button
                onClick={addTag}
                className="px-4 rounded-2xl bg-[#0A84FF] text-white active:scale-95 transition-all"
              >
                <FiPlus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0A84FF] text-sm font-medium"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full p-0.5">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {task.type === "task" && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Làm việc từ xa
              </span>
              <button
                onClick={() => setForm({...form, isRemote:!form.isRemote })}
                className={`relative w-12 h-7 rounded-full transition-all ${
                  form.isRemote? "bg-[#0A84FF]" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                    form.isRemote? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="w-16 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
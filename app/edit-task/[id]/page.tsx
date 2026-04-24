"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getTaskById, updateTask, deleteTask } from "@/lib/task";
import { Task, UpdateTaskInput } from "@/types/task";
import { toast, Toaster } from "sonner";
import { FiArrowLeft, FiTrash2, FiSave, FiX } from "react-icons/fi";
import Link from "next/link";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<UpdateTaskInput>({
    title: "",
    description: "",
    price: 0,
    totalSlots: 1,
    category: "",
    tags: [],
    images: [],
    requirements: "",
    location: {
      address: "",
      city: "",
    },
    isRemote: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const loadTask = async () => {
      try {
        const data = await getTaskById(taskId);

        if (!data) {
          toast.error("Không tìm thấy công việc");
          router.replace("/");
          return;
        }

        if (data.userId !== user.uid) {
          toast.error("Bạn không có quyền sửa");
          router.replace(`/task/${taskId}`);
          return;
        }

        if (data.status !== "open") {
          toast.error("Chỉ sửa được công việc đang mở");
          router.replace(`/task/${taskId}`);
          return;
        }

        setTask(data);

        // 🔥 normalize dữ liệu để KHÔNG BAO GIỜ undefined
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          price: data.price ?? 0,
          totalSlots: data.totalSlots ?? 1,
          category: data.category ?? "",
          tags: data.tags ?? [],
          images: data.images ?? [],
          requirements: data.requirements ?? "",
          location: {
            address: data.location?.address ?? "",
            city: data.location?.city ?? "",
          },
          isRemote: data.isRemote ?? false,
        });
      } catch (e) {
        console.error(e);
        toast.error("Tải dữ liệu thất bại");
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, user, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.title || form.title.length < 10)
      newErrors.title = "Tiêu đề tối thiểu 10 ký tự";

    if (!form.description || form.description.length < 20)
      newErrors.description = "Mô tả tối thiểu 20 ký tự";

    if (!form.price || form.price < 1000)
      newErrors.price = "Giá tối thiểu 1.000đ";

    if (!form.totalSlots || form.totalSlots < 1)
      newErrors.totalSlots = "Số người tối thiểu 1";

    if (task && form.totalSlots < task.joined) {
      newErrors.totalSlots = `Không được nhỏ hơn ${task.joined} người đã tham gia`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !user) return;

    try {
      setSaving(true);

      await updateTask(taskId, user.uid, form);

      toast.success("Cập nhật thành công");
      router.push(`/task/${taskId}`);
    } catch (err: any) {
      toast.error(err.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !task) return;

    if (!confirm("Bạn chắc chắn muốn xóa? Hành động này không thể hoàn tác.")) return;

    try {
      setDeleting(true);

      await deleteTask(taskId, user.uid);

      toast.success("Đã xóa công việc");
      router.replace("/");
    } catch (err: any) {
      toast.error(err.message || "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  // 🔥 FIX CHUẨN TYPE
  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) return null;

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 z-40">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href={`/task/${taskId}`} className="p-2 -ml-2">
              <FiArrowLeft size={20} />
            </Link>

            <h1 className="font-bold text-gray-900 dark:text-gray-100">
              Sửa công việc
            </h1>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-red-500 disabled:opacity-50"
            >
              <FiTrash2 size={20} />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleUpdate}
          className="max-w-2xl mx-auto px-4 py-6 space-y-6"
        >
          {/* TITLE */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Tiêu đề *
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl border"
            />
            {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
          </div>

          {/* DESCRIPTION */}
          <div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          {/* IMAGES */}
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="task image" />
                  <button type="button" onClick={() => removeImage(i)}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}

         <button
  type="submit"
  disabled={saving}
  className="w-full py-3.5 rounded-2xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center gap-2"
>
  {saving ? (
    <>
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      Đang lưu...
    </>
  ) : (
    <>
      <FiSave />
      Lưu thay đổi
    </>
  )}
</button>
        </form>
      </div>
    </>
  );
}
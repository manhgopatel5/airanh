"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast, Toaster } from "sonner";
import type { Task } from "@/types/task";

export default function EditTaskPage() {
  const { id: taskId } = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // ✅ THÊM
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // ✅ SỬA 1: Thêm authLoading
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false); // Quan trọng
    });
    return () => unsub();
  }, [auth]);

  // ✅ SỬA 2: Đợi auth xong mới load task
  useEffect(() => {
    if (!taskId || typeof taskId!== "string" || authLoading) return; // Đợi auth

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "tasks", taskId));
        if (!snap.exists()) {
          toast.error("Không tìm thấy công việc");
          router.push("/tasks");
          return;
        }

        const data = { id: snap.id,...snap.data() } as Task;

        // ✅ SỬA 3: Check user sau khi auth đã load
        if (!user) {
          toast.error("Bạn cần đăng nhập");
          router.push("/login");
          return;
        }

        if (data.userId!== user.uid) {
          toast.error("Bạn không có quyền sửa");
          router.push(`/task/${taskId}`); // ← Đây là chỗ đá bạn về
          return;
        }

        setTask(data);
setForm({
  title: data.title,
  description: data.description || "",
  price: "price" in data? data.price : 0,
  totalSlots: "totalSlots" in data? data.totalSlots : 1,
  category: data.category,
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
  }, [taskId, user, authLoading, db, router]); // ✅ Thêm authLoading vào deps

  const handleSave = async () => {
    if (!task ||!user) return;
    if (!form.title.trim()) return toast.error("Tiêu đề không được trống");

    setSaving(true);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        title: form.title.trim(),
        description: form.description.trim(),
        price: form.price,
        updatedAt: serverTimestamp(),
        edited: true,
        editedAt: serverTimestamp(),
      });
      toast.success("Đã cập nhật");
      router.push(`/task/${task.id}`);
    } catch (err: any) {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  // ✅ SỬA 4: Gộp loading
  if (authLoading || loading) return <div className="p-4 text-center">Đang tải...</div>;
  if (!task) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="max-w-xl mx-auto p-4 pb-28">
        <h1 className="text-xl font-bold mb-4">Sửa công việc</h1>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Tiêu đề</label>
            <input
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value })}
              rows={5}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
            />
          </div>

          {"price" in task && (
            <div>
              <label className="text-sm font-medium">Giá</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({...form, price: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
              />
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-xl bg-[#0A84FF] text-white font-semibold disabled:opacity-50 active:scale-95"
          >
            {saving? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </>
  );
}
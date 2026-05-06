"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast, Toaster } from "sonner";
import type { Task } from "@/types/task";

export default function EditTaskPage() {
  const { id } = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!id || typeof id!== "string") return;
    const load = async () => {
      const snap = await getDoc(doc(db, "tasks", id));
      if (!snap.exists()) {
        toast.error("Không tìm thấy");
        router.push("/tasks");
        return;
      }
      const data = { id: snap.id,...snap.data() } as Task;

      // Chỉ chủ task mới sửa được
      if (data.userId!== currentUser?.uid) {
        toast.error("Bạn không có quyền sửa");
        router.push(`/task/${id}`);
        return;
      }

      setTask(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setPrice("price" in data? data.price : 0);
      setLoading(false);
    };
    load();
  }, [id, currentUser, db, router]);

  const handleSave = async () => {
    if (!task ||!currentUser) return;
    if (!title.trim()) return toast.error("Tiêu đề không được trống");

    setSaving(true);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        title: title.trim(),
        description: description.trim(),
        price: price,
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

  if (loading) return <div className="p-4">Đang tải...</div>;
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
            />
          </div>

          {"price" in task && (
            <div>
              <label className="text-sm font-medium">Giá</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
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
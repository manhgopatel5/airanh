"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getTaskById, updateTask, deleteItem } from "@/lib/task";
import { Task, UpdateTaskInput, isTask } from "@/types/task";
import { toast, Toaster } from "sonner";
import { FiArrowLeft, FiTrash2, FiSave, FiX, FiDollarSign, FiUsers, FiMapPin, FiAlertCircle } from "react-icons/fi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState<UpdateTaskInput>({
    title: "", description: "", price: 0, totalSlots: 1, category: "",
    tags: [], images: [], requirements: "",
    location: { address: "", city: "" }, isRemote: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    const loadTask = async () => {
      try {
        const data = await getTaskById(taskId);
        if (!data ||!isTask(data)) { toast.error("Không tìm thấy"); router.replace("/"); return; }
        if (data.userId !== user.uid) { toast.error("Không có quyền"); router.replace(`/task/${taskId}`); return; }
        if (data.status !== "open") { toast.error("Chỉ sửa được công việc đang mở"); router.replace(`/task/${taskId}`); return; }
        
        setTask(data);
        setForm({
          title: data.title ?? "", description: data.description ?? "", price: data.price ?? 0,
          totalSlots: data.totalSlots ?? 1, category: data.category ?? "", tags: data.tags ?? [],
          images: data.images ?? [], requirements: data.requirements ?? "",
          location: { address: data.location?.address ?? "", city: data.location?.city ?? "" },
          isRemote: data.isRemote ?? false,
        });
      } catch { toast.error("Tải dữ liệu thất bại"); } finally { setLoading(false); }
    };
    loadTask();
  }, [taskId, user, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title || form.title.length < 10) newErrors.title = "Tiêu đề tối thiểu 10 ký tự";
    if (!form.description || form.description.length < 20) newErrors.description = "Mô tả tối thiểu 20 ký tự";
    if (form.price !== undefined && form.price < 1000) newErrors.price = "Giá tối thiểu 1.000đ";
    if (!form.totalSlots || form.totalSlots < 1) newErrors.totalSlots = "Số người tối thiểu 1";
    if (task && form.totalSlots !== undefined && form.totalSlots < task.joined) {
      newErrors.totalSlots = `Không được nhỏ hơn ${task.joined} người đã tham gia`;
    }
    setErrors(newErrors);
    return!Object.keys(newErrors).length;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() ||!user) return;
    try {
      setSaving(true);
      await updateTask(taskId, user.uid, form);
      toast.success("Cập nhật thành công");
      navigator.vibrate?.(8);
      router.push(`/task/${taskId}`);
    } catch (err: any) {
      toast.error(err.message || "Cập nhật thất bại");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!user ||!task) return;
    try {
      setDeleting(true);
      await deleteItem(taskId, user.uid);
      toast.success("Đã xóa công việc");
      navigator.vibrate?.(8);
      router.replace("/");
    } catch (err: any) {
      toast.error(err.message || "Xóa thất bại");
    } finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({...prev, images: (prev.images ?? []).filter((_, i) => i !== index)}));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20" />
      </div>
    );
  }

  if (!task) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href={`/task/${taskId}`} className="w-9 h-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center -ml-1 active:scale-95 transition-all">
              <FiArrowLeft size={20} className="text-zinc-700 dark:text-zinc-300" />
            </Link>
            <h1 className="text-lg font-black tracking-tight">Sửa công việc</h1>
            <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="w-9 h-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-red-500 active:scale-95 transition-all disabled:opacity-50">
              <FiTrash2 size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
            <label className="block text-sm font-bold mb-2.5 text-zinc-900 dark:text-white">Tiêu đề <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(e) => { setForm(prev => ({...prev, title: e.target.value})); if (errors.title) setErrors(prev => ({...prev, title: ""})); }} placeholder="VD: Cần shipper giao hàng gấp Q1 → Q7" className={`w-full h-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.title? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none font-medium transition-all`} />
            <div className="flex justify-between mt-2">
              {errors.title? <p className="text-xs text-red-500 flex items-center gap-1"><FiAlertCircle size={12} />{errors.title}</p> : <p className="text-xs text-zinc-500">{form.title.length}/100 ký tự</p>}
            </div>
          </motion.div>

          {/* Description */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
            <label className="block text-sm font-bold mb-2.5">Mô tả chi tiết <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={(e) => { setForm(prev => ({...prev, description: e.target.value})); if (errors.description) setErrors(prev => ({...prev, description: ""})); }} rows={5} placeholder="Mô tả công việc, yêu cầu cụ thể..." className={`w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.description? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none font-medium resize-none transition-all`} />
            {errors.description && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><FiAlertCircle size={12} />{errors.description}</p>}
          </motion.div>

          {/* Price & Slots */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <label className="block text-sm font-bold mb-2.5 flex items-center gap-1.5"><FiDollarSign size={14} className="text-[#0042B2]" />Giá <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="number" value={form.price} onChange={(e) => setForm(prev => ({...prev, price: parseInt(e.target.value) || 0}))} className={`w-full h-12 pl-4 pr-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.price? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none font-bold text-lg transition-all`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium">đ</span>
              </div>
              {errors.price && <p className="text-xs text-red-500 mt-2">{errors.price}</p>}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <label className="block text-sm font-bold mb-2.5 flex items-center gap-1.5"><FiUsers size={14} className="text-[#0042B2]" />Số người <span className="text-red-500">*</span></label>
              <input type="number" min={task.joined} value={form.totalSlots} onChange={(e) => setForm(prev => ({...prev, totalSlots: parseInt(e.target.value) || 1}))} className={`w-full h-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 ${errors.totalSlots? "border-red-500" : "border-transparent focus:border-[#0042B2]"} outline-none font-bold text-lg transition-all`} />
              {errors.totalSlots? <p className="text-xs text-red-500 mt-2">{errors.totalSlots}</p> : <p className="text-xs text-zinc-500 mt-2">Đã có {task.joined} người</p>}
            </motion.div>
          </div>

          {/* Location */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
            <label className="block text-sm font-bold mb-3 flex items-center gap-1.5"><FiMapPin size={14} className="text-[#0042B2]" />Địa điểm</label>
            <div className="space-y-3">
              <input value={form.location?.address || ""} onChange={(e) => setForm(prev => ({...prev, location: {...prev.location!, address: e.target.value}}))} placeholder="Địa chỉ cụ thể" className="w-full h-11 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-[#0042B2] outline-none text-sm font-medium transition-all" />
              <input value={form.location?.city || ""} onChange={(e) => setForm(prev => ({...prev, location: {...prev.location!, city: e.target.value}}))} placeholder="Thành phố" className="w-full h-11 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-[#0042B2] outline-none text-sm font-medium transition-all" />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isRemote} onChange={(e) => setForm(prev => ({...prev, isRemote: e.target.checked}))} className="w-4 h-4 rounded border-2 border-zinc-300 text-[#0042B2] focus:ring-[#0042B2]/20" />
                <span className="text-sm font-medium">Làm việc từ xa</span>
              </label>
            </div>
          </motion.div>

          {/* Images */}
          {(form.images ?? []).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white dark:bg-zinc-950 rounded-3xl p-5 border-zinc-200/60 dark:border-zinc-800 shadow-sm">
              <label className="block text-sm font-bold mb-3">Hình ảnh ({form.images?.length})</label>
              <div className="grid grid-cols-3 gap-2.5">
                {(form.images ?? []).map((img, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-2xl" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90">
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Save Button */}
          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} type="submit" disabled={saving} whileTap={{ scale: 0.98 }} className="w-full h-13 rounded-2xl bg-[#0042B2] text-white font-bold shadow-lg shadow-[#0042B2]/25 hover:shadow-xl hover:shadow-[#0042B2]/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {saving? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</> : <><FiSave size={18} />Lưu thay đổi</>}
          </motion.button>
        </form>
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-zinc-950 rounded-3xl p-6 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-black text-center mb-2">Xóa công việc?</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-6 leading-relaxed">Hành động này không thể hoàn tác. Tất cả dữ liệu sẽ bị xóa vĩnh viễn.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-bold text-sm active:scale-95 transition-transform">Hủy</button>
                <button onClick={handleDelete} disabled={deleting} className="h-11 rounded-2xl bg-red-500 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {deleting? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiTrash2 size={16} />Xóa</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
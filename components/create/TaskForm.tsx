"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { FiDollarSign, FiUsers, FiClock, FiWifi } from "react-icons/fi";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

const CATEGORIES = [
  { id: "delivery", label: "Giao hàng", icon: "🚚" },
  { id: "shopping", label: "Mua hộ", icon: "🛒" },
  { id: "tutor", label: "Gia sư", icon: "📚" },
  { id: "design", label: "Thiết kế", icon: "🎨" },
  { id: "dev", label: "Lập trình", icon: "💻" },
  { id: "marketing", label: "Marketing", icon: "📢" },
  { id: "writing", label: "Viết lách", icon: "✍️" },
  { id: "other", label: "Khác", icon: "📌" },
];

const BUDGET_TYPES = [
  { id: "fixed", label: "Cố định" },
  { id: "hourly", label: "Theo giờ" },
  { id: "negotiable", label: "Thương lượng" },
];

export default function TaskForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "other",
    price: 50000,
    currency: "VND",
    budgetType: "fixed",
    requiredPeople: 1,
    durationHours: 24,
    address: "",
    city: "",
    remote: false,
    requirements: "",
    tags: "",
    visibility: "public",
  });

  const handleSubmit = async () => {
    if (!user) return toast.error("Đăng nhập trước");
    if (!form.title.trim()) return toast.error("Nhập tiêu đề");
    if (!form.description.trim()) return toast.error("Nhập mô tả");
    if (form.price <= 0) return toast.error("Giá phải > 0");

    setLoading(true);
    try {
      const db = getFirebaseDB();
      await addDoc(collection(db, "tasks"), {
        type: "task",
        userId: user.uid,
        userName: user.displayName || "HUHA User",
        userAvatar: user.photoURL || "",
        title: form.title,
        description: form.description,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        price: form.price,
        currency: form.currency,
        budgetType: form.budgetType,
        requiredPeople: form.requiredPeople,
        totalSlots: form.requiredPeople,
        durationHours: form.durationHours,
        location: { address: form.address, city: form.city },
        remote: form.remote,
        requirements: form.requirements,
        visibility: form.visibility,
        status: "open",
        banned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likeCount: 0,
        viewCount: 0,
        savedBy: [],
        applicants: [],
      });
      toast.success("Đăng việc thành công!");
      navigator.vibrate?.([10,20,10]);
      router.push("/?mode=task");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tạo công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-10">
      <div>
        <label className="text-sm font-semibold mb-2 block">Tiêu đề *</label>
        <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value })} placeholder="VD: Giao hàng quận 1 trong 2h" className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2] outline-none" />
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Mô tả chi tiết *</label>
        <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value })} placeholder="Mô tả yêu cầu, địa điểm, thời gian, kỹ năng..." rows={4} maxLength={5000} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none resize-none" />
        <div className="text-xs text-zinc-500 text-right mt-1">{form.description.length}/5000</div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Danh mục *</label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <motion.button key={c.id} whileTap={{scale:0.95}} onClick={() => setForm({...form, category: c.id })} className={`p-3 rounded-2xl border text-sm font-semibold transition-all ${form.category === c.id? "border-[#0042B2] bg-[#0042B2]/10 text-[#0042B2]" : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}>
              <div className="text-xl">{c.icon}</div>
              <div className="text-xs mt-1">{c.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Loại ngân sách</label>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_TYPES.map((b) => (
            <button key={b.id} onClick={() => setForm({...form, budgetType: b.id as any })} className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.budgetType === b.id? "border-[#0042B2] bg-[#0042B2]/10 text-[#0042B2]" : "border-zinc-200 dark:border-zinc-800"}`}>{b.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-1"><FiDollarSign /> Giá *</label>
          <input type="number" value={form.price} onChange={(e) => setForm({...form, price: parseInt(e.target.value) || 0 })} className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Đơn vị</label>
          <select value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value as any })} className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none">
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-1"><FiUsers /> Số người *</label>
          <input type="number" value={form.requiredPeople} onChange={(e) => setForm({...form, requiredPeople: parseInt(e.target.value) || 1 })} min={1} className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 flex items-center gap-1"><FiClock /> Thời gian (giờ) *</label>
          <input type="number" value={form.durationHours} onChange={(e) => setForm({...form, durationHours: parseInt(e.target.value) || 1 })} min={1} className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
        <label className="text-sm font-semibold flex items-center gap-2"><FiWifi /> Làm từ xa</label>
        <button onClick={() => setForm({...form, remote:!form.remote })} className={`relative w-12 h-7 rounded-full transition-all ${form.remote? "" : "bg-zinc-300 dark:bg-zinc-700"}`} style={{background:form.remote?'#0042B2':undefined}}>
          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${form.remote? "left-6" : "left-1"}`} />
        </button>
      </div>

      {!form.remote && (
        <div className="space-y-2">
          <input value={form.address} onChange={(e) => setForm({...form, address: e.target.value })} placeholder="Địa chỉ cụ thể" className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
          <input value={form.city} onChange={(e) => setForm({...form, city: e.target.value })} placeholder="Thành phố" className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
        </div>
      )}

      <div>
        <label className="text-sm font-semibold mb-2 block">Thẻ tag</label>
        <input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value })} placeholder="VD: gấp, part-time, remote" className="w-full px-4 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none" />
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Yêu cầu (không bắt buộc)</label>
        <textarea value={form.requirements} onChange={(e) => setForm({...form, requirements: e.target.value })} placeholder="Kỹ năng cần có, kinh nghiệm..." rows={3} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-[#0042B2]/30 outline-none resize-none" />
      </div>

      <motion.button whileTap={{scale:0.98}} onClick={handleSubmit} disabled={loading} className="w-full h- rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)',boxShadow:'0 8px 20px rgba(0,66,178,0.3)'}}>
        {loading? <><LottiePlayer animationData={loadingPull} autoplay loop className="w-5 h-5" /> Đang đăng...</> : "Đăng công việc HUHA"}
      </motion.button>
    </div>
  );
}
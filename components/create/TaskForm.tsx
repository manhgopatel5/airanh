"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { FiDollarSign, FiUsers, FiClock, FiWifi } from "react-icons/fi";

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
    if (!form.title.trim()) return toast.error("Nhập tiêu đề");
    if (!form.description.trim()) return toast.error("Nhập mô tả");
    if (form.price <= 0) return toast.error("Giá phải > 0");

    setLoading(true);
    try {
      const db = getFirebaseDB();
      await addDoc(collection(db, "tasks"), {
        type: "task",
        userId: "current_user_id", // TODO: auth
        title: form.title,
        description: form.description,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        price: form.price,
        currency: form.currency,
        budgetType: form.budgetType,
        requiredPeople: form.requiredPeople,
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
      });
      toast.success("Đăng việc thành công!");
      router.push("/?mode=task");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tạo công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold mb-2 block">Tiêu đề *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="VD: Giao hàng quận 1 trong 2h"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Mô tả chi tiết *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value })}
          placeholder="Mô tả yêu cầu, địa điểm, thời gian, kỹ năng..."
          rows={4}
          maxLength={5000}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
        />
        <div className="text-xs text-gray-400 text-right mt-1">{form.description.length}/5000</div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Danh mục *</label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setForm({ ...form, category: c.id })}
              className={`p-3 rounded-xl border text-sm font-semibold active:scale-95 transition ${
                form.category === c.id
                 ? "border-orange-500 bg-orange-500/10 text-orange-600"
                  : "border-gray-200 dark:border-zinc-800"
              }`}
            >
              {c.icon}
              <div className="text-xs mt-1">{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Loại ngân sách</label>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_TYPES.map((b) => (
            <button
              key={b.id}
              onClick={() => setForm({ ...form, budgetType: b.id as any })}
              className={`py-2 rounded-xl border text-sm font-semibold active:scale-95 transition ${
                form.budgetType === b.id
                 ? "border-orange-500 bg-orange-500/10 text-orange-600"
                  : "border-gray-200 dark:border-zinc-800"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold mb-2 block flex items-center gap-1">
            <FiDollarSign /> Giá *
          </label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block">Đơn vị</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold mb-2 block flex items-center gap-1">
            <FiUsers /> Số người *
          </label>
          <input
            type="number"
            value={form.requiredPeople}
            onChange={(e) => setForm({ ...form, requiredPeople: parseInt(e.target.value) || 1 })}
            min={1}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-2 block flex items-center gap-1">
            <FiClock /> Thời gian (giờ) *
          </label>
          <input
            type="number"
            value={form.durationHours}
            onChange={(e) => setForm({ ...form, durationHours: parseInt(e.target.value) || 1 })}
            min={1}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold flex items-center gap-1">
            <FiWifi /> Làm từ xa
          </label>
          <button
            onClick={() => setForm({ ...form, remote:!form.remote })}
            className={`w-12 h-7 rounded-full transition ${form.remote? "bg-orange-500" : "bg-gray-300 dark:bg-zinc-700"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition transform ${form.remote? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {!form.remote && (
        <>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Địa chỉ cụ thể"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none mb-2"
          />
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Thành phố"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </>
      )}

      <div>
        <label className="text-sm font-semibold mb-2 block">Thẻ tag</label>
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="VD: gấp, part-time, remote"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold mb-2 block">Yêu cầu (không bắt buộc)</label>
        <textarea
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          placeholder="Kỹ năng cần có, kinh nghiệm..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold text-base shadow-lg active:scale-95 transition disabled:opacity-50"
      >
        {loading? "Đang đăng..." : "Đăng công việc"}
      </button>
    </div>
  );
}
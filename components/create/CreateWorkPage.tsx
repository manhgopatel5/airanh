"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { mutate } from "swr";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiDollarSign,
  FiEye,
  FiMapPin,
  FiNavigation,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";
import { createPlan, createTask } from "@/lib/task";
import { useAuth } from "@/lib/AuthContext";

type Mode = "task" | "plan";
type LocationState = {
  address: string;
  city: string;
  lat?: number;
  lng?: number;
};

type FormState = {
  title: string;
  description: string;
  category: string;
  tags: string;
  visibility: "public" | "friends" | "private";
  remote: boolean;
  location: LocationState;
  price: number;
  budgetType: "fixed" | "hourly" | "negotiable";
  totalSlots: number;
  durationHours: number;
  requirements: string;
  eventDate: string;
  endDate: string;
  maxParticipants: number;
  costType: "free" | "share" | "host" | "ticket";
  costAmount: number;
  allowInvite: boolean;
  requireApproval: boolean;
};

const CATEGORY_TASKS = [
  { id: "delivery", label: "Giao hàng", icon: "🚚" },
  { id: "shopping", label: "Mua hộ", icon: "🛒" },
  { id: "tutor", label: "Gia sư", icon: "📚" },
  { id: "design", label: "Thiết kế", icon: "🎨" },
  { id: "dev", label: "Lập trình", icon: "💻" },
  { id: "marketing", label: "Marketing", icon: "📢" },
  { id: "repair", label: "Sửa chữa", icon: "🔧" },
  { id: "other", label: "Khác", icon: "📌" },
];

const CATEGORY_PLANS = [
  { id: "cafe", label: "Cafe", icon: "☕" },
  { id: "food", label: "Ăn uống", icon: "🍜" },
  { id: "sport", label: "Thể thao", icon: "🏃" },
  { id: "work", label: "Công việc", icon: "💼" },
  { id: "study", label: "Học", icon: "📚" },
  { id: "travel", label: "Đi chơi", icon: "🏖️" },
  { id: "art", label: "Nghệ thuật", icon: "🎨" },
  { id: "other", label: "Khác", icon: "📌" },
];

const taskTemplates = [
  { title: "Giao tài liệu trong nội thành", category: "delivery", description: "Cần người nhận và giao tài liệu đúng giờ. Có ảnh xác nhận khi hoàn tất.", price: 70000, tags: "giao-hang,nhanh" },
  { title: "Thiết kế banner social", category: "design", description: "Thiết kế banner gọn, rõ thông điệp, phù hợp mobile và social feed.", price: 300000, tags: "design,banner" },
  { title: "Hỗ trợ nhập liệu Excel", category: "assistant", description: "Nhập liệu chính xác, kiểm tra lại trước khi bàn giao file.", price: 150000, tags: "excel,nhap-lieu" },
];

const planTemplates = [
  { title: "Cafe làm việc cuối tuần", category: "cafe", description: "Tìm team cùng ngồi làm việc/coworking nhẹ, yên tĩnh, đúng giờ.", costType: "share" as const, tags: "cafe,coworking" },
  { title: "Chạy bộ công viên sáng sớm", category: "sport", description: "Pace nhẹ, ưu tiên vui khỏe. Có thể chia nhóm theo tốc độ.", costType: "free" as const, tags: "sport,running" },
  { title: "Workshop học nhóm", category: "study", description: "Cùng học và review mục tiêu trong buổi ngắn, có checklist rõ ràng.", costType: "share" as const, tags: "study,workshop" },
];

const defaultDateTime = (hoursFromNow: number) => {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const initialForm = (mode: Mode): FormState => ({
  title: "",
  description: "",
  category: mode === "task" ? "delivery" : "cafe",
  tags: "",
  visibility: "public",
  remote: false,
  location: { address: "", city: "" },
  price: mode === "task" ? 50000 : 0,
  budgetType: "fixed",
  totalSlots: 1,
  durationHours: 24,
  requirements: "",
  eventDate: defaultDateTime(mode === "task" ? 24 : 48),
  endDate: "",
  maxParticipants: 4,
  costType: mode === "task" ? "host" : "share",
  costAmount: 0,
  allowInvite: true,
  requireApproval: false,
});

const toTimestamp = (value: string) => Timestamp.fromDate(new Date(value));

export default function CreateWorkPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(() => initialForm(mode));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isTask = mode === "task";
  const accent = isTask ? "#0A84FF" : "#30D158";
  const gradient = isTask ? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";
  const categories = isTask ? CATEGORY_TASKS : CATEGORY_PLANS;
  const templates = isTask ? taskTemplates : planTemplates;
  const draftKey = `create_${mode}_draft_v3`;

  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      setForm({ ...initialForm(mode), ...JSON.parse(saved) });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, mode]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [draftKey, form]);

  const completion = useMemo(() => {
    const checks = [form.title.trim().length >= 5, form.description.trim().length >= 20, !!form.category, form.remote || !!form.location.address.trim(), isTask ? form.price > 0 || form.budgetType === "negotiable" : !!form.eventDate];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, isTask]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateLocation = (patch: Partial<LocationState>) => setForm((prev) => ({ ...prev, location: { ...prev.location, ...patch } }));

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Thiết bị không hỗ trợ định vị");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateLocation({ lat, lng });
        try {
          const res = await fetch(`/api/places/geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json().catch(() => null);
          const address = data?.results?.[0]?.formatted_address || data?.address || "Vị trí hiện tại";
          updateLocation({ address, city: data?.results?.[0]?.address_components?.find?.((c: any) => c.types?.includes("administrative_area_level_1"))?.long_name || form.location.city });
        } catch {
          updateLocation({ address: "Vị trí hiện tại" });
        }
        toast.success("Đã thêm vị trí hiện tại");
        setLocating(false);
      },
      () => {
        toast.error("Không thể lấy vị trí");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [form.location.city]);

  const applyTemplate = (template: any) => {
    setForm((prev) => ({
      ...prev,
      ...template,
      price: template.price ?? prev.price,
      costType: template.costType ?? prev.costType,
    }));
    toast.success("Đã áp dụng mẫu");
  };

  const validate = () => {
    if (!user) return "Bạn cần đăng nhập";
    if (form.title.trim().length < 5) return "Tiêu đề tối thiểu 5 ký tự";
    if (form.description.trim().length < 20) return "Mô tả nên có ít nhất 20 ký tự";
    if (!form.remote && !form.location.address.trim()) return "Thêm địa điểm hoặc bật làm từ xa";
    if (isTask && form.budgetType !== "negotiable" && form.price <= 0) return "Nhập ngân sách hợp lệ";
    if (!isTask && !form.eventDate) return "Chọn thời gian bắt đầu";
    if (!isTask && form.maxParticipants < 2) return "Plan cần tối thiểu 2 người";
    return "";
  };

  const handleSubmit = async () => {
    const message = validate();
    if (message) {
      toast.error(message);
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const location = form.remote ? undefined : {
        address: form.location.address.trim(),
        city: form.location.city.trim(),
        ...(form.location.lat !== undefined && { lat: form.location.lat }),
        ...(form.location.lng !== undefined && { lng: form.location.lng }),
      };

      if (isTask) {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + form.durationHours);
        await createTask({
          type: "task",
          title: form.title,
          description: form.description,
          price: form.budgetType === "negotiable" ? 0 : form.price,
          currency: "VND",
          budgetType: form.budgetType,
          totalSlots: form.totalSlots,
          visibility: form.visibility,
          category: form.category,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          requirements: form.requirements,
          location,
          isRemote: form.remote,
          deadline: Timestamp.fromDate(deadline),
          startDate: Timestamp.now(),
          urgency: form.durationHours <= 8 ? "urgent" : "flexible",
          needApproval: form.requireApproval,
        }, user as any);
        await mutate("/api/jobs?type=task&limit=12");
        toast.success("Đã tạo task");
        localStorage.removeItem(draftKey);
        router.replace("/?tab=home");
      } else {
        await createPlan({
          type: "plan",
          title: form.title,
          description: form.description,
          category: form.category,
          eventDate: toTimestamp(form.eventDate),
          ...(form.endDate && { endDate: toTimestamp(form.endDate) }),
          maxParticipants: form.maxParticipants,
          totalSlots: form.maxParticipants,
          costType: form.costType,
          ...(form.costType !== "free" && { costAmount: form.costAmount }),
          costDescription: form.costType === "share" ? "Chia đều chi phí" : "",
          visibility: form.visibility,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          location,
          allowInvite: form.allowInvite,
          requireApproval: form.requireApproval,
          autoAccept: !form.requireApproval,
        }, user as any);
        await mutate("/api/jobs?type=plan&limit=12");
        toast.success("Đã tạo plan");
        localStorage.removeItem(draftKey);
        router.replace("/?tab=plans");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Không thể tạo mục");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-dvh bg-white dark:bg-zinc-950" />;
  }

  const steps = ["Nội dung", "Địa điểm", isTask ? "Ngân sách" : "Thời gian", "Xuất bản"];

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${isTask ? "from-[#F4FAFF]" : "from-[#F2FFF7]"} via-white to-zinc-50 text-zinc-950 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 dark:text-white`}>
      <div className="sticky top-0 z-40 border-b border-white/70 bg-white/82 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/82">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200" aria-label="Quay lại"><FiArrowLeft /></button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Create Studio</p>
            <h1 className="truncate text-xl font-black">Tạo {isTask ? "Task" : "Plan"}</h1>
          </div>
          <button onClick={() => setShowPreview(true)} className="flex h-11 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-sm font-black text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"><FiEye /> Preview</button>
        </div>
      </div>

      <main className="mx-auto grid max-w-[760px] gap-4 px-4 py-4 pb-28">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-2xl shadow-black/[0.05] ring-1 ring-black/[0.03] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/72 dark:ring-white/10">
          <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${gradient} opacity-15 blur-3xl`} />
          <div className="relative">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${gradient} px-3 py-1 text-xs font-black text-white`}>Studio mode</div>
                <h2 className="mt-3 text-2xl font-black tracking-tight">Tạo một {isTask ? "task rõ việc, rõ tiền" : "plan có lịch, có nơi, có người"}.</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Auto-save draft, preview trước khi đăng và vị trí dùng chung cho cả Task lẫn Plan.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black" style={{ color: accent }}>{completion}%</p>
                <p className="text-xs font-bold text-zinc-400">hoàn thiện</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900"><motion.div className={`h-full bg-gradient-to-r ${gradient}`} initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${completion}%` }} /></div>
          </div>
        </section>

        <div className="grid grid-cols-4 gap-2">
          {steps.map((label, index) => (
            <button key={label} onClick={() => setStep(index)} className={`rounded-2xl px-2 py-3 text-xs font-black transition active:scale-[0.98] ${step === index ? `bg-gradient-to-r ${gradient} text-white shadow-lg` : "bg-white text-zinc-500 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"}`}>{label}</button>
          ))}
        </div>

        {step === 0 && (
          <Panel title="Nội dung chính" icon={<FiCheck />}>
            <div className="grid gap-3 sm:grid-cols-3">
              {templates.map((template) => <button key={template.title} onClick={() => applyTemplate(template)} className="rounded-2xl bg-zinc-50 p-3 text-left ring-1 ring-black/5 active:scale-[0.98] dark:bg-zinc-900 dark:ring-white/10"><p className="text-sm font-black">{template.title}</p><p className="mt-1 text-xs text-zinc-500">Mẫu nhanh</p></button>)}
            </div>
            <Field label="Tiêu đề" required><input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={isTask ? "VD: Giao tài liệu trong 2h" : "VD: Cafe làm việc cuối tuần"} className="input-xl" /></Field>
            <Field label="Mô tả" required><textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} maxLength={5000} placeholder="Viết rõ mong đợi, tiêu chí, cách phối hợp, điều cần chuẩn bị..." className="input-xl min-h-[140px] resize-none" /></Field>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((category) => <button key={category.id} onClick={() => update("category", category.id)} className={`rounded-2xl p-3 text-sm font-black ring-1 transition active:scale-[0.98] ${form.category === category.id ? `bg-gradient-to-r ${gradient} text-white ring-transparent` : "bg-white text-zinc-600 ring-black/5 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-white/10"}`}><span className="block text-xl">{category.icon}</span>{category.label}</button>)}
            </div>
            <Field label="Tags"><input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="urgent, online, thiết kế" className="input-xl" /></Field>
          </Panel>
        )}

        {step === 1 && (
          <Panel title="Địa điểm" icon={<FiMapPin />}>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
              <div><p className="font-black">Làm từ xa</p><p className="text-sm text-zinc-500">Bật nếu không cần địa điểm cụ thể.</p></div>
              <button onClick={() => update("remote", !form.remote)} className={`h-8 w-14 rounded-full p-1 transition ${form.remote ? `bg-gradient-to-r ${gradient}` : "bg-zinc-300 dark:bg-zinc-700"}`}><span className={`block h-6 w-6 rounded-full bg-white transition ${form.remote ? "translate-x-6" : "translate-x-0"}`} /></button>
            </div>
            {!form.remote && (
              <>
                <button onClick={useCurrentLocation} disabled={locating} className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} text-sm font-black text-white disabled:opacity-60`}><FiNavigation /> {locating ? "Đang lấy vị trí..." : "Dùng vị trí hiện tại"}</button>
                <Field label="Địa chỉ" required><input value={form.location.address} onChange={(e) => updateLocation({ address: e.target.value })} placeholder="Tên địa điểm, số nhà, đường..." className="input-xl" /></Field>
                <Field label="Thành phố"><input value={form.location.city} onChange={(e) => updateLocation({ city: e.target.value })} placeholder="Hồ Chí Minh, Hà Nội..." className="input-xl" /></Field>
                {form.location.lat && form.location.lng && <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-500 dark:bg-zinc-900">GPS: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}</p>}
              </>
            )}
          </Panel>
        )}

        {step === 2 && (
          <Panel title={isTask ? "Ngân sách & slot" : "Thời gian & chi phí"} icon={isTask ? <FiDollarSign /> : <FiCalendar />}>
            {isTask ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {["fixed", "hourly", "negotiable"].map((type) => <button key={type} onClick={() => update("budgetType", type as FormState["budgetType"])} className={`rounded-2xl px-3 py-3 text-sm font-black ${form.budgetType === type ? `bg-gradient-to-r ${gradient} text-white` : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>{type === "fixed" ? "Cố định" : type === "hourly" ? "Theo giờ" : "Thỏa thuận"}</button>)}
                </div>
                <Field label="Ngân sách"><input type="number" value={form.price} disabled={form.budgetType === "negotiable"} onChange={(e) => update("price", Number(e.target.value) || 0)} className="input-xl" /></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Số người"><input type="number" min={1} value={form.totalSlots} onChange={(e) => update("totalSlots", Number(e.target.value) || 1)} className="input-xl" /></Field><Field label="Hạn trong giờ"><input type="number" min={1} value={form.durationHours} onChange={(e) => update("durationHours", Number(e.target.value) || 1)} className="input-xl" /></Field></div>
                <Field label="Yêu cầu"><textarea value={form.requirements} onChange={(e) => update("requirements", e.target.value)} rows={3} className="input-xl resize-none" placeholder="Kỹ năng, giấy tờ, lưu ý..." /></Field>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3"><Field label="Bắt đầu" required><input type="datetime-local" value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} className="input-xl" /></Field><Field label="Kết thúc"><input type="datetime-local" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} className="input-xl" /></Field></div>
                <Field label="Số người tối đa"><input type="number" min={2} value={form.maxParticipants} onChange={(e) => update("maxParticipants", Number(e.target.value) || 2)} className="input-xl" /></Field>
                <div className="grid grid-cols-4 gap-2">{["free", "share", "host", "ticket"].map((type) => <button key={type} onClick={() => update("costType", type as FormState["costType"])} className={`rounded-2xl px-2 py-3 text-xs font-black ${form.costType === type ? `bg-gradient-to-r ${gradient} text-white` : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>{type === "free" ? "Free" : type === "share" ? "Chia" : type === "host" ? "Chủ bao" : "Vé"}</button>)}</div>
                {form.costType !== "free" && <Field label="Chi phí dự kiến"><input type="number" value={form.costAmount} onChange={(e) => update("costAmount", Number(e.target.value) || 0)} className="input-xl" /></Field>}
              </>
            )}
          </Panel>
        )}

        {step === 3 && (
          <Panel title="Xuất bản" icon={<FiShield />}>
            <div className="grid grid-cols-3 gap-2">{["public", "friends", "private"].map((visibility) => <button key={visibility} onClick={() => update("visibility", visibility as FormState["visibility"])} className={`rounded-2xl px-3 py-3 text-sm font-black ${form.visibility === visibility ? `bg-gradient-to-r ${gradient} text-white` : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>{visibility === "public" ? "Công khai" : visibility === "friends" ? "Bạn bè" : "Riêng tư"}</button>)}</div>
            <Toggle label="Cần duyệt người tham gia" checked={form.requireApproval} onChange={(value) => update("requireApproval", value)} />
            {!isTask && <Toggle label="Cho phép mời thêm người" checked={form.allowInvite} onChange={(value) => update("allowInvite", value)} />}
            <PreviewCard mode={mode} form={form} />
            <button onClick={handleSubmit} disabled={saving} className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} py-4 text-base font-black text-white shadow-xl disabled:opacity-60`}><FiCheck /> {saving ? "Đang xuất bản..." : `Xuất bản ${isTask ? "Task" : "Plan"}`}</button>
          </Panel>
        )}
      </main>

      {showPreview && <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowPreview(false)}><div className="mx-auto w-full max-w-[520px] rounded-[2rem] bg-white p-5 dark:bg-zinc-950" onClick={(e) => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Preview</h2><button onClick={() => setShowPreview(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900"><FiX /></button></div><PreviewCard mode={mode} form={form} /></div></div>}

      <style jsx global>{`
        .input-xl { width: 100%; min-height: 48px; border-radius: 1rem; border: 1px solid rgb(228 228 231); background: rgba(255,255,255,.9); padding: .75rem 1rem; font-weight: 700; outline: none; }
        .dark .input-xl { border-color: rgb(39 39 42); background: rgba(24,24,27,.9); color: white; }
        .input-xl:focus { box-shadow: 0 0 0 4px rgba(10,132,255,.12); border-color: ${accent}; }
      `}</style>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-[2rem] border border-white/70 bg-white/86 p-5 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03] backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/72 dark:ring-white/10"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">{icon}</div><h2 className="text-lg font-black">{title}</h2></div>{children}</motion.section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-black text-zinc-700 dark:text-zinc-200">{label}{required && <span className="text-red-500"> *</span>}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"><p className="font-black">{label}</p><button onClick={() => onChange(!checked)} className={`h-8 w-14 rounded-full p-1 transition ${checked ? "bg-[#0A84FF]" : "bg-zinc-300 dark:bg-zinc-700"}`}><span className={`block h-6 w-6 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-0"}`} /></button></div>;
}

function PreviewCard({ mode, form }: { mode: Mode; form: FormState }) {
  return <div className="rounded-[1.5rem] bg-zinc-50 p-4 ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"><div className="mb-3 flex items-center justify-between gap-3"><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-500 dark:bg-zinc-950">{mode === "task" ? "TASK" : "PLAN"}</span><span className="text-xs font-bold text-zinc-400">{form.visibility}</span></div><h3 className="text-lg font-black">{form.title || "Tiêu đề sẽ hiển thị ở đây"}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">{form.description || "Mô tả rõ ràng giúp người khác quyết định nhanh hơn."}</p><div className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold text-zinc-500"><span className="rounded-xl bg-white p-2 dark:bg-zinc-950"><FiMapPin className="mb-1" />{form.remote ? "Remote" : form.location.address || "Địa điểm"}</span><span className="rounded-xl bg-white p-2 dark:bg-zinc-950"><FiUsers className="mb-1" />{mode === "task" ? form.totalSlots : form.maxParticipants} người</span><span className="rounded-xl bg-white p-2 dark:bg-zinc-950"><FiDollarSign className="mb-1" />{mode === "task" ? (form.budgetType === "negotiable" ? "Thỏa thuận" : `${form.price.toLocaleString("vi-VN")}đ`) : form.costType === "free" ? "Free" : `${form.costAmount.toLocaleString("vi-VN")}đ`}</span></div></div>;
}

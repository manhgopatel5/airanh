"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { mutate } from "swr";
import { GpsRequiredModal } from "@/components/GpsRequiredModal";
import {
  FiArrowLeft,
  FiClock,
  FiTag,
  FiCheck,
  FiDollarSign,
  FiEye,
  FiMapPin,
  FiNavigation,
  FiShield,
  FiUsers,
  FiX,
  FiChevronRight,
  FiAlertCircle,
} from "react-icons/fi";
import { toast } from "sonner";
import { createPlan, createTask } from "@/lib/task";
import { useAuth } from "@/lib/AuthContext";

type Mode = "task" | "plan";

type Province = { id: number; name: string; code: string };
type District = { id: number; name: string; code: string };
type Ward = { id: number; name: string };

type LocationState = {
  address: string;
  provinceId: number | null;
  provinceName: string;
  districtId: number | null;
  districtName: string;
  wardId: number | null;
  wardName: string;
  lat?: number;
  lng?: number;
};

type FormState = {
  title: string;
  description: string;
  category: string;
  tags: string;
  visibility: "public" | "friends" | "private";
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

type FormErrors = Partial<Record<keyof FormState | "location.address" | "location.provinceId", string>>;

const CATEGORY_TASKS = [
  { id: "delivery", label: "Giao hàng", icon: "🚚", suggestPrice: 70000 },
  { id: "shopping", label: "Mua hộ", icon: "🛒", suggestPrice: 50000 },
  { id: "tutor", label: "Gia sư", icon: "📚", suggestPrice: 200000 },
  { id: "design", label: "Thiết kế", icon: "🎨", suggestPrice: 300000 },
  { id: "dev", label: "Lập trình", icon: "💻", suggestPrice: 500000 },
  { id: "marketing", label: "Marketing", icon: "📢", suggestPrice: 250000 },
  { id: "repair", label: "Sửa chữa", icon: "🔧", suggestPrice: 150000 },
  { id: "other", label: "Khác", icon: "📌", suggestPrice: 100000 },
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

const defaultDateTime = (hoursFromNow: number) => {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const initialForm = (mode: Mode): FormState => ({
  title: "",
  description: "",
  category: mode === "task"? "delivery" : "cafe",
  tags: "",
  visibility: "public",
  location: {
    address: "",
    provinceId: null,
    provinceName: "",
    districtId: null,
    districtName: "",
    wardId: null,
    wardName: ""
  },
  price: mode === "task"? 50000 : 0,
  budgetType: "fixed",
  totalSlots: 1,
  durationHours: 24,
  requirements: "",
  eventDate: defaultDateTime(mode === "task"? 24 : 48),
  endDate: "",
  maxParticipants: 4,
  costType: mode === "task"? "host" : "share",
  costAmount: 0,
  allowInvite: true,
  requireApproval: false,
});

const toTimestamp = (value: string) => Timestamp.fromDate(new Date(value));

export default function CreateWorkPage({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormState>(() => initialForm(mode));
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const debounceRef = useRef<NodeJS.Timeout>();

  const isTask = mode === "task";
  const accent = isTask? "#0A84FF" : "#30D158";
  const gradient = isTask? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";
  const categories = isTask? CATEGORY_TASKS : CATEGORY_PLANS;
  const draftKey = `create_${mode}_draft_v5`;
  const [showGpsExplain, setShowGpsExplain] = useState(false);
const [hasCheckedGps, setHasCheckedGps] = useState(false);

// Check quyền GPS khi vào step Địa điểm
useEffect(() => {
  if (step!== 1 || hasCheckedGps || form.location.lat) return;
  
  if (!navigator.permissions) {
    setShowGpsExplain(true);
    setHasCheckedGps(true);
    return;
  }

  navigator.permissions.query({ name: 'geolocation' }).then((result) => {
    setPermissionState(result.state);
    
    if (result.state === 'granted') {
      requestGPS();
    } else if (result.state === 'prompt') {
      setShowGpsExplain(true);
    } else {
      setGpsDenied(true);
      setShowGpsExplain(true);
    }
    setHasCheckedGps(true);
  });
}, [step, form.location.lat, hasCheckedGps]);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

// Check quyền GPS lúc mount
useEffect(() => {
  if (!navigator.permissions) return;
  navigator.permissions.query({ name: 'geolocation' }).then((result) => {
    setPermissionState(result.state);
    result.onchange = () => setPermissionState(result.state);
  });
}, []);

const requestGPS = useCallback(() => {
  if (!navigator.geolocation) {
    toast.error("Thiết bị không hỗ trợ GPS");
    setGpsDenied(true);
    return;
  }

  setLocating(true);
  setGpsDenied(false);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      updateLocation({ 
        lat: pos.coords.latitude, 
        lng: pos.coords.longitude 
      });
      setPermissionState('granted');
      setGpsDenied(false);
      setLocating(false);
      setShowGpsExplain(false); // Đóng modal
    },
    (err) => {
      console.warn("GPS error:", err);
      setGpsDenied(true);
      setLocating(false);
      setShowGpsExplain(true); // Hiện lại modal nếu fail
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}, []);
const [loadingProvinces, setLoadingProvinces] = useState(true);

// Load provinces
useEffect(() => {
fetch("/api/location/province", {
    headers: { "Content-Type": "application/json" },
    cache: "force-cache" // Dùng cache 24h từ route.ts
  })
  .then(async (r) => {
      if (!r.ok) throw new Error("API error");
      return r.json();
    })
  .then((data) => {
      setProvinces(Array.isArray(data)? data : []);
      setLoadingProvinces(false);
    })
  .catch(() => {
      toast.error("Không tải được danh sách tỉnh");
      setProvinces([]);
      setLoadingProvinces(false);
    });
}, []);

 // Load districts khi chọn tỉnh
useEffect(() => {
  if (!form.location.provinceId) {
    setDistricts([]);
    setWards([]);
    return;
  }
fetch("/api/location/district", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provinceId: form.location.provinceId }),
  })
  .then((r) => r.json())
  .then(setDistricts)
  .catch(() => setDistricts([]));
}, [form.location.provinceId]);

// Load wards khi chọn huyện
useEffect(() => {
  if (!form.location.districtId) {
    setWards([]);
    return;
  }
  fetch("/api/location/ward", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ districtId: form.location.districtId }),
  })
  .then((r) => r.json())
  .then(setWards)
  .catch(() => setWards([]));
}, [form.location.districtId]);

  // Auto-save draft
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setForm({...initialForm(mode),...parsed });
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, form]);

// Auto request GPS khi vào step Địa điểm
useEffect(() => {
  if (step !== 1 || form.location.lat) return;
  requestGPS();
}, [step, form.location.lat, requestGPS]);
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPreview) setShowPreview(false);
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showPreview, step]);

  const validateField = (key: keyof FormState, value: any): string => {
    switch (key) {
      case "title":
        if (!value.trim()) return "Nhập tiêu đề";
        if (value.trim().length < 5) return "Tối thiểu 5 ký tự";
        return "";
      case "description":
        if (!value.trim()) return "Nhập mô tả";
        if (value.trim().length < 20) return "Tối thiểu 20 ký tự";
        return "";
      case "location":
  if (!value.address.trim()) return "Nhập địa chỉ cụ thể";
  if (!value.provinceId) return "Chọn tỉnh/thành phố";
  if (!value.lat || !value.lng) return "Vui lòng bật GPS để định vị";
  return "";
      case "price":
        if (isTask && form.budgetType!== "negotiable" && value <= 0) return "Nhập số tiền hợp lệ";
        return "";
      case "eventDate":
        if (!isTask &&!value) return "Chọn thời gian bắt đầu";
        if (!isTask && new Date(value) < new Date()) return "Thời gian phải ở tương lai";
        return "";
      case "maxParticipants":
        if (!isTask && value < 2) return "Tối thiểu 2 người";
        return "";
      default:
        return "";
    }
  };

  const validateStep = (stepIdx: number): boolean => {
    const newErrors: FormErrors = {};
    if (stepIdx === 0) {
      newErrors.title = validateField("title", form.title);
      newErrors.description = validateField("description", form.description);
    }
    if (stepIdx === 1) {
      newErrors["location.address"] =!form.location.address.trim()? "Nhập địa chỉ cụ thể" : "";
      newErrors["location.provinceId"] =!form.location.provinceId? "Chọn tỉnh/thành phố" : "";
    }
    if (stepIdx === 2) {
      if (isTask) {
        newErrors.price = validateField("price", form.price);
      } else {
        newErrors.eventDate = validateField("eventDate", form.eventDate);
        newErrors.maxParticipants = validateField("maxParticipants", form.maxParticipants);
      }
    }
    setErrors(newErrors);
    return!Object.values(newErrors).some(Boolean);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({...prev, [key]: value }));
    if (touched[key]) {
      setErrors((prev) => ({...prev, [key]: validateField(key, value) }));
    }
  };

  const blur = (key: keyof FormState) => {
    setTouched((prev) => ({...prev, [key]: true }));
    setErrors((prev) => ({...prev, [key]: validateField(key, form[key]) }));
  };

  const updateLocation = (patch: Partial<LocationState>) => {
    setForm((prev) => ({...prev, location: {...prev.location,...patch } }));
    if (touched.location) {
      setErrors((prev) => ({...prev, "location.address": validateField("location", {...form.location,...patch }) }));
    }
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 3) {
      setPlaceSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlaceSuggestions(data.predictions?.map((p: any) => p.description) || []);
    } catch {
      setPlaceSuggestions([]);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    updateLocation({ address: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 400);
  };


  const handleCategoryChange = (catId: string) => {
    update("category", catId);
    if (isTask) {
      const cat = CATEGORY_TASKS.find((c) => c.id === catId);
      if (cat && form.price === initialForm(mode).price) {
        update("price", cat.suggestPrice);
      }
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 3));
    } else {
      toast.error("Vui lòng kiểm tra lại thông tin");
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (!user) {
      toast.error("Bạn cần đăng nhập");
      return;
    }

    setSaving(true);
    try {
      const location = {
        address: form.location.address.trim(),
        city: form.location.provinceName, // Dùng tên tỉnh đầy đủ
       ...(form.location.districtName && { district: form.location.districtName }),
       ...(form.location.wardName && { ward: form.location.wardName }),
       ...(form.location.lat!== undefined && { lat: form.location.lat }),
       ...(form.location.lng!== undefined && { lng: form.location.lng }),
      };

      if (isTask) {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + form.durationHours);
        await createTask({
          type: "task",
          title: form.title,
          description: form.description,
          price: form.budgetType === "negotiable"? 0 : form.price,
          currency: "VND",
          budgetType: form.budgetType,
          totalSlots: form.totalSlots,
          visibility: form.visibility,
          category: form.category,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          requirements: form.requirements,
          location,
          isRemote: false, // Bỏ remote
          deadline: Timestamp.fromDate(deadline),
          startDate: Timestamp.now(),
          urgency: form.durationHours <= 8? "urgent" : "flexible",
          needApproval: form.requireApproval,
        }, user as any);
        await mutate("/api/jobs?type=task&limit=12");
        toast.success("Đã tạo task thành công");
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
         ...(form.costType!== "free" && { costAmount: form.costAmount }),
          costDescription: form.costType === "share"? "Chia đều chi phí" : "",
          visibility: form.visibility,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          location,
          allowInvite: form.allowInvite,
          requireApproval: form.requireApproval,
          autoAccept:!form.requireApproval,
        }, user as any);
        await mutate("/api/jobs?type=plan&limit=12");
        toast.success("Đã tạo plan thành công");
        localStorage.removeItem(draftKey);
        router.replace("/?tab=plans");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Có lỗi xảy ra, thử lại nhé");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-dvh bg-white dark:bg-zinc-950" />;
  }

  const steps = ["Nội dung", "Địa điểm", isTask? "Ngân sách" : "Thời gian", "Xuất bản"];

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <div className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"
            aria-label="Quay lại"
          >
            <FiArrowLeft />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black">Tạo {isTask? "Task" : "Plan"}</h1>
            <p className="text-xs text-zinc-500">Bước {step + 1}/4</p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-zinc-100 px-3 text-sm font-bold text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <FiEye /> Preview
          </button>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                  className={`h-full bg-gradient-to-r ${gradient}`}
                  initial={false}
                  animate={{ width: i <= step? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Panel>
                <Field label="Tiêu đề" required error={errors.title}>
                  <input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    onBlur={() => blur("title")}
                    placeholder={isTask? "VD: Giao tài liệu trong 2h" : "VD: Cafe làm việc cuối tuần"}
                    className="input-base"
                    autoFocus
                  />
                </Field>
                <Field label="Mô tả chi tiết" required error={errors.description}>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    onBlur={() => blur("description")}
                    rows={5}
                    maxLength={5000}
                    placeholder="Viết rõ mong đợi, tiêu chí, cách phối hợp..."
                    className="input-base min-h resize-none"
                  />
                  <p className="text-xs text-zinc-400">{form.description.length}/5000</p>
                </Field>
                <Field label="Danh mục">
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`rounded-xl p-3 text-xs font-bold transition active:scale-95 ${
                          form.category === cat.id
                           ? `bg-gradient-to-br ${gradient} text-white shadow-lg`
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        <span className="block text-2xl mb-1">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Tags">
                  <input
                    value={form.tags}
                    onChange={(e) => update("tags", e.target.value)}
                    placeholder="urgent, online, thiết kế"
                    className="input-base"
                  />
                </Field>
              </Panel>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Panel>
{gpsDenied && permissionState === 'denied' && (
  <div className="space-y-3 rounded-xl bg-red-50 p-4 dark:bg-red-950/30">
    <div className="flex items-start gap-2 text-sm font-bold text-red-600 dark:text-red-400">
      <FiAlertCircle className="mt-0.5 flex-shrink-0" />
      <div>
        <p>Bạn đã tắt quyền truy cập vị trí.</p>
        <p className="mt-1 text-xs font-normal">
          iOS: Cài đặt → Safari → Vị trí → Cho phép<br/>
          Android: Chrome → ⚙️ → Quyền → Vị trí → Cho phép
        </p>
      </div>
    </div>
    <button
      onClick={requestGPS}
      disabled={locating}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
    >
      <FiNavigation /> {locating ? "Đang thử lại..." : "Thử lại"}
    </button>
  </div>
)}

{gpsDenied && permissionState === 'prompt' && (
  <div className="space-y-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
    <div className="flex items-start gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
      <FiAlertCircle className="mt-0.5 flex-shrink-0" />
      <span>Cần bật GPS để tạo task/plan gần bạn.</span>
    </div>
    <button
      onClick={requestGPS}
      disabled={locating}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
    >
      <FiNavigation /> {locating ? "Đang xin quyền..." : "Bật GPS"}
    </button>
  </div>
)}

             <Field label="Tỉnh/Thành phố" required error={errors["location.provinceId"]}>
  <select
    value={form.location.provinceId || ""}
    onChange={(e) => {
      const id = Number(e.target.value);
      const p = provinces.find(p => p.id === id);
      updateLocation({
        provinceId: id,
        provinceName: p?.name || "",
        districtId: null,
        districtName: "",
        wardId: null,
        wardName: ""
      });
    }}

    className="input-base"
    disabled={loadingProvinces}
  >
    <option value="">
      {loadingProvinces? "Đang tải..." : "Chọn tỉnh/thành phố"}
    </option>
    {provinces.map((p) => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
</Field>

                {form.location.provinceId && (
                  <Field label="Quận/Huyện">
                    <select
                      value={form.location.districtId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const d = districts.find(d => d.id === id);
                        updateLocation({
                          districtId: id,
                          districtName: d?.name || "",
                          wardId: null,
                          wardName: ""
                        });
                      }}
                      className="input-base"
                    >
                      <option value="">Chọn quận/huyện</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {form.location.districtId && (
                  <Field label="Phường/Xã">
                    <select
                      value={form.location.wardId || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const w = wards.find(w => w.id === id);
                        updateLocation({ wardId: id, wardName: w?.name || "" });
                      }}
                      className="input-base"
                    >
                      <option value="">Chọn phường/xã</option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Địa chỉ cụ thể" required error={errors["location.address"]}>
                  <div className="relative">
                    <input
                      value={form.location.address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onBlur={() => blur("location")}
                      placeholder="Tên đường, số nhà..."
                      className="input-base"
                    />
                    {placeSuggestions.length > 0 && (
                      <div className="absolute top-full z-10 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        {placeSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { updateLocation({ address: s }); setPlaceSuggestions([]); }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 first:rounded-t-xl last:rounded-b-xl"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                {form.location.lat && form.location.lng && (
                  <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    GPS: {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
                  </p>
                )}
              </Panel>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Panel>
                {isTask? (
                  <>
                    <Field label="Loại ngân sách">
                      <div className="grid grid-cols-3 gap-2">
                        {["fixed", "hourly", "negotiable"].map((type) => (
                          <button
                            key={type}
                            onClick={() => update("budgetType", type as FormState["budgetType"])}
                            className={`rounded-xl px-3 py-3 text-sm font-bold ${
                              form.budgetType === type
                               ? `bg-gradient-to-r ${gradient} text-white`
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {type === "fixed"? "Cố định" : type === "hourly"? "Theo giờ" : "Thỏa thuận"}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Ngân sách" error={errors.price}>
                      <input
                        type="number"
                        value={form.price}
                        disabled={form.budgetType === "negotiable"}
                        onChange={(e) => update("price", Number(e.target.value) || 0)}
                        onBlur={() => blur("price")}
                        className="input-base"
                        placeholder="0"
                      />
                      {form.budgetType === "negotiable" && <p className="text-xs text-zinc-400">Thương lượng trực tiếp với người nhận</p>}
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Số người">
                        <input
                          type="number"
                          min={1}
                          value={form.totalSlots}
                          onChange={(e) => update("totalSlots", Number(e.target.value) || 1)}
                          className="input-base"
                        />
                      </Field>
                      <Field label="Hoàn thành trong">
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            value={form.durationHours}
                            onChange={(e) => update("durationHours", Number(e.target.value) || 1)}
                            className="input-base"
                          />
                          <span className="flex items-center text-sm font-bold text-zinc-500">giờ</span>
                        </div>
                      </Field>
                    </div>
                    <Field label="Yêu cầu đặc biệt">
                      <textarea
                        value={form.requirements}
                        onChange={(e) => update("requirements", e.target.value)}
                        rows={3}
                        className="input-base resize-none"
                        placeholder="Kỹ năng, giấy tờ, lưu ý..."
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Bắt đầu" required error={errors.eventDate}>
                        <input
                          type="datetime-local"
                          value={form.eventDate}
                          onChange={(e) => update("eventDate", e.target.value)}
                          onBlur={() => blur("eventDate")}
                          className="input-base"
                        />
                      </Field>
                      <Field label="Kết thúc">
                        <input
                          type="datetime-local"
                          value={form.endDate}
                          onChange={(e) => update("endDate", e.target.value)}
                          className="input-base"
                        />
                      </Field>
                    </div>
                    <Field label="Số người tối đa" error={errors.maxParticipants}>
                      <input
                        type="number"
                        min={2}
                        value={form.maxParticipants}
                        onChange={(e) => update("maxParticipants", Number(e.target.value) || 2)}
                        onBlur={() => blur("maxParticipants")}
                        className="input-base"
                      />
                    </Field>
                    <Field label="Chi phí">
                      <div className="grid grid-cols-4 gap-2">
                        {["free", "share", "host", "ticket"].map((type) => (
                          <button
                            key={type}
                            onClick={() => update("costType", type as FormState["costType"])}
                            className={`rounded-xl px-2 py-3 text-xs font-bold ${
                              form.costType === type
                               ? `bg-gradient-to-r ${gradient} text-white`
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            {type === "free"? "Free" : type === "share"? "Chia đều" : type === "host"? "Chủ bao" : "Bán vé"}
                          </button>
                        ))}
                      </div>
                    </Field>
                    {form.costType!== "free" && (
                      <Field label="Chi phí dự kiến">
                        <input
                          type="number"
                          value={form.costAmount}
                          onChange={(e) => update("costAmount", Number(e.target.value) || 0)}
                          className="input-base"
                          placeholder="0"
                        />
                      </Field>
                    )}
                  </>
                )}
              </Panel>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Panel>
                <Field label="Ai có thể xem">
                  <div className="grid grid-cols-3 gap-2">
                    {["public", "friends", "private"].map((v) => (
                      <button
                        key={v}
                        onClick={() => update("visibility", v as FormState["visibility"])}
                        className={`rounded-xl px-3 py-3 text-sm font-bold ${
                          form.visibility === v
                           ? `bg-gradient-to-r ${gradient} text-white`
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {v === "public"? "Công khai" : v === "friends"? "Bạn bè" : "Riêng tư"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Toggle
                  label="Cần duyệt người tham gia"
                  checked={form.requireApproval}
                  onChange={(value) => update("requireApproval", value)}
                />
                {!isTask && (
                  <Toggle
                    label="Cho phép mời thêm người"
                    checked={form.allowInvite}
                    onChange={(value) => update("allowInvite", value)}
                  />
                )}
                <PreviewCard mode={mode} form={form} />
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-12 rounded-xl bg-zinc-100 px-6 font-bold text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Quay lại
            </button>
          )}
          {step < 3? (
            <button
              onClick={handleNext}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} font-bold text-white shadow-lg active:scale-95`}
            >
              Tiếp tục <FiChevronRight />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} font-bold text-white shadow-lg disabled:opacity-60 active:scale-95`}
            >
              <FiCheck /> {saving? "Đang xuất bản..." : `Xuất bản ${isTask? "Task" : "Plan"}`}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
                <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="mx-auto w-full max-w-lg rounded-3xl bg-white p-5 dark:bg-zinc-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900"
                >
                  <FiX />
                </button>
              </div>
              <PreviewCard mode={mode} form={form} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  <GpsRequiredModal
        open={showGpsExplain}
        onAllow={() => {
          setShowGpsExplain(false);
          requestGPS();
        }}
        onSkip={() => {
          setShowGpsExplain(false);
          setGpsDenied(true);
        }}
        loading={locating}
        mode={mode}
      />
      <style jsx global>{`
      .input-base {
          width: 100%;
          min-height: 48px;
          border-radius: 0.75rem;
          border: 1px solid rgb(228 228 231);
          background: white;
          padding: 0.75rem 1rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
      .dark.input-base {
          border-color: rgb(39 39 42);
          background: rgb(24 24 27);
          color: white;
        }
      .input-base:focus {
          box-shadow: 0 0 0 3px ${accent}20;
          border-color: ${accent};
        }
      .input-base:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">{children}</div>;
}

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-500">
          <FiAlertCircle /> {error}
        </p>
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <p className="font-bold">{label}</p>
      <button
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full p-1 transition ${checked? "bg-[#0A84FF]" : "bg-zinc-300 dark:bg-zinc-700"}`}
        aria-label={label}
      >
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function PreviewCard({ mode, form }: { mode: Mode; form: FormState }) {
  const isTask = mode === "task";
  const accent = isTask? "#0A84FF" : "#30D158";

  const formatPrice = (price: number) => {
    if (price === 0) return "Thỏa thuận";
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const fullAddress = [
    form.location.address,
    form.location.wardName,
    form.location.districtName,
    form.location.provinceName
  ].filter(Boolean).join(", ");

  return (
    <div className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-black text-white"
            style={{ backgroundColor: accent }}
          >
            {isTask? "TASK" : "PLAN"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-zinc-500">
            {form.visibility === "public"? <FiEye /> : <FiShield />}
            {form.visibility === "public"? "Công khai" : form.visibility === "friends"? "Bạn bè" : "Riêng tư"}
          </span>
        </div>
      </div>

      <h3 className="text-xl font-black leading-tight">
        {form.title || "Tiêu đề sẽ hiển thị ở đây"}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {form.description || "Mô tả chi tiết giúp người khác hiểu rõ hơn về yêu cầu của bạn."}
      </p>

      {form.tags && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {form.tags.split(",").map((tag, i) => tag.trim() && (
            <span key={i} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
              <FiTag className="text-[10px]" />
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <FiMapPin className="text-sm" />
            <span className="text-xs font-bold">Địa điểm</span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {fullAddress || "Chưa có"}
          </p>
        </div>

        <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <FiUsers className="text-sm" />
            <span className="text-xs font-bold">Số người</span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {isTask? form.totalSlots : form.maxParticipants} người
          </p>
        </div>

        {isTask? (
          <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <FiDollarSign className="text-sm" />
              <span className="text-xs font-bold">Ngân sách</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {form.budgetType === "negotiable"? "Thỏa thuận" : formatPrice(form.price)}
              {form.budgetType === "hourly" && "/giờ"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <FiDollarSign className="text-sm" />
              <span className="text-xs font-bold">Chi phí</span>
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {form.costType === "free"? "Miễn phí" : form.costType === "share"? "Chia đều" : form.costType === "host"? "Chủ bao" : formatPrice(form.costAmount)}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-white p-3 dark:bg-zinc-950">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <FiClock className="text-sm" />
            <span className="text-xs font-bold">{isTask? "Hạn" : "Thời gian"}</span>
          </div>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {isTask? `${form.durationHours} giờ` : formatDate(form.eventDate) || "Chưa đặt"}
          </p>
        </div>
      </div>

      {form.requireApproval && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          <FiShield />
          Cần duyệt trước khi tham gia
        </div>
      )}
    </div>
  );
}
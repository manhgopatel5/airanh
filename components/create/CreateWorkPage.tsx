 "use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import { useSWRConfig } from "swr";


import TaskCard from "@/components/task/TaskCard"; // đường dẫn đúng của bạn

import {
  FiArrowLeft,
  FiClock,
  FiTag,
  FiCheck,
  FiDollarSign,
  FiEye,
  FiMapPin,
  FiShield,
  FiUsers,
  FiX,
  FiChevronRight,
  FiAlertCircle,
  FiZap,
  
  FiCalendar,
  FiHash,
} from "react-icons/fi";
import { toast } from "sonner";
import { createPlan, createTask } from "@/lib/task";
import { useAuth } from "@/lib/AuthContext";
import { getCurrentPosition, GEO_PERMISSION_DENIED_MESSAGE } from "@/lib/geolocation";
import { formatShortLocation, type ParsedMapboxLocation } from "@/lib/mapboxGeocode";

type Mode = "task" | "plan";

type LocationState = {
  address: string;
  wardName: string;
  provinceName: string;
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

type FormErrors = Partial<Record<keyof FormState | "location.address" | "location.coords", string>>;

const CATEGORY_TASKS = [
  { id: "doing", label: "Việc gấp", icon: "⚡️", color: "#0A84FF", suggestPrice: 50000 },
  { id: "skill", label: "Kỹ năng", icon: "🎓", color: "#5E5CE6", suggestPrice: 100000 },
  { id: "shopping", label: "Mua hộ", icon: "🛍️", color: "#FF9F0A", suggestPrice: 30000 },
  { id: "help", label: "Giúp đỡ", icon: "🤝", color: "#30D158", suggestPrice: 0 },
  { id: "moving", label: "Chuyển đồ", icon: "🚚", color: "#FF375F", suggestPrice: 150000 },
  { id: "cleaning", label: "Dọn dẹp", icon: "🧹", color: "#64D2FF", suggestPrice: 80000 },
  { id: "repair", label: "Sửa chữa", icon: "🔧", color: "#BF5AF2", suggestPrice: 120000 },
  { id: "tutoring", label: "Gia sư", icon: "📚", color: "#0A84FF", suggestPrice: 200000 },
  { id: "photography", label: "Chụp ảnh", icon: "📸", color: "#FF9F0A", suggestPrice: 300000 },
  { id: "design", label: "Thiết kế", icon: "🎨", color: "#BF5AF2", suggestPrice: 500000 },
  { id: "cooking", label: "Nấu ăn", icon: "🍳", color: "#FF375F", suggestPrice: 100000 },
  { id: "petcare", label: "Chăm thú cưng", icon: "🐕", color: "#30D158", suggestPrice: 70000 },
  { id: "babysit", label: "Trông trẻ", icon: "👶", color: "#64D2FF", suggestPrice: 150000 },
  { id: "elderly", label: "Chăm người già", icon: "👴", color: "#5E5CE6", suggestPrice: 180000 },
  { id: "event", label: "Sự kiện", icon: "🎉", color: "#FF9F0A", suggestPrice: 400000 },
  { id: "marketing", label: "Marketing", icon: "📢", color: "#0A84FF", suggestPrice: 600000 },
  { id: "writing", label: "Viết lách", icon: "✍️", color: "#BF5AF2", suggestPrice: 250000 },
  { id: "translate", label: "Dịch thuật", icon: "🌐", color: "#64D2FF", suggestPrice: 150000 },
  { id: "consulting", label: "Tư vấn", icon: "💼", color: "#30D158", suggestPrice: 350000 },
  { id: "other", label: "Khác", icon: "📋", color: "#8E8E93", suggestPrice: 50000 },
] as const;

const CATEGORY_PLANS = [
  { id: "coffee", label: "Cà phê", icon: "☕", color: "#8B4513", suggestPrice: 0 },
  { id: "meal", label: "Ăn uống", icon: "🍜", color: "#FF6347", suggestPrice: 0 },
  { id: "sport", label: "Thể thao", icon: "⚽", color: "#30D158", suggestPrice: 0 },
  { id: "party", label: "Tiệc tùng", icon: "🎉", color: "#FF9F0A", suggestPrice: 0 },
  { id: "movie", label: "Xem phim", icon: "🎬", color: "#BF5AF2", suggestPrice: 0 },
  { id: "music", label: "Âm nhạc", icon: "🎵", color: "#FF375F", suggestPrice: 0 },
  { id: "travel", label: "Du lịch", icon: "✈️", color: "#0A84FF", suggestPrice: 0 },
  { id: "game", label: "Game", icon: "🎮", color: "#5E5CE6", suggestPrice: 0 },
  { id: "study", label: "Học nhóm", icon: "📚", color: "#64D2FF", suggestPrice: 0 },
  { id: "volunteer", label: "Tình nguyện", icon: "❤️", color: "#FF375F", suggestPrice: 0 },
  { id: "hiking", label: "Leo núi", icon: "⛰️", color: "#30D158", suggestPrice: 0 },
  { id: "camping", label: "Cắm trại", icon: "🏕️", color: "#FF9F0A", suggestPrice: 0 },
  { id: "beach", label: "Đi biển", icon: "🏖️", color: "#0A84FF", suggestPrice: 0 },
  { id: "karaoke", label: "Karaoke", icon: "🎤", color: "#BF5AF2", suggestPrice: 0 },
  { id: "boardgame", label: "Board game", icon: "🎲", color: "#5E5CE6", suggestPrice: 0 },
  { id: "picnic", label: "Dã ngoại", icon: "🧺", color: "#30D158", suggestPrice: 0 },
  { id: "workshop", label: "Workshop", icon: "🔨", color: "#FF9F0A", suggestPrice: 0 },
  { id: "networking", label: "Kết nối", icon: "🤝", color: "#0A84FF", suggestPrice: 0 },
  { id: "clubbing", label: "Club", icon: "🪩", color: "#BF5AF2", suggestPrice: 0 },
  { id: "other", label: "Khác", icon: "📋", color: "#8E8E93", suggestPrice: 0 },
] as const;

const defaultDateTime = (hoursFromNow: number) => {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
};

const initialForm = (mode: Mode): FormState => ({
  title: "",
  description: "",
  category: mode === "task"? CATEGORY_TASKS[0].id : CATEGORY_PLANS[0].id, // sửa đây
  tags: "",
  visibility: "public",
  location: {
    address: "",
    wardName: "",
    provinceName: "",
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
function TagsInput({
  value,
  onChange,
  placeholder,
  mode
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  mode: Mode;
}) {
  const [inputValue, setInputValue] = useState("");
  const accent = mode === "task"? "#0A84FF" : "#30D158";
  const tags = value.split(",").map(t => t.trim()).filter(Boolean);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/^#/, "");
      if (newTag &&!tags.includes(newTag)) {
        const newTags = [...tags, newTag].join(", ");
        onChange(newTags);
      }
      setInputValue("");
    }
    if (e.key === "Backspace" &&!inputValue && tags.length > 0) {
      const newTags = tags.slice(0, -1).join(", ");
      onChange(newTags);
    }
  };

  const removeTag = (idx: number) => {
    const newTags = tags.filter((_, i) => i!== idx).join(", ");
    onChange(newTags);
  };

  return (
    <div className="input-premium flex min-h-[52px] items-center gap-2!p-2">
      <div className="flex flex-1 flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <motion.span
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="ml-0.5 hover:scale-110 transition-transform"
            >
              <FiX className="text-xs" />
            </button>
          </motion.span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 bg-transparent p-0 outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 placeholder:font-medium focus:ring-0"
        />
      </div>
    </div>
  );
}
function BulletTextarea({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "\n- " + value.substring(end);
      
      onChange(newValue);
      
      // Đặt cursor sau "- "
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    
    // Nếu rỗng thì thêm "- " 
    if (val.length === 1 && val !== "-") {
      val = "- " + val;
    }
    // Nếu xóa hết thì để trống
    else if (val === "- " || val === "-") {
      val = "";
    }
    // Nếu paste nhiều dòng, thêm "- " cho dòng chưa có
    else if (val.includes("\n")) {
      val = val.split("\n").map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        return trimmed.startsWith("-") ? trimmed : `- ${trimmed}`;
      }).join("\n");
    }
    // Nếu bắt đầu gõ mà chưa có "- "
    else if (val && !val.startsWith("- ")) {
      val = "- " + val;
    }
    
    onChange(val);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      rows={3}
      className="input-premium resize-none"
      placeholder={placeholder}
    />
  );
}

export default function CreateWorkPage({ mode }: { mode: Mode }) {
  const { mutate } = useSWRConfig();
  
  useEffect(() => {
    // Xóa cache SWR cũ khi mount
    mutate("/api/location/province", undefined, { revalidate: true });
  }, []);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>(() => initialForm(mode));
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<ParsedMapboxLocation[]>([]);
  const [locating, setLocating] = useState(false);

const debounceRef = useRef<NodeJS.Timeout>();

const isTask = mode === "task";
const previewTask = useMemo(() => ({
  id: "preview",
  type: mode,
  status: "active",
  title: form.title || "Tiêu đề mẫu",
  description: form.description || "Mô tả sẽ hiển thị ở đây",
  userId: user?.uid || "preview",
  userName: user?.displayName || "Bạn",
  userAvatar: user?.photoURL || "",
  userVerified: false,
  createdAt: new Date().toISOString(),
  category: form.category,
  tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
  visibility: form.visibility,
  location: {
    city: form.location.provinceName,
    ward: form.location.wardName,
    address: form.location.address,
    lat: form.location.lat,
    lng: form.location.lng,
  },
  price: form.price,
  budgetType: form.budgetType,
  totalSlots: form.totalSlots,
  joined: 0,
  deadline: new Date(Date.now() + form.durationHours * 60 * 60 * 1000).toISOString(),
  requirements: form.requirements,
  eventDate: form.eventDate,
  endDate: form.endDate,
  maxParticipants: form.maxParticipants,
  currentParticipants: 0,
  costType: form.costType,
  costAmount: form.costAmount,
  allowInvite: form.allowInvite,
  requireApproval: form.requireApproval,
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  likes: [],
  savedBy: [],
  // Thêm mấy field FeedTask bắt buộc
  slug: "preview",
  shortId: "preview",
  images: [],
  milestones: [],
} as any), [form, mode, user]);

const accent = isTask ? "#0A84FF" : "#30D158";
const gradient = isTask ? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";
const categories = isTask ? CATEGORY_TASKS : CATEGORY_PLANS;
const draftKey = `create_${mode}_draft_v6`;


// Auto-save draft - chỉ load 1 lần khi mount
useEffect(() => {
  const saved = localStorage.getItem(draftKey);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    // Merge với initialForm để có default field mới
    setForm((prev) => ({...initialForm(mode),...prev,...parsed }));
  } catch {
    localStorage.removeItem(draftKey);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [draftKey]); // Bỏ mode khỏi deps để không reset khi đổi mode

useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, 500);
  return () => clearTimeout(timer);
}, [draftKey, form]);





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
        if (!value.address?.trim()) return "Nhập hoặc lấy địa chỉ";
        if (value.lat == null || value.lng == null) return "Bấm Gửi vị trí hoặc chọn từ gợi ý";
        if (!value.provinceName?.trim()) return "Chưa xác định được tỉnh/thành phố";
        return "";
      case "price":
        if (isTask && form.budgetType !== "negotiable" && value <= 0) return "Nhập số tiền hợp lệ";
        return "";
      case "eventDate":
        if (!isTask && !value) return "Chọn thời gian bắt đầu";
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
      newErrors["location.address"] = !form.location.address.trim() ? "Nhập hoặc lấy địa chỉ" : "";
      newErrors["location.coords"] =
        form.location.lat == null || form.location.lng == null
          ? "Bấm Gửi vị trí hoặc chọn từ gợi ý"
          : "";
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
    return !Object.values(newErrors).some(Boolean);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (touched[key]) {
      setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
    }
  };

  const blur = (key: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, form[key]) }));
  };

  const applyParsedLocation = useCallback((parsed: ParsedMapboxLocation) => {
    setForm((prev) => ({
      ...prev,
      location: {
        address: parsed.address,
        wardName: parsed.ward || "",
        provinceName: parsed.city || "",
        lat: parsed.lat,
        lng: parsed.lng,
      },
    }));
    setPlaceSuggestions([]);
  }, []);

  const handleSendLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const res = await fetch(`/api/places/geocode?lat=${pos.lat}&lng=${pos.lng}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không xác định được địa chỉ");
      applyParsedLocation(data as ParsedMapboxLocation);
      toast.success("Đã lấy vị trí hiện tại");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không lấy được vị trí";
      toast.error(message, { duration: message === GEO_PERMISSION_DENIED_MESSAGE ? 6000 : 4000 });
    } finally {
      setLocating(false);
    }
  }, [locating, applyParsedLocation]);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlaceSuggestions((data.predictions as ParsedMapboxLocation[]) || []);
    } catch {
      setPlaceSuggestions([]);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setForm((prev) => {
      const { lat: _lat, lng: _lng, ...rest } = prev.location;
      return {
        ...prev,
        location: {
          ...rest,
          address: value,
          wardName: "",
          provinceName: "",
        },
      };
    });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 400);
  };

const handleCategoryChange = (catId: string) => {
  update("category", catId);
  if (isTask) {
    const cat = CATEGORY_TASKS.find((c) => c.id === catId);
    // Chỉ set giá khi price đang là default
    const defaultPrice = initialForm(mode).price;
    if (cat && form.price === defaultPrice) {
      update("price", cat.suggestPrice);
    }
  }
};

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 3));
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        city: form.location.provinceName,
        ...(form.location.wardName ? { ward: form.location.wardName } : {}),
        lat: form.location.lat as number,
        lng: form.location.lng as number,
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
          isRemote: false,
          deadline: Timestamp.fromDate(deadline),
          startDate: Timestamp.now(),
          urgency: form.durationHours <= 8 ? "urgent" : "flexible",
          needApproval: form.requireApproval,
        }, user as any);
await mutate("/api/tasks?type=task&limit=20");
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
          ...(form.costType !== "free" && { costAmount: form.costAmount }),
          costDescription: form.costType === "share" ? "Chia đều chi phí" : "",
          visibility: form.visibility,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          location,
          allowInvite: form.allowInvite,
          requireApproval: form.requireApproval,
          autoAccept: !form.requireApproval,
        }, user as any);
await mutate("/api/tasks?type=plan&limit=20");
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

  const steps = [
    { label: "Nội dung", icon: FiZap },
    { label: "Địa điểm", icon: FiMapPin },
    { label: isTask ? "Ngân sách" : "Thời gian", icon: isTask ? FiDollarSign : FiCalendar },
    { label: "Đăng bài", icon: FiCheck },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      {/* Header với Progress */}
      <div className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/90 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
 <button
  onClick={() => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      localStorage.removeItem(draftKey); // Xóa draft trước khi thoát
      router.back();
    }
  }}
  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
  aria-label="Quay lại"
>
  <FiArrowLeft className="text-lg" />
</button>
            <div className="text-center">
              <h1 className="text-lg font-black">Tạo {isTask ? "Công việc" : "Sự kiện"}</h1>
              <p className="text-xs text-zinc-500">Bước {step + 1} / 4</p>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="flex h-10 items-center gap-2 rounded-2xl bg-zinc-100 px-4 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-200 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FiEye /> Preview
            </button>
          </div>


   {/* Progress Steps */}
<div className="flex items-center justify-center px-4 overflow-hidden">
  {steps.map((s, i) => (
    <div key={i} className="flex items-center">
      <div className="flex flex-col items-center gap-1.5">
        <motion.div
          initial={false}
          animate={{
            scale: i === step ? 1.05 : 1,
          }}
          className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-lg transition-all"
          style={{
            background: i <= step 
              ? `linear-gradient(135deg, ${accent}, ${accent}dd)` 
              : 'rgb(228 228 231)',
          }}
        >
          {i < step ? <FiCheck className="text-lg" /> : <s.icon className="text-lg" />}
        </motion.div>
        <span className={`text-[10px] font-bold transition-colors text-center max-w-[60px] leading-tight ${
          i <= step ? "text-zinc-900 dark:text-white" : "text-zinc-400"
        }`}>
          {s.label}
        </span>
      </div>
      
      {i < steps.length - 1 && (
        <div 
          className="h-0.5 w-6 mx-1.5 -mt-5 transition-colors"
          style={{
            background: i < step ? accent : 'rgb(228 228 231)',
          }}
        />
      )}
    </div>
  ))}
</div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 pb-32">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepContent key="step0">
              <Card>
                <Field label="Tiêu đề" required error={errors.title} icon={FiZap}>
                  <input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    onBlur={() => blur("title")}
                    placeholder={isTask ? "VD: Giao tài liệu trong 2h" : "VD: Cafe làm việc cuối tuần"}
                    className="input-premium"
                    autoFocus
                  />
                </Field>
                <Field label="Mô tả chi tiết" required error={errors.description} icon={FiHash}>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    onBlur={() => blur("description")}
                    rows={5}
                    maxLength={5000}
                    placeholder="Viết rõ mong đợi, tiêu chí, cách phối hợp..."
                    className="input-premium resize-none"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Tối thiểu 20 ký tự</span>
                    <span className={`font-bold ${form.description.length > 4500 ? "text-amber-500" : "text-zinc-400"}`}>
                      {form.description.length}/5000
                    </span>
                  </div>
                </Field>
<Field label="Danh mục" required icon={FiTag}>
  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
    {categories.map((cat) => {
      const isSelected = form.category === cat.id;
      
      return isSelected ? (
        <motion.button
          key={cat.id}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCategoryChange(cat.id)}
          className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-transparent p-3 shadow-xl ring-4 transition-all active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)`,
            '--tw-ring-color': `${cat.color}20`,
          } as any}
        >
          <motion.div
            layoutId="category-check"
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-white"
          >
            <FiCheck className="text-sm" style={{ color: cat.color }} />
          </motion.div>
          <span className="text-3xl drop-shadow-sm">{cat.icon}</span>
          <span className="text-xs font-black leading-tight text-center text-white drop-shadow-sm">
            {cat.label}
          </span>
        </motion.button>
      ) : (
        <motion.button
          key={cat.id}
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => handleCategoryChange(cat.id)}
          className="relative flex flex-col items-center gap-2 rounded-2xl border-2 border-zinc-200 bg-white p-3 transition-all hover:border-zinc-300 hover:shadow-md active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <span className="text-3xl drop-shadow-sm">{cat.icon}</span>
          <span className="text-xs font-black leading-tight text-center text-zinc-700 dark:text-zinc-200">
            {cat.label}
          </span>
        </motion.button>
      );
    })}
  </div>
  
  <div className="flex items-center justify-between text-xs mt-2">
    <span className="text-zinc-400 font-medium">
      {categories.find(c => c.id === form.category)?.label}
    </span>
    {isTask && (
      <span className="font-bold" style={{ color: accent }}>
        Gợi ý: {new Intl.NumberFormat("vi-VN").format(categories.find(c => c.id === form.category)?.suggestPrice || 0)}đ
      </span>
    )}
  </div>
</Field>
<Field label="Tags" icon={FiTag}>
  <TagsInput
    value={form.tags}
    onChange={(val) => update("tags", val)}
    placeholder={isTask? "gõ tag rồi ấn Space" : "gõ tag rồi ấn Space"}
    mode={mode}
  />
  <p className="text-xs text-zinc-400">Ấn Space hoặc Enter để thêm tag</p>
</Field>
              </Card>
            </StepContent>
          )}

 {step === 1 && (
  <StepContent key="step1">
    <Card>
      <Field label="Vị trí" required error={errors["location.address"] || errors["location.coords"]} icon={FiMapPin}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleSendLocation}
          disabled={locating}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-white shadow-lg transition disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          {locating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang lấy vị trí...
            </>
          ) : (
            <>
              <FiMapPin className="text-base" />
              Gửi vị trí
            </>
          )}
        </motion.button>
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          Bấm để dùng GPS. Nếu lỡ từ chối quyền định vị, thoát trang rồi vào lại để cho phép.
        </p>

        <div className="relative">
          <input
            value={form.location.address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onBlur={() => blur("location")}
            placeholder="Hoặc tìm địa chỉ cụ thể..."
            className="input-premium"
          />
          {placeSuggestions.length > 0 && (
            <div className="absolute top-full z-10 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
              {placeSuggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() => applyParsedLocation(s)}
                  className="w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.address}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatShortLocation({ ward: s.ward, city: s.city }) || "Việt Nam"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {(form.location.wardName || form.location.provinceName) && (
          <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm dark:bg-zinc-900/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Hiển thị công khai</p>
            <p className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
              {formatShortLocation({
                ward: form.location.wardName,
                city: form.location.provinceName,
              }) || form.location.provinceName}
            </p>
          </div>
        )}
      </Field>
    </Card>
  </StepContent>
)}

          {step === 2 && (
            <StepContent key="step2">
              <Card>
                {isTask ? (
                  <>
                    <Field label="Loại ngân sách" icon={FiDollarSign}>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "fixed", label: "Cố định", icon: "💰" },
                          { id: "hourly", label: "Theo giờ", icon: "⏱️" },
                          { id: "negotiable", label: "Thỏa thuận", icon: "🤝" },
                        ].map((type) => (
                          <motion.button
                            key={type.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => update("budgetType", type.id as FormState["budgetType"])}
                            className={`rounded-2xl p-4 text-sm font-bold transition-all ${
                              form.budgetType === type.id
                                ? `bg-gradient-to-br ${gradient} text-white shadow-xl`
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            <span className="block text-2xl mb-1">{type.icon}</span>
                            {type.label}
                          </motion.button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Ngân sách" error={errors.price} icon={FiDollarSign}>
                      <div className="relative">
                        <input
                          type="number"
                          value={form.price}
                          disabled={form.budgetType === "negotiable"}
                          onChange={(e) => update("price", Number(e.target.value) || 0)}
                          onBlur={() => blur("price")}
                          className="input-premium pr-16"
                          placeholder="0"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                          VNĐ
                        </span>
                      </div>
                      {form.budgetType === "negotiable" && (
                        <p className="flex items-center gap-2 text-xs text-zinc-400">
                          <FiAlertCircle /> Thương lượng trực tiếp với người nhận
                        </p>
                      )}
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Số người" icon={FiUsers}>
                        <input
                          type="number"
                          min={1}
                          value={form.totalSlots}
                          onChange={(e) => update("totalSlots", Number(e.target.value) || 1)}
                          className="input-premium"
                        />
                      </Field>
                      <Field label="Hoàn thành trong" icon={FiClock}>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            value={form.durationHours}
                            onChange={(e) => update("durationHours", Number(e.target.value) || 1)}
                            className="input-premium pr-12"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                            giờ
                          </span>
                        </div>
                      </Field>
                    </div>
            <Field label="Yêu cầu đặc biệt" icon={FiShield}>
  <BulletTextarea
    value={form.requirements}
    onChange={(val) => update("requirements", val)}
    placeholder="- Kỹ năng cần có&#10;- Giấy tờ yêu cầu&#10;- Lưu ý khác..."
  />
</Field>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Bắt đầu" required error={errors.eventDate} icon={FiCalendar}>
                        <input
                          type="datetime-local"
                          value={form.eventDate}
                          onChange={(e) => update("eventDate", e.target.value)}
                          onBlur={() => blur("eventDate")}
                          className="input-premium"
                        />
                      </Field>
                      <Field label="Kết thúc" icon={FiCalendar}>
                        <input
                          type="datetime-local"
                          value={form.endDate}
                          onChange={(e) => update("endDate", e.target.value)}
                          className="input-premium"
                        />
                      </Field>
                    </div>
                    <Field label="Số người tối đa" error={errors.maxParticipants} icon={FiUsers}>
                      <input
                        type="number"
                        min={2}
                        value={form.maxParticipants}
                        onChange={(e) => update("maxParticipants", Number(e.target.value) || 2)}
                        onBlur={() => blur("maxParticipants")}
                        className="input-premium"
                      />
                    </Field>
                    <Field label="Chi phí" icon={FiDollarSign}>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "free", label: "Free", icon: "🎁" },
                          { id: "share", label: "Chia đều", icon: "🤝" },
                          { id: "host", label: "Chủ bao", icon: "💝" },
                          { id: "ticket", label: "Bán vé", icon: "🎫" },
                        ].map((type) => (
                          <motion.button
                            key={type.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => update("costType", type.id as FormState["costType"])}
                            className={`rounded-2xl p-3 text-xs font-bold transition-all ${
                              form.costType === type.id
                                ? `bg-gradient-to-br ${gradient} text-white shadow-xl`
                                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                            }`}
                          >
                            <span className="block text-2xl mb-1">{type.icon}</span>
                            {type.label}
                          </motion.button>
                        ))}
                      </div>
                    </Field>
                    {form.costType !== "free" && (
                      <Field label="Chi phí dự kiến" icon={FiDollarSign}>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.costAmount}
                            onChange={(e) => update("costAmount", Number(e.target.value) || 0)}
                            className="input-premium pr-16"
                            placeholder="0"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">
                            VNĐ
                          </span>
                        </div>
                      </Field>
                    )}
                  </>
                )}
              </Card>
            </StepContent>
          )}

          {step === 3 && (
            <StepContent key="step3">
              <Card>
                <Field label="Ai có thể xem" icon={FiEye}>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "public", label: "Công khai", icon: "🌍" },
                      { id: "friends", label: "Bạn bè", icon: "👥" },
                      { id: "private", label: "Riêng tư", icon: "🔒" },
                    ].map((v) => (
                      <motion.button
                        key={v.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => update("visibility", v.id as FormState["visibility"])}
                        className={`rounded-2xl p-4 text-sm font-bold transition-all ${
                          form.visibility === v.id
                           ? `bg-gradient-to-br ${gradient} text-white shadow-xl`
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        <span className="block text-2xl mb-1">{v.icon}</span>
                        {v.label}
                      </motion.button>
                    ))}
                  </div>
                </Field>
                <Toggle
                  label="Cần duyệt người tham gia"
                  description="Bạn sẽ xem xét trước khi ai đó tham gia"
                  checked={form.requireApproval}
                  onChange={(value) => update("requireApproval", value)}
                  icon={FiShield}
                />
                {!isTask && (
                  <Toggle
                    label="Cho phép mời thêm người"
                    description="Người tham gia có thể mời bạn bè"
                    checked={form.allowInvite}
                    onChange={(value) => update("allowInvite", value)}
                    icon={FiUsers}
                  />
                )}
            <div className="pt-4">
  <h3 className="mb-3 text-sm font-bold text-zinc-700 dark:text-zinc-200">Xem trước</h3>
  <TaskCard 
    task={previewTask} 
    theme={mode} 
    className="pointer-events-none" 
  />
</div>
              </Card>
            </StepContent>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200/60 bg-white/90 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-2xl gap-3">
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setStep((s) => s - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-14 rounded-2xl bg-zinc-100 px-8 font-black text-zinc-700 transition-all hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Quay lại
            </motion.button>
          )}
          {step < 3? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} font-black text-white shadow-xl transition-all hover:shadow-2xl`}
            >
              Tiếp tục <FiChevronRight className="text-xl" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={saving}
              className={`flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${gradient} font-black text-white shadow-xl transition-all hover:shadow-2xl disabled:opacity-60`}
            >
              <FiCheck className="text-xl" /> {saving? "Đang xuất bản..." : `Đăng ${isTask? "Công việc" : "Sự kiện"}`}
            </motion.button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 backdrop-blur-md"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-950"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 p-5 dark:border-zinc-800">
                <h2 className="text-xl font-black">Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition-all hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
        <div className="p-5">
  <TaskCard 
    task={previewTask} 
    theme={mode} 
    className="pointer-events-none" 
  />
</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



           <style jsx global>{`
       .input-premium {
          width: 100%;
          min-height: 52px;
          border-radius: 1rem;
          border: 2px solid rgb(228 228 231);
          background: white;
          padding: 0.875rem 1.25rem;
          font-weight: 700;
          font-size: 0.9375rem;
          outline: none;
          transition: all 0.2s;
        }
       .dark.input-premium {
          border-color: rgb(39 39 42);
          background: rgb(24 24 27);
          color: white;
        }
       .input-premium:focus {
          box-shadow: 0 0 0 4px ${accent}20;
          border-color: ${accent};
          transform: translateY(-1px);
        }
       .input-premium:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
       .input-premium::placeholder {
          color: rgb(161 161 170);
          font-weight: 500;
        }
        
        /* React Select Dark Mode */
        .dark .react-select__control {
          background: rgb(24 24 27) !important;
          border-color: rgb(39 39 42) !important;
        }
        .dark .react-select__menu {
          background: rgb(24 24 27) !important;
          border: 1px solid rgb(39 39 42);
        }
        .dark .react-select__option {
          background: rgb(24 24 27) !important;
          color: white !important;
        }
        .dark .react-select__option--is-focused {
          background: ${accent}30 !important;
        }
        .dark .react-select__single-value {
          color: white !important;
        }
        .dark .react-select__input-container {
          color: white !important;
        }
      `}</style>
    </div>
  );
}

function StepContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-3xl bg-white p-6 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:shadow-black/20 dark:ring-zinc-800">
      {children}
    </div>
  );
}

function Field({ label, required, error, icon: Icon, children }: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  icon?: any;
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2.5">
      <span className="flex items-center gap-2 text-sm font-black text-zinc-700 dark:text-zinc-200">
        {Icon && <Icon className="text-base" />}
        {label}{required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs font-bold text-red-500"
        >
          <FiAlertCircle /> {error}
        </motion.p>
      )}
    </label>
  );
}

function Toggle({ label, description, checked, onChange, icon: Icon }: { 
  label: string; 
  description?: string;
  checked: boolean; 
  onChange: (value: boolean) => void;
  icon?: any;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 text-xl text-zinc-400" />}
        <div>
          <p className="font-black text-zinc-900 dark:text-zinc-100">{label}</p>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full p-1 transition-all ${
          checked? "bg-gradient-to-r from-[#0A84FF] to-[#0051D5]" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
        aria-label={label}
      >
        <motion.span
          layout
          className="block h-6 w-6 rounded-full bg-white shadow-lg"
          animate={{ x: checked? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

 
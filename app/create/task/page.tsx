"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, getFirebaseStorage, getFirebaseDB } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, query, where, onSnapshot, limit, getDocs } from "firebase/firestore";
import { createTask } from "@/lib/task";
import { toast, Toaster } from "sonner";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  FiX, FiCheck, FiPlus, FiClock, FiMapPin, FiEye, FiCopy,
  FiZap, FiShield, FiStar, FiTarget, FiLayers,
  FiTrendingUp, FiLock, FiGlobe, FiUsers, FiDollarSign,
  FiChevronRight, FiNavigation, FiCalendar, FiUserCheck // thêm 2 cái cuối
} from "react-icons/fi";

const CATEGORIES = [
  { id: "delivery", name: "Giao hàng", icon: "🚚", color: "#ff9500", basePrice: 50000 },
  { id: "shopping", name: "Mua hộ", icon: "🛒", color: "#34c759", basePrice: 30000 },
  { id: "tutoring", name: "Gia sư", icon: "📚", color: "#0a84ff", basePrice: 200000 },
  { id: "design", name: "Thiết kế", icon: "🎨", color: "#af52de", basePrice: 500000 },
  { id: "dev", name: "Lập trình", icon: "💻", color: "#5856d6", basePrice: 2000000 },
  { id: "marketing", name: "Marketing", icon: "📢", color: "#ff2d55", basePrice: 800000 },
  { id: "writing", name: "Viết lách", icon: "✍️", color: "#ffcc00", basePrice: 150000 },
  { id: "other", name: "Khác", icon: "📌", color: "#8e8e93", basePrice: 100000 },
];

const URGENCY = [
  { id: "normal", name: "Thường", time: "3-7 ngày", bonus: 0, color: "emerald" },
  { id: "urgent", name: "Gấp", time: "24-48h", bonus: 25, color: "amber" },
  { id: "express", name: "Hỏa tốc", time: "< 12h", bonus: 60, color: "red" },
];

const TEMPLATES = [
  { icon: "🚀", name: "Ship nhanh", cat: "delivery", title: "Giao hàng hỏa tốc nội thành", price: "45000", tags: ["gấp", "trong ngày"] },
  { icon: "🎨", name: "Logo Pro", cat: "design", title: "Thiết kế logo + bộ nhận diện", price: "1500000", tags: ["chuyên nghiệp", "3 concept"] },
  { icon: "💻", name: "Web bán hàng", cat: "dev", title: "Website TMĐT full tính năng", price: "5000000", tags: ["fullstack", "1 tháng"] },
  { icon: "📱", name: "TikTok Ads", cat: "marketing", title: "Chạy quảng cáo TikTok 1 tháng", price: "3000000", tags: ["target", "report"] },
];

export default function CreateTaskProMax() {
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const db = getFirebaseDB();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [savedTasks, setSavedTasks] = useState(0);

  const now = new Date();
  const [form, setForm] = useState({
    title: "", description: "", price: "", totalSlots: "1",
    startDate: new Date(now.getTime() + 3600000).toISOString().slice(0, 16),
    endDate: new Date(now.getTime() + 86400000 * 3).toISOString().slice(0, 16),
    category: "other", tags: [] as string[], images: [] as string[],
    address: "", city: "Hồ Chí Minh", lat: null as number | null, lng: null as number | null,
    visibility: "public", budgetType: "fixed", isRemote: true, requirements: "",
    urgency: "normal", skillLevel: 2, revisions: 3, milestones: true,
    autoMatch: true, allowBids: false, featured: false, privateNotes: "",
    invites: [] as string[], pollPrice: false, needApproval: true,
    nda: false, warranty: 7, attachments: [] as File[], recurring: "once",
    languages: ["Tiếng Việt"], timezone: "Asia/Ho_Chi_Minh",
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const category = useMemo(() => CATEGORIES.find(c => c.id === form.category)!, [form.category]);
  const urgencyLevel = URGENCY.find(u => u.id === form.urgency)!;
  const progress = (step / 3) * 100;
  const basePrice = parseInt(form.price.replace(/\./g, "") || "0");
  const urgencyFee = Math.round(basePrice * urgencyLevel.bonus / 100);
  const featuredFee = form.featured? 50000 : 0;
  const serviceFee = Math.round((basePrice + urgencyFee) * 0.05);
  const totalPrice = basePrice + urgencyFee + featuredFee + serviceFee;
  const canNext = step === 1? form.title.length >= 10 && form.description.length >= 20 : step === 2? basePrice >= 1000 || form.budgetType === "negotiable" : true;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => u? setUser({ uid: u.uid, email: u.email }) : router.replace("/login"));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(collection(db, 'tasks'), where('createdBy', '==', user.uid), limit(1))).then(s => setSavedTasks(s.size));
    const q = query(collection(db, 'friends'), where('userId', '==', user.uid), limit(12));
    return onSnapshot(q, snap => setFriends(snap.docs.map(d => ({ id: d.data().friendId, name: "Bạn" }))));
  }, [user, db]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50) return setDragX(0);
    if (info.offset.x < -50 && step < 3 && canNext) setStep(s => s + 1);
    if (info.offset.x > 50 && step > 1) setStep(s => s - 1);
    setDragX(0);
  };

  const useTemplate = (t: any) => {
    setForm(f => ({...f, category: t.cat, title: t.title, price: t.price, tags: t.tags }));
    setShowTemplates(false);
    toast.success("Đã áp dụng mẫu");
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const urls = await Promise.all(imageFiles.map(async file => {
        const r = ref(storage, `tasks/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(r, file);
        return getDownloadURL(r);
      }));
      await createTask({
        type: "task", title: form.title, description: form.description,
        price: form.budgetType === "negotiable"? 0 : totalPrice, currency: "VND",
        budgetType: form.budgetType, totalSlots: parseInt(form.totalSlots),
        visibility: form.visibility, deadline: Timestamp.fromDate(new Date(form.endDate)),
        applicationDeadline: Timestamp.fromDate(new Date(form.endDate)),
        startDate: Timestamp.fromDate(new Date(form.startDate)), category: form.category,
        tags: [...form.tags, form.urgency], images: urls, attachments: [],
        requirements: form.requirements, isRemote: form.isRemote,
        location: form.isRemote? {} : { address: form.address, city: form.city, lat: form.lat, lng: form.lng },
      } as any, user);
      toast.success("🎉 Đăng thành công!");
      setTimeout(() => router.push("/"), 800);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-black text-zinc-900 dark:text-zinc-100 select-none">
        {/* Header */}
        <div className="sticky top-0 z-40 backdrop-blur-2xl bg-white/70 dark:bg-black/70 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="h-[2px] bg-zinc-200 dark:bg-zinc-800"><motion.div className="h-full bg-[#0a84ff]" animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 300 }} /></div>
          <div className="h-[52px] px-4 flex items-center gap-3 max-w-[680px] mx-auto">
            <button onClick={() => step > 1? setStep(s => s - 1) : router.back()} className="w-8 h-8 -ml-1 grid place-items-center rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
              <FiX size={20} className="text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#0a84ff] text-white">BƯỚC {step}</span>
                <span className="text-[10px] text-zinc-500">/3</span>
                {savedTasks > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">{savedTasks} đã đăng</span>}
              </div>
              <h1 className="text-[15px] font-semibold leading-tight mt-0.5">{["Mô tả công việc", "Ngân sách & Thời gian", "Tùy chọn nâng cao"][step - 1]}</h1>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setShowTemplates(true)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <FiCopy size={16} />
              </button>
              <button onClick={() => setShowPreview(true)} className="w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <FiEye size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[680px] mx-auto pb-24">
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12} onDrag={(_, i) => setDragX(i.offset.x)} onDragEnd={handleDragEnd} style={{ x: dragX }}>
            <AnimatePresence mode="wait" initial={false}>
              {/* STEP 1 */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-3 space-y-3">
                  {/* Categories */}
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setForm({...form, category: c.id, price: c.basePrice.toString() })} className="group relative">
                        <div className={`aspect-[4/3.5] rounded-2xl border-[1.5px] p-2.5 flex flex-col items-center justify-center gap-1 transition-all ${form.category === c.id? "border-[#0a84ff] bg-[#0a84ff]/[0.06] dark:bg-[#0a84ff]/10 shadow-sm shadow-[#0a84ff]/20" : "border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
                          <div className="text-[22px] leading-none transition-transform group-active:scale-110">{c.icon}</div>
                          <div className={`text-[11px] font-medium leading-tight text-center ${form.category === c.id? "text-[#0a84ff]" : "text-zinc-700 dark:text-zinc-300"}`}>{c.name}</div>
                        </div>
                        {form.category === c.id && <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0a84ff] rounded-full grid place-items-center shadow-md ring-2 ring-white dark:ring-black"><FiCheck size={9} className="text-white" strokeWidth={3.5} /></div>}
                      </button>
                    ))}
                  </div>

                  {/* Title */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm shadow-zinc-900/[0.02]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl grid place-items-center shrink-0 mt-0.5" style={{ backgroundColor: `${category.color}15` }}>
                        <span className="text-[20px]">{category.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input value={form.title} onChange={e => setForm({...form, title: e.target.value.slice(0, 100) })} placeholder="Bạn cần làm gì?" className="w-full text-[17px] font-semibold bg-transparent outline-none placeholder:text-zinc-300 dark:placeholder-zinc-700 leading-snug" autoFocus />
                        <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide -mx-1 px-1">

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm shadow-zinc-900/[0.02]">
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value.slice(0, 2000) })} placeholder="Mô tả chi tiết yêu cầu, mục tiêu, kết quả mong muốn..." rows={4} className="w-full bg-transparent outline-none resize-none text-[15px] leading-[22px] placeholder:text-zinc-400" />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex gap-1">
                        {["Chi tiết", "Đúng hạn", "Báo cáo"].map(t => (
                          <button key={t} onClick={() => setForm(f => ({...f, description: f.description + (f.description? "\n• " : "• ") + t }))} className="px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 transition-colors">+ {t}</button>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400 tabular-nums">{form.description.length}/2000</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: FiUsers, label: "1.2k", sub: "Freelancer" },
                      { icon: FiClock, label: "2.4h", sub: "TB phản hồi" },
                      { icon: FiStar, label: "4.8", sub: "Đánh giá" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur rounded-2xl border-zinc-200/40 dark:border-zinc-800/40 p-3 text-center">
                        <s.icon size={16} className="mx-auto text-zinc-400 mb-1" />
                        <div className="text-[15px] font-semibold leading-none">{s.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{s.sub}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-3 space-y-3">
                  {/* Budget */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#0a84ff]/10 grid place-items-center"><FiDollarSign size={15} className="text-[#0a84ff]" /></div>
                        <span className="font-medium text-[14px]">Ngân sách</span>
                      </div>
                      <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                        {["fixed", "hourly", "negotiable"].map((t, i) => (
                          <button key={t} onClick={() => setForm({...form, budgetType: t as any })} className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-all ${form.budgetType === t? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"}`}>{["Cố định", "Giờ", "Thỏa thuận"][i]}</button>
                        ))}
                      </div>
                    </div>

                    {form.budgetType!== "negotiable"? (
                      <>
                        <div className="relative">
                          <input type="text" inputMode="numeric" value={form.price} onChange={e => setForm({...form, price: e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".") })} placeholder="0" className="w-full h-[52px] pl-4 pr-14 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl outline-none focus:ring-2 focus:ring-[#0a84ff]/20 text-[24px] font-semibold tracking-tight transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-zinc-400">VND</span>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-zinc-500">Số lượng:</span>
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                              <button onClick={() => setForm({...form, totalSlots: Math.max(1, parseInt(form.totalSlots) - 1).toString() })} className="w-6 h-6 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600">−</button>
                              <span className="w-8 text-center text-[13px] font-medium tabular-nums">{form.totalSlots}</span>
                              <button onClick={() => setForm({...form, totalSlots: Math.min(20, parseInt(form.totalSlots) + 1).toString() })} className="w-6 h-6 grid place-items-center rounded-md hover:bg-white dark:hover:bg-zinc-700 text-zinc-600">+</button>
                            </div>
                          </div>
                          <span className="text-[12px] text-zinc-500">TB: {(category.basePrice / 1000).toFixed(0)}k</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-[52px] grid place-items-center bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-zinc-500 text-[14px]">Sẽ thỏa thuận sau</div>
                    )}
                  </div>

                  {/* Urgency */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 grid place-items-center"><FiZap size={15} className="text-amber-600" /></div>
                      <span className="font-medium text-[14px]">Độ ưu tiên</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {URGENCY.map(u => (
                        <button key={u.id} onClick={() => setForm({...form, urgency: u.id })} className={`relative p-3 rounded-2xl border-[1.5px] text-left transition-all ${form.urgency === u.id? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-zinc-300"}`}>
                          <div className="text-[11px] font-semibold" style={{ color: u.color === "emerald"? "#10b981" : u.color === "amber"? "#f59e0b" : "#ef4444" }}>{u.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{u.time}</div>
                          {u.bonus > 0 && <div className="text-[10px] font-medium mt-1" style={{ color: u.color === "amber"? "#f59e0b" : "#ef4444" }}>+{u.bonus}%</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time & Location */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <FiCalendar size={15} className="text-zinc-400" />
                        <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Thời gian thực hiện</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Bắt đầu</div>
                          <input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value })} className="w-full h-9 px-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none text-[13px] font-medium" />
                        </div>
                        <div>
                          <div className="text-[11px] text-zinc-500 mb-1">Kết thúc</div>
                          <input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value })} className="w-full h-9 px-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none text-[13px] font-medium" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiMapPin size={15} className="text-zinc-400" />
                          <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Địa điểm</span>
                        </div>
                        <button onClick={() => setForm({...form, isRemote:!form.isRemote })} className={`relative w-10 h-[22px] rounded-full transition-colors ${form.isRemote? "bg-[#0a84ff]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                          <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform ${form.isRemote? "translate-x-[18px]" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                      {form.isRemote? (
                        <div className="h-9 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center gap-2 text-[13px] text-zinc-600 dark:text-zinc-400">
                          <FiGlobe size={14} /> Làm việc từ xa
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={form.address} onChange={e => setForm({...form, address: e.target.value })} placeholder="Nhập địa chỉ..." className="flex-1 h-9 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none text-[13px]" />
                          <button onClick={() => navigator.geolocation.getCurrentPosition(p => setForm({...form, lat: p.coords.latitude, lng: p.coords.longitude, address: "Vị trí hiện tại" }))} className="w-9 h-9 grid place-items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl active:scale-95">
                            <FiNavigation size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="p-3 space-y-3">
                  {/* Pro Features Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { k: "autoMatch", icon: FiTarget, label: "Tự động ghép", desc: "AI tìm người phù hợp", color: "emerald" },
                      { k: "milestones", icon: FiLayers, label: "Chia giai đoạn", desc: "Thanh toán theo tiến độ", color: "blue" },
                      { k: "allowBids", icon: FiTrendingUp, label: "Đấu thầu", desc: "Nhận nhiều báo giá", color: "purple" },
                      { k: "needApproval", icon: FiUserCheck, label: "Duyệt tay", desc: "Chọn người làm", color: "amber" },
                      { k: "nda", icon: FiLock, label: "Bảo mật NDA", desc: "Ký thỏa thuận", color: "red" },
                      { k: "warranty", icon: FiShield, label: "Bảo hành", desc: "7-30 ngày", color: "indigo" },
                    ].map(item => {
                      const Icon = item.icon;
                      const active = (form as any)[item.k];
                      return (
                        <button key={item.k} onClick={() => setForm({...form, [item.k]:!active })} className={`group relative p-3.5 rounded-2xl border-[1.5px] text-left transition-all active:scale-[0.98] ${active? "border-[#0a84ff] bg-[#0a84ff]/[0.06] dark:bg-[#0a84ff]/10" : "border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"}`}>
                          <Icon size={18} className={active? "text-[#0a84ff]" : "text-zinc-400 group-hover:text-zinc-600 transition-colors"} />
                          <div className="text-[13px] font-medium mt-2 leading-tight">{item.label}</div>
                          <div className="text-[11px] text-zinc-500 leading-snug mt-0.5">{item.desc}</div>
                          {active && <div className="absolute top-2 right-2 w-4 h-4 bg-[#0a84ff] rounded-full grid place-items-center"><FiCheck size={9} className="text-white" strokeWidth={3} /></div>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Skill & Revisions */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[12px] text-zinc-500 mb-2">Cấp độ yêu cầu</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(l => (
                            <button key={l} onClick={() => setForm({...form, skillLevel: l })} className={`flex-1 h-8 rounded-lg text-[12px] font-medium transition-all ${form.skillLevel === l? "bg-[#0a84ff] text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-200"}`}>{["New", "TB", "Pro", "Exp"][l - 1]}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] text-zinc-500 mb-2">Số lần sửa</div>
                        <div className="flex items-center gap-2">
                          <input type="range" min="1" max="10" value={form.revisions} onChange={e => setForm({...form, revisions: parseInt(e.target.value) })} className="flex-1 h-1.5 accent-[#0a84ff]" />
                          <span className="w-6 text-center text-[13px] font-medium tabular-nums">{form.revisions}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Media Upload */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-medium">Tài liệu đính kèm</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600">{form.images.length}/5</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {form.images.map((url, i) => (
                        <div key={i} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-800">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => { const n = [...form.images]; n.splice(i, 1); setForm({...form, images: n }); const f = [...imageFiles]; f.splice(i, 1); setImageFiles(f); }} className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 grid place-items-center transition-opacity">
                            <FiX size={16} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {form.images.length < 5 && (
                        <button onClick={() => fileRef.current?.click()} className="w-[72px] h-[72px] rounded-xl border-[1.5px] border-dashed border-zinc-300 dark:border-zinc-700 grid place-items-center hover:border-[#0a84ff]/50 hover:bg-[#0a84ff]/5 transition-colors shrink-0 group">
                          <FiPlus size={18} className="text-zinc-400 group-hover:text-[#0a84ff] transition-colors" />
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple onChange={e => { const f = Array.from(e.target.files || []); setImageFiles([...imageFiles,...f]); setForm({...form, images: [...form.images,...f.map(x => URL.createObjectURL(x))] }); }} className="hidden" />
                  </div>

                  {/* Visibility & Invite */}
                  <div className="bg-white dark:bg-zinc-900 rounded-[20px] border border-zinc-200/60 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 grid place-items-center"><FiEye size={14} className="text-zinc-600" /></div>
                        <div>
                          <div className="text-[13px] font-medium">Hiển thị</div>
                          <div className="text-[11px] text-zinc-500">Ai có thể xem</div>
                        </div>
                      </div>
                      <select value={form.visibility} onChange={e => setForm({...form, visibility: e.target.value as any })} className="text-[13px] font-medium bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg px-2.5 py-1.5 outline-none">
                        <option value="public">Công khai</option>
                        <option value="friends">Bạn bè</option>
                        <option value="private">Riêng tư</option>
                      </select>
                    </div>
                    {form.visibility!== "public" && friends.length > 0 && (
                      <div className="p-3.5">
                        <div className="text-[12px] text-zinc-500 mb-2">Mời bạn bè ({form.invites.length})</div>
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                          {friends.slice(0, 8).map(f => (
                            <button key={f.id} onClick={() => setForm({...form, invites: form.invites.includes(f.id)? form.invites.filter(x => x!== f.id) : [...form.invites, f.id] })} className={`px-2.5 py-1.5 rounded-full text-[12px] whitespace-nowrap border transition-all ${form.invites.includes(f.id)? "bg-[#0a84ff] text-white border-[#0a84ff]" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}>{f.name}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Featured */}
                  <button onClick={() => setForm({...form, featured:!form.featured })} className={`w-full p-4 rounded-[20px] border-[1.5px] transition-all text-left ${form.featured? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-2xl grid place-items-center ${form.featured? "bg-amber-500" : "bg-zinc-100 dark:bg-zinc-800"}`}><FiStar size={18} className={form.featured? "text-white" : "text-zinc-400"} /></div>
                        <div>
                          <div className="font-medium text-[14px] flex items-center gap-1.5">Ghim lên đầu <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">PRO</span></div>
                          <div className="text-[12px] text-zinc-500 mt-0.5 leading-snug">Hiển thị ưu tiên • Gấp 5x lượt xem • 24h đầu</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 grid place-items-center transition-all ${form.featured? "border-amber-500 bg-amber-500" : "border-zinc-300 dark:border-zinc-600"}`}>{form.featured && <FiCheck size={10} className="text-white" strokeWidth={3} />}</div>
                    </div>
                    {form.featured && <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between"><span className="text-[12px] text-amber-700 dark:text-amber-400">Phí dịch vụ</span><span className="text-[14px] font-semibold text-amber-600">+50.000đ</span></div>}
                  </button>

                  {/* Price Summary */}
                  {basePrice > 0 && (
                    <div className="bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[20px] p-4">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-[11px] opacity-60 uppercase tracking-wide font-medium">Tổng thanh toán</div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-[28px] font-bold tracking-tight leading-none">{totalPrice.toLocaleString()}</span>
                            <span className="text-[14px] opacity-70">đ</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] opacity-60">Bao gồm</div>
                          <div className="text-[12px] font-medium mt-0.5">Phí dịch vụ 5%</div>
                        </div>
                      </div>
                      {(urgencyFee > 0 || featuredFee > 0) && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          <div className="flex justify-between text-[12px] opacity-70"><span>Giá gốc</span><span>{basePrice.toLocaleString()}đ</span></div>
                          {urgencyFee > 0 && <div className="flex justify-between text-[12px] opacity-70"><span>Phí ưu tiên ({urgencyLevel.bonus}%)</span><span>+{urgencyFee.toLocaleString()}đ</span></div>}
                          {featuredFee > 0 && <div className="flex justify-between text-[12px] opacity-70"><span>Ghim PRO</span><span>+{featuredFee.toLocaleString()}đ</span></div>}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-2xl bg-white/80 dark:bg-black/80 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="max-w-[680px] mx-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-11 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium text-[14px] active:scale-95 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700">Quay lại</button>}
              <button onClick={() => step < 3? setStep(s => s + 1) : submit()} disabled={!canNext || submitting} className="flex-1 h-11 rounded-2xl bg-[#0a84ff] hover:bg-[#0071e3] active:bg-[#0066cc] text-white font-semibold text-[15px] disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-[#0a84ff]/20 active:scale-[0.98] transition-all">
                {submitting? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang đăng...</> : step < 3? <>Tiếp tục<FiChevronRight size={16} /></> : <>Đăng công việc<FiZap size={14} /></>}
              </button>
            </div>
          </div>
        </div>

      {/* DÁN VÀO ĐÂY - NGAY SAU </div> trên */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-3" onClick={() => setShowTemplates(false)}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-[28px] p-5 max-h-[75vh] overflow-auto shadow-2xl">
              <div className="w-9 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
              <h3 className="text-[20px] font-bold">Mẫu có sẵn</h3>
              <p className="text-[13px] text-zinc-500 mt-0.5 mb-4">Chọn để bắt đầu nhanh</p>
              <div className="grid gap-2.5">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => useTemplate(t)} className="group w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-left transition-all active:scale-[0.98]">
                    <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 shadow-sm grid place-items-center text-[20px] group-hover:scale-110 transition-transform">{t.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[14px]">{t.name}</div>
                      <div className="text-[12px] text-zinc-500 truncate">{t.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold text-[#0a84ff]">{(parseInt(t.price)/1000).toFixed(0)}k</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
{/* Thêm ngay trước </div> cuối cùng, sau phần Templates Modal */}
<AnimatePresence>
  {showPreview && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="w-full max-w-[380px] bg-white dark:bg-zinc-900 rounded-[24px] overflow-hidden">
        {form.images[0] && <img src={form.images[0]} alt="" className="w-full aspect-[16/9] object-cover" />}
        <div className="p-5">
          <h2 className="text-[18px] font-bold">{form.title || "Tiêu đề"}</h2>
          <p className="text-[13px] text-zinc-500 mt-1">{category.name} • {form.price}đ</p>
          <p className="text-[14px] mt-3 line-clamp-3 text-zinc-600 dark:text-zinc-400">{form.description || "Mô tả..."}</p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setShowPreview(false)} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800">Đóng</button>
            <button onClick={() => { setShowPreview(false); submit(); }} className="flex-1 h-11 rounded-2xl bg-[#0a84ff] text-white">Đăng</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
      </div>

      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}*{ -webkit-tap-highlight-color: transparent; }`}</style>
    </>
  );
}
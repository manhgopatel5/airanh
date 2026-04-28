"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FiX, FiCheck, FiPlus, FiChevronRight, FiUpload,
  FiClock, FiMapPin, FiEye, FiCopy,
  FiNavigation
} from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAuth } from "@/lib/useAuth";

type Category = { id: string; label: string; emoji: string; suggestions: string[] };
type CostType = "free" | "share" | "host" | "ticket";
type Privacy = "public" | "friends_of_friends" | "private";

const CATEGORIES: Category[] = [
  { id: "cafe", label: "Cafe", emoji: "☕", suggestions: ["Cafe sáng T7", "Work date", "Cafe chill", "Làm việc"] },
  { id: "drink", label: "Nhậu", emoji: "🍻", suggestions: ["Nhậu tối nay", "Beer craft", "Rooftop", "Quán quen"] },
  { id: "game", label: "Game", emoji: "🎮", suggestions: ["Boardgame", "PS5", "Bida", "Ma sói"] },
  { id: "sport", label: "Thể thao", emoji: "🏃", suggestions: ["Chạy bộ", "Đá banh", "Cầu lông", "Bơi"] },
  { id: "study", label: "Học", emoji: "📚", suggestions: ["Học nhóm", "Workshop", "Ôn thi", "Thuyết trình"] },
  { id: "movie", label: "Chill", emoji: "🎬", suggestions: ["Xem phim", "Concert", "Karaoke", "Bar"] },
  { id: "food", label: "Ăn", emoji: "🍜", suggestions: ["Ăn lẩu", "Buffet", "Ăn đêm", "Quán mới"] },
  { id: "travel", label: "Đi chơi", emoji: "🏖️", suggestions: ["Phượt", "Picnic", "Cắm trại", "Đà Lạt"] },
];

const TEMPLATES = [
  { name: "Cafe làm việc", cat: "cafe", title: "Cafe sáng thứ 7", loc: "The Workshop", time: "09:00" },
  { name: "Nhậu cuối tuần", cat: "drink", title: "Nhậu tối nay", loc: "Quán ốc", time: "19:00" },
  { name: "Chạy bộ", cat: "sport", title: "Chạy bộ công viên", loc: "CV Tao Đàn", time: "05:30" },
  { name: "Boardgame", cat: "game", title: "Boardgame tối T7", loc: "Boardgame Station", time: "19:30" },
];

const POPULAR_PLACES = [
  "Landmark 81", "Tao Đàn", "Bitexco", "Thảo Điền", "Nhà thờ Đức Bà",
  "Phố đi bộ Nguyễn Huệ", "Bùi Viện", "Thảo Cầm Viên", "Crescent Mall"
];

export default function CreatePlanFinal() {
  const router = useRouter();
  useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [dragX, setDragX] = useState(0);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(2);
  const [maxPeople, setMaxPeople] = useState(4);
  const [costType, setCostType] = useState<CostType>("share");
  const [costAmount, setCostAmount] = useState(0);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [cover, setCover] = useState<string | null>(null);
  const [invites, setInvites] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [minAge, setMinAge] = useState(0);
  const [needApproval, setNeedApproval] = useState(false);
  const [pollTime, setPollTime] = useState(false);
  const [pollLocation, setPollLocation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchFriend, setSearchFriend] = useState("");

  const friends = useMemo(() => [
    { id: "1", name: "Minh Nguyễn", avatar: "https://i.pravatar.cc/80?u=1", online: true, mutual: 12 },
    { id: "2", name: "An Trần", avatar: "https://i.pravatar.cc/80?u=2", online: true, mutual: 8 },
    { id: "3", name: "Linh Phạm", avatar: "https://i.pravatar.cc/80?u=3", online: false, mutual: 5 },
    { id: "4", name: "Khoa Lê", avatar: "https://i.pravatar.cc/80?u=4", online: true, mutual: 15 },
    { id: "5", name: "Trang Võ", avatar: "https://i.pravatar.cc/80?u=5", online: false, mutual: 3 },
    { id: "6", name: "Dũng Hoàng", avatar: "https://i.pravatar.cc/80?u=6", online: true, mutual: 9 },
  ], []);

  const filteredFriends = useMemo(() =>
    friends.filter(f => f.name.toLowerCase().includes(searchFriend.toLowerCase())),
    [friends, searchFriend]
  );

  useEffect(() => {
    const saved = localStorage.getItem("plan_draft");
    if (saved) try {
      const d = JSON.parse(saved);
      setTitle(d.title || "");
      setDesc(d.desc || "");
      setCategory(CATEGORIES.find(c => c.id === d.cat) || CATEGORIES[0]);
      setLocation(d.location || "");
      setTime(d.time || "");
    } catch {}
  }, []);

  useEffect(() => {
    const data = { title, desc, cat: category?.id || 'cafe', location, time };
    localStorage.setItem("plan_draft", JSON.stringify(data));
  }, [title, desc, category, location, time]);

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB");
    if (!f.type.startsWith("image/")) return toast.error("Chỉ chọn ảnh");
    const r = new FileReader();
    r.onload = ev => setCover(ev.target?.result as string);
    r.readAsDataURL(f);
    toast.success("Đã thêm ảnh");
  }, []);

  const toggleInvite = (id: string) => {
    setInvites(p => {
      const newList = p.includes(id)? p.filter(i => i!== id) : [...p, id];
      if (newList.length > 20) {
        toast.error("Tối đa 20 người");
        return p;
      }
      return newList;
    });
  };

  const addReq = () => {
    const t = reqInput.trim();
    if (!t) return;
    if (requirements.length >= 5) return toast.error("Tối đa 5 mục");
    if (requirements.includes(t)) return toast.error("Đã có rồi");
    setRequirements([...requirements, t]);
    setReqInput("");
  };

  const removeReq = (idx: number) => setRequirements(rs => rs.filter((_, i) => i!== idx));

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50) return setDragX(0);
    if (info.offset.x < -50 && step < 3 && canNext) setStep(s => s + 1);
    if (info.offset.x > 50 && step > 1) setStep(s => s - 1);
    setDragX(0);
  };

  const useTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title);
    setLocation(t.loc);
    setCategory(CATEGORIES.find(c => c.id === t.cat) || CATEGORIES[0]);
    const d = new Date();
const [h, m] = t.time.split(":").map(Number);
d.setHours(h || 0, m || 0, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    setTime(d.toISOString().slice(0, 16));
    setShowTemplates(false);
    toast.success(`Đã dùng mẫu "${t.name}"`);
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Nhập tên hoạt động");
    if (title.trim().length < 3) return toast.error("Tên quá ngắn");
    if (!location.trim()) return toast.error("Chọn địa điểm");
    if (!time) return toast.error("Chọn thời gian");
    if (new Date(time) < new Date()) return toast.error("Thời gian phải trong tương lai");

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      localStorage.removeItem("plan_draft");
      toast.success("Tạo kế hoạch thành công! 🎉");
      setTimeout(() => router.push("/"), 800);
    } catch {
      toast.error("Tạo thất bại, thử lại");
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;
  const canNext = step === 1? title.trim().length >= 3 : step === 2? location.trim().length > 0 &&!!time : true;
  const splitCost = costAmount > 0 && costType === "share"? Math.ceil(costAmount / maxPeople) : 0;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-[#f9f9fb] dark:bg-black text-zinc-900 dark:text-zinc-100 select-none">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="h-[3px] w-full bg-zinc-100 dark:bg-zinc-900">
            <motion.div className="h-full bg-[#22c55e]" animate={{ width: `${progress}%` }} />
          </div>
          <div className="h-[56px] px-4 flex items-center gap-3">
            <button onClick={() => step > 1? setStep(s => s - 1) : router.back()} className="w-9 h-9 -ml-1.5 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90">
              <FiX size={22} className="text-zinc-600 dark:text-zinc-400" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black uppercase">Bước {step}/3</span>
                <span className="text-[11px] text-zinc-500">Tự động lưu</span>
              </div>
              <h1 className="text-[17px] font-semibold leading-tight truncate mt-0.5">
                {step === 1? "Bạn muốn làm gì?" : step === 2? "Khi nào & ở đâu?" : "Mời bạn bè"}
              </h1>
            </div>
            <button onClick={() => setShowTemplates(true)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
              <FiCopy size={18} />
            </button>
            <button onClick={() => setShowPreview(true)} className="w-9 h-9 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
              <FiEye size={18} />
            </button>
          </div>
        </div>

        <div className="max-w-[600px] mx-auto pb-24">
          <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15} onDrag={(_, info) => setDragX(info.offset.x)} onDragEnd={handleDragEnd} style={{ x: dragX }}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-4 space-y-4">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-500 mb-2.5 px-1">Chọn loại hoạt động</p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {CATEGORIES.map(c => {
                        const active = category.id === c.id;
                        return (
                          <button key={c.id} onClick={() => setCategory(c)} className={`relative aspect-square rounded-[20px] border-2 transition-all active:scale-[0.96] ${active? "border-[#22c55e] bg-[#22c55e]/10" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                              <span className="text-[26px]">{c.emoji}</span>
                              <span className={`text-[11px] font-medium ${active? "text-[#22c55e]" : "text-zinc-600 dark:text-zinc-400"}`}>{c.label}</span>
                            </div>
                            {active && <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#22c55e] rounded-full grid place-items-center"><FiCheck size={12} className="text-white" strokeWidth={3} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-[28px] mt-0.5">{category.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <input value={title} onChange={e => setTitle(e.target.value.slice(0, 50))} placeholder={`${category.suggestions[0]}...`} className="w-full text-[22px] font-bold bg-transparent outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700" autoFocus />
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {category.suggestions.map(s => (
                              <button key={s} onClick={() => setTitle(s)} className="px-2.5 h-[26px] rounded-full bg-zinc-100 dark:bg-zinc-800 text-[12px] text-zinc-600 dark:text-zinc-400 font-medium active:scale-95">{s}</button>
                            ))}
                          </div>
                          <span className={`text-[11px] font-medium ${title.length > 40? "text-amber-600" : "text-zinc-400"}`}>{title.length}/50</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 300))} placeholder="Mô tả thêm về hoạt động, vibe, yêu cầu..." rows={3} className="w-full text-[15px] leading-[22px] bg-transparent outline-none resize-none placeholder:text-zinc-400" />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {["Vui là chính", "Đúng giờ", "Thoải mái"].map(t => (
                          <button key={t} onClick={() => setDesc(d => d? `${d} ${t}.` : `${t}.`)} className="text-[11px] px-2 h-5 rounded-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">+ {t}</button>
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-400">{desc.length}/300</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-4 space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 grid place-items-center"><FiClock size={18} className="text-[#22c55e]" /></div>
                        <h3 className="font-semibold text-[15px]">Thời gian</h3>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={pollTime} onChange={e => setPollTime(e.target.checked)} className="w-4 h-4 rounded border-2 accent-[#22c55e]" />
                        <span className="text-[12px] text-zinc-600 dark:text-zinc-400">Bình chọn</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: "Tối nay", h: 19 },
                        { label: "Ngày mai", h: 9, d: 1 },
                        { label: "T7", h: 9, wd: 6 },
                        { label: "CN", h: 9, wd: 0 },
                      ].map((qt) => (
                        <button key={qt.label} onClick={() => {
                          const d = new Date();
                          if (qt.d) d.setDate(d.getDate() + qt.d);
                          if (qt.wd!== undefined) {
                            const diff = qt.wd - d.getDay();
                            d.setDate(d.getDate() + (diff <= 0? diff + 7 : diff));
                          }
                          d.setHours(qt.h, 0, 0);
                          setTime(d.toISOString().slice(0, 16));
                        }} className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[13px] font-medium active:scale-[0.97]">
                          {qt.label}
                        </button>
                      ))}
                    </div>
                    <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full h-12 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#22c55e] text-[15px]" />
                    <div className="flex items-center gap-3 mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[13px] text-zinc-600 dark:text-zinc-400">Thời lượng</span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        {[1, 2, 3, 4, 6].map(h => (
                          <button key={h} onClick={() => setDuration(h)} className={`w-9 h-8 rounded-lg text-[13px] font-medium ${duration === h? "bg-[#22c55e] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{h}h</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#22c55e]/10 grid place-items-center"><FiMapPin size={18} className="text-[#22c55e]" /></div>
                        <h3 className="font-semibold text-[15px]">Địa điểm</h3>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={pollLocation} onChange={e => setPollLocation(e.target.checked)} className="w-4 h-4 rounded border-2 accent-[#22c55e]" />
                        <span className="text-[12px] text-zinc-600 dark:text-zinc-400">Bình chọn</span>
                      </label>
                    </div>
                    <div className="relative">
                      <FiNavigation size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Tìm địa điểm, quán, địa chỉ..." className="w-full h-12 pl-10 pr-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#22c55e] text-[15px] placeholder:text-zinc-400" />
                    </div>
                    <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide">
                      {POPULAR_PLACES.map(p => (
                        <button key={p} onClick={() => setLocation(p)} className={`flex-shrink-0 h-7 px-3 rounded-full text-[12px] font-medium whitespace-nowrap ${location === p? "bg-[#22c55e] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{p}</button>
                      ))}
                    </div>
                    <input value={locationDetail} onChange={e => setLocationDetail(e.target.value)} placeholder="Địa chỉ cụ thể (tùy chọn)" className="w-full mt-3 h-10 px-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 outline-none text-[13px] placeholder:text-zinc-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                      <p className="text-[12px] font-medium text-zinc-500 uppercase">Số người</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-[32px] font-bold leading-none">{maxPeople}</span>
                        <span className="text-[13px] text-zinc-500">người</span>
                      </div>
                      <input type="range" min={2} max={20} value={maxPeople} onChange={e => setMaxPeople(Number(e.target.value))} className="w-full mt-3 accent-[#22c55e]" />
                    </div>
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                      <p className="text-[12px] font-medium text-zinc-500 uppercase">Chi phí</p>
                      <select value={costType} onChange={e => setCostType(e.target.value as CostType)} className="w-full bg-transparent outline-none text-[15px] font-semibold mt-1 -ml-1">
                        <option value="free">Miễn phí</option>
                        <option value="share">Chia đều</option>
                        <option value="host">Mình bao</option>
                        <option value="ticket">Có vé</option>
                      </select>
                      {costType!== "free" && costType!== "host" && (
                        <div className="mt-1">
                          <input type="number" value={costAmount || ""} onChange={e => setCostAmount(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-20 text-[20px] font-bold bg-transparent outline-none" />
                          <span className="text-[13px] text-zinc-500 ml-1">đ</span>
                          {splitCost > 0 && <p className="text-[11px] text-[#22c55e] font-medium">~{splitCost.toLocaleString()}đ/ng</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="p-4 space-y-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3.5">
                      <h3 className="font-semibold text-[15px]">Mời bạn bè</h3>
                      {invites.length > 0 && <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] font-medium">{invites.length}</span>}
                    </div>
                    <input value={searchFriend} onChange={e => setSearchFriend(e.target.value)} placeholder="Tìm bạn bè..." className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#22c55e] text-[13px] mb-3" />
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {filteredFriends.map(f => {
                        const isInvited = invites.includes(f.id);
                        return (
                          <button key={f.id} onClick={() => toggleInvite(f.id)} className="flex-shrink-0 relative">
                            <div className={`w-[60px] h-[60px] rounded-2xl overflow-hidden ${isInvited? "ring-2 ring-[#22c55e] ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : "ring-1 ring-zinc-200 dark:ring-zinc-800"}`}>
                              <img src={f.avatar} alt="" className="w-full h-full object-cover" />
                              {f.online && <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-[#22c55e] rounded-full ring-2 ring-white dark:ring-zinc-900" />}
                            </div>
                            <p className="text-[11px] mt-1.5 w-[60px] truncate font-medium">{f.name}</p>
                            {isInvited && <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#22c55e] rounded-full grid place-items-center"><FiCheck size={11} className="text-white" strokeWidth={3} /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[15px]">Ảnh bìa</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Tùy chọn</span>
                    </div>
                    {cover? (
                      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden">
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCover(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 grid place-items-center"><FiX size={14} className="text-white" /></button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()} className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 grid place-items-center gap-2 hover:border-[#22c55e]/50">
                        <FiUpload size={24} className="text-zinc-400" />
                        <span className="text-[13px] text-zinc-500">Thêm ảnh</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      { label: "Ai xem được", value: privacy, setter: setPrivacy, options: [["public", "Công khai"], ["friends", "Bạn bè"], ["private", "Riêng tư"]] },
                      { label: "Độ tuổi", value: minAge, setter: setMinAge, options: [[0, "Mọi tuổi"], [18, "18+"], [21, "21+"]] },
                    ].map((item, i) => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <span className="text-[14px] font-medium">{item.label}</span>
                        <select value={item.value} onChange={e => item.setter(e.target.value as any)} className="text-[13px] font-medium bg-transparent outline-none">
                          {item.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-[14px] font-medium">Duyệt thành viên</span>
                      <button onClick={() => setNeedApproval(!needApproval)} className={`w-11 h-6 rounded-full transition-colors ${needApproval? "bg-[#22c55e]" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${needApproval? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 p-4">
                    <h3 className="font-semibold text-[15px] mb-3">Cần chuẩn bị</h3>
                    <div className="flex gap-2">
                      <input value={reqInput} onChange={e => setReqInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addReq()} placeholder="VD: Laptop, giày..." className="flex-1 h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#22c55e] text-[14px]" />
                      <button onClick={addReq} className="w-10 h-10 rounded-xl bg-[#22c55e] grid place-items-center"><FiPlus size={18} className="text-white" /></button>
                    </div>
                    {requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {requirements.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <span className="text-[12px]">{r}</span>
                            <button onClick={() => removeReq(i)} className="w-4 h-4 grid place-items-center"><FiX size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="max-w-[600px] mx-auto px-4 h-[84px] flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
            <div className="flex-1 min-w-0 hidden sm:block">
              <div className="flex gap-1">{[1, 2, 3].map(i => <div key={i} className={`h-1 rounded-full ${i === step? "w-8 bg-[#22c55e]" : i < step? "w-1 bg-[#22c55e]/60" : "w-1 bg-zinc-300 dark:bg-zinc-700"}`} />)}</div>
            </div>
            <div className="flex items-center gap-2.5 ml-auto">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-12 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium">Quay lại</button>}
              <button onClick={() => step < 3? setStep(s => s + 1) : submit()} disabled={!canNext || loading} className="h-12 px-6 min-w-[120px] rounded-2xl bg-[#22c55e] text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">
                {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : step < 3? <><span>Tiếp</span><FiChevronRight size={18} /></> : <><FiCheck size={18} /><span>Đăng</span></>}
              </button>
            </div>
          </div>
        </div>

        {showTemplates && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowTemplates(false)}>
            <div className="w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 sm:rounded-[28px] rounded-t-[28px] p-4 max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
              <h3 className="font-bold text-[18px] mb-3">Mẫu có sẵn</h3>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => useTemplate(t)} className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 grid place-items-center text-[18px]">{CATEGORIES.find(c => c.id === t.cat)?.emoji}</div>
                    <div className="flex-1">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-[12px] text-zinc-500">{t.title} • {t.loc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
            <div className="w-full max-w-[380px] bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden" onClick={e => e.stopPropagation()}>
              {cover && <img src={cover} alt="" className="w-full aspect-[16/9] object-cover" />}
              <div className="p-5">
                <h2 className="text-[22px] font-bold">{title || "Tên hoạt động"}</h2>
                <p className="text-[14px] text-zinc-500 mt-1">{category.label} • {new Date(time).toLocaleString("vi-VN")}</p>
                <p className="text-[14px] mt-3">{location}</p>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => setShowPreview(false)} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium">Đóng</button>
                  <button onClick={() => { setShowPreview(false); submit(); }} className="flex-1 h-11 rounded-2xl bg-[#22c55e] text-white font-medium">Đăng</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
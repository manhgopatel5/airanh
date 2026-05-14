"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { FiArrowLeft, FiSave, FiX, FiPlus } from "react-icons/fi";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";
import celebrate from "@/public/lotties/huha-celebrate.json";
import type { Task } from "@/types/task";

const CATEGORIES = [
  { value: "design", label: "Thiết kế" },
  { value: "dev", label: "Lập trình" },
  { value: "marketing", label: "Marketing" },
  { value: "writing", label: "Viết lách" },
  { value: "tutor", label: "Gia sư" },
  { value: "other", label: "Khác" },
];

export default function EditTaskPage() {
  const { id: taskId } = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!taskId || typeof taskId!== "string" || authLoading) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "tasks", taskId));
        if (!snap.exists()) { toast.error("Không tìm thấy công việc"); router.push("/tasks"); return; }
        const data = { id: snap.id,...snap.data() } as Task;
        if (!user) { toast.error("Bạn cần đăng nhập"); router.push("/login"); return; }
        if (data.userId!== user.uid) { toast.error("Bạn không có quyền sửa"); router.push(`/task/${taskId}`); return; }
        setTask(data);
        setForm({
          title: data.title,
          description: data.description || "",
          price: "price" in data? data.price : 0,
          totalSlots: "totalSlots" in data? data.totalSlots : 1,
          category: data.category || "",
          tags: data.tags || [],
          images: data.images || [],
          requirements: "requirements" in data? data.requirements : "",
          location: { address: data.location?.address || "", city: data.location?.city || "" },
          isRemote: "isRemote" in data? data.isRemote : false,
        });
      } catch (err) { console.error(err); toast.error("Lỗi tải dữ liệu"); router.push("/tasks"); }
      finally { setLoading(false); }
    };
    load();
  }, [taskId, user, authLoading, db, router]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag &&!form.tags.includes(tag)) {
      setForm({...form, tags: [...form.tags, tag] });
      setTagInput("");
      navigator.vibrate?.(5);
    }
  };
  const removeTag = (tag: string) => { setForm({...form, tags: form.tags.filter(t => t!== tag) }); navigator.vibrate?.(5); };

  const handleSave = async () => {
    if (!task ||!user) return;
    if (!form.title.trim()) return toast.error("Tiêu đề không được trống");
    if (form.price < 0) return toast.error("Giá không hợp lệ");
    if (form.totalSlots < 1) return toast.error("Số lượng phải >= 1");
    setSaving(true);
    try {
      const updateData: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags,
        images: form.images,
        location: form.location,
        updatedAt: serverTimestamp(),
        edited: true,
        editedAt: serverTimestamp(),
      };
      if (task.type === "task") {
        updateData.price = form.price;
        updateData.totalSlots = form.totalSlots;
        updateData.requirements = form.requirements.trim();
        updateData.isRemote = form.isRemote;
      }
      await updateDoc(doc(db, "tasks", task.id), updateData);
      toast.success("Đã cập nhật");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1800);
      navigator.vibrate?.([10,20,10]);
      router.push(`/task/${task.id}`);
    } catch (err) { console.error(err); toast.error("Lưu thất bại"); }
    finally { setSaving(false); }
  };

  if (authLoading || loading) return <EditSkeleton />;
  if (!task) return null;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b">
          <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
            <motion.button whileTap={{scale:0.9}} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <FiArrowLeft size={22} />
            </motion.button>
            <h1 className="text-[17px] font-bold">Sửa công việc</h1>
            <motion.button whileTap={{scale:0.95}} onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-white text-[14px] font-semibold disabled:opacity-50" style={{background:'linear-gradient(135deg,#0042B2,#1A5FFF)'}}>
              {saving? <LottiePlayer animationData={loadingPull} loop autoplay className="w-5 h-5"/> : <FiSave size={16}/>}
              {saving? "Đang lưu" : "Lưu"}
            </motion.button>
          </div>
        </div>

        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="px-4 py-6 space-y-5 max-w-2xl mx-auto pb-28">
          <div>
            <label className="block text-[13px] font-semibold mb-2">Tiêu đề <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength={100} className="w-full px-4 h-12 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30"/>
            <p className="text-[12px] text-zinc-500 mt-1.5 text-right">{form.title.length}/100</p>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2">Mô tả chi tiết</label>
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={5} maxLength={1000} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30 resize-none"/>
            <p className="text-[12px] text-zinc-500 mt-1.5 text-right">{form.description.length}/1000</p>
          </div>

          {task.type==="task" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-semibold mb-2">Giá tiền</label><div className="relative"><input type="number" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})} className="w-full pl-4 pr-10 h-12 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30"/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[13px]">đ</span></div></div>
                <div><label className="block text-[13px] font-semibold mb-2">Số lượng</label><input type="number" value={form.totalSlots} onChange={e=>setForm({...form,totalSlots:Number(e.target.value)})} min={1} className="w-full px-4 h-12 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30"/></div>
              </div>
              <div><label className="block text-[13px] font-semibold mb-2">Yêu cầu</label><textarea value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})} rows={3} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30 resize-none"/></div>
            </>
          )}

          <div>
            <label className="block text-[13px] font-semibold mb-2">Danh mục</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-4 h-12 rounded-2xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30">
              <option value="">Chọn danh mục</option>
              {CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-2">Tags</label>
            <div className="flex gap-2 mb-2.5">
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addTag())} placeholder="Nhập tag và Enter" className="flex-1 px-4 h-11 rounded-xl bg-white dark:bg-zinc-950 border outline-none focus:ring-2 focus:ring-[#0042B2]/30"/>
              <motion.button whileTap={{scale:0.9}} onClick={addTag} className="w-11 h-11 rounded-xl text-white flex items-center justify-center" style={{background:'#0042B2'}}><FiPlus size={20}/></motion.button>
            </div>
            <div className="flex flex-wrap gap-2">{form.tags.map(tag=><motion.div key={tag} initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="flex items-center gap-1.5 pl-3 pr-2 h-7 rounded-full text-[13px] font-medium" style={{background:'rgba(0,66,178,0.1)',color:'#0042B2'}}>{tag}<button onClick={()=>removeTag(tag)} className="hover:bg-[#0042B2]/20 rounded-full p-0.5"><FiX size={14}/></button></motion.div>)}</div>
          </div>

          {task.type==="task" && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-950 border">
              <div><p className="text-[14px] font-semibold">Làm việc từ xa</p><p className="text-[12px] text-zinc-500 mt-0.5">Cho phép làm online</p></div>
              <button onClick={()=>setForm({...form,isRemote:!form.isRemote})} className={`relative w-12 h-[28px] rounded-full transition-all ${form.isRemote?"":"bg-zinc-300 dark:bg-zinc-700"}`} style={{background:form.isRemote?'#0042B2':undefined}}><div className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-all ${form.isRemote?"left-[22px]":"left-[3px]"}`}/></button>
            </div>
          )}
        </motion.div>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-64 h-64"/>
        </div>
      )}
    </>
  );
}

function EditSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex-col">
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b px-4 h-14 flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"/>
        <div className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"/>
        <div className="w-16 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"/>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20"/>
      </div>
    </div>
  );
}
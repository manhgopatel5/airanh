"use client";

import { useState, useEffect, useMemo } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { EventItem, CATEGORY_INFO } from "@/data/events";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLoader, FiUpload, FiEye, FiEyeOff, FiLock, FiLogOut } from "react-icons/fi";
import { toast } from "sonner";

export default function AdminEventsPage() {
  // FIX 1: Dùng useMemo để không tạo lại instance
  const db = useMemo(() => getFirebaseDB(), []);
  const storage = useMemo(() => getStorage(), []);
  const auth = useMemo(() => getAuth(), []);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // FIX 2: Điền sẵn email đúng
  const [loginForm, setLoginForm] = useState({ email: "justastormyday@gmail.com", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  const [form, setForm] = useState<Partial<EventItem>>({
    title: "", tag: "NEW", tagColor: "from-blue-500 to-cyan-500", desc: "", image: "",
    joined: 0, distance: "", icon: "🎉", category: "phuot", address: "", openTime: "",
    price: "", tips: [], gallery: [], mapUrl: "", lat: 0, lng: 0, rating: 5, reviews: 0, isActive: true,
  });

  // Check đúng email này
  const ADMIN_EMAIL = "justastormyday@gmail.com";

  // FIX 3: Thêm vào dependency
  useEffect(() => {
    console.log("=== BẮT ĐẦU CHECK AUTH ===");
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("Firebase user:", user?.email, user?.uid);

      if (user && user.email === ADMIN_EMAIL) {
        console.log(">>> ĐÚNG ADMIN EMAIL");
        setIsAdmin(true);
      } else {
        console.log(">>> SAI EMAIL HOẶC CHƯA LOGIN");
        setIsAdmin(false);
      }
      setCheckingAuth(false);
    });
    return () => unsub();
  }, ); // QUAN TRỌNG: có

  const handleAdminLogin = async () => {
    if (!loginForm.email ||!loginForm.password) {
      toast.error("Nhập đủ email và mật khẩu");
      return;
    }
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      toast.success("Đăng nhập thành công");
    } catch (error: any) {
      console.error(error);
      toast.error("Sai email hoặc mật khẩu");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Đã đăng xuất");
  };

  useEffect(() => {
    if (!isAdmin) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    const q = query(collection(db, "events"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: EventItem[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id,...doc.data() } as EventItem));
      setEvents(data);
      setDataLoading(false);
    });
    return () => unsub();
  }, [db, isAdmin]);

  const resetForm = () => {
    setForm({
      title: "", tag: "NEW", tagColor: "from-blue-500 to-cyan-500", desc: "", image: "",
      joined: 0, distance: "", icon: "🎉", category: "phuot", address: "", openTime: "",
      price: "", tips: [], gallery: [], mapUrl: "", lat: 0, lng: 0, rating: 5, reviews: 0, isActive: true,
    });
    setEditingId(null);
  };

  const openEdit = (event: EventItem) => {
    setForm(event);
    setEditingId(event.id);
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "image" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileRef = ref(storage, `events/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      if (field === "image") setForm((prev) => ({...prev, image: url }));
      else setForm((prev) => ({...prev, gallery: [...(prev.gallery || []), url] }));
      toast.success("Upload thành công");
    } catch (error) {
      toast.error("Lỗi upload ảnh");
    }
  };

  const handleSave = async () => {
    if (!form.title ||!form.desc ||!form.image) {
      toast.error("Điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      const id = editingId || doc(collection(db, "events")).id;
      const data = {
   ...form, id,
        updatedAt: serverTimestamp(),
        createdAt: editingId? form.createdAt : serverTimestamp(),
      };
      await setDoc(doc(db, "events", id), data);
      toast.success(editingId? "Đã cập nhật" : "Đã thêm event");
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error("Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa event này?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      toast.success("Đã xóa");
    } catch (error) {
      toast.error("Lỗi xóa");
    }
  };

  const toggleActive = async (event: EventItem) => {
    try {
      await setDoc(doc(db, "events", event.id), {
   ...event, isActive:!event.isActive, updatedAt: serverTimestamp(),
      });
      toast.success(event.isActive? "Đã ẩn" : "Đã hiện");
    } catch (error) {
      toast.error("Lỗi");
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-[#0a84ff] rounded-2xl flex items-center justify-center">
              <FiLock size={32} className="text-white" />
            </div>
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>

          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500 rounded-lg text-xs">
            <div>Email hiện tại: {auth.currentUser?.email || "chưa login"}</div>
            <div>Email admin: justastormyday@gmail.com</div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value })}
                className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Mật khẩu</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleAdminLogin}
              disabled={loginLoading}
              className="w-full h-11 bg-[#0a84ff] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loginLoading? <FiLoader className="animate-spin" size={18} /> : <FiLock size={18} />}
              {loginLoading? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quản lý Events</h1>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="px-4 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-semibold flex items-center gap-2">
              <FiLogOut size={18} /> Đăng xuất
            </button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="px-4 h-10 bg-[#0a84ff] text-white rounded-xl font-semibold flex items-center gap-2">
              <FiPlus size={18} /> Thêm Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div key={event.id} className={`bg-white dark:bg-zinc-900 rounded-xl border-2 ${event.isActive? "border-green-500/30" : "border-zinc-200 dark:border-zinc-800"} overflow-hidden`}>
              <div className="relative h-40">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => toggleActive(event)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.isActive? "bg-green-500" : "bg-zinc-500"} text-white`}>
                    {event.isActive? <FiEye size={16} /> : <FiEyeOff size={16} />}
                  </button>
                  <button onClick={() => openEdit(event)} className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                    <FiEdit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center">
                    <FiTrash2 size={16} />
                  </button>
                </div>
                <div className={`absolute bottom-2 left-2 px-2 py-1 bg-gradient-to-r ${event.tagColor} rounded-md`}>
                  <span className="text-xs font-bold text-white">{event.tag}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{event.icon}</span>
                  <h3 className="font-bold">{event.title}</h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{event.desc}</p>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{event.category}</span>
                  <span>⭐ {event.rating} ({event.reviews})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-h- overflow-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId? "Sửa Event" : "Thêm Event"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center"><FiX size={22} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold mb-1 block">Tên *</label><input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Icon</label><input type="text" value={form.icon} onChange={(e) => setForm({...form, icon: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-semibold mb-1 block">Mô tả *</label><textarea value={form.desc} onChange={(e) => setForm({...form, desc: e.target.value })} className="w-full h-20 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold mb-1 block">Tag</label><input type="text" value={form.tag} onChange={(e) => setForm({...form, tag: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Category *</label><select value={form.category} onChange={(e) => setForm({...form, category: e.target.value as any })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm">{Object.entries(CATEGORY_INFO).map(([key, cat]) => (<option key={key} value={key}>{cat.icon} {cat.label}</option>))}</select></div>
              </div>
              <div><label className="text-sm font-semibold mb-1 block">Ảnh chính *</label><div className="flex gap-2"><input type="text" value={form.image} onChange={(e) => setForm({...form, image: e.target.value })} placeholder="URL ảnh" className="flex-1 h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /><label className="px-4 h-10 bg-blue-500 text-white rounded-lg flex items-center gap-2 cursor-pointer"><FiUpload size={16} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "image")} /></label></div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold mb-1 block">Địa chỉ *</label><input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Giờ mở cửa *</label><input type="text" value={form.openTime} onChange={(e) => setForm({...form, openTime: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold mb-1 block">Giá *</label><input type="text" value={form.price} onChange={(e) => setForm({...form, price: e.target.value })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Distance</label><input type="text" value={form.distance} onChange={(e) => setForm({...form, distance: e.target.value })} placeholder="Cách bạn 5km" className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-sm font-semibold mb-1 block">Tips (mỗi dòng 1 tip)</label><textarea value={form.tips?.join("\n")} onChange={(e) => setForm({...form, tips: e.target.value.split("\n").filter((t) => t) })} className="w-full h-20 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              <div><label className="text-sm font-semibold mb-1 block">Gallery URLs (mỗi dòng 1 URL)</label><textarea value={form.gallery?.join("\n")} onChange={(e) => setForm({...form, gallery: e.target.value.split("\n").filter((t) => t) })} className="w-full h-20 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm font-semibold mb-1 block">Rating</label><input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({...form, rating: parseFloat(e.target.value) })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Reviews</label><input type="number" value={form.reviews} onChange={(e) => setForm({...form, reviews: parseInt(e.target.value) })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-semibold mb-1 block">Joined</label><input type="number" value={form.joined} onChange={(e) => setForm({...form, joined: parseInt(e.target.value) })} className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm" /></div>
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked })} className="w-5 h-5" /><label className="text-sm font-semibold">Hiển thị công khai</label></div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-semibold">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-11 bg-[#0a84ff] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                {saving? <FiLoader className="animate-spin" size={18} /> : <FiSave size={18} />}
                {saving? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { EventItem, CATEGORY_INFO } from "@/data/events";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiLoader, FiUpload, FiEye, FiEyeOff, FiStar, FiChevronDown } from "react-icons/fi";
import { toast } from "sonner";

const ICON_LIST = [
  "🎉", "🎊", "🎈", "🎁", "🎂", "🎯", "🎨", "🎭", "🎪", "🎸",
  "🎵", "🎶", "🎤", "🎧", "🎬", "🎮", "🏆", "🥇", "🏅", "🎖️",
  "⛰️", "🏔️", "🏕️", "🏖️", "🏝️", "🏜️", "🌋", "🗻", "🏞️", "🌅",
  "🍜", "🍕", "🍔", "🍣", "🍻", "☕", "🍷", "🍸", "🥂", "🍹",
  "💪", "🏃", "🚴", "🏊", "⚽", "🏀", "🎾", "🏐", "🏸", "🥊",
  "✨", "💫", "⭐", "🌟", "💥", "🔥", "💎", "👑", "🎓", "📚"
];

const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const TAG_LIST = [
  { value: "NEW", label: "NEW", color: "from-blue-500 to-cyan-500" },
  { value: "HOT", label: "HOT", color: "from-red-500 to-orange-500" },
  { value: "TRENDING", label: "TRENDING", color: "from-purple-500 to-pink-500" },
  { value: "SALE", label: "SALE", color: "from-green-500 to-emerald-500" },
  { value: "LIMITED", label: "LIMITED", color: "from-amber-500 to-yellow-500" },
  { value: "POPULAR", label: "POPULAR", color: "from-rose-500 to-red-500" },
  { value: "FREE", label: "FREE", color: "from-teal-500 to-cyan-500" },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [ratingInput, setRatingInput] = useState("5");
  const [form, setForm] = useState<Partial<EventItem>>({
    title: "",
    tag: "NEW",
    tagColor: "from-blue-500 to-cyan-500",
    desc: "",
    image: "",
    joined: 0,
    distance: "",
    icon: "🎉",
    category: "phuot",
    province: "Hà Nội",
    address: "",
    openTime: "",
    price: "",
    tips: [],
    gallery: [],
    mapUrl: "",
    lat: 0,
    lng: 0,
    rating: 5,
    reviews: 0,
    isActive: true,
  });

  const fetchEvents = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/events');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setEvents(data.events);
    } catch (error) {
      toast.error("Lỗi tải events");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      tag: "NEW",
      tagColor: "from-blue-500 to-cyan-500",
      desc: "",
      image: "",
      joined: 0,
      distance: "",
      icon: "🎉",
      category: "phuot",
      province: "Hà Nội",
      address: "",
      openTime: "",
      price: "",
      tips: [],
      gallery: [],
      mapUrl: "",
      lat: 0,
      lng: 0,
      rating: 5,
      reviews: 0,
      isActive: true,
    });
    setRatingInput("5");
    setEditingId(null);
  };

  const openEdit = (event: EventItem) => {
    setForm(event);
    setEditingId(event.id);
    setRatingInput(String(event.rating || 5).replace('.', ','));
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setForm((prev) => ({...prev, image: data.url }));
      toast.success("Upload thành công");
    } catch (error) {
      toast.error("Lỗi upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 3) {
      toast.error("Chỉ được upload tối đa 3 ảnh");
      return;
    }
    setUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      setForm((prev) => ({...prev, gallery: [...(prev.gallery || []),...uploadedUrls].slice(0, 3) }));
      toast.success(`Đã upload ${uploadedUrls.length} ảnh`);
    } catch (error) {
      toast.error("Lỗi upload ảnh");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSave = async () => {
    if (!form.title ||!form.desc ||!form.image) {
      toast.error("Điền đầy đủ thông tin");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...form, id: editingId })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(editingId? "Đã cập nhật" : "Đã thêm event");
      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error("Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa event này?")) return;
    try {
      const res = await fetch(`/api/admin/events?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success("Đã xóa");
      fetchEvents();
    } catch (error) {
      toast.error("Lỗi xóa");
    }
  };

  const toggleActive = async (event: EventItem) => {
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...event, isActive:!event.isActive })
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(event.isActive? "Đã ẩn" : "Đã hiện");
      fetchEvents();
    } catch (error) {
      toast.error("Lỗi");
    }
  };

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
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-4 h-10 rounded-xl font-semibold flex items-center gap-2 ${
                showInactive
                 ? 'bg-amber-500 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white'
              }`}
            >
              {showInactive? <FiEye size={18} /> : <FiEyeOff size={18} />}
              {showInactive? 'Ẩn đã ẩn' : 'Hiện đã ẩn'}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 h-10 bg-[#0a84ff] text-white rounded-xl font-semibold flex items-center gap-2"
            >
              <FiPlus size={18} /> Thêm Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events
           .filter(event => showInactive || event.isActive === true)
           .map((event) => (
            <div
              key={event.id}
              className={`bg-white dark:bg-zinc-900 rounded-xl border-2 ${
                event.isActive? "border-green-500/30" : "border-zinc-200 dark:border-zinc-800"
              } overflow-hidden`}
            >
              <div className="relative h-40">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                {!event.isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">ĐÃ ẨN</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => toggleActive(event)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      event.isActive? "bg-green-500" : "bg-zinc-500"
                    } text-white`}
                    title={event.isActive? "Ẩn event" : "Hiện event"}
                  >
                    {event.isActive? <FiEye size={16} /> : <FiEyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => openEdit(event)}
                    className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
                <div className={`absolute bottom-2 left-2 px-2 py-1 bg-gradient-to-r ${event.tagColor} rounded-md`}>
                  <span className="text-xs font-bold text-white">{event.tag}</span>
                </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{event.icon}</span>
                  <h3 className="font-bold">{event.title}</h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{event.desc}</p>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{event.province}</span>
                  <span className="flex items-center gap-1">
                    <FiStar className="text-amber-500" size={12} fill="currentColor" />
                    {event.rating} ({event.reviews})
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mb-8">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingId? "Sửa Event" : "Thêm Event"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center">
                <FiX size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Tên *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Icon</label>
                  <div className="relative">
                    <select
                      value={form.icon}
                      onChange={(e) => setForm({...form, icon: e.target.value })}
                      className="w-full h-10 px-3 pr-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xl appearance-none"
                    >
                      {ICON_LIST.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1 block">Tỉnh/Thành phố *</label>
                <select
                  value={form.province}
                  onChange={(e) => setForm({...form, province: e.target.value })}
                  className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1 block">Mô tả *</label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm({...form, desc: e.target.value })}
                  className="w-full h-20 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Tag</label>
                  <div className="relative">
                    <select
                      value={form.tag}
                      onChange={(e) => {
                        const selectedTag = TAG_LIST.find(t => t.value === e.target.value);
                        setForm({
                         ...form,
                          tag: e.target.value,
                          tagColor: selectedTag?.color || "from-blue-500 to-cyan-500"
                        });
                      }}
                      className="w-full h-10 px-3 pr-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm appearance-none"
                    >
                      {TAG_LIST.map((tag) => (
                        <option key={tag.value} value={tag.value}>
                          {tag.label}
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={16} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value as any })}
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  >
                    {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1 block">Ảnh chính *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({...form, image: e.target.value })}
                    placeholder="URL ảnh"
                    className="flex-1 h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                  <label className="px-4 h-10 bg-blue-500 text-white rounded-lg flex items-center gap-2 cursor-pointer">
                    {uploading? <FiLoader className="animate-spin" size={16} /> : <FiUpload size={16} />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-1 block">Gallery (tối đa 3 ảnh)</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                        {form.gallery?.[idx]? (
                          <>
                            <img src={form.gallery[idx]} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                const newGallery = [...(form.gallery || [])];
                                newGallery.splice(idx, 1);
                                setForm({...form, gallery: newGallery });
                              }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                              <FiX size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400">
                            <FiUpload size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <label className="w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold">
                    {uploadingGallery? <FiLoader className="animate-spin" size={16} /> : <FiUpload size={16} />}
                    {uploadingGallery? "Đang upload..." : "Upload ảnh gallery"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGalleryUpload}
                      disabled={uploadingGallery || (form.gallery?.length || 0) >= 3}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Địa chỉ *</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({...form, address: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Giờ mở cửa *</label>
                  <input
                    type="text"
                    value={form.openTime}
                    onChange={(e) => setForm({...form, openTime: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Google Map URL</label>
                <input
                  type="text"
                  value={form.mapUrl || ''}
                  onChange={(e) => setForm({...form, mapUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                  className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Giá *</label>
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => setForm({...form, price: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Distance</label>
                  <input
                    type="text"
                    value={form.distance}
                    onChange={(e) => setForm({...form, distance: e.target.value })}
                    placeholder="Cách bạn 5km"
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Rating *</label>
                  <input
                    type="text"
                    value={ratingInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-5]?[,.]?[0-9]?$/.test(val) || val === '') {
                        setRatingInput(val);
                        const num = parseFloat(val.replace(',', '.'));
                        if (!isNaN(num) && num >= 0 && num <= 5) {
                          setForm({...form, rating: num });
                        } else if (val === '') {
                          setForm({...form, rating: 0 });
                        }
                      }
                    }}
                    placeholder="4,9"
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Reviews *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reviews || ''}
                    onChange={(e) => setForm({...form, reviews: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({...form, isActive: e.target.checked })}
                  className="w-5 h-5"
                />
                <label className="text-sm font-semibold">Hiển thị công khai</label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-[#0a84ff] text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              >
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
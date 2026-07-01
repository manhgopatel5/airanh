"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { FiLoader, FiArrowLeft, FiX } from "react-icons/fi";
import { Mail, Phone, AtSign, Calendar, User2, MapPin, ChevronRight } from "lucide-react";
import { toast, Toaster } from "sonner";
import { onProfileUpdate } from "@/lib/xp";

const BAD_WORDS = ["admin", "mod", "support", "đm", "vcl", "dm"];

type EditField = "name" | "dob" | "gender" | "address" | null;

type Province = { id: number; name: string; code: string };
type District = { id: number; name: string; code: string };
type Ward = { id: string; name: string };

export default function ProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();

  const [currentData, setCurrentData] = useState({
    name: "",
    email: "",
    phone: "",
    userId: "",
    dob: "",
    gender: "",
    address: "",
    provinceId: 0,
    districtId: 0,
    wardCode: "",
    detailAddress: "",
  });

  const [editingField, setEditingField] = useState<EditField>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Address
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState(0);
  const [selectedWard, setSelectedWard] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);

  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const newData = {
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          userId: data.userId || "",
          dob: data.dob || "",
          gender: data.gender || "",
          address: data.address || "",
          provinceId: data.provinceId || 0,
          districtId: data.districtId || 0,
          wardCode: data.wardCode || "",
          detailAddress: data.detailAddress || "",
        };
        setCurrentData(newData);
        setName(newData.name);
        setDob(newData.dob);
        setGender(newData.gender);
        setSelectedProvince(newData.provinceId);
        setSelectedDistrict(newData.districtId);
        setSelectedWard(newData.wardCode);
        setDetailAddress(newData.detailAddress);
      }
    });
    return () => unsub();
  }, [user?.uid, db, user?.email]);

  // Load provinces khi mở sheet
  useEffect(() => {
    if (showAddressSheet && provinces.length === 0) {
      fetch("/api/location/province")
       .then((res) => res.json())
       .then(setProvinces)
       .catch(() => toast.error("Không tải được tỉnh/thành"));
    }
  }, [showAddressSheet, provinces.length]);

  // Load districts khi chọn province
  useEffect(() => {
    if (selectedProvince) {
      setLoadingAddress(true);
      fetch("/api/location/district", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provinceId: selectedProvince }),
      })
       .then((res) => res.json())
       .then((data) => {
          setDistricts(data);
          setSelectedDistrict(0);
          setWards([]);
          setSelectedWard("");
        })
       .catch(() => toast.error("Không tải được quận/huyện"))
       .finally(() => setLoadingAddress(false));
    }
  }, [selectedProvince]);

  // Load wards khi chọn district
  useEffect(() => {
    if (selectedDistrict) {
      setLoadingAddress(true);
      fetch("/api/location/ward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ districtId: selectedDistrict }),
      })
       .then((res) => res.json())
       .then((data) => {
          setWards(data);
          setSelectedWard("");
        })
       .catch(() => toast.error("Không tải được phường/xã"))
       .finally(() => setLoadingAddress(false));
    }
  }, [selectedDistrict]);

  const validateName = useCallback((val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return "Tên không được để trống";
    if (trimmed.length < 2) return "Tên phải có ít nhất 2 ký tự";
    if (trimmed.length > 30) return "Tên không quá 30 ký tự";
    if (BAD_WORDS.some((w) => trimmed.toLowerCase().includes(w))) {
      return "Tên chứa từ không phù hợp";
    }
    return "";
  }, []);

  const getFullAddress = () => {
    const p = provinces.find((x) => x.id === selectedProvince)?.name || "";
    const d = districts.find((x) => x.id === selectedDistrict)?.name || "";
    const w = wards.find((x) => x.id === selectedWard)?.name || "";
    return [detailAddress, w, d, p].filter(Boolean).join(", ");
  };

  const hasChanges = () => {
    return (
      name.trim()!== currentData.name ||
      dob!== currentData.dob ||
      gender!== currentData.gender ||
      getFullAddress()!== currentData.address ||
      selectedProvince!== currentData.provinceId ||
      selectedDistrict!== currentData.districtId ||
      selectedWard!== currentData.wardCode ||
      detailAddress!== currentData.detailAddress
    );
  };

  const save = useCallback(async () => {
    if (editingField === "name") {
      const err = validateName(name.trim());
      if (err) {
        toast.error(err);
        setTouched(true);
        return;
      }
    }

    if (!hasChanges()) {
      setEditingField(null);
      return;
    }

    if (!user ||!auth.currentUser) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (name.trim()!== currentData.name) {
        const trimmedName = name.trim();
        updateData.name = trimmedName;
        updateData.displayName = trimmedName;
        updateData.nameLower = trimmedName.toLowerCase();
        updateData.searchKeywords = trimmedName.toLowerCase().split(/\s+/).filter(Boolean);
        await updateProfile(auth.currentUser, { displayName: trimmedName });
      }
      if (dob!== currentData.dob) updateData.dob = dob;
      if (gender!== currentData.gender) updateData.gender = gender;

      const fullAddress = getFullAddress();
      if (fullAddress!== currentData.address) {
        updateData.address = fullAddress;
        updateData.provinceId = selectedProvince;
        updateData.districtId = selectedDistrict;
        updateData.wardCode = selectedWard;
        updateData.detailAddress = detailAddress;
      }

      await setDoc(doc(db, "users", user.uid), updateData, { merge: true });
      await onProfileUpdate(user.uid);

      if ("vibrate" in navigator) navigator.vibrate(8);
      toast.success("Đã cập nhật thông tin");
      setEditingField(null);
      setShowAddressSheet(false);
      setTouched(false);
    } catch (err) {
      toast.error("Có lỗi xảy ra, thử lại sau");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [name, dob, gender, selectedProvince, selectedDistrict, selectedWard, detailAddress, currentData, user, validateName, auth, db, editingField, provinces, districts, wards]);

  const nameError = editingField === "name" && touched? validateName(name) : "";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans flex flex-col">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Thông tin cá nhân</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 mt-6 pb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
          {/* TÊN HIỂN THỊ */}
          <button
            onClick={() => setEditingField("name")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <User2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">TÊN HIỂN THỊ</div>
              {editingField === "name"? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Nhập tên của bạn"
                  maxLength={30}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                />
              ) : (
                <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                  {currentData.name || "Chưa cập nhật"}
                </div>
              )}
            </div>
            {editingField!== "name" && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />}
          </button>
          {editingField === "name" && nameError && (
            <div className="px-4 pb-2 -mt-1 flex items-center justify-between">
              <p className="text-xs text-red-500">{nameError}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600">{name.length}/30</p>
            </div>
          )}

          {/* EMAIL - Link */}
          <button
            onClick={() => router.push("/settings/change-email")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <Mail className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">Email</div>
              <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                {currentData.email || "Chưa có"}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />
          </button>

          {/* SĐT - Link */}
          <button
            onClick={() => router.push("/settings/change-phone")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">Số điện thoại</div>
              <div className="text-base font-medium text-gray-900 dark:text-white">
                {currentData.phone || "Chưa xác thực"}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />
          </button>

          {/* ID */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <AtSign className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">ID người dùng</div>
              <div className="text-base font-medium text-gray-900 dark:text-white">
                @{currentData.userId || "---"}
              </div>
            </div>
          </div>

          {/* NGÀY SINH */}
          <button
            onClick={() => setEditingField("dob")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <Calendar className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">NGÀY SINH</div>
              {editingField === "dob"? (
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white focus:outline-none focus:ring-0"
                />
              ) : (
                <div className="text-base font-medium text-gray-900 dark:text-white">
                  {currentData.dob? new Date(currentData.dob).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                </div>
              )}
            </div>
            {editingField!== "dob" && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />}
          </button>

          {/* GIỚI TÍNH */}
          <button
            onClick={() => setEditingField("gender")}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <User2 className="w-5 h-5 text-pink-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">GIỚI TÍNH</div>
              {editingField === "gender"? (
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white focus:outline-none focus:ring-0"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              ) : (
                <div className="text-base font-medium text-gray-900 dark:text-white">
                  {currentData.gender === "male"? "Nam" : currentData.gender === "female"? "Nữ" : currentData.gender === "other"? "Khác" : "Chưa cập nhật"}
                </div>
              )}
            </div>
            {editingField!== "gender" && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />}
          </button>

          {/* ĐỊA CHỈ */}
          <button
            onClick={() => setShowAddressSheet(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
          >
            <MapPin className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500 uppercase">ĐỊA CHỈ</div>
              <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                {currentData.address || "Chưa cập nhật"}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Nút Lưu thay đổi */}
      {hasChanges() && (
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black pt-8">
          <button
            onClick={save}
            disabled={loading || (editingField === "name" &&!!validateName(name))}
            className={`w-full px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
              loading || (editingField === "name" &&!!validateName(name))
               ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
            }`}
          >
            {loading? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        </div>
      )}

      {/* Bottom Sheet Chọn Địa Chỉ */}
      {showAddressSheet && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAddressSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Chọn địa chỉ</h2>
              <button onClick={() => setShowAddressSheet(false)} className="p-2 -mr-2 active:opacity-50">
                <FiX className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-2 uppercase">
                  Tỉnh/Thành phố
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={0}>Chọn tỉnh/thành</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProvince > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-2 uppercase">
                    Quận/Huyện
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(Number(e.target.value))}
                    disabled={loadingAddress}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    <option value={0}>Chọn quận/huyện</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDistrict > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-2 uppercase">
                    Phường/Xã
                  </label>
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    disabled={loadingAddress}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    <option value="">Chọn phường/xã</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedWard && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-2 uppercase">
                    Số nhà, tên đường
                  </label>
                  <input
                    value={detailAddress}
                    onChange={(e) => setDetailAddress(e.target.value)}
                    placeholder="VD: 123 Nguyễn Văn Linh"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  if (!selectedProvince ||!selectedDistrict ||!selectedWard) {
                    toast.error("Vui lòng chọn đầy đủ địa chỉ");
                    return;
                  }
                  setShowAddressSheet(false);
                }}
                disabled={!selectedProvince ||!selectedDistrict ||!selectedWard}
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-blue-500 text-white disabled:bg-gray-100 dark:disabled:bg-zinc-800 disabled:text-gray-400 active:scale-[0.98] transition"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
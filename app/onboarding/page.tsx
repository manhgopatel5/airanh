"use client";

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { updateProfile, getIdToken } from "firebase/auth";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FiAlertCircle, FiArrowRight, FiUser,
  FiMapPin, FiCalendar, FiPhone, FiUsers
} from "react-icons/fi";
import HuhaLogo from "@/components/brand/HuhaLogo";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { getSafeRedirect } from "@/components/auth/authRoutes";
import { establishSession } from "@/lib/authSession";

type Province = { id: number; name: string; code: string };
type District = { id: number; name: string; code: string };
type Ward = { id: string; name: string };

const generateUsername = (name: string) => {
  return name
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/\s+/g, "")
 .replace(/[^a-z0-9]/g, "")
 .slice(0, 20) || "user";
};

function OnboardingContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const redirectTo = getSafeRedirect(searchParams.get("redirect")) || "/";

  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    birthDate: "",
    gender: "",
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingProvince, setLoadingProvince] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetch("/api/location/province")
   .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
   .then((data) => {
        if (Array.isArray(data)) {
          setProvinces(data);
        } else {
          throw new Error("Invalid data format");
        }
      })
   .catch((err) => {
        console.error("Province load error:", err);
        toast.error("Không tải được danh sách tỉnh");
      })
   .finally(() => setLoadingProvince(false));
  }, []);

  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setWards([]);
      setSelectedDistrict("");
      setSelectedWard("");
      return;
    }
    fetch("/api/location/district", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provinceId: Number(selectedProvince) }),
    })
   .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
   .then(setDistricts)
   .catch(() => toast.error("Không tải được quận/huyện"));
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      setSelectedWard("");
      return;
    }
    fetch("/api/location/ward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ districtId: Number(selectedDistrict) }),
    })
   .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
   .then(setWards)
   .catch(() => toast.error("Không tải được phường/xã"));
  }, [selectedDistrict]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user &&!form.displayName) {
      const fallback = user.email?.split("@")[0] || `User${user.uid.slice(0, 4)}`;
      const name = user.displayName || fallback;
      setForm(prev => ({...prev, displayName: name === "Ẩn danh"? fallback : name }));
    }
    const timer = window.setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [user, form.displayName]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (form.displayName.trim().length < 2) newErrors.displayName = "Tên tối thiểu 2 ký tự";
    if (form.displayName.trim().length > 50) newErrors.displayName = "Tên tối đa 50 ký tự";
    if (!/^[\p{L}\s0-9]+$/u.test(form.displayName.trim())) newErrors.displayName = "Tên chỉ chứa chữ, số và khoảng trắng";

    if (!/^0\d{9,10}$/.test(form.phone)) newErrors.phone = "SĐT phải có 10-11 số, bắt đầu bằng 0";

    if (!form.birthDate) newErrors.birthDate = "Chọn ngày sinh";
    else {
      const age = new Date().getFullYear() - new Date(form.birthDate).getFullYear();
      if (age < 13) newErrors.birthDate = "Bạn phải từ 13 tuổi trở lên";
      if (age > 100) newErrors.birthDate = "Ngày sinh không hợp lệ";
    }

    if (!form.gender) newErrors.gender = "Chọn giới tính";
    if (!selectedProvince) newErrors.province = "Chọn tỉnh/thành";
    if (!selectedDistrict) newErrors.district = "Chọn quận/huyện";
    if (!selectedWard) newErrors.ward = "Chọn phường/xã";
    if (streetAddress.trim().length < 5) newErrors.streetAddress = "Địa chỉ tối thiểu 5 ký tự";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: "" }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Phiên đăng nhập hết hạn");
      return;
    }

    setSaving(true);
    try {
      const db = getFirebaseDB();
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      const oldData = userDoc.data();

      const trimmed = form.displayName.trim();
      const lowerName = trimmed.toLowerCase();
      const username = oldData?.username || generateUsername(trimmed);
      const userId = oldData?.userId || `AIR${currentUser.uid.slice(0, 6).toUpperCase()}`;
      const avatar =
        currentUser.photoURL ||
        oldData?.photoURL ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=0A84FF&color=fff&bold=true`;

      const provinceName = provinces.find(p => p.id === Number(selectedProvince))?.name || "";
      const districtName = districts.find(d => d.id === Number(selectedDistrict))?.name || "";
      const wardName = wards.find(w => w.id === selectedWard)?.name || "";
      const fullAddress = `${streetAddress.trim()}, ${wardName}, ${districtName}, ${provinceName}`;

      await Promise.all([
        updateProfile(currentUser, { displayName: trimmed, photoURL: avatar }),
        updateDoc(userRef, {
          displayName: trimmed,
          nameLower: lowerName,
          username,
          userId,
          photoURL: avatar,
          phone: form.phone,
          birthDate: form.birthDate,
          gender: form.gender,
          address: fullAddress,
          addressDetails: {
            provinceId: Number(selectedProvince),
            provinceName,
            districtId: Number(selectedDistrict),
            districtName,
            wardId: selectedWard,
            wardName,
            street: streetAddress.trim(),
          },
          searchKeywords: [
            lowerName,
            lowerName.replace(/\s+/g, ""),
         ...lowerName.split(" ").filter((word) => word.length >= 2),
            userId.toLowerCase(),
            username.toLowerCase(),
            form.phone,
          ],
          onboardingCompleted: true,
          onboarded: true,
          emailVerified: true,
          updatedAt: serverTimestamp(),
        }),
      ]);

      await currentUser.reload();

      const idToken = await getIdToken(currentUser, true);
      await establishSession(idToken);

      toast.success(`Chào mừng, ${trimmed}!`);

      // FIX: Chỉ redirect khi bấm nút, dùng replace để không back lại
      setTimeout(() => {
        window.location.replace(redirectTo);
      }, 100);

    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error("Có lỗi xảy ra, thử lại sau");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-300 motion-safe:animate-pulse dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const inputClass = (field: string) => `h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
    errors[field]
   ? "border-red-400 focus:border-red-500"
      : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
  }`;

  const selectClass = (field: string) => `h-14 w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
    errors[field]
   ? "border-red-400 focus:border-red-500"
      : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
  }`;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10"><HuhaLogo /></div>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Hoàn tất hồ sơ</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Vui lòng điền đầy đủ thông tin để bắt đầu
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tên hiển thị *</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                ref={nameRef}
                type="text"
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                maxLength={50}
                disabled={saving}
                className={inputClass("displayName")}
              />
            </div>
            {errors.displayName && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.displayName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Số điện thoại *</label>
            <div className="relative">
              <FiPhone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="VD: 0912345678"
                maxLength={11}
                disabled={saving}
                className={inputClass("phone")}
              />
            </div>
            {errors.phone && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Ngày sinh *</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                disabled={saving}
                className={inputClass("birthDate")}
              />
            </div>
            {errors.birthDate && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.birthDate}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Giới tính *</label>
            <div className="relative">
              <FiUsers className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <select
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                disabled={saving}
                className={selectClass("gender")}
              >
                <option value="">Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            {errors.gender && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.gender}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tỉnh/Thành phố *</label>
            <div className="relative">
              <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setErrors(prev => ({...prev, province: "" }));
                }}
                disabled={saving || loadingProvince}
                className={selectClass("province")}
              >
                <option value="">{loadingProvince? "Đang tải..." : "Chọn tỉnh/thành"}</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {errors.province && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.province}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Quận/Huyện *</label>
            <div className="relative">
              <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setErrors(prev => ({...prev, district: "" }));
                }}
                disabled={saving ||!selectedProvince}
                className={selectClass("district")}
              >
                <option value="">Chọn quận/huyện</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {errors.district && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.district}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Phường/Xã *</label>
            <div className="relative">
              <FiMapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <select
                value={selectedWard}
                onChange={(e) => {
                  setSelectedWard(e.target.value);
                  setErrors(prev => ({...prev, ward: "" }));
                }}
                disabled={saving ||!selectedDistrict}
                className={selectClass("ward")}
              >
                <option value="">Chọn phường/xã</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            {errors.ward && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.ward}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Số nhà, tên đường *</label>
            <div className="relative">
              <FiMapPin className="absolute left-4 top-4 h-5 w-5 text-zinc-400" />
              <textarea
                value={streetAddress}
                onChange={(e) => {
                  setStreetAddress(e.target.value);
                  setErrors(prev => ({...prev, streetAddress: "" }));
                }}
                placeholder="VD: 123 Đường ABC"
                rows={2}
                disabled={saving}
                className={`w-full rounded-2xl border bg-zinc-50 pl-12 pr-4 py-4 text-base font-semibold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
                  errors.streetAddress
                 ? "border-red-400 focus:border-red-500"
                    : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
                }`}
              />
            </div>
            {errors.streetAddress && (
              <p className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                <FiAlertCircle className="h-3 w-3" />{errors.streetAddress}
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={saving}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition disabled:opacity-60"
          >
            {saving? (
              "Đang lưu..."
            ) : (
              <>
                <span>Hoàn tất hồ sơ</span>
                <FiArrowRight className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          * Bắt buộc. Bạn có thể chỉnh sửa sau trong Cài đặt
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-zinc-50 px-5 py-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
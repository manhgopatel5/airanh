"use client";

import { useState, useEffect, useMemo, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiChevronLeft, FiSearch, FiMapPin, FiCheck, FiX, FiNavigation } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import { loadingPull, celebrate } from "@/components/illustrations";
import { toast, Toaster } from "sonner";

type Province = { ProvinceID: number; ProvinceName: string };
type District = { DistrictID: number; DistrictName: string };
type Ward = { WardCode: string; WardName: string };
type Step = "province" | "district" | "ward" | "street";

export default function SelectLocationPage() {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [street, setStreet] = useState("");
  const [step, setStep] = useState<Step>("province");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchWithAbort = useCallback(async (url: string, options?: RequestInit, retries = 2): Promise<any> => {
    const controller = new AbortController();
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      if (e.name === "AbortError") return null;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500));
        return fetchWithAbort(url, options, retries - 1);
      }
      throw e;
    }
  }, []);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("provinces_cache");
      if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < 86400000 && Array.isArray(data)) {
          setProvinces(data);
          return;
        }
      }
    } catch {}
    setLoading(true);
    fetchWithAbort("/api/location/province")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProvinces(list);
        localStorage.setItem("provinces_cache", JSON.stringify({ data: list, time: Date.now() }));
      })
      .catch(() => setError("Không tải được danh sách tỉnh"))
      .finally(() => setLoading(false));
  }, [fetchWithAbort]);

  useEffect(() => {
    if (!selectedProvince) return;
    setLoading(true);
    setDistricts([]); setWards([]); setError("");
    fetchWithAbort("/api/location/district", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provinceId: selectedProvince.ProvinceID }),
    })
      .then((data) => setDistricts(Array.isArray(data) ? data : []))
      .catch(() => setError("Không tải được quận/huyện"))
      .finally(() => setLoading(false));
  }, [selectedProvince, fetchWithAbort]);

  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    setWards([]); setError("");
    fetchWithAbort("/api/location/ward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ districtId: selectedDistrict.DistrictID }),
    })
      .then((data) => setWards(Array.isArray(data) ? data : []))
      .catch(() => setError("Không tải được phường/xã"))
      .finally(() => setLoading(false));
  }, [selectedDistrict, fetchWithAbort]);

  const getCurrentList = useCallback(() => {
    if (step === "province") return provinces;
    if (step === "district") return districts;
    if (step === "ward") return wards;
    return [];
  }, [step, provinces, districts, wards]);

  const filteredList = useMemo(() => {
    const list = getCurrentList();
    if (!deferredSearch.trim()) return list;
    const key = step === "province" ? "ProvinceName" : step === "district" ? "DistrictName" : "WardName";
    return list.filter((item: any) => item[key].toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [getCurrentList, deferredSearch, step]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return toast.error("Trình duyệt không hỗ trợ GPS");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          setSelectedProvince({ ProvinceID: data.provinceId, ProvinceName: data.province });
          setSelectedDistrict({ DistrictID: data.districtId, DistrictName: data.district });
          setSelectedWard({ WardCode: data.wardCode, WardName: data.ward });
          setStreet(data.street || "");
          setStep("street");
          toast.success("Đã lấy vị trí");
        } catch {
          setError("Không xác định được vị trí");
        } finally { setLoading(false); }
      },
      () => { setError("Bạn đã từ chối quyền truy cập vị trí"); setLoading(false); }
    );
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedProvince || !selectedDistrict) return;
    const location = {
      city: selectedProvince.ProvinceName,
      district: selectedDistrict.DistrictName,
      ward: selectedWard?.WardName || "",
      street: street.trim(),
      provinceId: selectedProvince.ProvinceID,
      districtId: selectedDistrict.DistrictID,
      wardCode: selectedWard?.WardCode || "",
    };
    localStorage.setItem("task_location", JSON.stringify(location));
    setShowSuccess(true);
    navigator.vibrate?.([10, 20, 10]);
    setTimeout(() => {
      setShowSuccess(false);
      router.back();
    }, 1200);
  }, [selectedProvince, selectedDistrict, selectedWard, street, router]);

  const handleBack = useCallback(() => {
    if (step === "street") setStep("ward");
    else if (step === "ward") setStep("district");
    else if (step === "district") setStep("province");
    else router.back();
    setSearch("");
  }, [step, router]);

  const handleSelect = useCallback((item: any) => {
    if (step === "province") { setSelectedProvince(item); setStep("district"); }
    else if (step === "district") { setSelectedDistrict(item); setStep("ward"); }
    else { setSelectedWard(item); setStep("street"); }
    setSearch("");
    navigator.vibrate?.(5);
  }, [step]);

  const getTitle = () => {
    if (step === "province") return "Chọn tỉnh/thành";
    if (step === "district") return selectedProvince?.ProvinceName;
    if (step === "ward") return selectedDistrict?.DistrictName;
    return "Nhập địa chỉ";
  };

  const renderList = () => {
    const items = filteredList;
    const getKey = (item: any) => step === "province" ? item.ProvinceID : step === "district" ? item.DistrictID : item.WardCode;
    const getName = (item: any) => step === "province" ? item.ProvinceName : step === "district" ? item.DistrictName : item.WardName;
    const getSelected = (item: any) => {
      if (step === "province") return selectedProvince?.ProvinceID === item.ProvinceID;
      if (step === "district") return selectedDistrict?.DistrictID === item.DistrictID;
      return selectedWard?.WardCode === item.WardCode;
    };

    if (loading) return (
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
    if (error) return (
      <div className="text-center py-16">
        <FiX size={48} className="mx-auto mb-3 text-red-500" />
        <p className="font-semibold text-red-500">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-[#0042B2] mt-2 font-semibold">Thử lại</button>
      </div>
    );
    if (!items.length) return (
      <div className="text-center py-16 text-zinc-400">
        <FiMapPin size={48} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">Không tìm thấy</p>
      </div>
    );

    return (
      <div className="space-y-2.5">
        {items.map((item: any, idx) => (
          <motion.button
            key={getKey(item)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            onClick={() => handleSelect(item)}
            className={`w-full p-4 rounded-2xl text-left font-medium active:scale-[0.98] transition-all border-2 ${
              getSelected(item)
                ? "bg-[#E8F1FF] dark:bg-[#0042B2]/20 border-[#0042B2] text-[#0042B2]"
                : "bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{getName(item)}</span>
              {getSelected(item) && <FiCheck className="w-5 h-5 text-[#0042B2]" />}
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <FiChevronLeft size={24} />
            </motion.button>
            <h1 className="font-bold text-lg flex-1 truncate">{getTitle()}</h1>
          </div>
          {step !== "street" && (
            <div className="px-4 pb-3 flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-10 pr-10 h-11 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#0042B2]/30"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full">
                    <FiX size={14} />
                  </button>
                )}
              </div>
              {step === "province" && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={useCurrentLocation} className="w-11 h-11 bg-[#0042B2] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#0042B2]/25">
                  <FiNavigation size={18} />
                </motion.button>
              )}
            </div>
          )}
        </div>

        <div className="max-w-xl mx-auto p-4 pb-28">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {step === "ward" && (
                <button onClick={() => { setSelectedWard(null); setStep("street"); }} className="w-full p-4 mb-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-2xl text-zinc-500 font-medium border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                  Bỏ qua chọn phường/xã
                </button>
              )}
              {step !== "street" ? renderList() : (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-5 shadow-sm">
                    <p className="text-xs text-zinc-500 mb-1.5">Địa chỉ đã chọn</p>
                    <p className="font-bold text-lg leading-snug">{[selectedWard?.WardName, selectedDistrict?.DistrictName, selectedProvince?.ProvinceName].filter(Boolean).join(", ")}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-5 shadow-sm">
                    <label className="text-sm font-semibold mb-2.5 block">Số nhà, tên đường (không bắt buộc)</label>
                    <input
                      placeholder="VD: 123 Nguyễn Huệ"
                      className="w-full h-12 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-[#0042B2]/30"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full h-12 rounded-2xl bg-[#0042B2] text-white font-semibold shadow-lg shadow-[#0042B2]/25 flex items-center justify-center gap-2">
                    <FiCheck size={20} />Xác nhận địa điểm
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {loading && step === "province" && !provinces.length && (
          <div className="fixed inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20" />
          </div>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 shadow-2xl">
                <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24 mx-auto" />
                <p className="text-center font-bold mt-3">Đã chọn địa điểm!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
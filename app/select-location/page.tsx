"use client";
[0]

import { useState, useEffect, useMemo, useDeferredValue, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiChevronLeft, FiSearch, FiMapPin, FiCheck, FiX, FiNavigation } from "react-icons/fi";

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
  const deferredSearch = useDeferredValue(search); // ✅ FIX 4: Debounce

  /* ================= FETCH WITH ABORT ✅ FIX 1 ================= */
  const fetchWithAbort = useCallback(async (url: string, options?: RequestInit, retries = 2): Promise<any> => {
    const controller = new AbortController();
    try {
      const res = await fetch(url, {...options, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      if (e.name === "AbortError") return null;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 500)); // ✅ FIX 8: Backoff
        return fetchWithAbort(url, options, retries - 1);
      }
      throw e;
    }
  }, []);

  /* ================= CACHE PROVINCES ✅ FIX 2 ================= */
  useEffect(() => {
    try {
      const cached = localStorage.getItem("provinces_cache");
      if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < 86400000 && Array.isArray(data) && data[0]?.ProvinceID) { // ✅ FIX 2: Validate
          setProvinces(data);
          return;
        }
      }
    } catch {} // Ignore JSON lỗi

    setLoading(true);
    fetchWithAbort("/api/location/province")
    .then((data) => {
        const list = Array.isArray(data)? data : [];
        setProvinces(list);
        localStorage.setItem("provinces_cache", JSON.stringify({ data: list, time: Date.now() }));
      })
    .catch(() => setError("Không tải được danh sách tỉnh"))
    .finally(() => setLoading(false));
  }, [fetchWithAbort]);

  /* ================= FETCH DISTRICT ================= */
  useEffect(() => {
    if (!selectedProvince) return;
    setLoading(true);
    setDistricts([]);
    setWards([]);
    setError("");

    fetchWithAbort("/api/location/district", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provinceId: selectedProvince.ProvinceID }),
    })
    .then((data) => setDistricts(Array.isArray(data)? data : []))
    .catch(() => setError("Không tải được quận/huyện"))
    .finally(() => setLoading(false));
  }, [selectedProvince, fetchWithAbort]);

  /* ================= FETCH WARD ================= */
  useEffect(() => {
    if (!selectedDistrict) return;
    setLoading(true);
    setWards([]);
    setError("");

    fetchWithAbort("/api/location/ward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ districtId: selectedDistrict.DistrictID }),
    })
    .then((data) => setWards(Array.isArray(data)? data : []))
    .catch(() => setError("Không tải được phường/xã"))
    .finally(() => setLoading(false));
  }, [selectedDistrict, fetchWithAbort]);

  /* ================= SEARCH FILTER ================= */
  const getCurrentList = useCallback(() => {
    if (step === "province") return provinces;
    if (step === "district") return districts;
    if (step === "ward") return wards;
    return [];
  }, [step, provinces, districts, wards]);

  const filteredList = useMemo(() => {
    const list = getCurrentList();
    if (!deferredSearch.trim()) return list;
    const key = step === "province"? "ProvinceName" : step === "district"? "DistrictName" : "WardName";
    return list.filter((item: any) => item[key].toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [getCurrentList, deferredSearch, step]);

  /* ================= GPS ✅ FIX 10 ================= */
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return alert("Trình duyệt không hỗ trợ GPS");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Gọi API reverse geocode của bạn
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          setSelectedProvince({ ProvinceID: data.provinceId, ProvinceName: data.province });
          setSelectedDistrict({ DistrictID: data.districtId, DistrictName: data.district });
          setSelectedWard({ WardCode: data.wardCode, WardName: data.ward });
          setStreet(data.street || "");
          setStep("street");
        } catch {
          setError("Không xác định được vị trí");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Bạn đã từ chối quyền truy cập vị trí");
        setLoading(false);
      }
    );
  }, []);

  /* ================= SAVE ✅ FIX 11 ================= */
  const handleSave = useCallback(() => {
    if (!selectedProvince ||!selectedDistrict) return;
    const location = {
      city: selectedProvince.ProvinceName,
      district: selectedDistrict.DistrictName,
      ward: selectedWard?.WardName || "",
      street: street.trim(),
      lat: null, // TODO: Gọi API geocode nếu cần
      lng: null,
      provinceId: selectedProvince.ProvinceID,
      districtId: selectedDistrict.DistrictID,
      wardCode: selectedWard?.WardCode || "",
    };
    localStorage.setItem("task_location", JSON.stringify(location));
    router.back();
  }, [selectedProvince, selectedDistrict, selectedWard, street, router]);

  const canConfirm = selectedProvince && selectedDistrict;

  const getTitle = () => {
    if (step === "province") return "Chọn tỉnh/thành phố";
    if (step === "district") return selectedProvince?.ProvinceName;
    if (step === "ward") return selectedDistrict?.DistrictName;
    return selectedWard?.WardName || selectedDistrict?.DistrictName;
  };

  const handleBack = useCallback(() => {
    if (step === "street") setStep("ward");
    else if (step === "ward") setStep("district");
    else if (step === "district") setStep("province");
    else {
      // ✅ FIX 3: Không back ra Google
      if (window.history.length <= 1) router.push("/");
      else router.back();
    }
    setSearch("");
  }, [step, router]);

  const handleSelect = useCallback((item: any) => {
    if (step === "province") {
      setSelectedProvince(item);
      setStep("district");
    } else if (step === "district") {
      setSelectedDistrict(item);
      setStep("ward");
    } else {
      setSelectedWard(item);
      setStep("street");
    }
    setSearch("");
  }, [step]);

  /* ================= RENDER LIST ✅ FIX 6+9 ================= */
  const renderList = () => {
    const items = filteredList;
    const getKey = (item: any) => (step === "province"? item.ProvinceID : step === "district"? item.DistrictID : item.WardCode);
    const getName = (item: any) => (step === "province"? item.ProvinceName : step === "district"? item.DistrictName : item.WardName);
    const getSelected = (item: any) => {
      if (step === "province") return selectedProvince?.ProvinceID === item.ProvinceID;
      if (step === "district") return selectedDistrict?.DistrictID === item.DistrictID;
      return selectedWard?.WardCode === item.WardCode;
    };

    if (loading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}</div>;
    if (error) return <div className="text-center py-12 text-red-500 dark:text-red-400"><FiX size={48} className="mx-auto mb-3" /><p className="font-semibold">{error}</p><button onClick={() => window.location.reload()} className="text-sm text-blue-500 mt-2 font-semibold">Thử lại</button></div>;
    if (!items.length) return <div className="text-center py-12 text-gray-400 dark:text-zinc-500"><FiMapPin size={48} className="mx-auto mb-3 opacity-50" /><p className="font-semibold">Không tìm thấy</p></div>;

    return (
      <div className="space-y-2" role="listbox">
        {items.map((item: any) => (
          <button
            key={getKey(item)}
            role="option"
            aria-selected={getSelected(item)} // ✅ FIX 6
            onClick={() => handleSelect(item)}
            onKeyDown={(e) => e.key === "Enter" && handleSelect(item)} // ✅ FIX 5
            className={`w-full p-4 rounded-2xl text-left font-medium active:scale-[0.98] transition-all border ${
              getSelected(item) // ✅ FIX 9
              ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-600 dark:text-blue-400"
                : "bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-gray-100"
            }`}
          >
            {getName(item)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={handleBack} className="p-2 -ml-2 active:scale-90"><FiChevronLeft size={24} /></button>
          <h1 className="font-bold text-lg flex-1 truncate">{getTitle()}</h1>
        </div>
        {step!== "street" && (
          <div className="px-4 pb-3 flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-10 pr-10 py-3 bg-gray-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full"><FiX size={16} className="text-gray-400" /></button>}
            </div>
            {step === "province" && (
              <button onClick={useCurrentLocation} className="p-3 bg-blue-500 text-white rounded-2xl active:scale-95" title="Dùng vị trí hiện tại">
                <FiNavigation size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto p-4">
        {step === "ward" && (
          <button onClick={() => { setSelectedWard(null); setStep("street"); }} className="w-full p-4 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl text-gray-500 dark:text-zinc-400 font-medium mb-3 border border-gray-100 dark:border-zinc-800">
            Bỏ qua chọn phường/xã
          </button>
        )}
        {step!== "street"? renderList() : (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl">
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Địa chỉ đã chọn</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{[selectedWard?.WardName, selectedDistrict?.DistrictName, selectedProvince?.ProvinceName].filter(Boolean).join(", ")}</p>
            </div>
            <input placeholder="Số nhà, tên đường... (không bắt buộc)" className="w-full p-4 bg-gray-50 dark:bg-zinc-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500" value={street} onChange={(e) => setStreet(e.target.value)} autoFocus />
            <button onClick={handleSave} disabled={!canConfirm} className="w-full p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <FiCheck className="inline mr-2" size={20} />Xác nhận địa điểm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

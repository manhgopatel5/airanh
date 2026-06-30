"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiMapPin } from "react-icons/fi";
import { toast } from "sonner";
import StrangerAddressSearch from "@/components/stranger/StrangerAddressSearch";
import { getCurrentPosition, GEO_PERMISSION_DENIED_MESSAGE } from "@/lib/geolocation";
import { mapboxReverseGeocode } from "@/lib/mapboxClient";
import {
  isStrangerRegionValid,
  regionFromMapbox,
  type StrangerRegion,
} from "@/lib/strangerLocation";
import type { ParsedMapboxLocation } from "@/lib/mapboxGeocode";
import { cn } from "@/lib/utils";

type Props = {
  value: StrangerRegion;
  onChange: (region: StrangerRegion) => void;
  className?: string;
};

export default function RegionPicker({ value, onChange, className }: Props) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  const applyParsed = (parsed: ParsedMapboxLocation) => {
    const region = regionFromMapbox(parsed);
    if (!isStrangerRegionValid(region)) {
      toast.error("Không xác định được khu vực, thử địa chỉ cụ thể hơn");
      return;
    }
    onChange(region);
    setQuery(parsed.address);
    toast.success("Đã chọn khu vực");
  };

  const handleGps = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const parsed = await mapboxReverseGeocode(pos.lat, pos.lng);
      applyParsed(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không lấy được vị trí";
      toast.error(message, { duration: message === GEO_PERMISSION_DENIED_MESSAGE ? 6000 : 4000 });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={handleGps}
        disabled={locating}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
      >
        <FiMapPin size={16} />
        {locating ? "Đang lấy..." : "Dùng vị trí hiện tại (GPS)"}
      </motion.button>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="shrink-0 text-xs font-bold text-zinc-500">hoặc bạn dùng địa chỉ khác</span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <StrangerAddressSearch
        value={query}
        onChange={setQuery}
        onSelect={applyParsed}
        placeholder="Tìm tỉnh, phường hoặc địa chỉ..."
        inputClassName="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 border border-zinc-200 dark:border-zinc-700"
      />

      <p className="text-xs leading-relaxed text-zinc-500">
        Dùng Mapbox để tìm khu vực. Chọn GPS hoặc nhập địa chỉ trước khi tìm người lạ.
      </p>

      {isStrangerRegionValid(value) && (
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm dark:bg-emerald-950/30">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Khu vực tìm kiếm
          </p>
          <p className="mt-1 font-semibold text-emerald-900 dark:text-emerald-100">{value.displayLabel}</p>
        </div>
      )}
    </div>
  );
}

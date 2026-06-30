"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatShortLocation, type ParsedMapboxLocation } from "@/lib/mapboxGeocode";
import { mapboxSearchPlaces } from "@/lib/mapboxClient";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: ParsedMapboxLocation) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  minChars?: number;
};

export default function StrangerAddressSearch({
  value,
  onChange,
  onSelect,
  onBlur,
  placeholder = "Nhập địa chỉ để tìm...",
  className = "",
  inputClassName = "input-premium",
  minChars = 2,
}: Props) {
  const [suggestions, setSuggestions] = useState<ParsedMapboxLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchPlaces = useCallback(async (query: string) => {
    if (query.trim().length < minChars) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const results = await mapboxSearchPlaces(query);
      setSuggestions(results);
      if (results.length === 0) {
        setError("Không tìm thấy địa chỉ phù hợp");
      }
    } catch (err: unknown) {
      setSuggestions([]);
      const message = err instanceof Error ? err.message : "Lỗi tìm kiếm Mapbox";
      setError(message);
    } finally {
      setSearching(false);
    }
  }, [minChars]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(next), 350);
  };

  const handleSelect = (item: ParsedMapboxLocation) => {
    onChange(item.address);
    setSuggestions([]);
    setError(null);
    onSelect(item);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />
      {searching && value.trim().length >= minChars && (
        <p className="mt-1 text-xs text-zinc-400">Đang tìm trên Mapbox...</p>
      )}
      {error && !searching && value.trim().length >= minChars && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lng}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.address}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatShortLocation({
                  ...(s.ward ? { ward: s.ward } : {}),
                  ...(s.city ? { city: s.city } : {}),
                  ...(s.district && !s.city ? { city: s.district } : {}),
                }) || "Việt Nam"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

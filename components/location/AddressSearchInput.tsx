"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatShortLocation, type ParsedMapboxLocation } from "@/lib/mapboxGeocode";

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

export default function AddressSearchInput({
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
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchPlaces = useCallback(async (query: string) => {
    if (query.trim().length < minChars) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setSuggestions((data.predictions as ParsedMapboxLocation[]) || []);
    } catch {
      setSuggestions([]);
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
        <p className="mt-1 text-xs text-zinc-400">Đang tìm...</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat}-${s.lng}-${i}`}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.address}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {formatShortLocation({
                  ...(s.ward ? { ward: s.ward } : {}),
                  ...(s.city ? { city: s.city } : {}),
                }) || "Việt Nam"}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

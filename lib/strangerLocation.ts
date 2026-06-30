import type { ParsedMapboxLocation } from "@/lib/mapboxGeocode";
import { formatShortLocation } from "@/lib/mapboxGeocode";

export type StrangerRegion = {
  province: string;
  displayLabel: string;
  lat?: number;
  lng?: number;
  ward?: string;
};

export function normalizeProvinceName(name: string): string {
  if (!name) return "";
  return name
    .replace(/^(Thành phố|Tỉnh|TP\.|T\.)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function provincesMatch(a: string, b: string): boolean {
  const na = normalizeProvinceName(a);
  const nb = normalizeProvinceName(b);
  if (!na || !nb) return false;
  return na.toLowerCase() === nb.toLowerCase();
}

export function isStrangerRegionValid(region: StrangerRegion): boolean {
  return Boolean(region.province?.trim() && region.displayLabel?.trim());
}

export function regionFromMapbox(parsed: ParsedMapboxLocation): StrangerRegion {
  const province = parsed.city ? normalizeProvinceName(parsed.city) : "";
  const displayLabel =
    formatShortLocation({
      ...(parsed.ward ? { ward: parsed.ward } : {}),
      ...(parsed.city ? { city: parsed.city } : {}),
    }) || parsed.address || province;

  return {
    province: parsed.city || province,
    displayLabel,
    lat: parsed.lat,
    lng: parsed.lng,
    ...(parsed.ward ? { ward: parsed.ward } : {}),
  };
}

export const defaultStrangerRegion = (): StrangerRegion => ({
  province: "",
  displayLabel: "",
});

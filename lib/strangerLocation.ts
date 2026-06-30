import type { ParsedMapboxLocation } from "@/lib/mapboxGeocode";
import { formatShortLocation } from "@/lib/mapboxGeocode";

export type StrangerRegion = {
  province: string;
  displayLabel: string;
  lat?: number;
  lng?: number;
  ward?: string;
};

export const NATIONWIDE = "Toàn quốc";

export function normalizeProvinceName(name: string): string {
  if (!name || name === NATIONWIDE) return NATIONWIDE;
  return name
    .replace(/^(Thành phố|Tỉnh|TP\.|T\.)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function provincesMatch(a: string, b: string): boolean {
  const na = normalizeProvinceName(a);
  const nb = normalizeProvinceName(b);
  if (na === NATIONWIDE || nb === NATIONWIDE) return true;
  return na.toLowerCase() === nb.toLowerCase();
}

export function regionFromMapbox(parsed: ParsedMapboxLocation): StrangerRegion {
  const province = parsed.city ? normalizeProvinceName(parsed.city) : NATIONWIDE;
  const displayLabel =
    province === NATIONWIDE
      ? NATIONWIDE
      : formatShortLocation({
          ...(parsed.ward ? { ward: parsed.ward } : {}),
          ...(parsed.city ? { city: parsed.city } : {}),
        }) || province;

  return {
    province: province === NATIONWIDE ? NATIONWIDE : parsed.city || province,
    displayLabel,
    lat: parsed.lat,
    lng: parsed.lng,
    ...(parsed.ward ? { ward: parsed.ward } : {}),
  };
}

export const defaultStrangerRegion = (): StrangerRegion => ({
  province: NATIONWIDE,
  displayLabel: NATIONWIDE,
});

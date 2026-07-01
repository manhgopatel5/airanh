import type { ParsedMapboxLocation } from "@/lib/mapboxGeocode";

async function apiGet<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.");
  }

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

/** Gọi Mapbox qua API route — token NEXT_PUBLIC_MAPBOX_TOKEN xử lý phía server */
export async function mapboxSearchPlaces(query: string): Promise<ParsedMapboxLocation[]> {
  const data = await apiGet<{ predictions?: ParsedMapboxLocation[] }>(
    `/api/places/autocomplete?input=${encodeURIComponent(query.trim())}`
  );
  return data.predictions ?? [];
}

export async function mapboxReverseGeocode(
  lat: number,
  lng: number
): Promise<ParsedMapboxLocation> {
  const data = await apiGet<ParsedMapboxLocation>(
    `/api/places/geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );
  return data;
}

import {
  fetchMapboxAutocomplete,
  fetchMapboxReverseGeocode,
} from "@/lib/mapboxFetch";
import type { ParsedMapboxLocation } from "@/lib/mapboxGeocode";

export function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token?.trim()) {
    throw new Error("Mapbox chưa cấu hình (NEXT_PUBLIC_MAPBOX_TOKEN)");
  }
  return token.trim();
}

export async function mapboxSearchPlaces(query: string): Promise<ParsedMapboxLocation[]> {
  return fetchMapboxAutocomplete(query, getMapboxToken());
}

export async function mapboxReverseGeocode(
  lat: number,
  lng: number
): Promise<ParsedMapboxLocation> {
  const result = await fetchMapboxReverseGeocode(lat, lng, getMapboxToken());
  if (!result) {
    throw new Error("Không xác định được khu vực từ GPS");
  }
  return result;
}

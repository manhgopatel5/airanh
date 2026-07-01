import { NextRequest, NextResponse } from "next/server";
import { fetchMapboxReverseGeocode } from "@/lib/mapboxFetch";

function mapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) return null;
  return token;
}

export async function GET(req: NextRequest) {
  const latRaw = req.nextUrl.searchParams.get("lat");
  const lngRaw = req.nextUrl.searchParams.get("lng");

  if (!latRaw || !lngRaw) {
    return NextResponse.json({ error: "Thiếu tọa độ GPS" }, { status: 400 });
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Tọa độ GPS không hợp lệ" }, { status: 400 });
  }

  const token = mapboxToken();
  if (!token) {
    return NextResponse.json(
      { error: "Mapbox chưa cấu hình (NEXT_PUBLIC_MAPBOX_TOKEN)" },
      { status: 500 }
    );
  }

  try {
    const parsed = await fetchMapboxReverseGeocode(lat, lng, token);
    if (!parsed) {
      return NextResponse.json(
        { error: "Không tìm thấy địa chỉ cho vị trí này" },
        { status: 404 }
      );
    }
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("Mapbox geocode error:", err);
    const message = err instanceof Error ? err.message : "Lỗi xác định vị trí Mapbox";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

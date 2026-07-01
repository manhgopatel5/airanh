import { NextRequest, NextResponse } from "next/server";
import { fetchMapboxAutocomplete } from "@/lib/mapboxFetch";

function mapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
  if (!token) return null;
  return token;
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const token = mapboxToken();
  if (!token) {
    return NextResponse.json(
      { error: "Mapbox chưa cấu hình (NEXT_PUBLIC_MAPBOX_TOKEN)" },
      { status: 500 }
    );
  }

  try {
    const predictions = await fetchMapboxAutocomplete(input, token);
    return NextResponse.json({ predictions });
  } catch (err: unknown) {
    console.error("Mapbox autocomplete error:", err);
    const message = err instanceof Error ? err.message : "Lỗi tìm kiếm Mapbox";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

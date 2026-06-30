import { NextRequest, NextResponse } from "next/server";
import { parseMapboxFeature } from "@/lib/mapboxGeocode";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.trim())}.json` +
    `?access_token=${token}&country=vn&language=vi&limit=6&types=address,poi,place,locality,neighborhood`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const predictions = (data.features ?? [])
      .map((feature: Parameters<typeof parseMapboxFeature>[0]) => parseMapboxFeature(feature))
      .filter(Boolean);

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

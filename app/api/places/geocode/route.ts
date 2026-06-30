import { NextRequest, NextResponse } from "next/server";
import { fetchMapboxReverseGeocode } from "@/lib/mapboxFetch";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing coords" }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  try {
    const parsed = await fetchMapboxReverseGeocode(Number(lat), Number(lng), token);
    if (!parsed) {
      return NextResponse.json({ error: "No results" }, { status: 404 });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

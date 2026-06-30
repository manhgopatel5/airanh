import { NextRequest, NextResponse } from "next/server";
import { parseMapboxFeature } from "@/lib/mapboxGeocode";

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

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${token}&language=vi&types=address,poi,neighborhood,locality,place`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) {
      return NextResponse.json({ error: "No results" }, { status: 404 });
    }

    const parsed = parseMapboxFeature(feature);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid result" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

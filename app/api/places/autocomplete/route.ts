import { NextRequest, NextResponse } from "next/server";
import { fetchMapboxAutocomplete } from "@/lib/mapboxFetch";

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 });
  }

  try {
    const predictions = await fetchMapboxAutocomplete(input, token);
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

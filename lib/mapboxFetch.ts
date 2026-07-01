import { parseMapboxFeature, type ParsedMapboxLocation } from "@/lib/mapboxGeocode";

const VN_CENTER = "105.8342,21.0278";

type MapboxFeature = Parameters<typeof parseMapboxFeature>[0];

function parseFeatures(features: MapboxFeature[] | undefined): ParsedMapboxLocation[] {
  return (features ?? [])
    .map((feature) => parseMapboxFeature(feature))
    .filter((item): item is ParsedMapboxLocation => item !== null);
}

export async function fetchMapboxAutocomplete(
  input: string,
  token: string
): Promise<ParsedMapboxLocation[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&country=vn&language=vi&limit=8` +
    `&types=address,poi,place,locality,neighborhood,region` +
    `&proximity=${VN_CENTER}`;

  const res = await fetch(url);
  if (!res.ok) {
    let message = `Mapbox lỗi (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { features?: MapboxFeature[] };
  return parseFeatures(data.features);
}

export async function fetchMapboxReverseGeocode(
  lat: number,
  lng: number,
  token: string
): Promise<ParsedMapboxLocation | null> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&language=vi&limit=1` +
    `&types=address,poi,neighborhood,locality,place,region,district`;

  const res = await fetch(url);
  if (!res.ok) {
    let message = `Mapbox lỗi (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { features?: MapboxFeature[] };
  const parsed = parseFeatures(data.features);
  return parsed[0] ?? null;
}

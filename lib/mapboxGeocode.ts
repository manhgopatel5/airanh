export type ParsedMapboxLocation = {
  address: string;
  ward?: string;
  district?: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
};

type MapboxContextItem = { id?: string; text?: string; short_code?: string };

function contextText(context: MapboxContextItem[] | undefined, ...prefixes: string[]): string | undefined {
  if (!context?.length) return undefined;
  for (const prefix of prefixes) {
    const hit = context.find((item) => item.id?.startsWith(`${prefix}.`));
    if (hit?.text) return hit.text;
  }
  return undefined;
}

export function parseMapboxFeature(feature: {
  id?: string;
  place_name?: string;
  text?: string;
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
  context?: MapboxContextItem[];
  properties?: { address?: string };
}): ParsedMapboxLocation | null {
  const coords = feature.center ?? feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [lng, lat] = coords;
  const context = feature.context ?? [];

  const ward =
    contextText(context, "neighborhood", "locality") ||
    (feature.id?.startsWith("neighborhood.") || feature.id?.startsWith("locality.") ? feature.text : undefined);

  const district = contextText(context, "district", "place");
  const city = contextText(context, "region");
  const country = contextText(context, "country");

  const street = feature.properties?.address || feature.text || "";
  const address = feature.place_name || [street, ward, district, city, country].filter(Boolean).join(", ");

  return {
    address,
    lat,
    lng,
    ...(ward ? { ward } : {}),
    ...(district ? { district } : {}),
    ...(city ? { city } : {}),
    ...(country ? { country } : {}),
  };
}

export function stripAdminPrefix(value: string): string {
  return value.replace(/^(Thành phố|Tỉnh|Quận|Huyện|Phường|Xã|TP\.|T\.|Q\.|P\.|X\.)\s*/i, "").trim();
}

/** Hiển thị ngắn: phường/xã + tỉnh/thành phố */
export function formatShortLocation(input: {
  ward?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
}): string {
  const ward = input.ward?.trim();
  const city = input.city?.trim();
  const parts: string[] = [];
  if (ward) parts.push(ward);
  if (city) parts.push(city.replace(/^(Thành phố|Tỉnh|TP\.|T\.)\s*/i, "").trim() || city);
  return parts.join(", ");
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const revalidate = 86400; // Cache 24h

// Rate limit: 50 req/phút/IP
const rateLimit = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];
  const recent = timestamps.filter(t => now - t < 60 * 1000);
  if (recent.length >= 50) return true;
  recent.push(now);
  rateLimit.set(ip, recent);
  return false;
}

type Ward = {
  id: string;
  name: string;
};

export async function POST(req: Request) {
  try {
    // ✅ FIX Next 15: headers() là async
    const h = await headers();
    const ip = h.get("x-forwarded-for") || "unknown";
    
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { districtId } = await req.json();

    const id = Number(districtId);
    if (!districtId || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid districtId" }, { status: 400 });
    }

    const token = process.env.GHN_TOKEN;
    if (!token) {
      console.error("GHN_TOKEN missing");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const res = await fetch(
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/ward",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
        body: JSON.stringify({ district_id: id }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.error("GHN HTTP Error:", res.status);
      return NextResponse.json({ error: "GHN API error" }, { status: 502 });
    }

    const data = await res.json();
    console.log("GHN WARD:", { code: data.code, count: data.data?.length, districtId: id });

    if (data.code !== 200) {
      return NextResponse.json({ error: data.message || "GHN error" }, { status: 400 });
    }

    const wards: Ward[] = (data.data || [])
      .map((w: any) => ({
        id: w.WardCode,
        name: w.WardName,
      }))
      .sort((a: Ward, b: Ward) => a.name.localeCompare(b.name, "vi"));

    return NextResponse.json(wards, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      console.error("GHN TIMEOUT");
      return NextResponse.json({ error: "GHN timeout" }, { status: 504 });
    }
    console.error("WARD ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
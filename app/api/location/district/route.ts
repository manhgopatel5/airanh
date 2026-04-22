import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const revalidate = 86400; // ✅ Nâng cấp 4: Cache 24h trên Vercel

// ✅ Nâng cấp 2: Rate limit đơn giản bằng Map
const rateLimit = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];
  const recent = timestamps.filter(t => now - t < 60 * 1000);
  if (recent.length >= 30) return true;
  recent.push(now);
  rateLimit.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  try {
    // ✅ Nâng cấp 2: Rate limit
    const ip = headers().get("x-forwarded-for") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { provinceId } = await req.json();

    // ✅ FIX 1: Validate
    const id = Number(provinceId);
    if (!provinceId || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid provinceId" }, { status: 400 });
    }

    // ✅ FIX 2: Check env
    const token = process.env.GHN_TOKEN;
    if (!token) {
      console.error("GHN_TOKEN missing");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    // ✅ FIX 3: Timeout 8s
    const res = await fetch(
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/district",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
        body: JSON.stringify({ province_id: id }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.error("GHN HTTP Error:", res.status);
      return NextResponse.json({ error: "GHN API error" }, { status: 502 });
    }

    const data = await res.json();
    console.log("GHN DISTRICT:", { code: data.code, count: data.data?.length }); // ✅ FIX 5: Ẩn token

    if (data.code!== 200) {
      return NextResponse.json({ error: data.message || "GHN error" }, { status: 400 });
    }

    // ✅ Nâng cấp 3: Transform gọn
    const districts = (data.data || []).map((d: any) => ({
      id: d.DistrictID,
      name: d.DistrictName,
      code: d.Code,
    }));

    return NextResponse.json(districts, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" }, // ✅ Nâng cấp 4
    });
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      console.error("GHN TIMEOUT");
      return NextResponse.json({ error: "GHN timeout" }, { status: 504 });
    }
    console.error("DISTRICT ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

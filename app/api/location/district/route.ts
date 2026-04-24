import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const revalidate = 86400; // cache 24h

/* ================= RATE LIMIT ================= */
const rateLimit = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(ip) || [];

  const recent = timestamps.filter((t) => now - t < 60 * 1000);

  if (recent.length >= 30) return true;

  recent.push(now);
  rateLimit.set(ip, recent);

  return false;
}

/* ================= HANDLER ================= */
export async function POST(req: Request) {
  try {
    // ✅ Next 15 headers()
    const h = await headers();

    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    /* ================= BODY ================= */
    const body = await req.json().catch(() => null);
    const provinceId = body?.provinceId;

    const id = Number(provinceId);
    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid provinceId" },
        { status: 400 }
      );
    }

    /* ================= ENV ================= */
    const token = process.env.GHN_TOKEN;
    if (!token) {
      console.error("❌ GHN_TOKEN missing");
      return NextResponse.json(
        { error: "Server config error" },
        { status: 500 }
      );
    }

    /* ================= FETCH ================= */
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/district",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
        body: JSON.stringify({ province_id: id }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      console.error("❌ GHN HTTP:", res.status);
      return NextResponse.json(
        { error: "GHN API error" },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.code !== 200) {
      return NextResponse.json(
        { error: data.message || "GHN error" },
        { status: 400 }
      );
    }

    /* ================= TRANSFORM ================= */
    const districts = (data.data || []).map((d: any) => ({
      id: d.DistrictID,
      name: d.DistrictName,
      code: d.Code,
    }));

    return NextResponse.json(districts, {
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("⏱ GHN TIMEOUT");
      return NextResponse.json(
        { error: "GHN timeout" },
        { status: 504 }
      );
    }

    console.error("❌ DISTRICT ERROR:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
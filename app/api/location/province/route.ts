import { NextResponse } from "next/server";

export const revalidate = 604800; // ✅ 7 ngày

export async function GET() {
  try {
    // ✅ FIX 1: Check env
    const token = process.env.GHN_TOKEN;
    if (!token) {
      console.error("GHN_TOKEN missing");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    // ✅ FIX 2: Timeout 8s
    const res = await fetch(
      "https://online-gateway.ghn.vn/shiip/public-api/master-data/province",
      {
        headers: { Token: token },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      console.error("GHN HTTP Error:", res.status);
      return NextResponse.json({ error: "GHN API error" }, { status: 502 });
    }

    const data = await res.json();
    console.log("GHN PROVINCE:", { code: data.code, count: data.data?.length });

    if (data.code!== 200) {
      return NextResponse.json({ error: data.message || "GHN error" }, { status: 400 });
    }

    // ✅ Nâng cấp 3+4: Transform + Sort
    const provinces = (data.data || [])
      .map((p: any) => ({
        id: p.ProvinceID,
        name: p.ProvinceName,
        code: p.Code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi")); // Sort A-Z tiếng Việt

    return NextResponse.json(provinces, {
      headers: {
        // ✅ Nâng cấp 1+5: Cache 7 ngày, SWR 3 ngày
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=259200",
      },
    });
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      console.error("GHN TIMEOUT");
      return NextResponse.json({ error: "GHN timeout" }, { status: 504 });
    }
    console.error("PROVINCE ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

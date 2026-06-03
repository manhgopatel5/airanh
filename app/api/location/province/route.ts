import { NextResponse } from "next/server";

export const revalidate = 86400; // 24h

export async function GET() {
  try {
    const res = await fetch("https://provinces.open-api.vn/api/p/", {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("API error");
    
    const data = await res.json();
    const provinces = data.map((p: any) => ({
      id: p.code,
      name: p.name,
      code: p.codename,
    }));

    return NextResponse.json(provinces);
  } catch (err: any) {
    console.error("PROVINCE ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
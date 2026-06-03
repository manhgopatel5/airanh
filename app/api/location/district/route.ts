import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { provinceId } = await req.json();
    const id = Number(provinceId);
    if (!id) return NextResponse.json({ error: "Invalid provinceId" }, { status: 400 });

    const res = await fetch(`https://provinces.open-api.vn/api/p/${id}?depth=2`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("API error");
    
    const data = await res.json();
    const districts = (data.districts || []).map((d: any) => ({
      id: d.code,
      name: d.name,
      code: d.codename,
    }));

    return NextResponse.json(districts);
  } catch (err: any) {
    console.error("DISTRICT ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
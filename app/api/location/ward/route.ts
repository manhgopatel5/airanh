import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { districtId } = await req.json();
    const id = Number(districtId);
    if (!id) return NextResponse.json({ error: "Invalid districtId" }, { status: 400 });

    const res = await fetch(`https://provinces.open-api.vn/api/d/${id}?depth=2`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error("API error");
    
    const data = await res.json();
    const wards = (data.wards || []).map((w: any) => ({
      id: w.code,
      name: w.name,
    }));

    return NextResponse.json(wards);
  } catch (err: any) {
    console.error("WARD ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
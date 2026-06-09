import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // THÊM DÒNG NÀY
export const revalidate = 0; // ĐỔI THÀNH 0

export async function GET() {
  try {
    const res = await fetch("https://provinces.open-api.vn/api/p/", {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store', // THÊM DÒNG NÀY
    });

    if (!res.ok) throw new Error("API error");
    
    const data = await res.json();
    const provinces = data.map((p: any) => ({
      id: p.code,
      name: p.name,
      code: p.codename,
    }));

    return NextResponse.json(provinces, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0', // THÊM DÒNG NÀY
      },
    });
  } catch (err: any) {
    console.error("PROVINCE ERROR:", err);
    return NextResponse.json(
      { error: "Internal error" }, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
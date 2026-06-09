import { NextResponse } from "next/server";

// XÓA DÒNG NÀY: export const dynamic = 'force-dynamic';
// XÓA DÒNG NÀY: export const revalidate = 0;

// Cache 1 năm. Tỉnh không đổi
export const revalidate = 31536000;

export async function GET() {
  const res = await fetch("https://provinces.open-api.vn/api/p/", {
    // Bỏ AbortSignal.timeout đi, nó hay lỗi trên Vercel
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 31536000 } // Cache fetch 1 năm
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  
  const data = await res.json();
  const provinces = data.map((p: any) => ({
    id: Number(p.code),
    name: p.name,
    code: p.codename,
  }));

  return NextResponse.json(provinces);
}
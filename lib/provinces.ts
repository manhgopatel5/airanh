// lib/provinces.ts
export type Province = { id: number; name: string; code: string };

let cache: Province[] | null = null;
let promise: Promise<Province[]> | null = null;

export const getProvinces = async (): Promise<Province[]> => {
  if (cache) return cache;
  if (promise) return promise;

  // Dùng absolute URL cho server fetch
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  promise = fetch(`${baseUrl}/api/location/province`, { 
    next: { revalidate: 86400 } // ISR 24h
  })
    .then((r) => {
      if (!r.ok) throw new Error('Failed to fetch');
      return r.json();
    })
    .then((data) => {
      cache = data;
      return data;
    })
    .catch(() => {
      promise = null;
      return [];
    });

  return promise;
};
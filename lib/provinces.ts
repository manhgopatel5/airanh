// lib/provinces.ts
type Province = { id: number; name: string; code: string };

let cache: Province[] | null = null;
let promise: Promise<Province[]> | null = null;

export const getProvinces = async (): Promise<Province[]> => {
  if (cache) return cache;
  if (promise) return promise;

  promise = fetch("/api/location/provinces", { next: { revalidate: 86400 } }) // ISR 24h
  .then((r) => r.json())
  .then((data) => {
      cache = data;
      return data;
    })
  .catch(() => []);

  return promise;
};

// Dùng SWR cho client cache + dedupe

export const useProvinces = () => {
  const { data } = useSWR<Province[]>("/api/provinces", getProvinces, {
    revalidateOnFocus: false,
    dedupingInterval: 86400000, // 24h
  });
  return data || [];
};
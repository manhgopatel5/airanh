// lib/useProvinces.ts
"use client";
import useSWR from 'swr';
import type { Province } from './provinces';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const useProvinces = () => {
  const { data } = useSWR<Province[]>("/api/location/provinces", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 86400000, // 24h
    fallbackData: [],
  });
  return data || [];
};
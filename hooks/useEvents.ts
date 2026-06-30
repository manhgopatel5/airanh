"use client";

import useSWR from "swr";
import type { EventItem } from "@/data/events";

const EVENTS_KEY = "/api/admin/events";

async function fetchEvents(): Promise<EventItem[]> {
  const res = await fetch(EVENTS_KEY);
  if (!res.ok) throw new Error("Không tải được sự kiện");
  const data = await res.json();
  return data.events || [];
}

export function useEvents(initialEvents?: EventItem[]) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<EventItem[]>(
    EVENTS_KEY,
    fetchEvents,
    {
      ...(initialEvents?.length ? { fallbackData: initialEvents } : {}),
      revalidateOnMount: !initialEvents?.length,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return {
    events: data ?? initialEvents ?? [],
    loading: isLoading && !data?.length,
    validating: isValidating,
    error,
    refresh: mutate,
  };
}

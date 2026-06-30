import type { FeedTask } from "@/types/task";

export type FeedSortBy = "new" | "views" | "likes" | "price_asc" | "price_desc";

export type FeedTab = "hot" | "near" | "friends" | "new";

export type FeedFilters = {
  category?: string | undefined;
  priceRange: string;
  deadlineRange: string;
  sortBy: FeedSortBy;
  query: string;
  tab?: FeedTab | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  radiusKm?: number | undefined;
};

export type FeedPage = {
  tasks: FeedTask[];
  nextCursor: string | null;
};

export function buildFeedApiUrl(
  mode: "task" | "plan",
  filters: FeedFilters,
  cursor?: string | null
): string {
  const params = new URLSearchParams({
    type: mode,
    limit: "20",
    sortBy: filters.sortBy,
  });

  if (filters.category) params.set("category", filters.category);
  if (filters.priceRange !== "all") params.set("priceRange", filters.priceRange);
  if (filters.deadlineRange !== "all") params.set("deadlineRange", filters.deadlineRange);
  if (filters.query) params.set("query", filters.query);
  if (filters.tab) params.set("tab", filters.tab);
  if (filters.lat != null) params.set("lat", String(filters.lat));
  if (filters.lng != null) params.set("lng", String(filters.lng));
  if (filters.radiusKm != null) params.set("radiusKm", String(filters.radiusKm));
  if (cursor) params.set("cursor", cursor);

  return `/api/tasks?${params.toString()}`;
}

export function hasActiveFilters(filters: FeedFilters): boolean {
  return !!(
    filters.category ||
    filters.priceRange !== "all" ||
    filters.deadlineRange !== "all" ||
    filters.sortBy !== "new" ||
    filters.query.trim()
  );
}

export function mergeFeedPages(pages: FeedPage[]): FeedTask[] {
  const seen = new Set<string>();
  const merged: FeedTask[] = [];

  for (const page of pages) {
    for (const task of page.tasks) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      merged.push(task);
    }
  }

  return merged;
}

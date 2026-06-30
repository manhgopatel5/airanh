import type { FeedTask } from "@/types/task";

export type FeedSortBy = "new" | "views" | "price_asc" | "price_desc";

export type FeedFilters = {
  category?: string | undefined;
  priceRange: string;
  deadlineRange: string;
  sortBy: FeedSortBy;
  query: string;
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
  if (cursor) params.set("cursor", cursor);

  return `/api/tasks?${params.toString()}`;
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

import type { FeedTask } from "@/types/task";

type VisibilityItem = {
  visibility?: FeedTask["visibility"];
  hidden?: boolean;
  userId?: string;
  allowedViewerIds?: string[];
};

/** Public feed: only non-hidden public items */
export function canViewInPublicFeed(item: VisibilityItem): boolean {
  const visibility = item.visibility || "public";
  return visibility === "public" && item.hidden !== true;
}

/** Whether a viewer may see this item (feed, detail, direct link) */
export function canUserViewItem(item: VisibilityItem, viewerUid?: string | null): boolean {
  if (item.userId && viewerUid === item.userId) return true;

  const visibility = item.visibility || "public";

  if (visibility === "public") {
    if (item.hidden === true) return false;
    return true;
  }

  if (!viewerUid) return false;

  const allowed = item.allowedViewerIds || [];
  if (visibility === "friends" || visibility === "private") {
    return allowed.includes(viewerUid);
  }

  return false;
}

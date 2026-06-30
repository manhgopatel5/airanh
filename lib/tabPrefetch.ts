let prefetched = false;

const TAB_IMPORTS = {
  home: () => import("@/app/_tabs/TaskFeedPage"),
  messages: () => import("@/app/chat/ChatClient"),
  tasks: () => import("@/app/_tabs/MyTasksPage"),
  profile: () => import("@/app/profile/ProfileTabContent"),
  rooms: () => import("@/app/rooms/PublicRoomsClient"),
} as const;

export type PrefetchTab = keyof typeof TAB_IMPORTS;

export function prefetchTab(tab: PrefetchTab) {
  void TAB_IMPORTS[tab]();
}

export function prefetchAllTabs() {
  if (prefetched || typeof window === "undefined") return;
  prefetched = true;
  (Object.keys(TAB_IMPORTS) as PrefetchTab[]).forEach((tab) => prefetchTab(tab));
}

export function scheduleTabPrefetch() {
  if (typeof window === "undefined") return;
  const run = () => prefetchAllTabs();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 1200);
  }
}

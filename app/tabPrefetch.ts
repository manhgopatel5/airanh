export type AppTab = "home" | "messages" | "tasks" | "profile";

let prefetched = false;

export function prefetchAppTab(tab: AppTab) {
  if (typeof window === "undefined") return;
  switch (tab) {
    case "home":
      void import("./_tabs/TaskFeedPage");
      break;
    case "messages":
      void import("./chat/ChatClient");
      break;
    case "tasks":
      void import("./_tabs/MyTasksPage");
      break;
    case "profile":
      void import("./profile/ProfileTabContent");
      break;
  }
}

export function scheduleAppTabPrefetch() {
  if (typeof window === "undefined" || prefetched) return;
  prefetched = true;
  const run = () => {
    prefetchAppTab("tasks");
    prefetchAppTab("profile");
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    globalThis.setTimeout(run, 2500);
  }
}

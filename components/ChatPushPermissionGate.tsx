"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChatPushPermissionBanner } from "@/components/PushPermissionPrompt";

/** Chỉ hiện banner trên màn chat cụ thể — không hiện ở inbox/tab tin nhắn (tránh trùng) */
export default function ChatPushPermissionGate() {
  const pathname = usePathname() || "";

  const isChatScreen = useMemo(
    () =>
      /^\/chat\/[^/]+/.test(pathname) ||
      /^\/groups\/[^/]+/.test(pathname) ||
      /^\/stranger\/[^/]+/.test(pathname) ||
      /^\/rooms\/[^/]+/.test(pathname),
    [pathname]
  );

  if (!isChatScreen) return null;
  return <ChatPushPermissionBanner />;
}

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChatPushPermissionBanner } from "@/components/PushPermissionPrompt";

export default function ChatPushPermissionGate() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();

  const isChatScreen = useMemo(
    () =>
      pathname === "/chat" ||
      pathname === "/messages" ||
      /^\/chat\/[^/]+/.test(pathname) ||
      /^\/groups\/[^/]+/.test(pathname) ||
      /^\/stranger\/[^/]+/.test(pathname) ||
      /^\/rooms\/[^/]+/.test(pathname) ||
      (pathname === "/" && searchParams.get("tab") === "messages"),
    [pathname, searchParams]
  );

  if (!isChatScreen) return null;
  return <ChatPushPermissionBanner />;
}

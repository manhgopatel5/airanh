"use client";

import dynamic from "next/dynamic";

// ⚠️ QUAN TRỌNG: disable SSR hoàn toàn
const ChatPage = dynamic(() => import("../chat/page"), {
  ssr: false,
});

export default function MessagesPage() {
  return <ChatPage />;
}

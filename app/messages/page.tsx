"use client";

import dynamic from "next/dynamic";

// ✅ giờ dùng ssr:false OK
const ChatClient = dynamic(() => import("../chat/ChatClient"), {
  ssr: false,
});

export default function MessagesPage() {
  return <ChatClient />;
}

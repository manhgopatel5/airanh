"use client";

import { useSearchParams } from "next/navigation";

export default function ChatClient() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  if (!userId) {
    return <div>Chưa chọn người chat</div>;
  }

  // ⚠️ chỗ này mới là nơi mày query Firestore
  return <div>Chat với {userId}</div>;
}

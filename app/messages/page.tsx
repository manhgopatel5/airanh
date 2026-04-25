import dynamic from "next/dynamic";

// ✅ dùng chung component
const ChatClient = dynamic(() => import("../chat/ChatClient"), {
  ssr: false,
});

export default function MessagesPage() {
  return <ChatClient />;
}

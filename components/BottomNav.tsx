"use client";
import { useRouter } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 z-50 shadow-md">
      <button onClick={() => router.push("/")}>🏠</button>
      <button onClick={() => router.push("/tasks")}>📋</button>
      <button className="text-green-500">➕</button>
      <button onClick={() => router.push("/chat")}>💬</button>
      <button onClick={() => router.push("/profile")}>👤</button>
    </div>
  );
}
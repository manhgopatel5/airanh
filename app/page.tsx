"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isLogin = localStorage.getItem("user");

    if (!isLogin) {
      router.replace("/login"); // 🔥 dùng replace thay vì push
    }
  }, []);

  return null;
}

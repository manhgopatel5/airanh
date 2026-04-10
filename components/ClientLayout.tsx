"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");

    // 🚨 CHẶN khi chưa login
    if (!user && !["/login", "/register"].includes(pathname)) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [pathname]);

  // ⛔ chưa check xong
  if (!ready) return null;

  // 🔥 ẨN NAVBAR Ở LOGIN/REGISTER
  const hideNav = ["/login", "/register"].includes(pathname);

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}

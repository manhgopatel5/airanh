"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");

    // 🔥 CHỈ redirect khi thực sự cần
    if (!user && !["/login", "/register"].includes(pathname)) {
      router.replace("/login");
    }

    setChecked(true);
  }, [pathname]);

  // ⛔ tránh render sớm gây lỗi
  if (!checked) return null;

  const hideNav = ["/login", "/register"].includes(pathname);

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}

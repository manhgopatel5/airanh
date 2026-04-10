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

    if (!user && !["/login", "/register"].includes(pathname)) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [pathname]);

  if (!ready) return null;

  const hideNav = ["/login", "/register"].includes(pathname);

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // ❌ Ẩn ở login/register
  const hideNavbar =
    pathname === "/login" || pathname === "/register";

  return (
    <>
      {children}
      {!hideNavbar && <BottomNav />}
    </>
  );
}

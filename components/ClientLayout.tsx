"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }: any) {
  const pathname = usePathname();

  const publicRoutes = ["/login", "/register"];
  const hideNav = publicRoutes.includes(pathname);

  return (
    <div className="pb-20">
      {children}
      {!hideNav && <BottomNav />}
    </div>
  );
}
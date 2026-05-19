"use client";

import { usePathname, useRouter } from "next/navigation";
import FCMProvider from "@/components/FCMProvider";
import { useEffect, useMemo, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Dùng ref để ghi nhớ xem app đã từng load thành công lần đầu chưa
  const hasInitiallyLoaded = useRef(false);

  const publicRoutes = ["/login", "/register", "/forgot-password", "/verify-email", "/terms", "/privacy"];

  const isPublic = useMemo(
    () => publicRoutes.some((r) => pathname.startsWith(r)),
    [pathname]
  );

  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace("/login");
    }
  }, [user, loading, isPublic, router]);

  // Đánh dấu đã qua được bước tải đầu tiên khi mở ứng dụng
  if (!loading && !hasInitiallyLoaded.current) {
    hasInitiallyLoaded.current = true;
  }

  /* ================= LOADING THÔNG MINH ================= */
  // CHỈ chặn màn hình bằng `return null` ĐÚNG 1 LẦN DUY NHẤT lúc vừa mở app.
  // Khi người dùng chuyển đổi tab, qua lại giữa các trang, tuyệt đối KHÔNG chặn null nữa để triệt tiêu chớp nháy.
  if (loading && !hasInitiallyLoaded.current) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors font-sans">
      {user && <FCMProvider userId={user.uid} />}

      <div className={!isChatDetail && !isCreate ? "pb-24" : ""}>
        {children}
      </div>

      {/* NÂNG CẤP: 
          Nếu đang ở trang chủ "/", ta sử dụng thanh BottomNav tích hợp sẵn bằng State của file page.tsx để có hiệu ứng trượt.
          Nếu đi vào các trang sâu hơn (như chat detail, create...), ta mới dùng BottomNav cũ này. */}
      {pathname !== "/" && !isPublic && user && !isChatDetail && !isCreate && (
        <BottomNav />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          className: "text-sm font-sans",
          duration: 3000,
        }}
      />
    </div>
  );
}

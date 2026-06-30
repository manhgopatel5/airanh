"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/adminAuth";
import { FiArrowLeft, FiFlag, FiCalendar } from "react-icons/fi";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = isAdminUser(user?.uid, user?.email);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0a84ff] border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-lg font-bold text-red-500">403 — Không có quyền truy cập</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const tabs = [
    { href: "/admin/reports", label: "Báo cáo", icon: FiFlag },
    { href: "/admin/events", label: "Sự kiện", icon: FiCalendar },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-white">
      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button type="button" onClick={() => router.back()} className="-ml-2 flex h-8 w-8 items-center justify-center">
            <FiArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold">Quản trị hệ thống</h1>
            <p className="text-xs text-zinc-500">Xử lý báo cáo và nội dung</p>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-[#0a84ff] text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}

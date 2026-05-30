"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading &&!user) router.replace("/login");
    if (!loading && userData?.onboardingCompleted) router.replace("/");
  }, [loading, user, userData, router]);

  if (loading ||!user) {
    return (
      <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md px-5 pt-20">
          <div className="h-14 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
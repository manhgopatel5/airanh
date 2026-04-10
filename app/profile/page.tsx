"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";

export default function Profile() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // 🔥 CHẶN USER
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Profile</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}

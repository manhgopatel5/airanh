"use client";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
const handleLogout = async () => {
  const auth = getAuth();
  await signOut(auth);
  router.push("/login");
};
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

    {/* 👇 THÊM Ở ĐÂY */}
    <button
      onClick={handleLogout}
      className="mt-4 bg-black text-white px-4 py-2 rounded"
    >
      Logout
    </button>
  </div>
);
}

"use client";

import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";

export default function Profile() {
  const router = useRouter(); // ✅ phải nằm trong component
  const { user, loading } = useAuth();

  // ✅ function phải nằm TRONG component
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push("/login");
  };

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

      <button
        onClick={handleLogout}
        className="mt-4 bg-black text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}

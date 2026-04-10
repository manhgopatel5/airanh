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
if (!user) return null;

return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-96 text-center">
      
      <h1 className="text-2xl font-bold text-blue-600 mb-4">
        Profile
      </h1>

      <p className="mb-6 text-gray-700">
        Email: <span className="font-semibold">{user.email}</span>
      </p>

      <button
        onClick={handleLogout}
        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg w-full"
      >
        Logout
      </button>
    </div>
  </div>
);
}

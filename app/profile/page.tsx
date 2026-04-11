"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔐 check login
  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user]);

  // 📥 lấy dữ liệu user
  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setUserData(snap.data());
      }

      setLoading(false);
    };

    fetchUser();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg text-center">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
          {user.email?.charAt(0).toUpperCase()}
        </div>

        <h1 className="text-xl font-bold text-blue-600 mb-2">
          Thông tin tài khoản
        </h1>

        <p className="text-gray-600 mb-6">
          {userData?.email || user.email}
        </p>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

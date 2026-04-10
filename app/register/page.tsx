"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = () => {
    alert("CLICK REGISTER");

    if (!email || !password) return;

    localStorage.setItem("user", "true");
    router.replace("/tasks");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto mt-20 bg-white p-6 rounded-2xl shadow-lg relative z-50">
        <h2 className="text-xl font-bold mb-4">Đăng ký</h2>

        <input
          placeholder="Email"
          className="w-full border p-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          className="w-full border p-2 mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="w-full bg-green-500 text-white p-2 rounded"
        >
          Register
        </button>
      </div>
    </div>
  );
}

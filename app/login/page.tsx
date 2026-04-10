"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();
  const auth = getAuth(app);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/profile");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-xl w-96 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center text-blue-600">
          Đăng nhập tài khoản
        </h1>

        {/* EMAIL */}
        <div className="flex items-center border p-3 rounded-lg">
          <span className="mr-2">📧</span>
          <input
            type="email"
            placeholder="Email"
            className="outline-none w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* PASSWORD */}
        <div className="flex items-center border p-3 rounded-lg">
          <span className="mr-2">🔒</span>
          <input
            type="password"
            placeholder="Mật khẩu"
            className="outline-none w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-lg"
        >
          Đăng nhập
        </button>

        <p className="text-sm text-center">
          Chưa có tài khoản?{" "}
          <a href="/register" className="text-blue-600 underline">
            Đăng ký
          </a>
        </p>
      </form>
    </div>
  );
}

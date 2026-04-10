"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = () => {
    if (!email || !password) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    localStorage.setItem("user", "true");

    // ✅ FIX 404
    router.push("/tasks");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 pb-24">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg">
        
        <h2 className="text-2xl font-bold text-center mb-2">
          Đăng ký
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Tạo tài khoản mới
        </p>

        {/* Email */}
        <div className="flex items-center border p-3 rounded-lg mb-4">
          <FiMail className="mr-2 text-gray-500" />
          <input
            type="email"
            placeholder="Email"
            className="w-full outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="flex items-center border p-3 rounded-lg mb-4">
          <FiLock className="mr-2 text-gray-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
            className="w-full outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 text-gray-500"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        <button
          onClick={handleRegister}
          disabled={!email || !password}
          className="w-full bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600 transition disabled:opacity-50"
        >
          Đăng ký
        </button>

        <p className="text-center text-sm mt-4">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-blue-500 font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

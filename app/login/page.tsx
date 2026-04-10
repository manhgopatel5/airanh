"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          Đăng nhập
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Chào mừng bạn quay lại!
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
        <div className="flex items-center border p-3 rounded-lg mb-2">
          <FiLock className="mr-2 text-gray-500" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
            className="w-full outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Show/Hide */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        {/* Forgot password */}
        <div className="text-right mb-4">
          <Link href="/forgot-password" className="text-sm text-blue-500">
            Quên mật khẩu?
          </Link>
        </div>

       <button
  onClick={() => {
    if (!email || !password) {
      alert("Vui lòng nhập email và mật khẩu!");
      return;
    }

    localStorage.setItem("user", "true");
    router.push("/");
  }}
  disabled={!email || !password}
  className="w-full bg-blue-500 text-white p-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
>
  Đăng nhập
</button>

        {/* Register */}
        <p className="text-center text-sm mt-4">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-blue-500 font-semibold">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}

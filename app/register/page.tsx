"use client";
import { useState } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import Link from "next/link";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-white px-4">
      <div className="w-full max-w-md space-y-5">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-blue-600">
            Đăng ký tài khoản
          </h1>
          <p className="text-gray-500 text-sm">
            Hãy bắt đầu với JodoJob nhé!
          </p>
        </div>

        {/* Role */}
        <div className="text-center text-blue-600 font-medium">
          Vai trò: Người tìm việc ▼
        </div>

        {/* Input Email */}
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow">
          <FiMail className="text-blue-500 mr-2" />
          <input
            className="w-full outline-none"
            placeholder="Email"
            onChange={(e)=>setEmail(e.target.value)}
          />
        </div>

        {/* Input Password */}
        <div className="flex items-center bg-white rounded-2xl px-4 py-3 shadow">
          <FiLock className="text-blue-500 mr-2" />
          <input
            type="password"
            className="w-full outline-none"
            placeholder="Mật khẩu"
            onChange={(e)=>setPassword(e.target.value)}
          />
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" />
          <p>
            Tôi đồng ý với <span className="text-blue-500">Điều khoản</span> &{" "}
            <span className="text-blue-500">Chính sách</span>
          </p>
        </div>

        {/* Button */}
        <button className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500">
          Đăng ký
        </button>

        {/* Link */}
        <p className="text-center text-sm">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-blue-500 font-medium">
            Đăng nhập
          </Link>
        </p>

      </div>
    </div>
  );
}

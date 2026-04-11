"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) {
      alert("Nhập đầy đủ!");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/tasks");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <h1 className="text-center text-2xl font-bold text-blue-600 mb-2">
          Đăng ký tài khoản
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Hãy bắt đầu với JodoJob nhé!
        </p>

        {/* Email */}
        <div className="flex items-center bg-white rounded-full px-4 py-3 mb-4 shadow">
          <FiMail className="text-gray-400 mr-2" />
          <input
            type="email"
            placeholder="Email"
            className="w-full outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="flex items-center bg-white rounded-full px-4 py-3 mb-4 shadow">
          <FiLock className="text-gray-400 mr-2" />
          <input
            type={show ? "text" : "password"}
            placeholder="Mật khẩu"
            className="w-full outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={() => setShow(!show)}>
            {show ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        {/* Checkbox */}
        <div className="flex items-center mb-4 text-sm">
          <input type="checkbox" className="mr-2" />
          Tôi đồng ý với Điều khoản & Chính sách
        </div>

        {/* Button */}
        <button
          onClick={handleRegister}
          className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500"
        >
          Đăng ký
        </button>

        <p className="text-center mt-4 text-sm">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-blue-500">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

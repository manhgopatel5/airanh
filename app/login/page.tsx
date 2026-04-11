"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Nhập đầy đủ!");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/tasks");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        
        {/* Title */}
        <h1 className="text-center text-2xl font-bold text-blue-600 mb-2">
          Đăng nhập tài khoản
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Chào mừng bạn quay lại JodoJob!
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

        {/* Button */}
        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* Links */}
        <p className="text-center mt-4 text-sm">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-blue-500">
            Đăng ký
          </Link>
        </p>

        <p className="text-center text-sm text-blue-500 mt-1">
          Quên mật khẩu?
        </p>
      </div>
    </div>
  );
}

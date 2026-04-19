"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase.client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import InstallPrompt from "@/components/InstallPrompt"; // ✅ THÊM

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log("CLICK LOGIN");

    if (!email || !password) {
      alert("Nhập đầy đủ thông tin!");
      return;
    }

    try {
      setLoading(true);

      const res = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("LOGIN SUCCESS:", res.user);

      if (res.user) {
        const userRef = doc(db, "users", res.user.uid);
        const snap = await getDoc(userRef);

        // 🆕 nếu chưa có user trong Firestore
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: res.user.uid,
            name: res.user.email || "User",
            avatar: "",
            shortId: res.user.uid.slice(0, 6),
            online: true,
            createdAt: Date.now(),
          });
        } else {
          const data = snap.data();

          if (!data.shortId) {
            await updateDoc(userRef, {
              shortId: res.user.uid.slice(0, 6),
            });
          }

          await updateDoc(userRef, {
            online: true,
          });
        }

        router.replace("/");
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 🔥 PWA Install Prompt */}
      <InstallPrompt />

      <div className="min-h-screen bg-[#f3f6fb] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-center text-2xl font-bold text-blue-600 mb-2">
            Đăng nhập tài khoản
          </h1>

          <p className="text-center text-gray-500 mb-6">
            Chào mừng bạn quay lại!
          </p>

          {/* Email */}
          <div className="flex items-center bg-white rounded-full px-4 py-3 mb-4 shadow">
            <FiMail className="mr-2 text-gray-400" />
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
            <FiLock className="mr-2 text-gray-400" />
            <input
              type={show ? "text" : "password"}
              placeholder="Mật khẩu"
              className="w-full outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="ml-2"
            >
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {/* Button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-full text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>

          <p className="text-center mt-4 text-sm">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-blue-500">
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

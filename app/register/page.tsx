"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = getAuth(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("CLICK REGISTER");

    if (!email || !password) {
      alert("Nhập email và password");
      return;
    }

    try {
      const user = userCredential.user;

// 🔥 LƯU FIRESTORE
await setDoc(doc(db, "users", user.uid), {
  email: user.email,
  createdAt: new Date(),
});
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("SUCCESS:", userCredential.user);

      // 📧 gửi email xác minh
      await sendEmailVerification(userCredential.user);

      alert("Đăng ký thành công! Kiểm tra email.");

      router.push("/login");
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

 return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200">
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-2xl shadow-xl w-96 flex flex-col gap-4"
    >
      <h1 className="text-2xl font-bold text-center text-blue-600">
        Đăng ký tài khoản
      </h1>

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
        Đăng ký
      </button>

      <p className="text-sm text-center">
        Đã có tài khoản?{" "}
        <a href="/login" className="text-blue-600 underline">
          Đăng nhập
        </a>
      </p>
    </form>
  </div>
);
}

"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = getAuth(app);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("CLICK LOGIN");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("LOGIN SUCCESS:", userCredential.user);

      alert("Đăng nhập thành công");

      router.push("/profile"); // hoặc dashboard
    } catch (error: any) {
      console.error(error);

      // xử lý lỗi dễ hiểu
      if (error.code === "auth/user-not-found") {
        alert("Email chưa đăng ký");
      } else if (error.code === "auth/wrong-password") {
        alert("Sai mật khẩu");
      } else {
        alert(error.message);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={handleLogin}
        className="flex flex-col gap-4 p-8 rounded-2xl shadow-lg w-96 bg-white"
      >
        <h1 className="text-xl font-bold text-center">Đăng nhập</h1>

        <input
  type="email"
  placeholder="Email"
  className="border p-3 rounded-lg"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

        <input
  type="password"
  placeholder="Mật khẩu"
  className="border p-3 rounded-lg"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

       <button
  type="submit"
  className="bg-black text-white p-3 rounded-lg hover:opacity-80 transition"
>
  Đăng nhập
</button>
      </form>
    </div>
  );
}

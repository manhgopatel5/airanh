"use client";

import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = getAuth(app);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    console.log("CLICK REGISTER"); // 👈 check

    try {
      const user = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("SUCCESS:", user);
      alert("Đăng ký thành công");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Register</button>
    </form>
  );
}

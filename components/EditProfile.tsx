"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { FiCheck, FiLoader } from "react-icons/fi";

type Props = {
  currentName: string;
  onClose?: () => void;
};

const BAD_WORDS = ["admin", "mod", "support", "đm", "vcl", "dm"];

export default function EditProfile({ currentName, onClose }: Props) {
  const { user } = useAuth();

  // 🔥 lấy firebase đúng cách
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();

  const [name, setName] = useState(currentName || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  const validate = useCallback((val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return "Tên không được để trống";
    if (trimmed.length < 2) return "Tên phải có ít nhất 2 ký tự";
    if (trimmed.length > 30) return "Tên không quá 30 ký tự";
    if (BAD_WORDS.some((w) => trimmed.toLowerCase().includes(w))) {
      return "Tên chứa từ không phù hợp";
    }
    return "";
  }, []);

  const errorMsg = touched ? validate(name) : "";

  const save = useCallback(async () => {
    const trimmed = name.trim();
    const err = validate(trimmed);

    if (err) {
      setError(err);
      setTouched(true);
      return;
    }

    if (trimmed === currentName) {
      onClose?.();
      return;
    }

    if (!user) {
      setError("Bạn chưa đăng nhập");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await Promise.all([
        updateProfile(auth.currentUser!, { displayName: trimmed }),
        setDoc(
          doc(db, "users", user.uid),
          {
            name: trimmed,
            searchKeywords: trimmed.toLowerCase().split(" "),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      ]);

      setSuccess(true);
      setTimeout(() => onClose?.(), 800);
    } catch (err) {
      setError("Có lỗi xảy ra, thử lại sau");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [name, currentName, user, validate, onClose, auth, db]);

  const isValid = !validate(name.trim()) && name.trim() !== currentName;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">
          Tên hiển thị
        </label>

        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSuccess(false);
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Nhập tên của bạn"
          maxLength={30}
          autoFocus
          className={`w-full px-4 py-3 rounded-2xl border bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all ${
            errorMsg
              ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-200 dark:border-zinc-700 focus:ring-blue-500/20 focus:border-blue-500"
          }`}
        />

        <div className="flex items-center justify-between mt-1.5 px-1">
          <p className="text-xs text-red-500 h-4">{errorMsg || error}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            {name.length}/30
          </p>
        </div>
      </div>

      <button
        onClick={save}
        disabled={loading || success || !isValid}
        className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
          success
            ? "bg-emerald-500 text-white"
            : loading || !isValid
            ? "bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
        }`}
      >
        {loading ? (
          <>
            <FiLoader className="animate-spin" size={18} />
            Đang lưu...
          </>
        ) : success ? (
          <>
            <FiCheck size={18} />
            Đã cập nhật
          </>
        ) : (
          "Lưu thay đổi"
        )}
      </button>
    </div>
  );
}
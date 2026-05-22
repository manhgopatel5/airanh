"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { FiCheck, FiLoader, FiArrowLeft } from "react-icons/fi";
import { Mail, Phone, AtSign } from "lucide-react";
import { toast, Toaster } from "sonner";

const BAD_WORDS = ["admin", "mod", "support", "đm", "vcl", "dm"];

export default function ProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();

  const [currentData, setCurrentData] = useState({
    name: "",
    email: "",
    phone: "",
    userId: ""
  });
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentData({
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          userId: data.userId || ""
        });
        setName(data.name || "");
      }
    });
    return () => unsub();
  }, [user?.uid, db, user?.email]);

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
  const isValid = !validate(name.trim()) && name.trim() !== currentData.name;

  const save = useCallback(async () => {
    const trimmed = name.trim();
    const err = validate(trimmed);

    if (err) {
      setError(err);
      setTouched(true);
      return;
    }

    if (trimmed === currentData.name) {
      router.back();
      return;
    }

    if (!user || !auth.currentUser) {
      setError("Bạn chưa đăng nhập");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await Promise.all([
        updateProfile(auth.currentUser, { displayName: trimmed }),
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
      if ("vibrate" in navigator) navigator.vibrate(8);
      toast.success("Đã cập nhật tên");
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setError("Có lỗi xảy ra, thử lại sau");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [name, currentData.name, user, validate, auth, db, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans">
      <Toaster richColors position="top-center" />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:opacity-50">
            <FiArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Thông tin cá nhân</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-4">
        {/* Card Tên */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-500 mb-2 uppercase">
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
              className={`w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0`}
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-red-500 h-4">{errorMsg || error}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600">
                {name.length}/30
              </p>
            </div>
          </div>
          <div className="h-px bg-gray-100 dark:bg-zinc-800 ml-4" />
          <button
            onClick={save}
            disabled={loading || success || !isValid}
            className={`w-full px-4 py-3.5 text-left flex items-center justify-between active:bg-gray-50 dark:active:bg-zinc-800 transition ${
              success
                ? "text-emerald-600 dark:text-emerald-500"
                : loading || !isValid
                ? "text-gray-400 dark:text-zinc-600"
                : "text-blue-500"
            }`}
          >
            <span className="text-base font-semibold">
              {loading ? "Đang lưu..." : success ? "Đã cập nhật" : "Lưu thay đổi"}
            </span>
            {loading ? (
              <FiLoader className="animate-spin w-4 h-4" />
            ) : success ? (
              <FiCheck className="w-4 h-4" />
            ) : null}
          </button>
        </div>

        {/* Card Email - Read Only */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">Email</div>
              <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                {currentData.email || "Chưa có"}
              </div>
            </div>
          </div>
        </div>

        {/* Card SĐT - Read Only */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">Số điện thoại</div>
              <div className="text-base font-medium text-gray-900 dark:text-white">
                {currentData.phone || "Chưa xác thực"}
              </div>
            </div>
          </div>
        </div>

        {/* Card UserID - Read Only */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <AtSign className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-zinc-500">ID người dùng</div>
              <div className="text-base font-medium text-gray-900 dark:text-white">
                @{currentData.userId || "---"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
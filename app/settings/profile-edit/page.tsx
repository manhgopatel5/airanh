"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { FiLoader, FiArrowLeft } from "react-icons/fi";
import { Mail, Phone, AtSign, Calendar, User2, MapPin, ChevronRight } from "lucide-react";
import { toast, Toaster } from "sonner";

const BAD_WORDS = ["admin", "mod", "support", "đm", "vcl", "dm"];

type EditField = "name" | "dob" | "gender" | "address" | null;

export default function ProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();

  const [currentData, setCurrentData] = useState({
    name: "",
    email: "",
    phone: "",
    userId: "",
    dob: "",
    gender: "",
    address: ""
  });
  
  const [editingField, setEditingField] = useState<EditField>(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const newData = {
          name: data.name || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          userId: data.userId || "",
          dob: data.dob || "",
          gender: data.gender || "",
          address: data.address || ""
        };
        setCurrentData(newData);
        setName(newData.name);
        setDob(newData.dob);
        setGender(newData.gender);
        setAddress(newData.address);
      }
    });
    return () => unsub();
  }, [user?.uid, db, user?.email]);

  const validateName = useCallback((val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return "Tên không được để trống";
    if (trimmed.length < 2) return "Tên phải có ít nhất 2 ký tự";
    if (trimmed.length > 30) return "Tên không quá 30 ký tự";
    if (BAD_WORDS.some((w) => trimmed.toLowerCase().includes(w))) {
      return "Tên chứa từ không phù hợp";
    }
    return "";
  }, []);

  const hasChanges = () => {
    return (
      name.trim() !== currentData.name ||
      dob !== currentData.dob ||
      gender !== currentData.gender ||
      address.trim() !== currentData.address
    );
  };

  const save = useCallback(async () => {
    const trimmedName = name.trim();
    const err = validateName(trimmedName);

    if (err) {
      setError(err);
      setTouched(true);
      return;
    }

    if (!hasChanges()) {
      setEditingField(null);
      return;
    }

    if (!user || !auth.currentUser) {
      setError("Bạn chưa đăng nhập");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (trimmedName !== currentData.name) {
        updateData.name = trimmedName;
        updateData.searchKeywords = trimmedName.toLowerCase().split(" ");
        await updateProfile(auth.currentUser, { displayName: trimmedName });
      }
      if (dob !== currentData.dob) updateData.dob = dob;
      if (gender !== currentData.gender) updateData.gender = gender;
      if (address.trim() !== currentData.address) updateData.address = address.trim();

      await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

      if ("vibrate" in navigator) navigator.vibrate(8);
      toast.success("Đã cập nhật thông tin");
      setEditingField(null);
      setTouched(false);
    } catch (err) {
      setError("Có lỗi xảy ra, thử lại sau");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [name, dob, gender, address, currentData, user, validateName, auth, db]);

  if (!user) return null;

  const renderField = (
    field: EditField,
    label: string,
    value: string,
    icon: any,
    iconColor: string,
    type: "text" | "date" | "select" = "text",
    placeholder?: string,
    options?: { value: string; label: string }[]
  ) => {
    const isEditing = editingField === field;
    const Icon = icon;

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden">
        <button
          onClick={() => !isEditing && setEditingField(field)}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 dark:active:bg-zinc-800 transition text-left"
        >
          <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 dark:text-zinc-500">{label}</div>
            {isEditing ? (
              type === "select" ? (
                <select
                  value={field === "gender" ? gender : ""}
                  onChange={(e) => setGender(e.target.value)}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white focus:outline-none focus:ring-0"
                >
                  <option value="">Chọn giới tính</option>
                  {options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : type === "date" ? (
                <input
                  type="date"
                  value={field === "dob" ? dob : ""}
                  onChange={(e) => setDob(e.target.value)}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white focus:outline-none focus:ring-0"
                />
              ) : (
                <input
                  value={field === "name" ? name : field === "address" ? address : ""}
                  onChange={(e) => {
                    if (field === "name") setName(e.target.value);
                    if (field === "address") setAddress(e.target.value);
                  }}
                  onBlur={() => field === "name" && setTouched(true)}
                  placeholder={placeholder}
                  maxLength={field === "name" ? 30 : undefined}
                  autoFocus
                  className="w-full text-base font-medium bg-transparent border-0 p-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                />
              )
            ) : (
              <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                {value || "Chưa cập nhật"}
              </div>
            )}
          </div>
          {!isEditing && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-zinc-600 flex-shrink-0" />}
        </button>
        {isEditing && field === "name" && (
          <>
            <div className="px-4 flex items-center justify-between pb-2">
              <p className="text-xs text-red-500 h-4">{touched ? validateName(name) : ""}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600">{name.length}/30</p>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans pb-24">
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
      <div className="px-4 mt-6 space-y-3">
        {/* TÊN HIỂN THỊ */}
        {renderField(
          "name",
          "TÊN HIỂN THỊ",
          currentData.name,
          User2,
          "text-blue-500",
          "text",
          "Nhập tên của bạn"
        )}

        {/* Nút Lưu thay đổi - chỉ hiện khi đang edit */}
        {editingField && (
          <button
            onClick={save}
            disabled={loading || !hasChanges() || (editingField === "name" && !!validateName(name))}
            className={`w-full px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
              loading || !hasChanges() || (editingField === "name" && !!validateName(name))
                ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            }`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        )}

        {/* EMAIL - Read Only */}
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

        {/* SĐT - Read Only */}
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

        {/* ID - Read Only */}
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

        {/* NGÀY SINH */}
        {renderField(
          "dob",
          "Ngày sinh",
          currentData.dob ? new Date(currentData.dob).toLocaleDateString("vi-VN") : "",
          Calendar,
          "text-orange-500",
          "date"
        )}

        {/* GIỚI TÍNH */}
        {renderField(
          "gender",
          "Giới tính",
          currentData.gender === "male" ? "Nam" : currentData.gender === "female" ? "Nữ" : currentData.gender === "other" ? "Khác" : "",
          User2,
          "text-pink-500",
          "select",
          undefined,
          [
            { value: "male", label: "Nam" },
            { value: "female", label: "Nữ" },
            { value: "other", label: "Khác" }
          ]
        )}

        {/* ĐỊA CHỈ */}
        {renderField(
          "address",
          "Địa chỉ",
          currentData.address,
          MapPin,
          "text-red-500",
          "text",
          "Nhập địa chỉ của bạn"
        )}
      </div>
    </div>
  );
}
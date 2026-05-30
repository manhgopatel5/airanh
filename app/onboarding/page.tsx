"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FiUser, FiCamera, FiFileText, FiTag, FiCheck, FiArrowRight, FiSkipForward } from "react-icons/fi";

import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import HuhaLogo from "@/components/brand/HuhaLogo";
import ProgressBar from "@/components/onboarding/ProgressBar";

const INTERESTS = [
  "Công nghệ", "Thiết kế", "Marketing", "Kinh doanh", "Âm nhạc", "Phim ảnh",
  "Du lịch", "Thể thao", "Ẩm thực", "Game", "Đọc sách", "Nhiếp ảnh"
];

const sanitizeUsername = (name: string) => {
  return name
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/\s+/g, "")
   .replace(/[^a-z0-9_]/g, "")
   .slice(0, 20);
};

export default function OnboardingPage() {
  const { user, userData, loading, refreshToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [form, setForm] = useState({
    username: "",
    bio: "",
    photoURL: "",
    interests: [] as string[],
  });
  const [errors, setErrors] = useState({
    username: "",
    bio: "",
  });

  useEffect(() => {
    if (!loading &&!user) router.replace("/login");
    if (!loading && userData?.onboardingCompleted) router.replace("/");
  }, [loading, router, user, userData]);

  useEffect(() => {
    if (user && userData) {
      setForm({
        username: userData.username || sanitizeUsername(user.displayName || user.email?.split("@")[0] || "user"),
        bio: userData.bio || "",
        photoURL: userData.photoURL || user.photoURL || "",
        interests: userData.interests || [],
      });
    }
  }, [user, userData]);

  const totalSteps = 4;

  const validateUsername = async (username: string) => {
    if (username.length < 3) return "Username tối thiểu 3 ký tự";
    if (username === "Ẩn danh") return "Không được dùng username này";

    setCheckingUsername(true);
    try {
      const db = getFirebaseDB();
      const snap = await getDoc(doc(db, "usernames", username));
      if (snap.exists() && snap.data().uid!== user?.uid) {
        return "Username đã được sử dụng";
      }
      return "";
    } catch {
      return "Không kiểm tra được";
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = async (val: string) => {
    const cleaned = sanitizeUsername(val);
    setForm({...form, username: cleaned });
    if (cleaned.length >= 3) {
      const err = await validateUsername(cleaned);
      setErrors({...errors, username: err });
    } else {
      setErrors({...errors, username: "" });
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!form.username || form.username.length < 3) {
        setErrors({...errors, username: "Username tối thiểu 3 ký tự" });
        return;
      }
      const err = await validateUsername(form.username);
      if (err) {
        setErrors({...errors, username: err });
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    // Bước cuối: lưu hết
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Phiên đăng nhập hết hạn");
      router.push("/login");
      return;
    }

    setSaving(true);
    try {
      const db = getFirebaseDB();
      const userRef = doc(db, "users", currentUser.uid);

      const updates: any = {
        username: form.username,
        bio: form.bio.slice(0, 150),
        interests: form.interests,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      };

      if (form.photoURL && form.photoURL!== currentUser.photoURL) {
        await updateProfile(currentUser, { photoURL: form.photoURL });
        updates.photoURL = form.photoURL;
      }

      await updateDoc(userRef, updates);

      // Cập nhật usernames collection nếu đổi username
      if (form.username!== userData?.username) {
        await updateDoc(doc(db, "usernames", form.username), {
          uid: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }

      await refreshToken();
      toast.success(`Chào mừng đến Huha!`);
      router.refresh();
      router.replace("/");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error("Có lỗi xảy ra: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (step === totalSteps && form.interests.length < 3) {
      toast.error("Chọn ít nhất 3 sở thích");
      return;
    }
    if (step < totalSteps) setStep(step + 1);
    else handleNext();
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-8 dark:bg-zinc-950">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6"><HuhaLogo /></div>
          <div className="space-y-3">
            <div className="h-2 rounded-full bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
            <div className="h-32 rounded-2xl bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || userData?.onboardingCompleted) return null;

  return (
    <div className="min-h-dvh bg-zinc-50 px-5 pb-10 pt-8 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6"><HuhaLogo /></div>
        <ProgressBar step={step} total={totalSteps} />

        <AnimatePresence mode="wait">
          {/* STEP 1: USERNAME */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] shadow-lg shadow-[#0A84FF]/25">
                  <FiUser className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Tên người dùng</h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  Chọn username duy nhất để bạn bè tìm thấy bạn
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-400">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={form.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`h-14 w-full rounded-2xl border bg-white pl-10 pr-4 text-base font-bold text-zinc-900 outline-none transition focus:bg-white dark:bg-zinc-900 dark:text-white ${
                      errors.username? "border-red-400 focus:border-red-500" : "border-zinc-200 focus:border-[#0A84FF] dark:border-zinc-800"
                    }`}
                    maxLength={20}
                  />
                  {checkingUsername && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-[#0A84FF] border-t-transparent" />
                  )}
                </div>
                {errors.username && <p className="text-xs font-bold text-red-500">{errors.username}</p>}
                <p className="text-xs font-semibold text-zinc-500">Chỉ chữ thường, số và dấu _. Tối thiểu 3 ký tự</p>
              </div>

              <button
                onClick={handleNext}
                disabled={!form.username || form.username.length < 3 ||!!errors.username || checkingUsername}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-40"
              >
                Tiếp tục <FiArrowRight />
              </button>
            </motion.div>
          )}

          {/* STEP 2: AVATAR */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#34C759] to-[#30B94D] shadow-lg shadow-[#34C759]/25">
                  <FiCamera className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Ảnh đại diện</h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Thêm ảnh để mọi người nhận ra bạn</p>
              </div>

              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={form.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "User")}&background=0A84FF&color=fff&size=256`}
                    alt="Avatar"
                    className="h-32 w-32 rounded-3xl object-cover ring-4 ring-white dark:ring-zinc-900"
                  />
                  <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#0A84FF] text-white shadow-lg active:scale-95">
                    <FiCamera size={18} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // TODO: Upload Firebase Storage
                        const url = URL.createObjectURL(file);
                        setForm({...form, photoURL: url });
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleSkip} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <FiSkipForward /> Bỏ qua
                </button>
                <button onClick={handleNext} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 active:scale-[0.98]">
                  Tiếp tục <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: BIO */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF9500] to-[#FF7A00] shadow-lg shadow-[#FF9500]/25">
                  <FiFileText className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Giới thiệu</h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Viết vài dòng về bản thân</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Tiểu sử</label>
                <textarea
                  placeholder="Mình là..."
                  value={form.bio}
                  onChange={(e) => setForm({...form, bio: e.target.value })}
                  className="h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-4 text-base font-semibold text-zinc-900 outline-none transition focus:border-[#0A84FF] dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  maxLength={150}
                />
                <p className="text-right text-xs font-bold text-zinc-500">{form.bio.length}/150</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleSkip} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-base font-black text-zinc-700 transition active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  <FiSkipForward /> Bỏ qua
                </button>
                <button onClick={handleNext} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 active:scale-[0.98]">
                  Tiếp tục <FiArrowRight />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: INTERESTS */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-[#AF52DE] to-[#9B3FD6] shadow-lg shadow-[#AF52DE]/25">
                  <FiTag className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Sở thích</h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Chọn ít nhất 3 để kết nối với người cùng gu</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => {
                      const newInterests = form.interests.includes(interest)
                       ? form.interests.filter((i) => i!== interest)
                        : [...form.interests, interest];
                      setForm({...form, interests: newInterests });
                    }}
                    className={`rounded-2xl border-2 px-3 py-3 text-sm font-bold transition active:scale-95 ${
                      form.interests.includes(interest)
                       ? "border-[#0A84FF] bg-[#0A84FF]/10 text-[#0A84FF]"
                        : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={form.interests.length < 3 || saving}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-base font-black text-white shadow-lg shadow-[#0A84FF]/25 transition active:scale-[0.98] disabled:opacity-40"
              >
                {saving? "Đang lưu..." : <><FiCheck /> Hoàn tất</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
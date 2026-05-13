"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Ban, Clock, Send, CheckCircle2, Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { toast, Toaster } from "sonner";

type UserData = {
  banned: boolean;
  bannedUntil?: any;
  bannedReason?: string;
  bannedAt?: any;
  violationCount?: number;
  appealSent?: boolean;
};

export default function BannedPage() {
  const params = useSearchParams();
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const [user] = useAuthState(auth);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasAppealed, setHasAppealed] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);

  const until = params.get("until");

useEffect(() => {
  if (!user) {
    setLoading(false);
    return;
  }

    const fetchData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }

      // Check xem đã kháng cáo chưa
      const appealQuery = query(
        collection(db, "appeals"),
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      );
      const appealSnap = await getDocs(appealQuery);
      setHasAppealed(!appealSnap.empty);
      setLoading(false);
    };

    fetchData();
  }, [user, db]);

  const handleAppeal = async () => {
    if (!user ||!appealText.trim()) {
      toast.error("Vui lòng nhập nội dung kháng cáo");
      return;
    }

    if (appealText.trim().length < 20) {
      toast.error("Nội dung kháng cáo phải ít nhất 20 ký tự");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "appeals"), {
        userId: user.uid,
        userName: user.displayName || "Unknown",
        userEmail: user.email,
        reason: userData?.bannedReason || "Không rõ",
        appealText: appealText.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        violationCount: userData?.violationCount || 0,
      });

      toast.success("Đã gửi kháng cáo. Admin sẽ xem xét trong 24-48h");
      setHasAppealed(true);
      setShowAppealForm(false);
      setAppealText("");
    } catch (err) {
      console.error(err);
      toast.error("Gửi kháng cáo thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  const banEndDate = until
  ? new Date(Number(until))
  : userData?.bannedUntil &&
    typeof userData.bannedUntil.toDate === "function"
    ? userData.bannedUntil.toDate()
    : userData?.bannedUntil
      ? new Date(userData.bannedUntil)
      : null;
  const isPermanent =!banEndDate;
  const violationCount = userData?.violationCount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Ban className="w-10 h-10" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Tài khoản bị khóa</h1>
          <p className="text-white/90 text-sm">
            Vi phạm lần thứ {violationCount}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Ban info */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-200 mb-1">
                  Lý do khóa
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {userData?.bannedReason || "Vi phạm quy định cộng đồng"}
                </p>
              </div>
            </div>
          </div>

          {/* Thời gian */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                  Thời gian mở khóa
                </p>
                {isPermanent? (
                  <p className="font-semibold text-red-600">
                    Vĩnh viễn
                  </p>
                ) : (
                  <p className="font-semibold">
                    {banEndDate?.toLocaleString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kháng cáo */}
          <AnimatePresence mode="wait">
            {hasAppealed? (
              <motion.div
                key="appealed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-200">
                      Đã gửi kháng cáo
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Admin sẽ xem xét trong 24-48h
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : showAppealForm? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="w-4 h-4" />
                  Gửi kháng cáo
                </div>
                <textarea
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Giải thích lý do bạn cho rằng việc khóa tài khoản là không chính xác..."
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  rows={5}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    {appealText.length < 20? `Cần thêm ${20 - appealText.length} ký tự` : "Đã đủ ký tự"}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {appealText.length}/1000
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAppealForm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl font-medium transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAppeal}
                    disabled={submitting || appealText.length < 20}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                  >
                    {submitting? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Gửi kháng cáo
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAppealForm(true)}
                className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/30"
              >
                <MessageSquare className="w-5 h-5" />
                Gửi kháng cáo
              </motion.button>
            )}
          </AnimatePresence>

          {/* Lưu ý */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <b>Lưu ý:</b> Kháng cáo chỉ được chấp nhận nếu bạn có bằng chứng rõ ràng.
              Spam kháng cáo sẽ bị từ chối và có thể kéo dài thời gian khóa.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Copy, RefreshCw, Zap, Eye, EyeOff, KeyRound, Webhook } from "lucide-react";
import { toast, Toaster } from "sonner";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import { celebrate, loadingPull } from "@/components/illustrations";

export default function ApiPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setApiKey(data.settings?.apiKey ?? "");
        setWebhookUrl(data.settings?.webhookUrl ?? "");
      }
    });
    return () => unsub();
  }, [user?.uid, db]);

  const generateKey = async () => {
    if (!user) return;
    if (!confirm("Tạo key mới sẽ vô hiệu hóa key cũ. Tiếp tục?")) return;
    setGenerating(true);
    try {
      const newKey = `huha_${nanoid(32)}`;
      await updateDoc(doc(db, "users", user.uid), { "settings.apiKey": newKey });
      toast.success("Đã tạo API key mới");
      navigator.vibrate?.(10);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1200);
    } catch { toast.error("Không thể tạo key"); }
    finally { setGenerating(false); }
  };

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    toast.success("Đã copy");
    navigator.vibrate?.(5);
  };

  const saveWebhook = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { "settings.webhookUrl": webhookUrl });
    toast.success("Đã lưu webhook");
  };

  const testWebhook = async () => {
    if (!webhookUrl) return toast.error("Nhập URL webhook");
    setTesting(true);
    try {
      const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "test", timestamp: Date.now(), app: "huha" }) });
      if (!res.ok) throw new Error();
      toast.success("Webhook hoạt động");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1200);
    } catch { toast.error("Webhook lỗi"); }
    finally { setTesting(false); }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black pb-28">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-900">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] flex items-center justify-center shadow-lg shadow-[#0042B2]/20">
                <KeyRound className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tight">API & Webhook</h1>
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          {/* API KEY */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">API KEY</h2>
              <button onClick={() => setShowKey(v =>!v)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl">
                {showKey? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl font-mono text-sm mb-4 break-all border-zinc-200 dark:border-zinc-800">
              {apiKey? (showKey? apiKey : "•".repeat(40)) : <span className="text-zinc-400">Chưa tạo</span>}
            </div>
            <div className="flex gap-2.5">
              <motion.button whileTap={{ scale: 0.97 }} onClick={copyKey} disabled={!apiKey} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /> Copy
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={generateKey} disabled={generating} className="flex-1 h-11 rounded-2xl bg-[#0042B2] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#0042B2]/25">
                {generating? <LottiePlayer animationData={loadingPull} loop autoplay className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                {generating? "Đang tạo..." : "Tạo mới"}
              </motion.button>
            </div>
          </motion.div>

          {/* WEBHOOK */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-zinc-950 rounded-3xl border-zinc-200/60 dark:border-zinc-900 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Webhook className="w-4 h-4 text-zinc-500" />
              <h2 className="text-xs font-bold text-zinc-500 tracking-wider">WEBHOOK</h2>
            </div>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="w-full px-4 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2] mb-3" />
            <div className="flex gap-2.5">
              <motion.button whileTap={{ scale: 0.97 }} onClick={saveWebhook} className="flex-1 h-11 rounded-2xl bg-[#0042B2] text-white font-semibold shadow-lg shadow-[#0042B2]/25">Lưu</motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={testWebhook} disabled={testing ||!webhookUrl} className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {testing? <LottiePlayer animationData={loadingPull} loop autoplay className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {testing? "Testing..." : "Test"}
              </motion.button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">Webhook sẽ nhận POST khi có sự kiện task/plan mới</p>
          </motion.div>

          <div className="bg-[#E8F1FF] dark:bg-[#0042B2]/10 border-[#0042B2]/20 rounded-2xl p-4">
            <p className="text-xs text-[#0042B2] dark:text-[#8AB4F8] leading-relaxed">• Giữ API key bí mật\n• Key có quyền truy cập dữ liệu của bạn\n• Dùng header: Authorization: Bearer YOUR_KEY</p>
          </div>
        </div>

        {showSuccess && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-24 h-24" />
          </div>
        )}
      </div>
    </>
  );
}
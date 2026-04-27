"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Key, Copy, RefreshCw, Zap, Eye, EyeOff } from "lucide-react";
import { toast, Toaster } from "sonner";
import { nanoid } from "nanoid";

export default function ApiPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setApiKey(data.settings?.apiKey || "");
        setWebhookUrl(data.settings?.webhookUrl || "");
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const generateKey = async () => {
    if (!user) return;
    if (!confirm("Tạo key mới sẽ vô hiệu hóa key cũ. Tiếp tục?")) return;
    const newKey = `air_${nanoid(32)}`;
    await updateDoc(doc(db, "users", user.uid), { "settings.apiKey": newKey });
    toast.success("Đã tạo API key mới");
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success("Đã copy");
  };

  const saveWebhook = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { "settings.webhookUrl": webhookUrl });
    toast.success("Đã lưu webhook");
  };

  const testWebhook = async () => {
    if (!webhookUrl) return toast.error("Nhập URL webhook");
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "test", timestamp: Date.now() }),
      });
      toast.success("Webhook hoạt động");
    } catch {
      toast.error("Webhook lỗi");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">API & Webhook</h1>
      </div>

      <div className="px-6 space-y-6">
        {/* API Key */}
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-2">API KEY</div>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Khóa API</span>
              <button onClick={() => setShowKey(!showKey)} className="p-1.5">
                {showKey? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-black font-mono text-sm text-gray-900 dark:text-white mb-3">
              {apiKey? (showKey? apiKey : "•".repeat(40)) : "Chưa tạo"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyKey}
                disabled={!apiKey}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-800 font-semibold text-gray-900 dark:text-white active:scale-95 transition disabled:opacity-50"
              >
                <Copy className="w-4 h-4 inline mr-1.5" />
                Copy
              </button>
              <button
                onClick={generateKey}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-semibold active:scale-95 transition"
              >
                <RefreshCw className="w-4 h-4 inline mr-1.5" />
                Tạo mới
              </button>
            </div>
          </div>
        </div>

        {/* Webhook */}
        <div>
          <div className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-2">WEBHOOK</div>
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4">
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
              Nhận sự kiện realtime: task.created, plan.updated, chat.message...
            </p>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black text-gray-900 dark:text-white outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={saveWebhook}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-semibold active:scale-95 transition"
              >
                Lưu
              </button>
              <button
                onClick={testWebhook}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-zinc-800 font-semibold text-gray-900 dark:text-white active:scale-95 transition"
              >
                <Zap className="w-4 h-4 inline mr-1.5" />
                Test
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Docs:</strong> https://air.vn/docs/api
          </p>
        </div>
      </div>
    </div>
  );
}
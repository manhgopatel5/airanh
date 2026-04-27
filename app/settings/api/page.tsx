"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { ChevronLeft, Copy, RefreshCw, Zap, Eye, EyeOff } from "lucide-react";
import { toast, Toaster } from "sonner";
import { nanoid } from "nanoid";

export default function ApiPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();

  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showKey, setShowKey] = useState(false);

  // =====================
  // LOAD DATA
  // =====================
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      setApiKey(data.settings?.apiKey ?? "");
      setWebhookUrl(data.settings?.webhookUrl ?? "");
    });

    return () => unsub();
  }, [user?.uid, db]);

  // =====================
  // ACTIONS
  // =====================
  const generateKey = async () => {
    if (!user) return;

    if (!confirm("Tạo key mới sẽ vô hiệu hóa key cũ. Tiếp tục?")) return;

    try {
      const newKey = `air_${nanoid(32)}`;

      await updateDoc(doc(db, "users", user.uid), {
        "settings.apiKey": newKey,
      });

      toast.success("Đã tạo API key mới");
    } catch {
      toast.error("Không thể tạo key");
    }
  };

  const copyKey = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("Đã copy");
    } catch {
      toast.error("Copy thất bại");
    }
  };

  const saveWebhook = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        "settings.webhookUrl": webhookUrl,
      });

      toast.success("Đã lưu webhook");
    } catch {
      toast.error("Lưu thất bại");
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) return toast.error("Nhập URL webhook");

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          timestamp: Date.now(),
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Webhook hoạt động");
    } catch {
      toast.error("Webhook lỗi");
    }
  };

  // =====================
  // UI
  // =====================
  return (
    <div className="min-h-screen bg-white dark:bg-black pb-24 font-sans">
      <Toaster richColors position="top-center" />

      <div className="px-6 pt-12 pb-6 flex items-center gap-3 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-10">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 active:scale-90 transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-2xl font-extrabold">
          API & Webhook
        </h1>
      </div>

      <div className="px-6 space-y-6">
        {/* API KEY */}
        <div>
          <div className="text-xs font-bold mb-2">API KEY</div>

          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4">
            <div className="flex justify-between mb-3">
              <span className="font-semibold">Khóa API</span>

              <button onClick={() => setShowKey((v) => !v)}>
                {showKey ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="p-3 bg-white dark:bg-black rounded-xl font-mono mb-3">
              {apiKey
                ? showKey
                  ? apiKey
                  : "•".repeat(40)
                : "Chưa tạo"}
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyKey}
                disabled={!apiKey}
                className="flex-1 py-2 bg-gray-200 rounded-xl disabled:opacity-50"
              >
                <Copy className="inline w-4 mr-1" />
                Copy
              </button>

              <button
                onClick={generateKey}
                className="flex-1 py-2 bg-sky-500 text-white rounded-xl"
              >
                <RefreshCw className="inline w-4 mr-1" />
                Tạo mới
              </button>
            </div>
          </div>
        </div>

        {/* WEBHOOK */}
        <div>
          <div className="text-xs font-bold mb-2">WEBHOOK</div>

          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4">
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full px-4 py-3 rounded-xl mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={saveWebhook}
                className="flex-1 py-2 bg-sky-500 text-white rounded-xl"
              >
                Lưu
              </button>

              <button
                onClick={testWebhook}
                className="flex-1 py-2 bg-gray-200 rounded-xl"
              >
                <Zap className="inline w-4 mr-1" />
                Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/AuthContext";
import { getMessaging, getToken, isSupported, onMessage, deleteToken } from "firebase/messaging";
import { app, db } from "@/lib/firebase";
import { doc, setDoc, deleteField } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

type Props = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const fcmSetupRef = useRef(false);

  /* ================= ROUTE ================= */
  const publicRoutes = ["/login", "/register", "/reset-password"];
  const isPublic = useMemo(() => publicRoutes.some((r) => pathname.startsWith(r)), [pathname]);
  const isChatDetail = /^\/chat\/[^/]+$/.test(pathname);
  const isCreate = pathname.startsWith("/create");

  /* ================= REDIRECT ================= */
  useEffect(() => {
    if (user === undefined) return;
    setLoading(false);

    if (!user &&!isPublic) {
      router.replace("/login");
      return;
    }
    if (user && isPublic) {
      router.replace("/");
      return;
    }
  }, [user, isPublic, router]);

  /* ================= FCM SETUP + CLEANUP ================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!user) {
      localStorage.removeItem("fcmToken");
      return;
    }

    if (fcmSetupRef.current) return;
    fcmSetupRef.current = true;

    const setupFCM = async () => {
      try {
        const supported = await isSupported();
        if (!supported) return;

        await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        const messaging = getMessaging(app);

        onMessage(messaging, (payload) => {
          toast(`${payload.notification?.title}: ${payload.notification?.body}`, {
            icon: "🔔",
          });
        });

        const permission = await Notification.requestPermission();

        if (permission!== "granted") {
          await deleteToken(messaging);
          await setDoc(doc(db, "users", user.uid), { fcmToken: deleteField() }, { merge: true });
          localStorage.removeItem("fcmToken");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: "BNtLKVLAr2GZL6KI8iD7omOGwWbQw1w-IxAw061Do7loEcELfkyNIzLzgDsg9GRGVvwChReYcTqDdwrNGOv38",
        });

        if (!token) return;
        if (localStorage.getItem("fcmToken") === token) return;

        localStorage.setItem("fcmToken", token);
        await setDoc(doc(db, "users", user.uid), { fcmToken: token }, { merge: true });
        console.log("🔥 FCM TOKEN UPDATED");
      } catch (err) {
        console.log("FCM error:", err);
      }
    };

    setupFCM();
  }, [user?.uid]);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pt-8">
          <div className="flex justify-around pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="w-10 h-2 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse border border-gray-100 dark:border-zinc-800">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors">
      <div className={!isChatDetail &&!isCreate? "pb-24" : ""}>{children}</div>
      {!isPublic && user &&!isChatDetail &&!isCreate && <BottomNav />}
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'text-sm',
          duration: 3000,
        }}
      />
    </div>
  );
}
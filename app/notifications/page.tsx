"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase.client";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

/* ================= PAGE ================= */

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  /* AUTH */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  /* LOAD NOTIFICATIONS */
/* LOAD NOTIFICATIONS */
useEffect(() => {
  if (!user?.uid) return;

  console.log("🔥 load notifications for:", user.uid);

  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", user.uid)
  );

  const unsub = onSnapshot(q, (snap) => {
    console.log("🔥 SNAP SIZE:", snap.size);

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setNotifications(list);
  });

  return () => unsub();
}, [user?.uid]); // 🔥 QUAN TRỌNG NHẤT

  /* MARK AS READ */
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), {
        isRead: true,
      });
    } catch (e) {
      console.log("❌ mark read error", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* HEADER */}
      <div className="px-4 py-3 border-b bg-white font-semibold">
        Thông báo
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Chưa có thông báo
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markAsRead(n.id)}
            className={`px-4 py-3 border-b bg-white ${
              !n.isRead ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">

              <img
                src={n.fromUserAvatar || "/avatar.png"}
                className="w-10 h-10 rounded-full"
              />

              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {n.fromUserName || "User"}
                  </span>{" "}
                  {n.content}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {formatTime(n.createdAt)}
                </p>
              </div>

              {!n.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= TIME FORMAT ================= */

function formatTime(time: any) {
  if (!time) return "";

  try {
    const date = time?.toDate ? time.toDate() : new Date(time);

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

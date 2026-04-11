"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function Notifications() {
  const { user } = useAuth();
  const [noti, setNoti] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setNoti(snap.docs.map((doc) => doc.data()));
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">🔔 Thông báo</h1>

      {noti.map((n, i) => (
        <div key={i} className="bg-white p-3 rounded-xl shadow">
          {n.text}
        </div>
      ))}
    </div>
  );
}

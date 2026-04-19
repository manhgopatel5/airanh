"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase.client";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
  setDoc, // ✅ thêm dòng này
} from "firebase/firestore";
import { useRouter } from "next/navigation";

/* ================= PAGE ================= */

export default function ChatPage() {
  const [tab, setTab] = useState<"friends" | "requests" | "notifications">("friends");

  return (
    <div className="flex flex-col h-screen bg-white">

      <div className="border-b bg-white sticky top-0 z-10">
        <div className="flex">
          <TabButton active={tab === "friends"} onClick={() => setTab("friends")} label="Bạn bè" />
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")} label="Lời mời" />
          <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")} label="Thông báo" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {tab === "friends" && <FriendsTab />}
        {tab === "requests" && <RequestsTab />}
        {tab === "notifications" && <NotificationsTab />}
      </div>
    </div>
  );
}

/* ================= TAB BUTTON ================= */

function TabButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium ${
        active ? "text-black border-b-2 border-black" : "text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

/* ================= FRIENDS ================= */

function FriendsTab() {
  const [friends, setFriends] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  /* AUTH */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  /* LOAD FRIENDS */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friends"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const userDoc = await getDoc(doc(db, "users", data.friendId));

          return {
            id: d.id,
            friendId: data.friendId,
            ...userDoc.data(),
          };
        })
      );

      setFriends(list);
    });

    return () => unsub();
  }, [user]);

  /* OPEN CHAT */
async function openChat(friendId: string) {
  if (!user) return;

  // 🔥 tạo chatId cố định (tránh duplicate)
  const chatId =
    user.uid < friendId
      ? `${user.uid}_${friendId}`
      : `${friendId}_${user.uid}`;

  const chatRef = doc(db, "chats", chatId);

  const snap = await getDoc(chatRef);

  // 🚫 chỉ tạo nếu chưa tồn tại
  if (!snap.exists()) {
    await setDoc(chatRef, {
      members: [user.uid, friendId],
      createdAt: Date.now(),
    });
  }

  router.push(`/chat/${chatId}`);
}

  return (
    <div className="divide-y">
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between px-4 py-3 bg-white"
        >
          <div className="flex items-center gap-3">
            <img
              src={f.avatar || "/avatar.png"}
              className="w-11 h-11 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium">{f.name || "User"}</p>
              <p className="text-xs text-gray-400">
                {f.online ? "Đang hoạt động" : "Offline"}
              </p>
            </div>
          </div>

          <button
            onClick={() => openChat(f.friendId)}
            className="text-blue-500 text-sm font-medium"
          >
            Nhắn tin
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================= REQUESTS ================= */

function RequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [user, setUser] = useState<any>(null);

  /* AUTH */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  /* LOAD REQUESTS */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "friend_requests"),
      where("toUserId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const userDoc = await getDoc(doc(db, "users", data.fromUserId));

          return {
            id: d.id,
            fromUserId: data.fromUserId,
            ...userDoc.data(),
          };
        })
      );

      setRequests(list);
    });

    return () => unsub();
  }, [user]);

  /* SEARCH */
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchId.trim() || !user) {
        setResult(null);
        return;
      }

      setLoading(true);

      const q = query(
        collection(db, "users"),
        where("userId", "==", searchId)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setResult(null);
        setLoading(false);
        return;
      }

      const data = snap.docs[0];
      const foundUser = {
        id: data.id,
        ...data.data(),
      };

      setResult(foundUser);

      const checkQ = query(
        collection(db, "friend_requests"),
        where("fromUserId", "==", user.uid),
        where("toUserId", "==", foundUser.id),
        where("status", "==", "pending")
      );

      const checkSnap = await getDocs(checkQ);
      setAlreadySent(!checkSnap.empty);

      setLoading(false);
    }, 400);

    return () => clearTimeout(delay);
  }, [searchId, user]);

  /* SEND */
  async function sendRequest() {
    if (!user || !result || alreadySent) return;

    await addDoc(collection(db, "friend_requests"), {
      fromUserId: user.uid,
      toUserId: result.id,
      status: "pending",
      createdAt: Date.now(),
    });

    setAlreadySent(true);
  }

  /* ACCEPT */
  async function acceptRequest(req: any) {
    if (!user) return;

    await updateDoc(doc(db, "friend_requests", req.id), {
      status: "accepted",
    });

    await addDoc(collection(db, "friends"), {
      userId: user.uid,
      friendId: req.fromUserId,
    });

    await addDoc(collection(db, "friends"), {
      userId: req.fromUserId,
      friendId: user.uid,
    });
  }

  /* REJECT */
  async function rejectRequest(req: any) {
    await updateDoc(doc(db, "friend_requests", req.id), {
      status: "rejected",
    });
  }

  return (
    <div className="space-y-4">

      {/* SEARCH */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <input
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Nhập User ID để tìm bạn"
            className="w-full text-sm outline-none"
          />

          {loading && (
            <p className="text-xs text-gray-400 mt-2">Đang tìm...</p>
          )}
        </div>
      </div>

      {/* RESULT */}
      {result && (
        <div className="mx-4 p-3 bg-white rounded-xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={result.avatar || "/avatar.png"}
              className="w-11 h-11 rounded-full"
            />
            <div>
              <p className="text-sm font-medium">{result.name}</p>
              <p className="text-xs text-gray-400">{searchId}</p>
            </div>
          </div>

          {alreadySent ? (
            <span className="text-xs text-gray-400">Đã gửi</span>
          ) : (
            <button
              onClick={sendRequest}
              className="bg-black text-white px-3 py-1.5 rounded-lg text-sm"
            >
              Kết bạn
            </button>
          )}
        </div>
      )}

      {/* LIST */}
      <div className="divide-y">
        {requests.map((r) => (
          <div key={r.id} className="px-4 py-3 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={r.avatar || "/avatar.png"}
                className="w-11 h-11 rounded-full"
              />
              <p className="text-sm font-medium">{r.name}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => acceptRequest(r)}
                className="flex-1 bg-black text-white py-2 rounded-lg text-sm"
              >
                Đồng ý
              </button>

              <button
                onClick={() => rejectRequest(r)}
                className="flex-1 bg-gray-100 py-2 rounded-lg text-sm"
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= NOTIFICATIONS ================= */

function NotificationsTab() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setNotifications(list);
    });

    return () => unsub();
  }, [user?.uid]);

  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Chưa có thông báo
      </div>
    );
  }

  return (
    <div className="divide-y">
      {notifications.map((n) => (
        <div key={n.id} className="px-4 py-3 bg-white flex gap-3">
          <img
            src={n.fromUserAvatar || "/avatar.png"}
            className="w-10 h-10 rounded-full"
          />

          <div>
            <p className="text-sm">
              <b>{n.fromUserName || "User"}</b> {n.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

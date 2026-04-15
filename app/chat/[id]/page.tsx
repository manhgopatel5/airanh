"use client";

import { useEffect, useRef, useState } from "react";
import { db, auth, storage } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Phone,
  Info,
  Send,
} from "lucide-react";

export default function ChatDetail() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [friend, setFriend] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 🔥 NEW: chống gửi push trùng
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const refUser = doc(db, "users", user.uid);

    updateDoc(refUser, { online: true }).catch(() => {});

    const handleOffline = () => {
      updateDoc(refUser, {
        online: false,
        lastSeen: Date.now(),
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleOffline);

    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [user]);

  useEffect(() => {
    if (!id || !user) return;

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", id),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      setMessages(list);

      // ✅ FIX LOOP (giữ nguyên logic bạn)
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msg = change.doc.data();

          if (!msg.seenBy?.includes(user.uid)) {
            updateDoc(doc(db, "messages", change.doc.id), {
              seenBy: [...(msg.seenBy || []), user.uid],
            }).catch(() => {});
          }
        }
      });
    });

    return () => unsub();
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;

    let unsub: any;

    const load = async () => {
      const chatDoc = await getDoc(doc(db, "chats", id));
      const data = chatDoc.data();

      if (!data) return;

      const friendId = data.members.find((m: string) => m !== user.uid);

      unsub = onSnapshot(doc(db, "users", friendId), (snap) => {
        setFriend({ id: friendId, ...snap.data() });
      });
    };

    load();

    return () => unsub && unsub();
  }, [id, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 CREATE NOTIFICATION (GIỮ NGUYÊN)
  const createNotification = async (type: string, content: string) => {
    if (!user || !id) return;

    try {
      const chatRef = doc(db, "chats", id);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) return;

      const data = chatSnap.data();
      const receiverId = data.members.find((m: string) => m !== user.uid);
      if (!receiverId) return;

      await addDoc(collection(db, "notifications"), {
        toUserId: receiverId,
        fromUserId: user.uid,
        fromUserName: user.displayName || "User",
        fromUserAvatar: user.photoURL || "",
        type,
        content,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.log("❌ notification error", e);
    }
  };

  // 🔥 FIX PUSH (CHỐNG DOUBLE 100%)
  const sendPush = async (message: string) => {
    if (!friend?.fcmToken) return;

    // ❌ chống trùng
    if (lastSentRef.current === message) return;
    lastSentRef.current = message;

    try {
      await fetch("/api/send-noti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: friend.fcmToken,
          title: "Tin nhắn mới",
          message,
          chatId: id,
        }),
      });

      console.log("✅ push sent");
    } catch (e) {
      console.log("❌ push error", e);
    }

    setTimeout(() => {
      lastSentRef.current = "";
    }, 2000);
  };

  async function sendMessage() {
    if (!user || !text.trim() || !id) return;

    await addDoc(collection(db, "messages"), {
      chatId: id,
      senderId: user.uid,
      text,
      type: "text",
      createdAt: Date.now(),
      seenBy: [user.uid],
    });

    await updateDoc(doc(db, "chats", id), {
      lastMessage: text,
      updatedAt: Date.now(),
    });

    // 🔥 CHỈ PUSH (KHÔNG createNotification để tránh double)
    await sendPush(text);

    setText("");
  }

  const sendImage = async (file: File) => {
    if (!user) return;

    const storageRef = ref(storage, "chat-images/" + Date.now());
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "messages"), {
      chatId: id,
      senderId: user.uid,
      image: url,
      type: "image",
      createdAt: Date.now(),
      seenBy: [user.uid],
    });

    await sendPush("Đã gửi 1 ảnh 📷");
  };

  const sendFile = async (file: File) => {
    if (!user) return;

    const storageRef = ref(storage, "chat-files/" + file.name);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "messages"), {
      chatId: id,
      senderId: user.uid,
      file: url,
      fileName: file.name,
      type: "file",
      createdAt: Date.now(),
      seenBy: [user.uid],
    });

    await sendPush("Đã gửi file 📎");
  };

  const sendLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;

      await addDoc(collection(db, "messages"), {
        chatId: id,
        senderId: user.uid,
        type: "location",
        location: { lat: latitude, lng: longitude },
        createdAt: Date.now(),
        seenBy: [user.uid],
      });

      await sendPush("Đã gửi vị trí 📍");
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* UI giữ nguyên */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>←</button>

          <img
            src={friend?.avatar || "/avatar.png"}
            className="w-10 h-10 rounded-full"
          />

          <div>
            <p className="font-semibold">{friend?.name || "User"}</p>
            <p className="text-xs text-green-500">
              {friend?.online ? "Đang hoạt động" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex gap-4 text-blue-500">
          <Phone size={20} />
          <Info size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "120px" }}>
        <div className="text-center text-xs text-gray-400">
          04:04 14/04/2026
        </div>

        {messages.map((m) => (
          <MessageItem key={m.id} msg={m} currentUser={user} />
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="file"
            accept="image/*"
            hidden
            id="img"
            onChange={(e) =>
              e.target.files?.[0] && sendImage(e.target.files[0])
            }
          />
          <label htmlFor="img">
            <ImageIcon className="text-blue-500 w-6 h-6" />
          </label>

          <button onClick={sendLocation}>
            <MapPin className="text-blue-500 w-6 h-6" />
          </button>

          <input
            type="file"
            hidden
            id="file"
            onChange={(e) =>
              e.target.files?.[0] && sendFile(e.target.files[0])
            }
          />
          <label htmlFor="file">
            <Paperclip className="text-blue-500 w-6 h-6" />
          </label>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none"
            placeholder="Aa"
          />

          <button onClick={sendMessage}>
            <Send className="text-blue-500 w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ msg, currentUser }: any) {
  const isMe = msg.senderId === currentUser?.uid;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`
          px-4 py-2 text-sm max-w-[75%]
          ${
            isMe
              ? "bg-blue-500 text-white rounded-2xl rounded-br-sm"
              : "bg-white text-black rounded-2xl rounded-bl-sm border"
          }
        `}
      >
        {(!msg.type || msg.type === "text") && <span>{msg.text}</span>}

        {msg.type === "image" && (
          <img src={msg.image} className="rounded-2xl max-w-[220px] mt-1" />
        )}

        {msg.type === "file" && (
          <a href={msg.file} target="_blank" className="underline">
            📎 {msg.fileName}
          </a>
        )}

        {msg.type === "location" && (
          <a
            href={`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
            target="_blank"
            className="text-blue-200 underline"
          >
            📍 Xem vị trí
          </a>
        )}

        {isMe && (
          <div className="text-[10px] mt-1 opacity-70 text-right">
            {msg.seenBy?.length > 1 ? "Đã xem" : "Đã gửi"}
          </div>
        )}
      </div>
    </div>
  );
}

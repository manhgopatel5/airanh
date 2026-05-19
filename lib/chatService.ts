import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc,
  where,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  Unsubscribe,
  writeBatch,
  limit,
  increment,
  arrayUnion,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  deleteField,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";
import { User } from "@/types/task";

export class ChatError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "ChatError";
  }
}

/* ================= TYPES ================= */
export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  attachments?: { url: string; type: "image" | "file"; name?: string }[];
  location?: { lat: number; lng: number };
  type: "text" | "image" | "file" | "location" | "system";
  createdAt: Timestamp | null;
  seenBy: string[];
  reactions?: Record<string, string>;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
  };
  deletedFor?: string[];
  edited?: boolean;
  editedAt?: Timestamp;
};

export type Chat = {
  id: string;
  members: string[];
  membersKey: string;
  lastMessage: string;
  lastMessageSender: string;
  lastMessageId?: string;
  updatedAt: Timestamp | null;
  createdAt: Timestamp | null;
  typing: Record<string, boolean>;
  unreadCount: Record<string, number>;
};

/* ================= HELPERS ================= */
const validateUser = (user?: User | null) => {
  if (!user?.uid) throw new ChatError("Bạn cần đăng nhập");
};

/* ================= GET OR CREATE CHAT ================= */
export const getOrCreateConversation = async (
  user1: string,
  user2: string
): Promise<string | null> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!user1 ||!user2 || user1 === user2) return null;

  const [block1, block2] = await Promise.all([
    getDoc(doc(db, "blocks", `${user1}_${user2}`)),
    getDoc(doc(db, "blocks", `${user2}_${user1}`)),
  ]);
  if (block1.exists() || block2.exists()) throw new ChatError("Đã chặn, không thể nhắn tin", "BLOCKED");

  const members = [user1, user2].sort();
  const chatId = members.join("_");
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (snap.exists()) return chatId;

  await setDoc(chatRef, {
    members,
    membersKey: chatId,
    lastMessage: "",
    lastMessageSender: "",
    lastMessageId: "",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    typing: {},
    unreadCount: { [user1]: 0, [user2]: 0 },
  });

  return chatId;
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (
  chatId: string,
  user: User,
  payload: {
    text?: string;
    attachments?: { url: string; type: "image" | "file"; name?: string }[];
    location?: { lat: number; lng: number };
    type: Message["type"];
    replyTo?: Message["replyTo"];
  }
): Promise<string | null> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  validateUser(user);
  if (!chatId ||!payload.type) throw new ChatError("Thiếu dữ liệu");
  if (payload.type === "text" &&!payload.text?.trim()) throw new ChatError("Tin nhắn trống");

  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) throw new ChatError("Cuộc trò chuyện không tồn tại");

  const chat = chatSnap.data() as Chat;
  if (!chat.members.includes(user.uid)) throw new ChatError("Bạn không thuộc cuộc trò chuyện này");

  const batch = writeBatch(db);
  const msgRef = doc(collection(db, "chats", chatId, "messages"));

  const lastMessageText =
    payload.type === "text"
     ? payload.text!.slice(0, 50)
      : payload.type === "image"
     ? "📷 Ảnh"
      : payload.type === "file"
     ? `📎 Tệp đính kèm`
      : payload.type === "location"
     ? "📍 Vị trí"
      : "";

  batch.set(msgRef, {
    chatId,
    senderId: user.uid,
   ...payload,
    text: payload.text?.trim() || "",
    createdAt: serverTimestamp(),
    seenBy: [user.uid],
    deletedFor: [],
  });

  const unreadUpdate: Record<string, any> = {
    lastMessage: lastMessageText,
    lastMessageSender: user.uid,
    lastMessageId: msgRef.id,
    updatedAt: serverTimestamp(),
    [`typing.${user.uid}`]: false,
    [`unreadCount.${user.uid}`]: 0,
  };

  chat.members.forEach((uid) => {
    if (uid!== user.uid) {
      unreadUpdate[`unreadCount.${uid}`] = increment(1);
    }
  });

  batch.update(chatRef, unreadUpdate);

  await batch.commit();
  return msgRef.id;
};

/* ================= LISTEN MESSAGES ================= */
export const listenMessages = (
  chatId: string,
  userId: string,
  callback: (msgs: Message[], hasMore: boolean) => void,
  options?: { limit?: number; startAfterDoc?: QueryDocumentSnapshot<DocumentData> }
): Unsubscribe => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!userId) return () => {};

  const constraints: QueryConstraint[] = [
    where("createdAt", "!=", null),
    orderBy("createdAt", "desc"),
    limit(options?.limit || 50),
  ];

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  const q = query(collection(db, "chats", chatId, "messages"),...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs
       .map((d) => ({ id: d.id,...d.data() } as Message))
       .filter((m) =>!m.deletedFor?.includes(userId))
       .reverse();
      callback(data, snapshot.docs.length === (options?.limit || 50));
    },
    (err) => {
      console.error("listenMessages error:", err);
      callback([], false);
    }
  );
};

/* ================= INBOX ================= */
export const listenConversations = (
  userId: string,
  callback: (data: Chat[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!userId) return () => {};

  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", userId),
    orderBy("updatedAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id,...d.data() } as Chat));
      callback(data);
    },
    (err) => {
      console.error("listenConversations error:", err);
      onError?.(err);
    }
  );
};

/* ================= MARK AS READ ================= */
export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  const db = getFirebaseDB();

  if (!chatId ||!userId) return;
  const batch = writeBatch(db);
  const chatRef = doc(db, "chats", chatId);

  batch.update(chatRef, {
    [`unreadCount.${userId}`]: 0,
  });

  const q = query(
    collection(db, "chats", chatId, "messages"),
    where("seenBy", "not-in", [[userId]]),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);

  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      seenBy: arrayUnion(userId),
    });
  });

  await batch.commit();
};

/* ================= TYPING ================= */
const typingTimers = new Map<string, NodeJS.Timeout>();

export const setTyping = async (
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!userId) return;
  const key = `${chatId}_${userId}`;

  if (isTyping) {
    await updateDoc(doc(db, "chats", chatId), {
      [`typing.${userId}`]: true,
    }).catch(() => {});

    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key)!);

    const timer = setTimeout(() => {
      updateDoc(doc(db, "chats", chatId), {
        [`typing.${userId}`]: false,
      }).catch(() => {});
      typingTimers.delete(key);
    }, 3000);
    typingTimers.set(key, timer);
  } else {
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key)!);
      typingTimers.delete(key);
    }
    await updateDoc(doc(db, "chats", chatId), {
      [`typing.${userId}`]: false,
    }).catch(() => {});
  }
};

/* ================= EDIT MESSAGE ================= */
export const editMessage = async (
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!messageId ||!newText.trim()) throw new ChatError("Dữ liệu không hợp lệ");

  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  const chatRef = doc(db, "chats", chatId);

  await updateDoc(msgRef, {
    text: newText.trim(),
    edited: true,
    editedAt: serverTimestamp(),
  });

  const chatSnap = await getDoc(chatRef);
  if (chatSnap.data()?.lastMessageId === messageId) {
    await updateDoc(chatRef, {
      lastMessage: newText.trim().slice(0, 50),
    });
  }
};

/* ================= DELETE MESSAGE ================= */
export const deleteMessage = async (
  chatId: string,
  messageId: string,
  userId: string,
  deleteForEveryone: boolean = false
): Promise<void> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!messageId ||!userId) throw new ChatError("Thiếu thông tin");

  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  const chatRef = doc(db, "chats", chatId);
  const msgSnap = await getDoc(msgRef);
  if (!msgSnap.exists()) return;

  const msgData = msgSnap.data() as Message;

  if (deleteForEveryone && msgData.senderId!== userId) {
    throw new ChatError("Không có quyền xóa tin nhắn của người khác");
  }

  if (deleteForEveryone) {
    await updateDoc(msgRef, {
      text: "Tin nhắn đã bị xóa",
      attachments: deleteField(),
      location: deleteField(),
      type: "system",
      deletedFor: [],
    });

    const chatSnap = await getDoc(chatRef);
    if (chatSnap.data()?.lastMessageId === messageId) {
      const lastMsgQuery = query(
        collection(db, "chats", chatId, "messages"),
        where("type", "!=", "system"),
        where("deletedFor", "not-in", [[userId]]),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const lastMsgSnap = await getDocs(lastMsgQuery);
      const lastMsg = lastMsgSnap.docs[0]?.data() as Message | undefined;

      await updateDoc(chatRef, {
        lastMessage: lastMsg?.text?.slice(0, 50) || "",
        lastMessageSender: lastMsg?.senderId || "",
        lastMessageId: lastMsgSnap.docs[0]?.id || "",
      });
    }
  } else {
    await updateDoc(msgRef, {
      deletedFor: arrayUnion(userId),
    });
  }
};

/* ================= REACTIONS ================= */
export const addReaction = async (
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string
): Promise<void> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!messageId ||!userId) return;
  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(msgRef, {
    [`reactions.${userId}`]: emoji,
  });
};

export const removeReaction = async (
  chatId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  const db = getFirebaseDB(); // ✅ Thêm db

  if (!chatId ||!messageId ||!userId) return;
  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(msgRef, {
    [`reactions.${userId}`]: deleteField(),
  });
};
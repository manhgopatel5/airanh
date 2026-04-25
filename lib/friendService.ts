import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
  getDoc,
  getDocs,
  writeBatch,
  limit,
  orderBy,
  query,
  where,
  Unsubscribe,
  onSnapshot,
  addDoc,
  getCountFromServer,
  updateDoc,
  deleteDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";

/* ================= TYPES ================= */
export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type Friend = {
  id: string;
  userId: string;
  friendId: string;
  createdAt: Timestamp;
  lastInteractionAt?: Timestamp;
};

export type User = {
  uid: string;
  name: string;
  avatar: string;
  shortId: string;
  username?: string;
  friendRequestsUnread?: number;
};

export type FriendWithUser = Friend & {
  user: User;
  mutualFriendsCount?: number;
};

export type FriendStatus =
  | "none"
  | "friends"
  | "pending_sent"
  | "pending_received"
  | "blocked";

class FriendError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "FriendError";
  }
}

/* ================= HELPER: BATCH GET USERS ================= */
const batchGetUsers = async (uids: string[]): Promise<Map<string, User>> => {
  const db = getFirebaseDB(); // ✅ Fix

  if (uids.length === 0) return new Map();
  const chunks: Promise<any>[] = [];
  for (let i = 0; i < uids.length; i += 10) {
    const chunk = uids.slice(i, i + 10);
    chunks.push(
      getDocs(query(collection(db, "users"), where("__name__", "in", chunk)))
    );
  }
  const snaps = await Promise.all(chunks);
  const map = new Map<string, User>();
  snaps.forEach((snap) => {
    snap.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) =>
      map.set(d.id, { uid: d.id, ...d.data() } as User)
    );
  });
  return map;
};

/* ================= HELPER: MUTUAL FRIENDS COUNT ================= */
const getMutualFriendsCount = async (
  userId1: string,
  userId2: string
): Promise<number> => {
  const db = getFirebaseDB(); // ✅ Fix

  if (!userId1 || !userId2 || userId1 === userId2) return 0;

  const [friends1Snap, friends2Snap] = await Promise.all([
    getDocs(
      query(
        collection(db, "friends"),
        where("userId", "==", userId1),
        limit(500)
      )
    ),
    getDocs(
      query(
        collection(db, "friends"),
        where("userId", "==", userId2),
        limit(500)
      )
    ),
  ]);

  const set1 = new Set(friends1Snap.docs.map((d) => d.data().friendId));
  const set2 = new Set(friends2Snap.docs.map((d) => d.data().friendId));

  let count = 0;
  set1.forEach((id) => {
    if (set2.has(id)) count++;
  });
  return count;
};

/* ================= SEND REQUEST ================= */
export const sendFriendRequest = async (
  from: string,
  to: string
): Promise<void> => {
  const db = getFirebaseDB();

  if (!from || !to) throw new FriendError("Thiếu thông tin người dùng");
  if (from === to)
    throw new FriendError("Không thể kết bạn với chính mình");

  const requestId = [from, to].sort().join("_");
  const requestRef = doc(db, "friendRequests", requestId);
  const friendRef = doc(db, "friends", `${from}_${to}`);
  const toUserRef = doc(db, "users", to);

  const [block1, block2] = await Promise.all([
    getDoc(doc(db, "blocks", `${to}_${from}`)),
    getDoc(doc(db, "blocks", `${from}_${to}`)),
  ]);
  if (block1.exists() || block2.exists()) {
    throw new FriendError("Không thể gửi lời mời", "BLOCKED");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const countSnap = await getCountFromServer(
    query(
      collection(db, "friendRequests"),
      where("fromUserId", "==", from),
      where("createdAt", ">=", Timestamp.fromDate(today))
    )
  );
  if (countSnap.data().count >= 20) {
    throw new FriendError(
      "Bạn đã gửi quá 20 lời mời hôm nay",
      "LIMIT_EXCEEDED"
    );
  }

  const [reqSnap, friendSnap] = await Promise.all([
    getDoc(requestRef),
    getDoc(friendRef),
  ]);

  if (friendSnap.exists())
    throw new FriendError("Hai bạn đã là bạn bè");
  if (reqSnap.exists()) {
    const status = reqSnap.data().status;
    if (status === "pending")
      throw new FriendError("Đã gửi lời mời trước đó");
    if (status === "rejected") {
      await updateDoc(requestRef, {
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }
  }

  const batch = writeBatch(db);
  batch.set(requestRef, {
    fromUserId: from,
    toUserId: to,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
};

/* ================= LIST REQUEST ================= */
export const listenFriendRequests = (
  userId: string,
  callback: (data: FriendRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const db = getFirebaseDB();

  if (!userId) return () => {};
  const q = query(
    collection(db, "friendRequests"),
    where("toUserId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as FriendRequest)
      );
      callback(data);
    },
    (err) => {
      console.error("listenFriendRequests:", err);
      onError?.(err);
    }
  );
};

/* ================= MARK AS READ ================= */
export const markFriendRequestsAsRead = async (
  userId: string
): Promise<void> => {
  const db = getFirebaseDB();

  if (!userId) return;
  await updateDoc(doc(db, "users", userId), {
    friendRequestsUnread: 0,
  });
};

/* ================= ACCEPT ================= */
export const acceptRequest = async (
  req: FriendRequest
): Promise<void> => {
  const db = getFirebaseDB();

  if (!req?.id || !req.fromUserId || !req.toUserId) {
    throw new FriendError("Thông tin lời mời không hợp lệ");
  }

  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, "friendRequests", req.id);
    const friend1Ref = doc(
      db,
      "friends",
      `${req.fromUserId}_${req.toUserId}`
    );
    const friend2Ref = doc(
      db,
      "friends",
      `${req.toUserId}_${req.fromUserId}`
    );
    const toUserRef = doc(db, "users", req.toUserId);

    const [reqSnap, friendSnap, toUserSnap] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(friend1Ref),
      transaction.get(toUserRef),
    ]);

    if (!reqSnap.exists() || reqSnap.data().status !== "pending") {
      throw new FriendError("Lời mời không tồn tại");
    }
    if (friendSnap.exists()) {
      transaction.update(requestRef, {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const toUser = toUserSnap.data() as User;
    const currentUnread = toUser.friendRequestsUnread || 0;

    transaction.update(requestRef, {
      status: "accepted",
      updatedAt: serverTimestamp(),
    });
    transaction.set(friend1Ref, {
      userId: req.fromUserId,
      friendId: req.toUserId,
      createdAt: serverTimestamp(),
    });
    transaction.set(friend2Ref, {
      userId: req.toUserId,
      friendId: req.fromUserId,
      createdAt: serverTimestamp(),
    });

  });

  const toUserSnap = await getDoc(doc(db, "users", req.toUserId));
  const toUser = toUserSnap.data() as User;
  await addDoc(collection(db, "notifications"), {
    toUserId: req.fromUserId,
    fromUserId: req.toUserId,
    fromUserName: toUser.name,
    fromUserAvatar: toUser.avatar,
    type: "friend_accept",
    content: "đã chấp nhận lời mời kết bạn",
    link: `/profile/${toUser.shortId}`,
    isRead: false,
    createdAt: serverTimestamp(),
  });
};

/* ================= REJECT ================= */
export const rejectRequest = async (
  id: string,
  userId: string
): Promise<void> => {
  const db = getFirebaseDB();

  if (!id || !userId) throw new FriendError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const reqRef = doc(db, "friendRequests", id);
    const userRef = doc(db, "users", userId);
    const [reqSnap, userSnap] = await Promise.all([
      transaction.get(reqRef),
      transaction.get(userRef),
    ]);

    if (!reqSnap.exists()) return;
    const currentUnread =
      userSnap.data()?.friendRequestsUnread || 0;

    transaction.update(reqRef, {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    transaction.update(userRef, {
      friendRequestsUnread: Math.max(0, currentUnread - 1),
    });
  });
};

/* ================= CANCEL REQUEST ================= */
export const cancelFriendRequest = async (
  from: string,
  to: string
): Promise<void> => {
  const db = getFirebaseDB();

  if (!from || !to) throw new FriendError("Thiếu thông tin");
  const requestId = [from, to].sort().join("_");
  const batch = writeBatch(db);
  batch.delete(doc(db, "friendRequests", requestId));
  await batch.commit();
};

/* ================= UNFRIEND ================= */
export const unfriend = async (
  userId: string,
  friendId: string,
  deleteChat = false
): Promise<void> => {
  const db = getFirebaseDB();

  if (!userId || !friendId)
    throw new FriendError("Thiếu thông tin");
  const batch = writeBatch(db);
  batch.delete(doc(db, "friends", `${userId}_${friendId}`));
  batch.delete(doc(db, "friends", `${friendId}_${userId}`));
  if (deleteChat) {
    const chatId = [userId, friendId].sort().join("_");
    batch.delete(doc(db, "chats", chatId));
  }
  await batch.commit();
};

/* ================= LIST FRIENDS ================= */
export const listenFriendsWithUser = (
  userId: string,
  callback: (data: FriendWithUser[]) => void
): Unsubscribe => {
  const db = getFirebaseDB();

  if (!userId) return () => {};
  const q = query(
    collection(db, "friends"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(500)
  );

  return onSnapshot(q, async (snap) => {
    const friends = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Friend)
    );
    const userIds = [
      ...new Set(friends.map((f) => f.friendId)),
    ];
    const userMap = await batchGetUsers(userIds);

    const data: FriendWithUser[] = await Promise.all(
      friends.map(async (f) => ({
        ...f,
        user:
          userMap.get(f.friendId) || {
            uid: f.friendId,
            name: "Đã xóa",
            avatar: "",
            shortId: "",
          },
        mutualFriendsCount: await getMutualFriendsCount(
          userId,
          f.friendId
        ),
      }))
    );
    callback(data);
  });
};

/* ================= CHECK STATUS ================= */
export const getFriendStatus = async (
  user1: string,
  user2: string
): Promise<FriendStatus> => {
  const db = getFirebaseDB();

  if (!user1 || !user2 || user1 === user2) return "none";

  const [friendSnap, reqSent, reqReceived, block1, block2] =
    await Promise.all([
      getDoc(doc(db, "friends", `${user1}_${user2}`)),
      getDoc(
        doc(
          db,
          "friendRequests",
          [user1, user2].sort().join("_")
        )
      ),
      getDoc(
        doc(
          db,
          "friendRequests",
          [user2, user1].sort().join("_")
        )
      ),
      getDoc(doc(db, "blocks", `${user1}_${user2}`)),
      getDoc(doc(db, "blocks", `${user2}_${user1}`)),
    ]);

  if (block1.exists() || block2.exists()) return "blocked";
  if (friendSnap.exists()) return "friends";
  if (reqSent.exists() && reqSent.data().status === "pending")
    return "pending_sent";
  if (
    reqReceived.exists() &&
    reqReceived.data().status === "pending"
  )
    return "pending_received";
  return "none";
};

/* ================= BLOCK/UNBLOCK ================= */
export const blockUser = async (
  from: string,
  to: string
): Promise<void> => {
  const db = getFirebaseDB();

  if (!from || !to || from === to)
    throw new FriendError("Thiếu thông tin");
  const batch = writeBatch(db);
  batch.set(doc(db, "blocks", `${from}_${to}`), {
    fromUserId: from,
    toUserId: to,
    createdAt: serverTimestamp(),
  });
  batch.delete(doc(db, "friends", `${from}_${to}`));
  batch.delete(doc(db, "friends", `${to}_${from}`));
  batch.delete(
    doc(db, "friendRequests", [from, to].sort().join("_"))
  );
  await batch.commit();
};

export const unblockUser = async (
  from: string,
  to: string
): Promise<void> => {
  const db = getFirebaseDB();
  await deleteDoc(doc(db, "blocks", `${from}_${to}`));
};

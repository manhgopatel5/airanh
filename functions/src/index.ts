import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";

initializeApp();
const db = getFirestore();

// 1. Khi có lời mời kết bạn mới → tạo thông báo cho người nhận
export const onFriendRequestCreated = onDocumentCreated(
  {
    document: "friendRequests/{requestId}",
    region: "asia-southeast1",
  },
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const data = event.data?.data();
    if (!data) return;

    const { from, to } = data;

    try {
      const fromUserDoc = await db.doc(`users/${from}`).get();
      const fromUser = fromUserDoc.data();

      await db.collection(`notifications/${to}/items`).add({
        type: "friend_request",
        fromUid: from,
        fromName: fromUser?.name || "Người dùng",
        fromAvatar: fromUser?.avatar || "",
        title: "Lời mời kết bạn",
        message: "đã gửi lời mời kết bạn",
        actionData: { requesterId: from },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("onFriendRequestCreated error:", error);
    }
  }
);

// 2. Khi lời mời được chấp nhận → tạo thông báo cho người gửi lời mời
export const onFriendAccepted = onDocumentCreated(
  {
    document: "users/{userId}/friends/{friendId}",
    region: "asia-southeast1",
  },
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const userId = event.params.userId;
    const friendId = event.params.friendId;

    try {
      const requestId = `${friendId}_${userId}`;
      const requestDoc = await db.doc(`friendRequests/${requestId}`).get();

      if (!requestDoc.exists) return;

      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();

      await db.collection(`notifications/${friendId}/items`).add({
        type: "friend_accepted",
        fromUid: userId,
        fromName: userData?.name || "Người dùng",
        fromAvatar: userData?.avatar || "",
        title: "Đã chấp nhận kết bạn",
        message: "đã chấp nhận lời mời kết bạn của bạn",
        actionData: { chatId: [userId, friendId].sort().join("_") },
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      await db.doc(`friendRequests/${requestId}`).delete();
    } catch (error) {
      console.error("onFriendAccepted error:", error);
    }
  }
);

// 3. Function accept lời mời
// 3. Function accept lời mời
export const acceptFriendRequest = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { fromUid, notifId } = request.data;
    if (!fromUid ||!notifId) {
      throw new HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
    }

    const requestId = `${fromUid}_${uid}`;
    const requestDoc = await db.doc(`friendRequests/${requestId}`).get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Lời mời không tồn tại");
    }

    const batch = db.batch();

    batch.set(db.doc(`users/${uid}/friends/${fromUid}`), {
      createdAt: FieldValue.serverTimestamp(),
      status: "active",
    });
    batch.set(db.doc(`users/${fromUid}/friends/${uid}`), {
      createdAt: FieldValue.serverTimestamp(),
      status: "active",
    });

    const chatId = [uid, fromUid].sort().join("_");
    const [currentUserDoc, fromUserDoc] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.doc(`users/${fromUid}`).get(),
    ]);

    const currentData = currentUserDoc.data();
    const fromData = fromUserDoc.data();

    batch.set(
      db.doc(`chats/${chatId}`),
      {
        members: [uid, fromUid],
        isGroup: false,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastMessage: "Các bạn đã là bạn bè",
        lastSenderName: "Hệ thống",
        membersInfo: {
          [uid]: {
            name: currentData?.name || "User",
            avatar: currentData?.avatar || "",
            username: currentData?.username || "",
          },
          [fromUid]: {
            name: fromData?.name || "User",
            avatar: fromData?.avatar || "",
            username: fromData?.username || "",
          },
        },
        // THÊM 2 DÒNG NÀY: Xóa deletedFor để mở lại chat
        deletedFor: FieldValue.arrayRemove(uid),
        blockedUsers: FieldValue.arrayRemove(uid),
      },
      { merge: true }
    );

    batch.delete(db.doc(`notifications/${uid}/items/${notifId}`));
    await batch.commit();

    return { chatId };
  }
);


// 4. Function hủy kết bạn: A xóa B → B còn A nhưng status = "removed"
export const unfriend = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { friendUid } = request.data;
    if (!friendUid) {
      throw new HttpsError("invalid-argument", "Thiếu friendUid");
    }

    if (uid === friendUid) {
      throw new HttpsError("invalid-argument", "Không thể tự hủy kết bạn");
    }

    try {
      const batch = db.batch();

      // 1. Xóa B khỏi danh sách bạn của A
const myFriendRef = db.doc(`users/${uid}/friends/${friendUid}`);

const myFriendDoc = await myFriendRef.get();
const myData = myFriendDoc.data();
batch.set(
  myFriendRef,
  {
    status: "removed",
    removedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  },
  { merge: true }
);

      // 2. Check xem B có A trong friend list không rồi mới update
const theirFriendRef = db.doc(`users/${friendUid}/friends/${uid}`);



// Nếu người kia đã hủy mình trước đó
if (myData?.removedBy === friendUid) {
  batch.set(
    theirFriendRef,
    {
      status: "removed",
      removedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
} else {
  // Chỉ một phía hủy
  batch.set(
    theirFriendRef,
    {
      status: "active",
      removedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

      // 3. Update chat: chỉ ẩn với A, B vẫn thấy nhưng không nhắn được
      const chatId = [uid, friendUid].sort().join("_");
      const chatRef = db.doc(`chats/${chatId}`);
      const chatDoc = await chatRef.get();

      if (chatDoc.exists) {
        const userDoc = await db.doc(`users/${uid}`).get();
        const userName = userDoc.data()?.name || "Người dùng";

        batch.update(chatRef, {
          status: "active",
          archivedBy: uid,
          deletedFor: FieldValue.arrayUnion(uid), // Chỉ ẩn với A
          updatedAt: FieldValue.serverTimestamp(),
          lastMessage: `${userName} đã hủy kết bạn`,
          lastSenderName: "Hệ thống",
        });
      }

      await batch.commit();
      return { success: true };

    } catch (error: any) {
      console.error("unfriend error:", error);
      throw new HttpsError("internal", `Lỗi server: ${error.message}`);
    }
  }
);

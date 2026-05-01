import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const acceptFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Chưa đăng nhập");
  }

  const toUid = context.auth.uid;
  const { fromUid, notifId } = data;

  if (!fromUid ||!notifId) {
    throw new functions.https.HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
  }

  const requestId = `${fromUid}_${toUid}`;
  const chatId = [fromUid, toUid].sort().join("_");

  return db.runTransaction(async (tx) => {
    const requestRef = db.doc(`friendRequests/${requestId}`);
    const requestSnap = await tx.get(requestRef);

    if (!requestSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Lời mời không tồn tại");
    }

    const [fromUserSnap, toUserSnap] = await Promise.all([
      tx.get(db.doc(`users/${fromUid}`)),
      tx.get(db.doc(`users/${toUid}`))
    ]);

    if (!fromUserSnap.exists ||!toUserSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User không tồn tại");
    }

    const fromUser = fromUserSnap.data()!;
    const toUser = toUserSnap.data()!;

    tx.set(db.doc(`users/${toUid}/friends/${fromUid}`), {
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: fromUid,
    });
    tx.set(db.doc(`users/${fromUid}/friends/${toUid}`), {
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: toUid,
    });

    tx.set(db.doc(`chats/${chatId}`), {
      members: [fromUid, toUid],
      isGroup: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      membersInfo: {
        [fromUid]: {
          name: fromUser.name || "User",
          avatar: fromUser.avatar || "",
          username: fromUser.username || ""
        },
        [toUid]: {
          name: toUser.name || "User",
          avatar: toUser.avatar || "",
          username: toUser.username || ""
        }
      }
    });

    tx.set(db.doc(`users/${toUid}/chats/${chatId}`), {
      chatId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      members: [fromUid, toUid],
      otherUser: {
        uid: fromUid,
        name: fromUser.name || "User",
        avatar: fromUser.avatar || "",
        username: fromUser.username || ""
      }
    });
    tx.set(db.doc(`users/${fromUid}/chats/${chatId}`), {
      chatId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      members: [fromUid, toUid],
      otherUser: {
        uid: toUid,
        name: toUser.name || "User",
        avatar: toUser.avatar || "",
        username: toUser.username || ""
      }
    });

    tx.delete(db.doc(`notifications/${toUid}/items/${notifId}`));
    tx.delete(requestRef);

    const acceptedNotifRef = db.collection(`notifications/${fromUid}/items`).doc();
    tx.set(acceptedNotifRef, {
      type: "friend_accepted",
      fromUid: toUid,
      fromName: toUser.name || "Người dùng",
      fromAvatar: toUser.avatar || "",
      title: "Đã chấp nhận",
      message: "đã chấp nhận lời mời kết bạn",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { chatId };
  });
});
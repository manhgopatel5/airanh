import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
const db = admin.firestore();

export const acceptFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Chưa đăng nhập");
  }

  const toUid = context.auth.uid;
  const fromUid = data.fromUid;
  const notifId = data.notifId;

  if (!fromUid ||!notifId) {
    throw new functions.https.HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
  }

  const requestId = `${fromUid}_${toUid}`;
  const chatId = [fromUid, toUid].sort().join("_");

  return db.runTransaction(async (tx) => {
    const requestRef = db.doc(`friendRequests/${requestId}`);
    const requestSnap = await tx.get(requestRef);

    if (!requestSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Lời mời đã hết hạn");
    }

    const requestData = requestSnap.data()!;
    if (requestData.to!== toUid || requestData.status!== 'pending') {
      throw new functions.https.HttpsError("permission-denied", "Lời mời không hợp lệ");
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

    // 1. Add friend 2 chiều
    tx.set(db.doc(`users/${toUid}/friends/${fromUid}`), {
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: fromUid
    });
    tx.set(db.doc(`users/${fromUid}/friends/${toUid}`), {
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: toUid
    });

    // 2. Tạo chat
    tx.set(db.doc(`chats/${chatId}`), {
      members: [fromUid, toUid],
      isGroup: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      membersInfo: {
        [fromUid]: { name: fromUser.name, avatar: fromUser.avatar, username: fromUser.username },
        [toUid]: { name: toUser.name, avatar: toUser.avatar, username: toUser.username }
      }
    });

    // 3. Add vào subcollection 2 user
    tx.set(db.doc(`users/${toUid}/chats/${chatId}`), {
      chatId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      members: [fromUid, toUid],
      otherUser: { uid: fromUid, name: fromUser.name, avatar: fromUser.avatar, username: fromUser.username }
    });
    tx.set(db.doc(`users/${fromUid}/chats/${chatId}`), {
      chatId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: "",
      members: [fromUid, toUid],
      otherUser: { uid: toUid, name: toUser.name, avatar: toUser.avatar, username: toUser.username }
    });

    // 4. Xóa request + notif
    tx.delete(requestRef);
    tx.delete(db.doc(`notifications/${toUid}/items/${notifId}`));

    // 5. Gửi notif cho người gửi
    tx.set(db.collection(`notifications/${fromUid}/items`).doc(), {
      type: "friend_accepted",
      fromUid: toUid,
      fromName: toUser.name,
      fromAvatar: toUser.avatar,
      title: "Đã chấp nhận",
      message: "đã chấp nhận lời mời kết bạn",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      chatId
    });

    return { success: true, chatId };
  });
});
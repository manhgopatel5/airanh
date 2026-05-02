import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const acceptFriendRequest = onCall(
  {
    region: "asia-southeast1",
    cors: true,
    invoker: ["public"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Chưa đăng nhập");
    }

    const { fromUid, notifId } = request.data;
    const toUid = request.auth.uid;

    if (!fromUid || !notifId) {
      throw new HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
    }

    const batch = db.batch();
    
    // 1. Tạo friend 2 chiều - dùng set + merge để không lỗi nếu đã tồn tại
    const friendRef1 = db.doc(`users/${toUid}/friends/${fromUid}`);
    const friendRef2 = db.doc(`users/${fromUid}/friends/${toUid}`);
    
    batch.set(friendRef1, { 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });
    
    batch.set(friendRef2, { 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });

    // 2. Xóa notification + friendRequest
    const notifRef = db.doc(`notifications/${toUid}/items/${notifId}`);
    const requestRef = db.doc(`friendRequests/${fromUid}_${toUid}`);
    batch.delete(notifRef);
    batch.delete(requestRef);

    // 3. RESET CHAT: XÓA blockedBy + deletedBy để chat lại bình thường
    const chatId = [fromUid, toUid].sort().join("_");
    const chatRef = db.doc(`chats/${chatId}`);
    batch.set(chatRef, {
      members: [fromUid, toUid].sort(),
      isGroup: false,
      blockedBy: [], // RESET
      deletedBy: [], // RESET
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();
    return { chatId };
  }
);
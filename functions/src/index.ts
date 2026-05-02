import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const acceptFriendRequest = onCall(async (request) => {
  const { fromUid, notifId } = request.data;
  const toUid = request.auth?.uid;

  if (!toUid) {
    throw new HttpsError("unauthenticated", "Phải đăng nhập");
  }
  if (!fromUid || !notifId) {
    throw new HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
  }

  const batch = db.batch();
  
  // 1. Tạo friend cho cả 2 chiều
  const friendRef1 = db.collection("friends").doc(`${toUid}_${fromUid}`);
  batch.set(friendRef1, { 
    userId: toUid, 
    friendId: fromUid, 
    status: "accepted",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  const friendRef2 = db.collection("friends").doc(`${fromUid}_${toUid}`);
  batch.set(friendRef2, { 
    userId: fromUid, 
    friendId: toUid, 
    status: "accepted",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 2. Xóa thông báo
  const notifRef = db.collection("notifications").doc(notifId);
  batch.delete(notifRef);

  await batch.commit();
  return { success: true };
});
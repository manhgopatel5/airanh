const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.acceptFriendRequest = functions
  .region("asia-southeast1") // Giữ Singapore
  .https.onCall(async (data, context) => {
    const { fromUid, notifId } = data;
    const toUid = context.auth?.uid;

    if (!toUid) {
      throw new functions.https.HttpsError("unauthenticated", "Phải đăng nhập");
    }
    if (!fromUid || !notifId) {
      throw new functions.https.HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
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
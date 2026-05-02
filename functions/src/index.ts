import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

interface AcceptFriendData {
  fromUid: string;
  notifId: string;
}

export const acceptFriendRequest = functions
  .region("asia-southeast1")
  .https.onCall(async (
    data: AcceptFriendData,
    context: functions.https.CallableContext
  ) => {
    const { fromUid, notifId } = data;
    const toUid = context.auth?.uid;

    if (!toUid) {
      throw new functions.https.HttpsError("unauthenticated", "Phải đăng nhập");
    }
    if (!fromUid || !notifId) {
      throw new functions.https.HttpsError("invalid-argument", "Thiếu fromUid hoặc notifId");
    }

    const batch = db.batch();
    
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

    const notifRef = db.collection("friendRequests").doc(notifId);
    batch.delete(notifRef);

    await batch.commit();
    return { success: true };
  });
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";

initializeApp();
const db = getFirestore();

// ĐÃ XÓA: sendVerificationEmail - đây là thằng gửi mail /api/verify-email

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
        fromName: fromUser?.displayName || fromUser?.name || "Người dùng",
        fromAvatar: fromUser?.photoURL || fromUser?.avatar || "",
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
        fromName: userData?.displayName || userData?.name || "Người dùng",
        fromAvatar: userData?.photoURL || userData?.avatar || "",
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
            name: currentData?.displayName || currentData?.name || "User",
            avatar: currentData?.photoURL || currentData?.avatar || "",
            username: currentData?.username || "",
          },
          [fromUid]: {
            name: fromData?.displayName || fromData?.name || "User",
            avatar: fromData?.photoURL || fromData?.avatar || "",
            username: fromData?.username || "",
          },
        },
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

    if (!uid) {
      throw new HttpsError("unauthenticated", "Chưa đăng nhập");
    }

    const { friendUid } = request.data;

    if (!friendUid) {
      throw new HttpsError("invalid-argument", "Thiếu friendUid");
    }

    if (uid === friendUid) {
      throw new HttpsError("invalid-argument", "Không thể tự hủy kết bạn");
    }

    try {
      const batch = db.batch();

      const myFriendRef = db.doc(`users/${uid}/friends/${friendUid}`);

      batch.set(
        myFriendRef,
        {
          status: "removed",
          removedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const theirFriendRef = db.doc(`users/${friendUid}/friends/${uid}`);
      const theirFriendDoc = await theirFriendRef.get();

      if (theirFriendDoc.exists) {
        const theirData = theirFriendDoc.data();

        if (theirData?.removedBy === friendUid) {
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
      }

      const chatId = [uid, friendUid].sort().join("_");
      const chatRef = db.doc(`chats/${chatId}`);
      const chatDoc = await chatRef.get();

      if (chatDoc.exists) {
        const userDoc = await db.doc(`users/${uid}`).get();
        const userName = userDoc.data()?.displayName || userDoc.data()?.name || "Người dùng";

        batch.update(chatRef, {
          status: "active",
          archivedBy: uid,
          deletedFor: FieldValue.arrayUnion(uid),
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

// 5. Tự động xóa task hết hạn sau 7 ngày - chạy 2h sáng mỗi ngày
export const cleanupExpiredTasks = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Ho_Chi_Minh",
    region: "asia-southeast1",
    memory: "128MiB",
  },
  async () => {
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const expiredTasks = await db
    .collection("tasks")
    .where("deadline", "<", sevenDaysAgo)
    .limit(500)
    .get();

    if (expiredTasks.empty) {
      console.log("No expired tasks to delete");
      return;
    }

    const batch = db.batch();
    expiredTasks.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${expiredTasks.size} expired tasks`);
  }
);

// 6. CHUẨN APP LỚN: Sync task khi user đổi tên/avatar
export const onUserProfileUpdate = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "asia-southeast1",
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before ||!after) return;

    if (
      before.displayName === after.displayName &&
      before.photoURL === after.photoURL &&
      before.verified === after.verified
    ) {
      console.log(`User ${userId} update không liên quan profile, skip`);
      return;
    }

    console.log(`User ${userId} đổi profile, bắt đầu sync tasks...`);

    const tasksSnap = await db
    .collection("tasks")
    .where("userId", "==", userId)
    .get();

    if (tasksSnap.empty) {
      console.log(`User ${userId} không có task nào`);
      return;
    }

    const batch = db.batch();
    let count = 0;

    tasksSnap.forEach((taskDoc) => {
      batch.update(taskDoc.ref, {
        userName: after.displayName || "User",
        userAvatar: after.photoURL || null,
        userVerified: after.verified || false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;

      if (count === 500) {
        batch.commit();
        count = 0;
      }
    });

    if (count > 0) await batch.commit();
    console.log(`Đã sync ${tasksSnap.size} tasks cho user ${userId}`);
  }
);
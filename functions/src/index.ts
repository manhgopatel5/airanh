import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import type { DocumentSnapshot } from "firebase-admin/firestore";
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
    schedule: "0 2 * *",
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

// 7. THÊM MỚI: Update hotScore cho tab Hot - chạy 15 phút/lần
export const updateHotScore = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Ho_Chi_Minh",
    region: "asia-southeast1",
    memory: "256MiB",
  },
  async () => {
    const now = Date.now();
    const snap = await db.collection("tasks")
  .where("status", "in", ["open", "pending", "full", "doing", "in_progress"])
  .where("banned", "!=", true)
  .where("hidden", "!=", true)
  .limit(5000)
  .get();

    if (snap.empty) {
      console.log("No active tasks to update hotScore");
      return;
    }

    const batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;

    snap.docs.forEach((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toMillis() || now;
      const ageHours = (now - createdAt) / 3600000;

      let score = 0;
      if (d.type === 'task') {
        score = (d.viewCount * 0.5 + d.likeCount * 2 + d.commentCount * 3) / Math.pow(ageHours + 2, 1.5);
      } else {
        const joinRate = (d.currentParticipants || 0) / (d.maxParticipants || 1);
        const eventTime = d.eventDate?.toMillis() || now;
        const hoursToEvent = Math.max((eventTime - now) / 3600000, 1);
        score = (joinRate * 100) / hoursToEvent;
      }

      batch.update(doc.ref, { hotScore: score });
      batchCount++;
      totalUpdated++;

      if (batchCount === 400) {
        batch.commit();
        batchCount = 0;
      }
    });

    if (batchCount > 0) await batch.commit();
    console.log(`Updated hotScore for ${totalUpdated} tasks`);
  }
);

// 8. TÌM NGƯỜI LẠ CHAT 1-1 - ĐÃ FIX
export const findStranger = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { interests, ageRange, wantGender, voiceUrl } = request.data;

    if (!interests || interests.length < 3) {
      throw new HttpsError("invalid-argument", "Chọn ít nhất 3 sở thích");
    }
    if (!voiceUrl) {
      throw new HttpsError("invalid-argument", "Cần voice intro");
    }

    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();

    if ((userData?.karma || 0) < 50) {
      throw new HttpsError("permission-denied", "Karma quá thấp, cần >= 50");
    }

    const userGender = userData?.gender || "other";
    const queueRef = db.collection("stranger_queue");

    const matches = await queueRef
    .where("status", "==", "waiting")
    .where("userId", "!=", uid)
    .limit(20)
    .get();

    // SỬA TYPE Ở ĐÂY
    let bestMatch: DocumentSnapshot | null = null;
    let maxCommon = 0;

    for (const doc of matches.docs) {
      const d = doc.data();
      
      if (wantGender!== "all" && d.gender!== wantGender) continue;
      if (d.wantGender!== "all" && d.wantGender!== userGender) continue;
      if (ageRange && d.ageRange!== ageRange) continue;

      const common = interests.filter((i: string) => d.interests?.includes(i)).length;
      if (common >= 2 && common > maxCommon) {
        maxCommon = common;
        bestMatch = doc;
      }
    }

    if (bestMatch) {
      const other = bestMatch.data();
      if (!other) throw new HttpsError("internal", "Lỗi data"); // THÊM CHECK
      
      const chatId = `str_${[uid, other.userId].sort().join("_")}_${Date.now()}`;

      await db.runTransaction(async (transaction) => {
        const otherQueueSnap = await transaction.get(bestMatch!.ref);
        if (!otherQueueSnap.exists) {
          throw new HttpsError("aborted", "Người kia vừa thoát hàng đợi");
        }

        const chatRef = db.doc(`stranger_chats/${chatId}`);
        transaction.set(chatRef, {
          members: [uid, other.userId],
          topic: interests,
          ageRange,
          voiceIntros: { [uid]: voiceUrl, [other.userId]: other.voiceUrl },
          messages: [],
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
          extended: false,
          reportedBy: [],
          status: "active",
        });

        transaction.delete(bestMatch!.ref);
      });

      return { matched: true, chatId };
    } 
    
    await queueRef.doc(uid).set({
      userId: uid,
      interests,
      ageRange,
      wantGender,
      voiceUrl,
      gender: userGender,
      status: "waiting",
      createdAt: FieldValue.serverTimestamp(),
    });
    
    return { matched: false };
  }
);

// 9. BÁO CÁO NGƯỜI LẠ
export const reportStranger = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { chatId, reason } = request.data;
if (!chatId ||!reason) throw new HttpsError("invalid-argument", "Thiếu chatId hoặc reason");

    await db.doc(`users/${uid}`).update({
      karma: FieldValue.increment(-20),
    });

    await db.collection("reports").add({
      chatId,
      reporter: uid,
      reason,
      type: "stranger_chat",
      createdAt: FieldValue.serverTimestamp(),
    });

    const chatRef = db.doc(`stranger_chats/${chatId}`);
    const chatDoc = await chatRef.get();
    if (chatDoc.exists) {
      const reportedBy = chatDoc.data()?.reportedBy || [];
      const newReportedBy = [...reportedBy, uid];

      if (newReportedBy.length >= 2) {
        await chatRef.delete();
      } else {
        await chatRef.update({ reportedBy: newReportedBy });
      }
    }

    return { success: true };
  }
);

// 10. THÊM BẠN TỪ CHAT NGƯỜI LẠ
export const addStrangerFriend = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { chatId, otherUid } = request.data;
if (!otherUid) throw new HttpsError("invalid-argument", "Thiếu otherUid");

    const chatDoc = await db.doc(`stranger_chats/${chatId}`).get();
    if (!chatDoc.exists) throw new HttpsError("not-found", "Phòng chat không tồn tại");

    const createdAt = chatDoc.data()?.createdAt.toMillis() || 0;
    if (Date.now() - createdAt < 2 * 60 * 1000) {
      throw new HttpsError("failed-precondition", "Chat ít nhất 2 phút mới kết bạn được");
    }

    const requestId = `${uid}_${otherUid}`;
    await db.doc(`friendRequests/${requestId}`).set({
      from: uid,
      to: otherUid,
      fromStrangerChat: chatId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

// 11. TỰ XÓA CHAT NGƯỜI LẠ HẾT HẠN - chạy 1 phút/lần
export const cleanupStrangerChats = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Ho_Chi_Minh",
    region: "asia-southeast1",
  },
  async () => {
    const now = Timestamp.now();
    const expired = await db
.collection("stranger_chats")
.where("expiresAt", "<=", now)
.limit(500)
.get();

    if (expired.empty) return;

    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Deleted ${expired.size} expired stranger chats`);
  }
);

// 12. AUTO UPDATE LEVEL khi huhaScore thay đổi
export const onHuhaScoreUpdate = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before ||!after || before.huhaScore === after.huhaScore) return;

    const newScore = after.huhaScore || 0;
    const newLevel = Math.floor(newScore / 100) + 1;

    if (after.level!== newLevel) {
      await db.doc(`users/${userId}`).update({ level: newLevel });
      console.log(`User ${userId} lên level ${newLevel}`);
    }

    // Update rank cho tất cả user - chạy async để không block
    const usersSnap = await db.collection("users")
    .orderBy("huhaScore", "desc")
    .get();

    const batch = db.batch();
    usersSnap.docs.forEach((doc, idx) => {
      batch.update(doc.ref, { rank: idx + 1 });
    });

    await batch.commit();
    console.log(`Updated ranks for ${usersSnap.size} users`);
  }
);
// 14. TỰ ĐỘNG CẬP NHẬT friendCount khi add friend
export const onFriendAdded = onDocumentCreated(
  {
    document: "users/{userId}/friends/{friendId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const userId = event.params.userId;
    const friendData = event.data?.data();
    
    // Chỉ đếm khi status = "active", bỏ qua "removed"
    if (friendData?.status !== "active") return;
    
    await db.doc(`users/${userId}`).update({
      friendCount: FieldValue.increment(1)
    });
    console.log(`+1 friend for ${userId}`);
  }
);

// 15. TỰ ĐỘNG GIẢM friendCount khi xóa/unfriend
export const onFriendRemoved = onDocumentDeleted(
  {
    document: "users/{userId}/friends/{friendId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const userId = event.params.userId;
    const friendData = event.data?.data();
    
    // Chỉ giảm nếu trước đó là "active"
    if (friendData?.status === "active") {
      await db.doc(`users/${userId}`).update({
        friendCount: FieldValue.increment(-1)
      });
      console.log(`-1 friend for ${userId}`);
    }
  }
);

// 16. Xử lý khi unfriend đổi status = "removed" thay vì xóa doc
export const onFriendStatusChanged = onDocumentUpdated(
  {
    document: "users/{userId}/friends/{friendId}",
    region: "asia-southeast1",
  },
  async (event) => {
    const userId = event.params.userId;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // active -> removed: giảm 1
    if (before.status === "active" && after.status === "removed") {
      await db.doc(`users/${userId}`).update({
        friendCount: FieldValue.increment(-1)
      });
      console.log(`-1 friend for ${userId} via status change`);
    }
    
    // removed -> active: tăng 1, phòng case kết bạn lại
    if (before.status === "removed" && after.status === "active") {
      await db.doc(`users/${userId}`).update({
        friendCount: FieldValue.increment(1)
      });
      console.log(`+1 friend for ${userId} via re-add`);
    }
  }
);
// 13. Function cộng điểm HuhaScore - gọi từ client
export const addHuhaScore = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { action } = request.data;
    const SCORE_MAP: Record<string, number> = {
      EVENT_JOIN: 20,
      KEO_SUCCESS: 30,
      CHECKIN_VERIFIED: 10,
      INVITE_FRIEND: 15,
      POSITIVE_REVIEW: 5,
      QUALITY_POST: 10,
      CANCEL_LATE: -20,
      SPAM: -15,
      REPORTED: -10,
    };

    const score = SCORE_MAP[action];
    if (score === undefined) throw new HttpsError("invalid-argument", "Action không hợp lệ");

    await db.doc(`users/${uid}`).update({
      huhaScore: FieldValue.increment(score),
    });

    return { success: true, scoreAdded: score };
  }
);
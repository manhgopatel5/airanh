import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { DocumentSnapshot } from "firebase-admin/firestore";

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

    const { fromUserId, toUserId } = data;
    if (!fromUserId ||!toUserId) return;

    try {
      const fromUserDoc = await db.doc(`users/${fromUserId}`).get();
      const fromUser = fromUserDoc.data();

      await db.collection(`notifications/${toUserId}/items`).add({
        type: "friend_request",
        fromUid: fromUserId,
        fromName: fromUser?.displayName || fromUser?.name || "Người dùng",
        fromAvatar: fromUser?.photoURL || fromUser?.avatar || "",
        title: "Lời mời kết bạn",
        message: "đã gửi lời mời kết bạn",
        actionData: { requesterId: fromUserId },
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

// 3. Function accept lời mời - BẢN DEBUG
export const acceptFriendRequest = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      console.error("No uid");
      throw new HttpsError("unauthenticated", "Chưa đăng nhập");
    }

    const { fromUid, requestId } = request.data;
    if (!fromUid ||!requestId) {
      console.error("Missing params:", request.data);
      throw new HttpsError("invalid-argument", "Thiếu fromUid hoặc requestId");
    }

    const requestRef = db.doc(`friendRequests/${requestId}`);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      console.error("Request not found:", requestId);
      throw new HttpsError("not-found", "Lời mời không tồn tại");
    }

    const requestData = requestDoc.data();
    console.log("requestData:", JSON.stringify(requestData));

    if (!requestData || requestData.toUserId!== uid) {
      console.error("Permission denied. toUserId:", requestData?.toUserId, "uid:", uid);
      throw new HttpsError("permission-denied", "Không có quyền");
    }

    // CHECK BẮT BUỘC - NẾU THIẾU THÌ BÁO LỖI LUÔN
    if (!requestData.fromUserName ||!requestData.toUserName) {
      console.error("Missing names in requestData:", requestData);
      throw new HttpsError("failed-precondition", "Lời mời thiếu thông tin tên. Hãy gửi lại lời mời mới.");
    }

    // KHÔNG FALLBACK VỀ "User" NỮA - ĐỂ BIẾT LỖI Ở ĐÂU
    const fromName = requestData.fromUserName;
    const fromAvatar = requestData.fromUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fromName)}&background=random`;
    const fromUsername = requestData.fromUsername || "";

    const currentName = requestData.toUserName;
    const currentAvatar = requestData.toUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentName)}&background=random`;
    const currentUsername = requestData.toUsername || "";

    console.log("Data sẽ ghi vào chat:", {
      currentUser: { uid, name: currentName, avatar: currentAvatar },
      fromUser: { uid: fromUid, name: fromName, avatar: fromAvatar }
    });

    const batch = db.batch();

    // 1. Lưu friends 2 chiều
    batch.set(db.doc(`users/${uid}/friends/${fromUid}`), {
      uid: fromUid,
      name: fromName,
      avatar: fromAvatar,
      username: fromUsername,
      createdAt: FieldValue.serverTimestamp(),
      status: "active",
    });
    
    batch.set(db.doc(`users/${fromUid}/friends/${uid}`), {
      uid: uid,
      name: currentName,
      avatar: currentAvatar,
      username: currentUsername,
      createdAt: FieldValue.serverTimestamp(),
      status: "active",
    });

    // 2. XÓA CHAT NGƯỜI LẠ CŨ
    const strangerChatId = `str_${[uid, fromUid].sort().join("_")}`;
    batch.delete(db.doc(`chats/${strangerChatId}`));

    // 3. TẠO CHAT MỚI - DÙNG set KHÔNG DÙNG merge
    const chatId = [uid, fromUid].sort().join("_");
    batch.set(db.doc(`chats/${chatId}`), {
      members: [uid, fromUid],
      isGroup: false,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastMessage: "Các bạn đã là bạn bè",
      lastSenderName: "Hệ thống",
      membersInfo: {
        [uid]: {
          name: currentName,
          avatar: currentAvatar,
          username: currentUsername,
        },
        [fromUid]: {
          name: fromName,
          avatar: fromAvatar,
          username: fromUsername,
        },
      },
    });

    // 4. Xóa request
    batch.delete(requestRef);
    
    await batch.commit();
    
    console.log("SUCCESS: Chat created", chatId);
    return { chatId, fromName, currentName };
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
    memory: "256MiB",
  },
  async () => {
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    let totalDeleted = 0;

    const expiredTasks = await db
     .collection("tasks")
     .where("deadline", "<", sevenDaysAgo)
     .limit(500)
     .get();

    if (!expiredTasks.empty) {
      const batch = db.batch();
      expiredTasks.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += expiredTasks.size;
      console.log(`Deleted ${expiredTasks.size} expired tasks`);
    } else {
      console.log("No expired tasks to delete");
    }

    const expiredPlans = await db
     .collection("plans")
     .where("endDate", "<", sevenDaysAgo)
     .limit(500)
     .get();

    if (!expiredPlans.empty) {
      const batch = db.batch();
      expiredPlans.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      totalDeleted += expiredPlans.size;
      console.log(`Deleted ${expiredPlans.size} expired plans`);
    } else {
      console.log("No expired plans to delete");
    }

    console.log(`Total deleted: ${totalDeleted} items`);
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

// 7. Update hotScore cho tab Hot - chạy 15 phút/lần
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

      // Lọc banned/hidden ở code thay vì query
      if (d.banned === true || d.hidden === true) return;

      const createdAt = d.createdAt?.toMillis() || now;
      const ageHours = (now - createdAt) / 3600000;

      let score = 0;
      if (d.type === 'task') {
        const viewCount = d.viewCount || 0;
        const likeCount = d.likeCount || 0;
        const commentCount = d.commentCount || 0;
        score = (viewCount * 0.5 + likeCount * 2 + commentCount * 3) / Math.pow(ageHours + 2, 1.5);
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

// 8. TÌM NGƯỜI LẠ CHAT 1-1 - CHUẨN
function normalizeProvinceName(name?: string) {
  if (!name || name === "Toàn quốc") return "Toàn quốc";
  return String(name).replace(/^(Thành phố|Tỉnh|TP\.|T\.)\s*/i, "").trim();
}

function provincesMatch(a?: string, b?: string) {
  const na = normalizeProvinceName(a);
  const nb = normalizeProvinceName(b);
  if (na === "Toàn quốc" || nb === "Toàn quốc") return true;
  return na.toLowerCase() === nb.toLowerCase();
}

async function getUserPublic(uid: string) {
  const snap = await db.doc(`users/${uid}`).get();
  const d = snap.data();
  return {
    name: d?.displayName || d?.name || "Người lạ",
    avatar: d?.photoURL || d?.avatar || "",
  };
}

export const findStranger = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập");

    const { interests, ageRange, wantGender, province, locationLat, locationLng } = request.data;

    if (!interests || interests.length < 3) {
      throw new HttpsError("invalid-argument", "Chọn ít nhất 3 sở thích");
    }

    try {
      const userRef = db.doc(`users/${uid}`);
      const userDoc = await userRef.get();
      let userData = userDoc.data();

      if (!userDoc.exists) {
        await userRef.set({
          karma: 100,
          tier: 'user',
          createdAt: FieldValue.serverTimestamp()
        }, { merge: true });
        userData = (await userRef.get()).data();
      }

      const tier = userData?.vip?.tier || userData?.tier || "user";
      const correctKarma = tier === "elite"? 400 : tier === "vip"? 200 : 100;

      if (userData?.karma === undefined || userData?.karma < correctKarma) {
        await userRef.set({ karma: correctKarma }, { merge: true });
        userData = {...userData, karma: correctKarma };
      }

      const userKarma = userData?.karma || 0;
      if (userKarma < 50) {
        throw new HttpsError("permission-denied", `Cần tối thiểu 50 điểm. Hiện tại: ${userKarma}`);
      }

      const userGender = userData?.gender || "other";
      const queueRef = db.collection("stranger_queue");

      const existingChat = await db.collection("stranger_chats")
       .where("members", "array-contains", uid)
       .where("status", "==", "active")
       .limit(1)
       .get();

      if (!existingChat.empty) {
        return { matched: true, chatId: existingChat.docs[0].id };
      }

      const matches = await queueRef
       .where("status", "==", "waiting")
       .where("userId", "!=", uid)
       .limit(50)
       .get();

      let bestMatch: DocumentSnapshot | null = null;
      let maxCommon = 0;

      for (const doc of matches.docs) {
        const d = doc.data();

        if (wantGender!== "all" && d.gender!== wantGender) continue;
        if (d.wantGender!== "all" && d.wantGender!== userGender) continue;
        if (ageRange && d.ageRange!== ageRange) continue;

        if (province && province !== "Toàn quốc") {
          if (!provincesMatch(province, d.province)) continue;
        }

        const common = interests.filter((i: string) => d.interests?.includes(i)).length;
        if (common >= 2 && common > maxCommon) {
          maxCommon = common;
          bestMatch = doc;
        }
      }

      if (bestMatch && bestMatch.exists) {
        const other = bestMatch.data();
        if (!other) throw new HttpsError("internal", "Lỗi data");

        const chatId = `str_${[uid, other.userId].sort().join("_")}`;
        const chatRef = db.doc(`stranger_chats/${chatId}`);
        const [mePublic, otherPublic] = await Promise.all([
          getUserPublic(uid),
          getUserPublic(other.userId),
        ]);

        await db.runTransaction(async (transaction) => {
          const otherQueueSnap = await transaction.get(bestMatch!.ref);
          if (!otherQueueSnap.exists) {
            throw new HttpsError("aborted", "Người kia vừa thoát hàng đợi");
          }

          const existingChatSnap = await transaction.get(chatRef);

          if (!existingChatSnap.exists) {
            transaction.set(chatRef, {
              members: [uid, other.userId].sort(),
              topic: interests,
              ageRange,
              province: province || "Toàn quốc",
              messages: [],
              createdAt: FieldValue.serverTimestamp(),
              lastMessageTime: FieldValue.serverTimestamp(),
              lastMessage: "Đã kết nối. Hãy chào nhau 👋",
              expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
              extended: false,
              reportedBy: [],
              status: "active",
              unreadCounts: { [uid]: 0, [other.userId]: 0 },
              onlineStatus: { [uid]: true, [other.userId]: false },
              partnerNames: {
                [uid]: mePublic.name,
                [other.userId]: otherPublic.name,
              },
              partnerAvatars: {
                [uid]: mePublic.avatar,
                [other.userId]: otherPublic.avatar,
              },
              friendRequests: {},
              filters: {
                interests,
                ageRange,
                wantGender,
                province: province || "Toàn quốc",
                ...(locationLat != null && locationLng != null
                  ? { locationLat, locationLng }
                  : {}),
              },
              ...(locationLat != null && locationLng != null
                ? { locationLat, locationLng }
                : {}),
            });
          }

          transaction.update(bestMatch!.ref, {
            status: "matched",
            matchedChatId: chatId
          });
          transaction.set(queueRef.doc(uid), {
            userId: uid,
            status: "matched",
            matchedChatId: chatId,
            createdAt: FieldValue.serverTimestamp()
          });
        });

        return { matched: true, chatId };
      }

      await queueRef.doc(uid).set({
        userId: uid,
        interests,
        ageRange,
        wantGender,
        gender: userGender,
        province: province || "Toàn quốc",
        ...(locationLat != null && locationLng != null ? { locationLat, locationLng } : {}),
        status: "waiting",
        createdAt: FieldValue.serverTimestamp(),
      });

      return { matched: false };
    } catch (error: any) {
      console.error("findStranger error:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message || "Lỗi server");
    }
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
      fromUserId: uid,
      toUserId: otherUid,
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

    if (friendData?.status!== "active") return;

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

    if (!before ||!after) return;

    if (before.status === "active" && after.status === "removed") {
      await db.doc(`users/${userId}`).update({
        friendCount: FieldValue.increment(-1)
      });
      console.log(`-1 friend for ${userId} via status change`);
    }

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
// 17. GỬI LỜI MỜI KẾT BẠN - CHUẨN V2
export const sendFriendRequest = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const fromUserId = request.auth?.uid;
    if (!fromUserId) {
      throw new HttpsError("unauthenticated", "Chưa đăng nhập");
    }

    const { toUid } = request.data;
    if (!toUid) {
      throw new HttpsError("invalid-argument", "Thiếu toUid");
    }

    if (fromUserId === toUid) {
      throw new HttpsError("invalid-argument", "Không thể tự kết bạn");
    }

    // 1. Check đã là bạn chưa
    const friendSnap = await db.doc(`users/${fromUserId}/friends/${toUid}`).get();
    if (friendSnap.exists && friendSnap.data()?.status!== "removed") {
      throw new HttpsError("already-exists", "Đã là bạn bè");
    }

    // 2. Check đã gửi lời mời pending chưa
    const reqSnap = await db
     .collection("friendRequests")
     .where("fromUserId", "==", fromUserId)
     .where("toUserId", "==", toUid)
     .where("status", "==", "pending")
     .limit(1)
     .get();

    if (!reqSnap.empty) {
      throw new HttpsError("already-exists", "Đã gửi lời mời rồi");
    }

    // 3. LẤY INFO 2 USER ĐỂ LƯU VÀO REQUEST
    const [fromUserDoc, toUserDoc] = await Promise.all([
      db.doc(`users/${fromUserId}`).get(),
      db.doc(`users/${toUid}`).get(),
    ]);

    const fromData = fromUserDoc.data();
    const toData = toUserDoc.data();

    const fromName = fromData?.displayName || fromData?.name || request.auth?.token?.email?.split('@')[0] || "User";
    const fromAvatar = fromData?.photoURL || fromData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fromName)}&background=random`;
    const fromUsername = fromData?.username || "";

    const toName = toData?.displayName || toData?.name || "User";
    const toAvatar = toData?.photoURL || toData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(toName)}&background=random`;
    const toUsername = toData?.username || "";

    // 4. Tạo lời mời - LƯU ĐỦ 6 FIELD
    await db.collection("friendRequests").add({
      fromUserId,
      toUserId: toUid,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      // BẮT BUỘC PHẢI CÓ 6 FIELD NÀY
      fromUserName: fromName,
      fromUserAvatar: fromAvatar,
      fromUsername: fromUsername,
      toUserName: toName,
      toUserAvatar: toAvatar,
      toUsername: toUsername,
    });

    return { success: true, message: "Đã gửi lời mời" };
  }
);
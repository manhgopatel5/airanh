import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { Resend } from "resend";
import * as crypto from "crypto";
import { auth } from "firebase-functions/v1"; // Chỉ dùng cho onCreate user
import { onUserCreate } from "firebase-functions/v2/auth";

initializeApp();
const db = getFirestore();

const resendApiKey = defineString("RESEND_API_KEY");

// 0. GỬI MAIL XÁC THỰC BẰNG RESEND - CHUẨN V2
export const sendVerificationEmail = onUserCreate(
  {
    region: "asia-southeast1",
    secrets: [resendApiKey],
    memory: "256MiB",
  },
  async (event) => {
    const user = event.data;
    if (!user.email || user.emailVerified) {
      console.log("Skip:", user.email, "verified:", user.emailVerified);
      return;
    }

    try {
      // Rate limit: check xem user này gửi mail trong 60s chưa
      const recentMail = await db
      .collection("emailVerifications")
      .where("uid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

      const lastDoc = recentMail.docs[0];
      if (lastDoc) {
        const lastTime = lastDoc.createTime.toMillis();
        if (Date.now() - lastTime < 60 * 1000) {
          console.log("Rate limit: skip send for", user.email);
          return;
        }
      }

      // 1. Tạo token ngẫu nhiên, hết hạn sau 24h
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      // 2. Lưu vào Firestore để verify sau
      await db.collection("emailVerifications").doc(token).set({
        uid: user.uid,
        email: user.email,
        expiresAt,
        used: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log("Token created for:", user.email);

      // 3. Link verify của riêng bạn
      const link = `https://huha.online/api/verify-email?token=${token}`;

      // 4. Gửi qua Resend
      const resend = new Resend(resendApiKey.value());
      const { data, error } = await resend.emails.send({
        from: "Huha <admin@huha.online>",
        to: [user.email],
        subject: "Xác thực tài khoản Huha của bạn",
        html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:20px; overflow:hidden; max-width:560px; width:100%;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #0A84FF 0%, #0051D5 100%); padding: 48px 24px; text-align: center;">
                      <h1 style="color: #fff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">Huha</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 32px; color: #1d1d1f;">
                      <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 16px;">Chào ${user.displayName || "bạn"},</h2>
                      <p style="font-size: 16px; line-height: 1.6; color: #515154; margin: 0 0 16px;">
                        Cảm ơn bạn đã tạo tài khoản Huha. Chỉ còn 1 bước nữa để bắt đầu.
                      </p>
                      <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                        <tr>
                          <td align="center" style="border-radius:12px; background-color:#0A84FF;">
                            <a href="${link}" target="_blank" style="display:inline-block; padding:16px 32px; font-size:16px; font-weight:900; color:#ffffff; text-decoration:none;">
                              Xác thực email
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="font-size: 14px; line-height: 1.6; color: #86868b; margin: 24px 0 0;">
                        Link hết hạn sau 24 giờ. Nếu không phải bạn tạo tài khoản, hãy bỏ qua email này.
                      </p>
                      <p style="word-break: break-all; font-size: 12px; color: #86868b; margin: 16px 0 0;">${link}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 32px; background-color:#fafafa; border-top:1px solid #e5e5ea; text-align:center;">
                      <p style="margin:0; font-size:12px; color:#8e8e93;">
                        © 2026 Huha. Mọi quyền được bảo lưu.<br>
                        <a href="https://huha.online" style="color:#8e8e93; text-decoration:none;">huha.online</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `,
        text: `Chào ${user.displayName || "bạn"},\n\nXác thực tài khoản Huha tại link: ${link}\n\nLink hết hạn sau 24h. Nếu bạn không đăng ký, hãy bỏ qua email này.`,
      });

      if (error) {
        console.error("Resend error:", error);
        return;
      }
      console.log("Verification email sent to:", user.email, "id:", data?.id);
    } catch (err) {
      console.error("sendVerificationEmail error:", err);
    }
  }
);

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
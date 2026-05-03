const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// 1. Khi có lời mời kết bạn mới → tạo thông báo cho người nhận
exports.onFriendRequestCreated = onDocumentCreated(
  "friendRequests/{requestId}",
  async (event) => {
    const data = event.data.data();
    const { from, to } = data;

    // Lấy info người gửi
    const fromUserDoc = await db.doc(`users/${from}`).get();
    const fromUser = fromUserDoc.data();

    // Tạo notification cho người nhận
    await db.collection(`notifications/${to}/items`).add({
      type: "friend_request",
      fromUid: from,
      fromName: fromUser.name || "Người dùng",
      fromAvatar: fromUser.avatar || "",
      title: "Lời mời kết bạn",
      message: "đã gửi lời mời kết bạn",
      actionData: { requesterId: from },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

// 2. Khi lời mời được chấp nhận → tạo thông báo cho người gửi lời mời
exports.onFriendAccepted = onDocumentCreated(
  "users/{userId}/friends/{friendId}",
  async (event) => {
    const userId = event.params.userId; // Người vừa accept
    const friendId = event.params.friendId; // Người gửi lời mời ban đầu

    // Check xem friendId có gửi lời mời cho userId không
    const requestId = `${friendId}_${userId}`;
    const requestDoc = await db.doc(`friendRequests/${requestId}`).get();
    
    if (!requestDoc.exists) return; // Không phải accept từ lời mời

    // Lấy info người accept
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();

    // Tạo notification cho người gửi lời mời ban đầu
    await db.collection(`notifications/${friendId}/items`).add({
      type: "friend_accepted",
      fromUid: userId,
      fromName: userData.name || "Người dùng",
      fromAvatar: userData.avatar || "",
      title: "Đã chấp nhận kết bạn",
      message: "đã chấp nhận lời mời kết bạn của bạn",
      actionData: { chatId: [userId, friendId].sort().join("_") },
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Xóa document friendRequests sau khi accept
    await db.doc(`friendRequests/${requestId}`).delete();
  }
);
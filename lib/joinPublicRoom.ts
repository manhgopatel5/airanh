import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { getCityMetaByRoomId, type PublicRoomItem } from "@/lib/publicRooms";

export async function joinPublicRoom(room: PublicRoomItem, userId: string): Promise<void> {
  const db = getFirebaseDB();
  const roomRef = doc(db, "chats", room.id);
  const roomSnap = await getDoc(roomRef);
  const city = getCityMetaByRoomId(room.id);

  if (!roomSnap.exists()) {
    await setDoc(roomRef, {
      isGroup: true,
      isPublicRoom: true,
      groupName: room.name,
      emoji: room.emoji,
      color: room.color,
      imageUrl: room.imageUrl,
      groupAvatar: room.imageUrl,
      members: [userId],
      memberCount: 1,
      onlineCount: 1,
      lastMessage: `Chào mừng đến ${room.name}!`,
      lastSenderId: "system",
      lastSenderName: "Hệ thống",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      blockedUsers: [],
    });
    return;
  }

  const data = roomSnap.data();
  if (!data.members?.includes(userId)) {
    await updateDoc(roomRef, {
      members: arrayUnion(userId),
      imageUrl: data.imageUrl || city?.imageUrl || room.imageUrl,
      groupAvatar: data.groupAvatar || city?.imageUrl || room.imageUrl,
      updatedAt: serverTimestamp(),
    });
  }
}

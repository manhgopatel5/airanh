import type { EventItem } from "@/data/events";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

type ShareEventParams = {
  event: EventItem;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId: string;
};

export async function sendEventShareToChat(params: ShareEventParams) {
  const db = getFirebaseDB();
  const roomId = [params.senderId, params.recipientId].sort().join("_");

  await setDoc(
    doc(db, "chats", roomId),
    {
      members: [params.senderId, params.recipientId],
      lastMessage: `Đã chia sẻ sự kiện: ${params.event.title}`,
      lastMessageAt: serverTimestamp(),
      lastSenderId: params.senderId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await addDoc(collection(db, "chats", roomId, "messages"), {
    type: "event_share",
    eventId: params.event.id,
    eventTitle: params.event.title,
    eventImage: params.event.image || params.event.imageUrl || "",
    eventAddress: params.event.address || "",
    eventTag: params.event.tag || "",
    eventDesc: params.event.desc || params.event.description || "",
    eventPrice: params.event.price || "",
    eventOpenTime: params.event.openTime || "",
    mapUrl: params.event.mapUrl || "",
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    receiverId: params.recipientId,
    createdAt: serverTimestamp(),
    read: false,
  });
}

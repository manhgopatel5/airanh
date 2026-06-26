import { getFirebaseDB } from "@/lib/firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  serverTimestamp, 
  runTransaction,
  query,
  where,
  limit,
  getDocs 
} from "firebase/firestore";
import { toast } from "sonner";

export async function findStranger(user: any) {
  const db = getFirebaseDB();
  const queueRef = doc(db, "stranger_queue", user.uid);
  
  try {
    // 1. Vào hàng đợi trước
    await setDoc(queueRef, {
      userId: user.uid,
      status: "waiting",
      name: user.displayName || "Người lạ",
      avatar: user.photoURL || "",
      createdAt: serverTimestamp(),
    });

    // 2. Tìm người khác đang đợi
    const otherUserSnap = await runTransaction(db, async (transaction) => {
      const myQueue = await transaction.get(queueRef);
      if (!myQueue.exists()) throw new Error("Chưa vào hàng đợi");

      // Tìm 1 người khác trong queue - PHẢI getDocs NGOÀI transaction
      const q = query(
        collection(db, "stranger_queue"),
        where("status", "==", "waiting"),
        where("userId", "!=", user.uid),
        limit(1)
      );
      
      const otherSnap = await getDocs(q);
      if (otherSnap.empty) return null;
      
      const otherDoc = otherSnap.docs[0];
      const otherData = otherDoc.data();

      // Tạo chat room - DÙNG transaction.set THAY addDoc
      const chatRef = doc(collection(db, "stranger_chats"));
      transaction.set(chatRef, {
        members: [user.uid, otherData.userId],
        partnerNames: {
          [user.uid]: otherData.name,
          [otherData.userId]: user.displayName || "Người lạ",
        },
        partnerAvatars: {
          [user.uid]: otherData.avatar,
          [otherData.userId]: user.photoURL || "",
        },
        onlineStatus: {
          [user.uid]: true,
          [otherData.userId]: false,
        },
        unreadCounts: {
          [user.uid]: 0,
          [otherData.userId]: 0,
        },
        messages: [],
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        status: "active",
        createdAt: serverTimestamp(),
      });

      // Xóa cả 2 khỏi queue
      transaction.delete(queueRef);
      transaction.delete(doc(db, "stranger_queue", otherData.userId));

      return { chatId: chatRef.id, partnerName: otherData.name };
    });

    if (otherUserSnap) {
      toast.success(`Đã ghép với ${otherUserSnap.partnerName}`);
      return otherUserSnap.chatId;
    } else {
      toast.info("Đang tìm bạn... Hãy chờ trong giây lát");
      return null;
    }

  } catch (err: any) {
    console.error("Find stranger error:", err);
    await deleteDoc(queueRef).catch(() => {});
    
    if (err.code === "permission-denied") {
      toast.error("Lỗi quyền truy cập. Kiểm tra lại Firestore Rules");
    } else if (err.code === "failed-precondition") {
      toast.error("Lỗi đồng bộ. Thử lại");
    } else {
      toast.error("Lỗi tìm bạn: " + err.message);
    }
    return null;
  }
}

export async function cancelFindStranger(userId: string) {
  const db = getFirebaseDB();
  try {
    await deleteDoc(doc(db, "stranger_queue", userId));
    toast.success("Đã hủy tìm kiếm");
  } catch {
    toast.error("Lỗi hủy tìm kiếm");
  }
}
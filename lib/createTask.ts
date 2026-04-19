import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase.client";

/* ================= TYPES ================= */

type CreateTaskInput = {
  title: string;
  description: string;
  images?: string[];
  price: number;
  totalSlots: number;
  durationHours: number; // ⏳ user chọn (1h, 3h, 24h...)
};

type User = {
  uid: string;
  email?: string | null;
  photoURL?: string | null;
};

/* ================= MAIN FUNCTION ================= */

export async function createTask(data: CreateTaskInput, user: User) {
  try {
    /* ---------- VALIDATE ---------- */
    if (!user?.uid) throw "Chưa đăng nhập";

    if (!data.title?.trim()) throw "Thiếu tiêu đề";
    if (!data.description?.trim()) throw "Thiếu mô tả";
    if (!data.price || data.price <= 0) throw "Giá không hợp lệ";
    if (!data.totalSlots || data.totalSlots <= 0)
      throw "Số người không hợp lệ";
    if (!data.durationHours || data.durationHours <= 0)
      throw "Thời gian không hợp lệ";

    /* ---------- DEADLINE ---------- */
    const deadlineMs =
      Date.now() + data.durationHours * 60 * 60 * 1000;

    const deadline = Timestamp.fromMillis(deadlineMs);

    /* ---------- CREATE ---------- */
    const docRef = await addDoc(collection(db, "tasks"), {
      title: data.title,
      description: data.description,
      images: data.images || [],

      price: data.price,
      totalSlots: data.totalSlots,
      joined: 0,

      userId: user.uid,
      user: user.email || "Ẩn danh",
      avatar:
        user.photoURL ||
        "https://i.pravatar.cc/150?img=3",

      deadline, // 🔥 chuẩn Firestore
      createdAt: serverTimestamp(),

      likes: 0,
    });

    return docRef.id;
  } catch (err: any) {
    console.error("Create task error:", err);
    throw err;
  }
}

import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";

/* ================= TYPES ================= */
export type Gender = "male" | "female" | "other" | "any";
export type AgeRange = "18-22" | "23-27" | "28-35" | "any";

export type StrangerFilters = {
  interests?: string[];
  ageRange?: string;
  wantGender?: Gender;
  province?: string;
};

type UserInfo = {
  uid: string;
  gender: string;
  age: number;
  location: string;
  name: string;
  avatar: string;
  interests?: string[];
};

/* ================= HELPER: PARSE AGE RANGE ================= */
const parseAgeRange = (ageRange: string): [number, number] => {
  if (ageRange === "any") return [0, 200];
  const [min, max] = ageRange.split("-").map(Number);
  return [min || 0, max || 200];
};

/* ================= HELPER: CHECK FILTER MATCH ================= */
const isMatch = (
  user1: UserInfo,
  user2: UserInfo,
  filters1: StrangerFilters,
  filters2: StrangerFilters
): boolean => {
  // Check gender 2 chiều
  if (filters1.wantGender && filters1.wantGender!== "any") {
    if (user2.gender && user2.gender!== filters1.wantGender) return false;
  }
  if (filters2.wantGender && filters2.wantGender!== "any") {
    if (user1.gender && user1.gender!== filters2.wantGender) return false;
  }

  // Check age range 2 chiều
  if (filters1.ageRange && filters1.ageRange!== "any") {
    const [min, max] = parseAgeRange(filters1.ageRange);
    if (user2.age && (user2.age < min || user2.age > max)) return false;
  }
  if (filters2.ageRange && filters2.ageRange!== "any") {
    const [min, max] = parseAgeRange(filters2.ageRange);
    if (user1.age && (user1.age < min || user1.age > max)) return false;
  }

  // Check location 2 chiều
  if (filters1.province && filters1.province!== "Toàn quốc") {
    if (user2.location && user2.location!== filters1.province) return false;
  }
  if (filters2.province && filters2.province!== "Toàn quốc") {
    if (user1.location && user1.location!== filters2.province) return false;
  }

  // Check interests: ít nhất 1 interest trùng
  if (filters1.interests && filters1.interests.length > 0) {
    const user2Interests = user2.interests || [];
    const hasCommon = filters1.interests.some(i => 
      i === "tat-ca" || user2Interests.includes(i)
    );
    if (!hasCommon) return false;
  }

  if (filters2.interests && filters2.interests.length > 0) {
    const user1Interests = user1.interests || [];
    const hasCommon = filters2.interests.some(i => 
      i === "tat-ca" || user1Interests.includes(i)
    );
    if (!hasCommon) return false;
  }

  return true;
};

/* ================= GET USER INFO FOR MATCHING ================= */
const getUserInfo = async (uid: string): Promise<UserInfo | null> => {
  const db = getFirebaseDB();
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;
  const data = userSnap.data();
  
  return {
    uid,
    gender: data.gender || "other",
    age: data.age || 0,
    location: data.location || "",
    name: data.name || data.displayName || "Anonymous",
    avatar: data.avatar || data.photoURL || "",
    interests: data.interests || [],
  };
};

/* ================= MATCH STRANGER ================= */
export const matchStranger = async (
  uid: string,
  filters: StrangerFilters = {}
): Promise<string | null> => {
  const db = getFirebaseDB();
  
  if (!uid) throw new Error("Thiếu user ID");

  const userInfo = await getUserInfo(uid);
  if (!userInfo) throw new Error("Không tìm thấy user");

  // 1. Tìm trong queue xem có ai khớp không
  const queueRef = collection(db, "stranger_queue");
  const queueQuery = query(
    queueRef,
    where("uid", "!=", uid),
    limit(20)
  );
  
  const queueSnap = await getDocs(queueQuery);
  
  for (const queueDoc of queueSnap.docs) {
    const queueData = queueDoc.data();
    const partnerUid = queueData.uid;
    const partnerFilters = queueData.filters || {};
    
    const partnerInfo = await getUserInfo(partnerUid);
    if (!partnerInfo) continue;

    // Check 2 chiều: bạn match họ + họ match bạn
    const isMatched = isMatch(userInfo, partnerInfo, filters, partnerFilters);

    if (isMatched) {
      // MATCH! Tạo chat và xóa partner khỏi queue
      const chatId = await runTransaction(db, async (transaction) => {
        const partnerQueueRef = doc(db, "stranger_queue", partnerUid);
        const partnerQueueSnap = await transaction.get(partnerQueueRef);
        
        // Check lại partner còn trong queue không
        if (!partnerQueueSnap.exists()) return null;

        // Tạo chat
        const chatRef = doc(collection(db, "stranger_chats"));
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000); // 5 phút

        transaction.set(chatRef, {
          members: [uid, partnerUid].sort(),
          status: "active",
          messages: [],
          onlineStatus: { [uid]: true, [partnerUid]: false },
          unreadCounts: { [uid]: 0, [partnerUid]: 0 },
          createdAt: serverTimestamp(),
          expiresAt,
          friendRequests: {},
          filters: filters, // LƯU FILTER VÀO CHAT
        });

        // Xóa partner khỏi queue
        transaction.delete(partnerQueueRef);
        
        return chatRef.id;
      });

      if (chatId) return chatId;
    }
  }

  // 2. Không match ai → vào queue chờ
  await setDoc(doc(db, "stranger_queue", uid), {
    uid,
    filters,
    createdAt: serverTimestamp(),
  });

  return null; // Trả null = vào queue chờ, UI hiện "Đang tìm..."
};

/* ================= CANCEL SEARCH ================= */
export const cancelStrangerSearch = async (uid: string): Promise<void> => {
  const db = getFirebaseDB();
  if (!uid) return;
  await deleteDoc(doc(db, "stranger_queue", uid));
};

/* ================= CHECK IN QUEUE ================= */
export const isInStrangerQueue = async (uid: string): Promise<boolean> => {
  const db = getFirebaseDB();
  if (!uid) return false;
  const snap = await getDoc(doc(db, "stranger_queue", uid));
  return snap.exists();
};

/* ================= GET QUEUE DATA ================= */
export const getStrangerQueueData = async (uid: string) => {
  const db = getFirebaseDB();
  if (!uid) return null;
  const snap = await getDoc(doc(db, "stranger_queue", uid));
  return snap.exists()? snap.data() : null;
};
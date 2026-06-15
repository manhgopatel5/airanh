import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, increment } from "firebase/firestore";

export const hashPassword = async (pwd: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pwd);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const joinGroupByCode = async (groupCode: string, password: string, userId: string) => {
  const db = getFirebaseDB();
  
  // 1. Tìm nhóm theo mã
  const q = query(collection(db, "groups"), where("groupCode", "==", groupCode));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error("Không tìm thấy nhóm với mã này");
  }
  
  const groupDoc = snapshot.docs[0];
  const groupData = groupDoc.data();
  
  // 2. Check đã là thành viên chưa
  if (groupData.members?.includes(userId)) {
    throw new Error("Bạn đã là thành viên nhóm này");
  }
  
  // 3. Check password nếu có
  if (groupData.hasPassword) {
    if (!password) throw new Error("Nhóm này yêu cầu mật khẩu");
    const inputHash = await hashPassword(password);
    if (inputHash !== groupData.passwordHash) {
      throw new Error("Mật khẩu không đúng");
    }
  }
  
  // 4. Join nhóm
  await updateDoc(doc(db, "groups", groupDoc.id), {
    members: arrayUnion(userId),
    memberCount: increment(1),
    [`unreadCount.${userId}`]: 0,
  });
  
  return { groupId: groupDoc.id, groupName: groupData.name };
};
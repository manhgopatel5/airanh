import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  increment,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { MemberInfo } from "@/lib/mentions";

function generateGroupCode() {
  const time = Date.now().toString().slice(-4);
  const random = Math.floor(10 + Math.random() * 90).toString();
  return time + random;
}

async function fetchMemberInfo(db: Firestore, uid: string): Promise<MemberInfo> {
  const snap = await getDoc(doc(db, "users", uid));
  const d = snap.data();
  return {
    name: d?.displayName || d?.name || "User",
    avatar: d?.photoURL || d?.avatar || "",
    username: d?.username || "",
  };
}

/** Tạo hoặc mở rộng nhóm chat gắn với plan khi duyệt ứng viên */
export async function ensurePlanGroup(
  db: Firestore,
  taskId: string,
  title: string,
  ownerId: string,
  newMember: { uid: string; name: string; avatar: string }
): Promise<string> {
  const taskRef = doc(db, "tasks", taskId);
  const taskSnap = await getDoc(taskRef);
  const taskData = taskSnap.data();
  let groupId = taskData?.groupId as string | undefined;

  const memberInfo: MemberInfo = {
    name: newMember.name,
    avatar: newMember.avatar,
    username: "",
  };

  if (groupId) {
    await updateDoc(doc(db, "groups", groupId), {
      members: arrayUnion(newMember.uid),
      memberCount: increment(1),
      [`membersInfo.${newMember.uid}`]: memberInfo,
      updatedAt: serverTimestamp(),
    });
    return groupId;
  }

  const ownerInfo = await fetchMemberInfo(db, ownerId);
  const groupCode = generateGroupCode();

  const ref = await addDoc(collection(db, "groups"), {
    name: `📅 ${title}`.slice(0, 50),
    groupCode,
    members: [ownerId],
    admins: [ownerId],
    ownerId,
    createdBy: ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isGroup: true,
    avatar: "",
    memberCount: 1,
    hasPassword: false,
    linkedTaskId: taskId,
    membersInfo: { [ownerId]: ownerInfo },
  });

  groupId = ref.id;
  await updateDoc(taskRef, { groupId });

  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(newMember.uid),
    memberCount: increment(1),
    [`membersInfo.${newMember.uid}`]: memberInfo,
  });

  return groupId;
}

/** Mời bạn bè vào nhóm gắn với plan */
export async function inviteFriendToPlanGroup(
  db: Firestore,
  groupId: string,
  friendUid: string
): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Nhóm không tồn tại");

  const group = groupSnap.data();
  if (group.members?.includes(friendUid)) {
    throw new Error("Người này đã trong nhóm");
  }

  const memberInfo = await fetchMemberInfo(db, friendUid);
  await updateDoc(groupRef, {
    members: arrayUnion(friendUid),
    memberCount: increment(1),
    [`membersInfo.${friendUid}`]: memberInfo,
    updatedAt: serverTimestamp(),
  });
}

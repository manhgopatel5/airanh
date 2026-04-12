import {
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export const sendFriendRequest = async (from: string, to: string) => {
  if (from === to) return;

  const q = query(
    collection(db, "friendRequests"),
    where("from", "==", from),
    where("to", "==", to)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, "friendRequests"), {
    from,
    to,
    status: "pending",
    createdAt: serverTimestamp(),
  });
};

export const listenFriendRequests = (
  userId: string,
  callback: (data: any[]) => void
) => {
  const q = query(
    collection(db, "friendRequests"),
    where("to", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );
  });
};

export const acceptRequest = async (req: any) => {
  await updateDoc(doc(db, "friendRequests", req.id), {
    status: "accepted",
  });

  await updateDoc(doc(db, "users", req.from), {
    friends: arrayUnion(req.to),
  });

  await updateDoc(doc(db, "users", req.to), {
    friends: arrayUnion(req.from),
  });
};

export const rejectRequest = async (id: string) => {
  await updateDoc(doc(db, "friendRequests", id), {
    status: "rejected",
  });
};

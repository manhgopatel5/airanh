import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

// 🔍 SEARCH USER
export const searchUsers = async (keyword: string) => {
  if (!keyword) return [];

  const q = query(
    collection(db, "users"),
    where("name", ">=", keyword),
    where("name", "<=", keyword + "\uf8ff"),
    limit(10)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

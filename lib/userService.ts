import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  QueryConstraint,
  FirestoreDataConverter,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";

/* ================= TYPES ================= */
export type SearchUser = {
  uid: string;
  name: string;
  nameLower: string;
  email: string;
  avatar: string;
  userId: string;
  username?: string;
  bio?: string;
  searchKeywords: string[];
  hidden?: boolean;
  status: "active" | "banned" | "deleted" | "deactivated";
  deletedAt?: any;
};

export type SearchResult = {
  uid: string;
  name: string;
  avatar: string;
  userId: string;
  username?: string;
  bio?: string;
  isFriend?: boolean;
  matchedField?: "name" | "userId" | "username";
  email?: string;
};

export class SearchError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "SearchError";
  }
}

/* ================= CONVERTER ================= */
const userConverter: FirestoreDataConverter<SearchUser> = {
  toFirestore: (user) => {
    const { uid,...data } = user;
    return data;
  },
  fromFirestore: (snap) => ({
    uid: snap.id,
...snap.data(),
  } as SearchUser),
};

/* ================= CACHE LRU ================= */
class LRUCache<K, V> {
  private cache = new Map<K, { v: V; ts: number }>();
  constructor(private max = 100, private ttl = 5 * 60 * 1000) {}
  get(key: K): V | null {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.ts > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.v;
  }
  set(key: K, v: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, { v, ts: Date.now() });
    if (this.cache.size > this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey!== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
}
const userCache = new LRUCache<string, SearchResult>(100);

/* ================= SEARCH USERS ================= */
export const searchUsers = async (
  keyword: string,
  currentUserId?: string,
  maxResults = 10,
  cursor?: QueryDocumentSnapshot<SearchUser>,
  signal?: AbortSignal
): Promise<{ users: SearchResult[]; lastDoc: QueryDocumentSnapshot<SearchUser> | null; hasMore: boolean }> => {
  const db = getFirebaseDB();

  const trimmed = keyword.trim();
  if (!trimmed) return { users: [], lastDoc: null, hasMore: false };
  if (trimmed.length < 2) throw new SearchError("Từ khóa tối thiểu 2 ký tự", "TOO_SHORT");

  try {
    // ✅ 1. ƯU TIÊN SEARCH THEO USERID - 8 ký tự viết hoa
    if (/^[A-Z0-9]{8}$/.test(trimmed.toUpperCase())) {
      const userIdDoc = await getDoc(doc(db, "userIds", trimmed.toUpperCase()));
      if (userIdDoc.exists()) {
        const { uid } = userIdDoc.data();
        if (uid === currentUserId) return { users: [], lastDoc: null, hasMore: false };

        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if ((!data.status || data.status === "active") &&!data.hidden &&!data.deletedAt) {
            return {
              users: [{
                uid: data.uid,
                name: data.name,
                avatar: data.avatar,
                userId: data.userId,
            ...(data.username && { username: data.username }),
            ...(data.bio && { bio: data.bio }),
                isFriend: false,
                matchedField: "userId",
                email: data.email,
              }],
              lastDoc: null,
              hasMore: false
            };
          }
        }
      }
    }

    // ✅ 2. Search theo username
    const usernameDoc = await getDoc(doc(db, "usernames", trimmed.toLowerCase()));
    if (usernameDoc.exists()) {
      const { uid } = usernameDoc.data();
      if (uid!== currentUserId) {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if ((!data.status || data.status === "active") &&!data.hidden &&!data.deletedAt) {
            return {
              users: [{
                uid: data.uid,
                name: data.name,
                avatar: data.avatar,
                userId: data.userId,
            ...(data.username && { username: data.username }),
            ...(data.bio && { bio: data.bio }),
                isFriend: false,
                matchedField: "username",
                email: data.email,
              }],
              lastDoc: null,
              hasMore: false
            };
          }
        }
      }
    }

    // 3. Search theo name/email - fallback
    const constraints: QueryConstraint[] = [
      where("searchKeywords", "array-contains-any", [
        trimmed.toLowerCase(),
        trimmed.toLowerCase().replace(/\s/g, ""),
        trimmed.toLowerCase().split(" ")[0],
      ]),
      where("status", "==", "active"),
      orderBy("nameLower"),
  ...(cursor? [startAfter(cursor)] : []),
      limit(maxResults + 1),
    ];

    const q = query(collection(db, "users").withConverter(userConverter),...constraints);
    const snap = await getDocs(q);

    if (signal?.aborted) throw new SearchError("Aborted", "ABORTED");

    const docs = snap.docs.slice(0, maxResults);
    const hasMore = snap.docs.length > maxResults;
    const lastDoc = hasMore? docs[docs.length - 1] || null : null;

    const users: SearchResult[] = docs
  .map((d) => {
        const data = d.data();
        if (data.uid === currentUserId) return null;
        if (data.hidden || data.deletedAt) return null;

        let matchedField: SearchResult["matchedField"] = "name";
        if (data.userId?.toLowerCase().includes(trimmed.toLowerCase())) matchedField = "userId";
        else if (data.username?.toLowerCase().includes(trimmed.toLowerCase())) matchedField = "username";

        const result: SearchResult = {
          uid: data.uid,
          name: data.name,
          avatar: data.avatar,
          userId: data.userId,
      ...(data.username && { username: data.username }),
      ...(data.bio && { bio: data.bio }),
          isFriend: false,
          matchedField,
          email: data.email,
        };
        return result;
      })
  .filter(Boolean) as SearchResult[];

    return { users, lastDoc, hasMore };
  } catch (e: any) {
    if (e.code === "failed-precondition") {
      throw new SearchError("Thiếu index Firestore: searchKeywords + status + nameLower", "INDEX");
    }
    if (e.name === "AbortError" || e.code === "ABORTED") {
      throw new SearchError("Aborted", "ABORTED");
    }
    console.error("searchUsers:", e);
    throw new SearchError("Tìm kiếm thất bại");
  }
};

/* ================= GET BY USERID ================= */
export const getUserByUserId = async (userId: string): Promise<SearchResult | null> => {
  const db = getFirebaseDB();

  if (!userId) return null;
  const key = userId.toUpperCase();

  const cached = userCache.get(key);
  if (cached) return cached;

  const userIdDoc = await getDoc(doc(db, "userIds", key));
  if (!userIdDoc.exists()) return null;

  const { uid } = userIdDoc.data();
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return null;

  const data = userSnap.data();
  if (data.hidden || data.deletedAt || (data.status && data.status!== "active")) return null;

  const result: SearchResult = {
    uid: data.uid,
    name: data.name,
    avatar: data.avatar,
    userId: data.userId,
...(data.username && { username: data.username }),
...(data.bio && { bio: data.bio }),
    isFriend: false,
    email: data.email,
  };

  userCache.set(key, result);
  return result;
};

/* ================= DEBOUNCE HOOK ================= */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
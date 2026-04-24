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
  DocumentData,
  QueryConstraint,
  FirestoreDataConverter,
} from "firebase/firestore";
import { db } from "./firebase";

/* ================= TYPES ================= */
export type SearchUser = {
  uid: string;
  name: string;
  nameLower: string;
  email: string;
  avatar: string;
  shortId: string;
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
  shortId: string;
  username?: string;
  bio?: string;
  isFriend?: boolean;
  matchedField?: "name" | "shortId" | "username";
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

/* ================= HELPER: BATCH IN QUERY ================= */
const batchGetDocs = async <T>(
  col: string,
  field: string,
  ids: string[],
  extraConstraints: QueryConstraint[] = []
): Promise<T[]> => {
  if (ids.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const q = query(
      collection(db, col),
      where(field, "in", chunk),
    ...extraConstraints
    );
    chunks.push(getDocs(q));
  }
  const snaps = await Promise.all(chunks);
  return snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id,...d.data() } as T)));
};

/* ================= SEARCH USERS ================= */
export const searchUsers = async (
  keyword: string,
  currentUserId?: string,
  maxResults = 10,
  cursor?: QueryDocumentSnapshot<SearchUser>,
  signal?: AbortSignal
): Promise<{ users: SearchResult[]; lastDoc: QueryDocumentSnapshot<SearchUser> | null; hasMore: boolean }> => {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return { users: [], lastDoc: null, hasMore: false };
  if (trimmed.length < 2) throw new SearchError("Từ khóa tối thiểu 2 ký tự", "TOO_SHORT");

  try {
    const constraints: QueryConstraint[] = [
      where("searchKeywords", "array-contains-any", [
        trimmed,
        trimmed.replace(/\s/g, ""),
        trimmed.split(" ")[0],
        trimmed.toUpperCase(),
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

    const uids = docs.map((d) => d.id).filter((id) => id!== currentUserId);
    if (uids.length === 0) return { users: [], lastDoc: null, hasMore: false };

    const [friends, blocksFrom, blocksTo] = await Promise.all([
      currentUserId
      ? batchGetDocs<{ friendId: string }>("friends", "friendId", uids, [
            where("userId", "==", currentUserId),
            where("status", "==", "accepted"),
          ])
        : [],
      currentUserId
      ? batchGetDocs<{ toUserId: string }>("blocks", "toUserId", uids, [
            where("fromUserId", "==", currentUserId),
          ])
        : [],
      currentUserId
      ? batchGetDocs<{ fromUserId: string }>("blocks", "fromUserId", uids, [
            where("toUserId", "==", currentUserId),
          ])
        : [],
    ]);

    const friendSet = new Set(friends.map((f) => f.friendId));
    const blockSet = new Set([
    ...blocksFrom.map((b) => b.toUserId),
    ...blocksTo.map((b) => b.fromUserId),
    ]);

    const users: SearchResult[] = docs
    .map((d) => {
        const data = d.data();
        if (data.uid === currentUserId || blockSet.has(data.uid)) return null;
        if (data.hidden || data.deletedAt) return null;

        let matchedField: SearchResult["matchedField"] = "name";
        if (data.shortId.toLowerCase().includes(trimmed.toUpperCase())) matchedField = "shortId";
        else if (data.username?.toLowerCase().includes(trimmed)) matchedField = "username";

        const isFriend = friendSet.has(data.uid);

        return {
          uid: data.uid,
          name: data.name,
          avatar: data.avatar,
          shortId: data.shortId,
          username: data.username,
          bio: data.bio,
          isFriend,
          matchedField,
          email: isFriend? data.email : undefined,
        };
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

/* ================= GET BY SHORTID ================= */
export const getUserByShortId = async (shortId: string): Promise<SearchResult | null> => {
  if (!shortId) return null;
  const key = shortId.toUpperCase();

  const cached = userCache.get(key);
  if (cached) return cached;

  const q = query(
    collection(db, "users").withConverter(userConverter),
    where("shortId", "==", key),
    where("status", "==", "active"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const data = snap.docs[0]!.data();
  if (data.hidden || data.deletedAt) return null;

  const result: SearchResult = {
    uid: data.uid,
    name: data.name,
    avatar: data.avatar,
    shortId: data.shortId,
    username: data.username,
    bio: data.bio,
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
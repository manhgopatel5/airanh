"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import type { FeedTask } from "@/types/task";
import { isActiveFeedItem } from "@/types/task";

type TabId = "hot" | "near" | "friends" | "new";

const tsToString = (ts: any): string | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return null;
};

const docToFeedTask = (doc: QueryDocumentSnapshot<DocumentData>): FeedTask => {
  const d = doc.data();
  return {
    id: doc.id,
    slug: d.slug || "",
    shortId: d.shortId || "",
    title: d.title || "",
    description: d.description || "",
    type: "task",
    status: d.status || "open",
    userId: d.userId || "",
    userName: d.userName || "",
    userAvatar: d.userAvatar || "",
  ...(d.userShortId!== undefined && { userShortId: d.userShortId }),
  ...(d.userUsername!== undefined && { userUsername: d.userUsername }),
    price: d.price?? 0,
    currency: d.currency || "VND",
    totalSlots: d.totalSlots?? 0,
    joined: d.joined?? 0,
    budgetType: d.budgetType || "fixed",
  ...(d.paymentMethod!== undefined && { paymentMethod: d.paymentMethod }),
  ...(d.isRemote!== undefined && { isRemote: d.isRemote }),
    category: d.category || "",
    tags: Array.isArray(d.tags)? d.tags : [],
    images: Array.isArray(d.images)? d.images : [],
    viewCount: d.viewCount?? 0,
    likeCount: d.likeCount?? 0,
    commentCount: d.commentCount?? 0,
    likes: Array.isArray(d.likes)? d.likes : [],
  ...(d.location!== undefined && { location: d.location }),
    savedBy: Array.isArray(d.savedBy)? d.savedBy : [],
    applicants: Array.isArray(d.applicants)? d.applicants : [],
  ...(d.banned!== undefined && { banned: d.banned }),
  ...(d.hidden!== undefined && { hidden: d.hidden }),
  ...(d.appliedCount!== undefined && { appliedCount: d.appliedCount }),
    createdAt: tsToString(d.createdAt),
  ...(d.updatedAt && { updatedAt: tsToString(d.updatedAt) }),
  ...(d.deadline && { deadline: tsToString(d.deadline) }),
  ...(d.startDate && { startDate: tsToString(d.startDate) }),
  ...(d.applicationDeadline && { applicationDeadline: tsToString(d.applicationDeadline) }),
  } as FeedTask;
};

export function useTaskFeed(tab: TabId = "hot") {
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const taskIdsRef = useRef<Set<string>>(new Set());
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const buildQuery = useCallback((db: any, after?: QueryDocumentSnapshot<DocumentData>) => {
    let q = query(
      collection(db, "tasks"),
      where("type", "==", "task"),
      where("visibility", "==", "public"),
      where("status", "in", ["open", "doing"]),
      where("banned", "!=", true),
      where("hidden", "!=", true)
    );

    if (tab === "hot") q = query(q, orderBy("viewCount", "desc"));
    else if (tab === "new") q = query(q, orderBy("createdAt", "desc"));
    else q = query(q, orderBy("createdAt", "desc"));

    q = query(q, limit(20));
    if (after) q = query(q, startAfter(after));
    return q;
  }, [tab]);

  const loadInitial = useCallback(() => {
    const db = getFirebaseDB();
    if (unsubRef.current) unsubRef.current();

    setLoading(true);
    taskIdsRef.current.clear();

    unsubRef.current = onSnapshot(buildQuery(db), (snap) => {
      const newTasks = snap.docs.map(docToFeedTask).filter(isActiveFeedItem);
      setTasks(newTasks);
      taskIdsRef.current = new Set(newTasks.map((t) => t.id));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === 20);
      setLoading(false);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [buildQuery]);

  useEffect(() => {
    return loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore ||!hasMore ||!lastDocRef.current) return;
    setLoadingMore(true);

    const db = getFirebaseDB();
    const snap = await getDocs(buildQuery(db, lastDocRef.current));

    const moreTasks = snap.docs.map(docToFeedTask).filter(isActiveFeedItem);
    setTasks((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      const filtered = moreTasks.filter((t) =>!existing.has(t.id));
      filtered.forEach((t) => taskIdsRef.current.add(t.id));
      return [...prev,...filtered];
    });

    lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
    setHasMore(snap.docs.length === 20);
    setLoadingMore(false);
  }, [loadingMore, hasMore, buildQuery]);

  const refresh = useCallback(async () => {
    loadInitial();
  }, [loadInitial]);

  return {
    tasks,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    // Bỏ newTaskCount, resetNewTaskCount
  };
}
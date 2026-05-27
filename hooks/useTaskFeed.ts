"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import type { FeedTask } from "@/types/task";

const tsToString = (ts: any): string | null => {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  return null;
};

export function useTaskFeed() {
  const [tasks, setTasks] = useState<FeedTask[]>([]);
  const [newTaskCount, setNewTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // FIX: Lưu timestamp lần đầu load để chỉ count task mới hơn
  const firstLoadTimeRef = useRef<Timestamp | null>(null);
  const taskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const db = getFirebaseDB();
    const q = query(
      collection(db, "tasks"),
      where("type", "==", "task"),
      where("visibility", "==", "public"),
      where("status", "in", ["open", "doing"]),
      where("banned", "!=", true),
      where("hidden", "!=", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      // Lần đầu load
      if (!firstLoadTimeRef.current) {
        firstLoadTimeRef.current = Timestamp.now();
        
        const newTasks: FeedTask[] = snap.docs.map(doc => {
          const d = doc.data();
          taskIdsRef.current.add(doc.id);
          
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
        });
        
        setTasks(newTasks);
        setLoading(false);
        return;
      }

      // FIX: Chỉ count task thực sự mới - có createdAt > firstLoadTime và id chưa có
      let count = 0;
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const createdAt = data.createdAt;
          
          // Task mới = tạo sau lần load đầu + id chưa có trong list
          if (
            createdAt instanceof Timestamp &&
            createdAt.toMillis() > firstLoadTimeRef.current!.toMillis() &&
           !taskIdsRef.current.has(change.doc.id)
          ) {
            count++;
          }
        }
      });
      
      if (count > 0) {
        setNewTaskCount(prev => prev + count);
      }

      // Update list + dedupe
      const updatedTasks: FeedTask[] = snap.docs.map(doc => {
        const d = doc.data();
        taskIdsRef.current.add(doc.id);
        
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
      });
      
      setTasks(updatedTasks);
    });

    return () => unsub();
  }, []);

  const resetNewTaskCount = () => setNewTaskCount(0);

  return { tasks, newTaskCount, loading, resetNewTaskCount };
}
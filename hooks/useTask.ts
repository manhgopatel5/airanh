"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  doc, getDoc, getDocs, collection, query, where,
  updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { incrementTaskView } from "@/lib/task";
import { applyToTask, cancelToTask } from "@/app/actions/task";
import type { FeedTask } from "@/types/task";

import { mapFirestoreUserToOwner } from "@/lib/task/author";

type OwnerData = ReturnType<typeof mapFirestoreUserToOwner>;

type Application = {
  id: string;
  taskId: string;
  taskOwnerId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: any;
  updatedAt?: any;
};

export function useTask(taskId: string | undefined, currentUserId?: string) {
  const router = useRouter();
  const [db, setDb] = useState<any>(null);
  const [task, setTask] = useState<FeedTask | null>(null);
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDb(getFirebaseDB());
  }, []);

  const loadTask = useCallback(async () => {
    if (!db ||!taskId || typeof taskId!== "string") return;
    try {
      const snap = await getDoc(doc(db, "tasks", taskId));
      if (!snap.exists()) {
        toast.error("Không tìm thấy công việc");
        router.replace("/404");
        return;
      }
      const d = snap.data();
      if (d.banned) {
        toast.error("Công việc này đã bị khóa");
        router.replace("/");
        return;
      }

      const taskData: FeedTask = {
        id: snap.id,
        slug: d.slug || "",
        shortId: d.shortId || "",
        title: d.title || "",
        description: d.description || "",
        type: d.type || "task",
        status: d.status || "open",
        rating: d.rating, // Thêm dòng này
        xpClaimed: d.xpClaimed || false, // Thêm dòng này
        userId: d.userId || "",
        userName: d.userName || d.displayName || d.name || "",
        userAvatar: d.userAvatar || d.photoURL || d.avatar || null,
      ...(d.userShortId!== undefined && { userShortId: d.userShortId }),
      ...(d.userUsername!== undefined && { userUsername: d.userUsername }),
        price: d.price?? 0,
        currency: d.currency || "VND",
        budgetType: d.budgetType || "fixed",
      ...(d.paymentMethod!== undefined && { paymentMethod: d.paymentMethod }),
        totalSlots: d.totalSlots?? 0,
        joined: d.joined?? 0,
        maxParticipants: d.maxParticipants?? d.totalSlots?? 0,
        currentParticipants: d.currentParticipants?? d.joined?? 0,
        applicants: Array.isArray(d.applicants)? d.applicants : [],
        savedBy: Array.isArray(d.savedBy)? d.savedBy : [],
        assignees: Array.isArray(d.assignees)? d.assignees : [],
        likes: Array.isArray(d.likes)? d.likes : [],
      ...(d.location!== undefined && { location: d.location }),
        tags: Array.isArray(d.tags)? d.tags : [],
        category: d.category || "",
        images: Array.isArray(d.images)? d.images : [],
        visibility: d.visibility || "public",
        likeCount: d.likeCount?? 0,
        viewCount: d.viewCount?? 0,
        commentCount: d.commentCount?? 0,
        shareCount: d.shareCount?? 0,
        bookmarkCount: d.bookmarkCount?? 0,
      ...(d.isRemote!== undefined && { isRemote: d.isRemote }),
      ...(d.banned!== undefined && { banned: d.banned }),
      ...(d.hidden!== undefined && { hidden: d.hidden }),
      ...(d.appliedCount!== undefined && { appliedCount: d.appliedCount }),
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      ...(d.updatedAt?.toDate && { updatedAt: d.updatedAt.toDate().toISOString() }),
      ...(d.deadline?.toDate && { deadline: d.deadline.toDate().toISOString() }),
      ...(d.eventDate?.toDate && { eventDate: d.eventDate.toDate().toISOString() }),
      ...(d.endDate?.toDate && { endDate: d.endDate.toDate().toISOString() }),
      ...(d.startDate?.toDate && { startDate: d.startDate.toDate().toISOString() }),
      ...(d.applicationDeadline?.toDate && { applicationDeadline: d.applicationDeadline.toDate().toISOString() }),
      ...(d.type === "plan" && {
          milestones: Array.isArray(d.milestones) ? d.milestones : [],
          participants: Array.isArray(d.participants) ? d.participants : [],
          costType: d.costType || "free",
        ...(d.costAmount !== undefined && { costAmount: d.costAmount }),
        }),
      };

      setTask(taskData);
      setIsSaved(!!currentUserId &&!!taskData.savedBy?.includes(currentUserId));
      incrementTaskView(taskData.id);
    } catch (err) {
      console.error("Load task error:", err);
      toast.error("Lỗi tải công việc");
      router.replace("/404");
    } finally {
      setLoading(false);
    }
  }, [db, taskId, currentUserId, router]);

  const loadOwner = useCallback(async () => {
    if (!db || !task?.userId) return;
    const snap = await getDoc(doc(db, "users", task.userId));
    if (snap.exists()) {
      setOwner(mapFirestoreUserToOwner(snap.data() as Record<string, unknown>, snap.id));
      return;
    }
    setOwner({
      uid: task.userId,
      name: task.userName || "Người dùng",
      avatar: task.userAvatar || "",
      online: undefined,
      rating: undefined,
      reviewCount: undefined,
      verified: false,
      isNewUser: false,
    });
  }, [db, task?.userId, task?.userName, task?.userAvatar]);

  const loadApplications = useCallback(async () => {
    if (!db ||!task?.id) {
      setApplications([]);
      return;
    }
    const q = query(collection(db, 'applications'), where('taskId', '==', task.id));
    const snap = await getDocs(q);
    const apps = snap.docs.map(d => ({ id: d.id,...d.data() } as Application));
    setApplications(apps);
  }, [db, task?.id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    loadOwner();
  }, [loadOwner]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleSave = async () => {
    if (!currentUserId ||!task) return;
    if (saving) return;
    setSaving(true);
    const newSaved =!isSaved;
    setIsSaved(newSaved);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        savedBy: newSaved? arrayUnion(currentUserId) : arrayRemove(currentUserId),
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const handleJoinTask = async () => {
    if (!currentUserId ||!task || joining) return;
    setJoining(true);
    try {
      await applyToTask(task.id, currentUserId);
      toast.success("Đã gửi yêu cầu ứng tuyển!");
      navigator.vibrate?.(10);
      await loadTask();
      await loadApplications();
    } catch (err: any) {
      toast.error(err.message || "Ứng tuyển thất bại");
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handleCancelApply = async () => {
    if (!currentUserId ||!task || joining) return;
    setJoining(true);
    try {
      await cancelToTask(task.id, currentUserId);
      toast.success("Đã hủy ứng tuyển");
      navigator.vibrate?.(10);
      await loadTask();
      await loadApplications();
    } catch {
      toast.error("Hủy thất bại");
    } finally {
      setJoining(false);
    }
  };

  const isOwner = currentUserId === task?.userId;
  const isApplied = applications.some(
    app => app.userId === currentUserId && ['pending', 'accepted'].includes(app.status)
  );
  const isParticipant = task?.type === "plan" && currentUserId
    ? (task as FeedTask & { participants?: { userId: string; status?: string }[] }).participants?.some(
        (p) => p.userId === currentUserId && p.status !== "left" && p.status !== "kicked"
      ) ?? false
    : false;
  const isFull = task?
    (task.type === "task"
    ? (task.joined?? 0) >= task.totalSlots
      : (task.currentParticipants?? 0) >= (task.maxParticipants?? task.totalSlots)
    ) : false;

  return {
    task,
    owner,
    applications,
    loading,
    isOwner,
    isApplied,
    isParticipant,
    isFull,
    isSaved,
    saving,
    joining,
    handleSave,
    handleJoinTask,
    handleCancelApply,
    reloadTask: loadTask,
    reloadApplications: loadApplications
  };
}
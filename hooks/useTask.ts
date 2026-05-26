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
import type { Task } from "@/types/task";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean;
  rating?: number;
  reviewCount?: number;
  joinedDate?: any;
  phone?: string;
  verified?: boolean;
};

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
  const [task, setTask] = useState<Task | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
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
      const data = snap.data();
      if (data.banned) {
        toast.error("Công việc này đã bị khóa");
        router.replace("/");
        return;
      }
      const taskData = { id: snap.id,...data } as Task;
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
    if (!db ||!task?.userId) return;
    const snap = await getDoc(doc(db, "users", task.userId));
    if (snap.exists()) setOwner({ uid: snap.id,...snap.data() } as UserData);
  }, [db, task?.userId]);

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
  // Sửa: dùng?? 0 và check cả totalSlots + appliedCount
  const isFull = task && 'totalSlots' in task && 'appliedCount' in task
   ? (task.appliedCount?? 0) >= task.totalSlots
    : false;

  return {
    task,
    owner,
    applications,
    loading,
    isOwner,
    isApplied,
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
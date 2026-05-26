"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, query, limit, getDocs, Timestamp
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";
import {
  createComment,
  toggleLikeComment,
  deleteComment,
  editComment,
} from "@/lib/taskCommentService";
import type { TaskComment } from "@/types/task";
import type { User } from "firebase/auth";

export function useComments(taskId: string | undefined) {
  const [db, setDb] = useState<any>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [sending, setSending] = useState(false);
  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDb(getFirebaseDB());
  }, []);

  const loadComments = useCallback(async () => {
    if (!db ||!taskId) return;
    const q = query(
      collection(db, "tasks", taskId, "comments"),
      limit(20)
    );
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id,...d.data() } as TaskComment)));
  }, [db, taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const sendComment = async (text: string, currentUser: User | null, replyTo: TaskComment | null) => {
    if (!currentUser ||!taskId ||!text.trim() || sending) return;
    const tempId = `temp-${Date.now()}`;
    const tempComment: TaskComment = {
      id: tempId,
      taskId,
      userId: currentUser.uid,
      userName: currentUser.displayName || "Bạn",
      userAvatar: currentUser.photoURL || "",
      text: text.trim(),
      createdAt: Timestamp.now(),
      likeCount: 0,
      likedBy: [],
     ...(replyTo && {
        parentId: replyTo.parentId || replyTo.id,
        replyToUserId: replyTo.userId,
        replyToUserName: replyTo.userName
      }),
    };
    setComments(prev => [...prev, tempComment]);
    setSending(true);
    try {
      await createComment(taskId, { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }, {
        text: DOMPurify.sanitize(tempComment.text),
       ...(replyTo && {
          parentId: replyTo.parentId || replyTo.id,
          replyToUserId: replyTo.userId,
          replyToUserName: replyTo.userName
        }),
      });
      await loadComments();
    } catch (err: any) {
      setComments(prev => prev.filter(c => c.id!== tempId));
      toast.error(err.message || "Gửi thất bại");
      throw err;
    } finally {
      setSending(false);
    }
  };

  const likeComment = async (commentId: string, currentUserId: string) => {
    if (!taskId) return;
    if (likingComments.has(commentId)) return;
    setLikingComments(prev => new Set(prev).add(commentId));
    const liked = comments.find(c => c.id === commentId)?.likedBy?.includes(currentUserId);
    setComments(prev => prev.map(c => c.id === commentId? {
     ...c,
      likedBy: liked? c.likedBy.filter(id => id!== currentUserId) : [...(c.likedBy || []), currentUserId],
      likeCount: liked? c.likeCount - 1 : c.likeCount + 1
    } : c));
    try {
      await toggleLikeComment(commentId, currentUserId, taskId);
      navigator.vibrate?.(10);
    } catch {
      setComments(prev => prev.map(c => c.id === commentId? {
       ...c,
        likedBy: liked? [...(c.likedBy || []), currentUserId] : c.likedBy.filter(id => id!== currentUserId),
        likeCount: liked? c.likeCount + 1 : c.likeCount - 1
      } : c));
      toast.error("Lỗi");
    } finally {
      setLikingComments(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  };

  const handleDeleteComment = async (commentId: string, currentUserId: string) => {
    if (!taskId) return;
    const backup = comments;
    setComments(prev => prev.filter(c => c.id!== commentId && c.parentId!== commentId));
    try {
      await deleteComment(commentId, currentUserId, taskId);
      toast.success("Đã xóa");
      navigator.vibrate?.(10);
    } catch {
      setComments(backup);
      toast.error("Xóa thất bại");
    }
  };

  const handleEditComment = async (commentId: string, currentUserId: string, editText: string) => {
    if (!editText.trim() ||!taskId) return;
    try {
      await editComment(commentId, currentUserId, DOMPurify.sanitize(editText), taskId);
      toast.success("Đã sửa");
      await loadComments();
    } catch {
      toast.error("Sửa thất bại");
    }
  };

  return {
    comments,
    sending,
    likingComments,
    sendComment,
    likeComment,
    deleteComment: handleDeleteComment,
    editComment: handleEditComment,
    reloadComments: loadComments
  };
}
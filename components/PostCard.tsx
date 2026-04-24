"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiMessageCircle, FiShare2, FiMoreHorizontal, FiTrash2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useState, useCallback } from "react";
import { doc, runTransaction, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { Timestamp } from "firebase/firestore";
import Linkify from "linkify-react";

type Post = {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content?: string;
  images?: string[];
  likes?: string[];
  commentCount?: number;
  createdAt?: Timestamp;
};

type Props = {
  post: Post;
  onDelete?: (id: string) => void;
};

export default function PostCard({ post, onDelete }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [liking, setLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!post) return null;

  const liked = user && localLikes.includes(user.uid);
  const isOwner = user?.uid === post.userId;

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");
    if (liking) return;

    setLiking(true);
    const newLikes = liked
      ? localLikes.filter((id) => id !== user.uid)
      : [...localLikes, user.uid];
    setLocalLikes(newLikes);

    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "posts", post.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error("Post không tồn tại");

        const currentLikes = snap.data().likes || [];
        const hasLiked = currentLikes.includes(user.uid);

        transaction.update(ref, {
          likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        });
      });
    } catch (err) {
      console.error("Lỗi like:", err);
      setLocalLikes(post.likes || []);
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, localLikes, post.id, post.likes, router]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    const url = `${window.location.origin}/post/${post.id}`;
    const title = post.content?.slice(0, 50) || "Xem bài viết";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.warn("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [post.id, post.content]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    if (!confirm("Xóa bài viết này?")) return;
    await deleteDoc(doc(db, "posts", post.id));
    onDelete?.(post.id);
  }, [isOwner, post.id, onDelete]);

  const goToPost = useCallback(() => router.push(`/post/${post.id}`), [router, post.id]);
  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${post.userId}`);
  }, [router, post.userId]);

  const handleMouseEnter = useCallback(() => {
    router.prefetch(`/post/${post.id}`);
  }, [router, post.id]);

  const timeAgo = (seconds?: number) => {
    if (!seconds) return "";
    const diff = Date.now() / 1000 - seconds;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
    return new Date(seconds * 1000).toLocaleDateString("vi-VN");
  };

  return (
    <div
      onClick={goToPost}
      onMouseEnter={handleMouseEnter}
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm shadow-gray-100/50 dark:shadow-black/20 active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden group hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/40"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={goToProfile} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={post.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName || "U")}&background=random`}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800"
              alt=""
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {post.userName || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {timeAgo(post.createdAt?.seconds)}
              </p>
            </div>
          </button>

          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <FiMoreHorizontal size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 py-1 z-10">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 w-full"
                  >
                    <FiTrash2 size={14} /> Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {post.content && (
          <Linkify
            options={{
              target: "_blank",
              className: "text-blue-600 dark:text-blue-400 hover:underline",
            }}
          >
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </Linkify>
        )}

        {post.images && post.images.length > 0 && (
          <div
            className={`grid gap-1.5 rounded-2xl overflow-hidden ${
              post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-2"
            }`}
          >
            {post.images.slice(0, 4).map((img, i) => (
              <div key={i} className="relative">
                <img
                  src={img}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                  className={`w-full object-cover bg-gray-200 dark:bg-zinc-800 ${
                    post.images!.length === 1
                      ? "max-h-[400px]"
                      : post.images!.length === 3 && i === 0
                      ? "row-span-2 h-full"
                      : "h-40"
                  }`}
                  alt=""
                />
                {i === 3 && post.images!.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                    +{post.images!.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 pt-1 text-gray-500 dark:text-zinc-400">
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1.5 active:scale-90 transition group/like disabled:opacity-50"
          >
            {liked ? <FaHeart className="text-red-500" size={18} /> : <FiHeart className="group-hover/like:text-red-400" size={18} />}
            <span className="text-xs font-semibold">{localLikes.length}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPost();
            }}
            className="flex items-center gap-1.5 active:scale-90 transition group/comment"
          >
            <FiMessageCircle className="group-hover/comment:text-blue-400" size={18} />
            <span className="text-xs font-semibold">{post.commentCount || 0}</span>
          </button>

          <button onClick={handleShare} className="flex items-center gap-1.5 active:scale-90 transition group/share ml-auto">
            <FiShare2 className="group-hover/share:text-emerald-400" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
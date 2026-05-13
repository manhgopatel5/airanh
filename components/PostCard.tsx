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
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showLikeBurst, setShowLikeBurst] = useState(false);

  // ✅ LOTTIE
  const likeLottie = "/lotties/huha-celebrate-full.lottie";

  if (!post) return null;

  const liked = user && localLikes.includes(user.uid);
  const isOwner = user?.uid === post.userId;

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");
    if (liking) return;

    setLiking(true);
    const willLike =!liked;

    const newLikes = liked
    ? localLikes.filter((id) => id!== user.uid)
      : [...localLikes, user.uid];
    setLocalLikes(newLikes);

    if (willLike) {
      setShowLikeBurst(true);
      navigator.vibrate?.([5,10,5]);
      setTimeout(() => setShowLikeBurst(false), 700);
    }

    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "posts", post.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error("Post không tồn tại");

        const currentLikes = snap.data().likes || [];
        const hasLiked = currentLikes.includes(user.uid);

        transaction.update(ref, {
          likes: hasLiked? arrayRemove(user.uid) : arrayUnion(user.uid),
        });
      });
    } catch (err) {
      console.error("Lỗi like:", err);
      setLocalLikes(post.likes || []);
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, localLikes, post.id, post.likes, router, db]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.vibrate?.(10);

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
    navigator.vibrate?.(15);
    await deleteDoc(doc(db, "posts", post.id));
    onDelete?.(post.id);
  }, [isOwner, post.id, onDelete, db]);

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
    <motion.div
      initial={{opacity:0,y:10}}
      animate={{opacity:1,y:0}}
      onClick={goToPost}
      onMouseEnter={handleMouseEnter}
      className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-900 shadow-sm active:scale-[0.99] transition-all duration-200 cursor-pointer overflow-hidden group hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/30"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={goToProfile} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={post.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName || "U")}&background=0042B2&color=fff`}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-900"
              alt=""
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {post.userName || "User"}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
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
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
              >
                <FiMoreHorizontal size={18} className="text-zinc-500" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="absolute right-0 top-9 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1 z-10 overflow-hidden">
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 w-full font-medium"
                    >
                      <FiTrash2 size={14} /> Xóa
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {post.content && (
          <Linkify
            options={{
              target: "_blank",
              className: "text-[#0042B2] dark:text-[#5B8DEF] hover:underline font-medium",
            }}
          >
            <p className="text-[15px] text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </Linkify>
        )}

        {post.images && post.images.length > 0 && (
          <div
            className={`grid gap-1.5 rounded-2xl overflow-hidden ${
              post.images.length === 1? "grid-cols-1" : post.images.length === 2? "grid-cols-2" : "grid-cols-2"
            }`}
          >
            {post.images.slice(0, 4).map((img, i) => (
              <div key={i} className="relative bg-zinc-100 dark:bg-zinc-900">
                <img
                  src={img}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                  className={`w-full object-cover ${
                    post.images!.length === 1
                    ? "max-h-[420px]"
                      : post.images!.length === 3 && i === 0
                    ? "row-span-2 h-full min-h-[260px]"
                      : "h-44"
                  }`}
                  alt=""
                />
                {i === 3 && post.images!.length > 4 && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl">
                    +{post.images!.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 pt-1 text-zinc-500 dark:text-zinc-500">
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1.5 active:scale-90 transition group/like disabled:opacity-50 relative"
          >
            <div className="relative w-5 h-5 flex items-center justify-center">
              {liked? (
                <motion.div initial={{scale:0.7}} animate={{scale:1}} transition={{type:"spring",stiffness:500}}>
                  <FaHeart className="text-red-500" size={18} />
                </motion.div>
              ) : (
                <FiHeart className="group-hover/like:text-red-500 transition-colors" size={18} />
              )}
              <AnimatePresence>
                {showLikeBurst && (
                  <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.6}} exit={{opacity:0}} className="absolute inset-0 pointer-events-none">
                    <DotLottieReact src={likeLottie} autoplay style={{width:36,height:36,marginLeft:-9,marginTop:-9}} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-xs font-semibold min-w-">{localLikes.length}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPost();
            }}
            className="flex items-center gap-1.5 active:scale-90 transition group/comment hover:text-[#0042B2]"
          >
            <FiMessageCircle className="group-hover/comment:text-[#0042B2] transition-colors" size={18} />
            <span className="text-xs font-semibold">{post.commentCount || 0}</span>
          </button>

          <button onClick={handleShare} className="flex items-center gap-1.5 active:scale-90 transition group/share ml-auto hover:text-[#00C853]">
            <FiShare2 className="group-hover/share:text-[#00C853] transition-colors" size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
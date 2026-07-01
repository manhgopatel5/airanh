"use client";

import {
  FiX,
  FiMapPin,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiShare2,
  FiNavigation,
  FiStar,
  FiMessageSquare,
  FiCheckCircle,
  FiLogIn,
} from "react-icons/fi";
import { EventItem } from "@/data/events";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import ShareEventModal from "@/components/ShareEventModal";
import { eventAuthFetch } from "@/lib/eventApi";

type Review = {
  id: string;
  userId: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function EventDetailModal({
  event,
  onClose,
  onCheckinSuccess,
}: {
  event: EventItem | null;
  onClose: () => void;
  onCheckinSuccess?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [localJoined, setLocalJoined] = useState(event?.joined || 0);
  const [localRating, setLocalRating] = useState(event?.rating || 0);
  const [localReviews, setLocalReviews] = useState(event?.reviews || 0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasMyReview, setHasMyReview] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!event) return;
    try {
      const res = await fetch(`/api/admin/reviews?eventId=${event.id}`);
      const data = await res.json();
      if (!res.ok) return;

      const reviewList: Review[] = data.reviews || [];
      setReviews(reviewList);

      const mine = user?.uid
        ? reviewList.find((r) => r.userId === user.uid)
        : undefined;

      if (mine) {
        setMyRating(mine.rating);
        setComment(mine.comment || "");
        setHasMyReview(true);
      } else {
        setHasMyReview(false);
      }

      const total = reviewList.reduce((sum, r) => sum + r.rating, 0);
      const count = reviewList.length;
      setLocalRating(count > 0 ? Number((total / count).toFixed(1)) : 0);
      setLocalReviews(count);
    } catch (err) {
      console.error(err);
    }
  }, [event, user?.uid]);

  const fetchCheckinStatus = useCallback(async () => {
    if (!event || !user?.uid) {
      setHasCheckedIn(false);
      setLoadingStatus(false);
      return;
    }

    setLoadingStatus(true);
    try {
      const res = await eventAuthFetch(`/api/admin/checkin?eventId=${event.id}`);
      const data = await res.json();
      if (res.ok) {
        setHasCheckedIn(!!data.hasCheckedIn);
        if (typeof data.joined === "number") setLocalJoined(data.joined);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  }, [event, user?.uid]);

  useEffect(() => {
    if (!event) return;
    setLocalJoined(event.joined || 0);
    setLocalRating(event.rating || 0);
    setLocalReviews(event.reviews || 0);
    setMyRating(0);
    setComment("");
    setHasMyReview(false);
    setShowReviews(false);
    void fetchReviews();
    void fetchCheckinStatus();
  }, [event, fetchReviews, fetchCheckinStatus]);

  const handleCheckin = async () => {
    if (!event || checking || hasCheckedIn) return;
    if (!user?.uid) {
      toast.error("Đăng nhập để check-in");
      router.push("/login");
      return;
    }

    setChecking(true);
    try {
      const res = await eventAuthFetch("/api/admin/checkin", {
        method: "POST",
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Check-in thất bại");
        return;
      }
      setHasCheckedIn(true);
      if (typeof data.joined === "number") setLocalJoined(data.joined);
      else setLocalJoined((prev) => prev + 1);
      toast.success("Check-in thành công! +15 XP 🎉");
      onCheckinSuccess?.();
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setChecking(false);
    }
  };

  const handleUncheckin = async () => {
    if (!event || checking || !hasCheckedIn || !user?.uid) return;
    setChecking(true);
    try {
      const res = await eventAuthFetch("/api/admin/checkin", {
        method: "DELETE",
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bỏ check-in thất bại");
        return;
      }
      setHasCheckedIn(false);
      if (typeof data.joined === "number") setLocalJoined(data.joined);
      else setLocalJoined((prev) => Math.max(0, prev - 1));
      toast.success("Đã bỏ check-in");
      onCheckinSuccess?.();
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!event || myRating === 0 || savingReview) return;
    if (!user?.uid) {
      toast.error("Đăng nhập để đánh giá");
      router.push("/login");
      return;
    }

    setSavingReview(true);
    try {
      const res = await eventAuthFetch("/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({
          eventId: event.id,
          rating: myRating,
          comment: comment.trim(),
        }),
      });
      if (!res.ok) {
        toast.error("Gửi đánh giá thất bại");
        return;
      }
      toast.success(hasMyReview ? "Đã cập nhật đánh giá" : "Đã gửi đánh giá");
      setHasMyReview(true);
      await fetchReviews();
      onCheckinSuccess?.();
    } catch {
      toast.error("Lỗi mạng");
    } finally {
      setSavingReview(false);
    }
  };

  const handleShare = () => {
    if (!user?.uid) {
      toast.error("Đăng nhập để chia sẻ cho bạn bè");
      router.push("/login");
      return;
    }
    setShowShareModal(true);
  };

  if (!event) return null;

  return (
    <>
      <AnimatePresence>
        {event && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="relative h-44 flex-shrink-0 overflow-hidden">
                <img src={event.image} className="w-full h-full object-cover" alt={event.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center"
                >
                  <FiX className="text-white" size={20} />
                </button>
                <div className={`absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r ${event.tagColor} rounded-lg`}>
                  <span className="text-xs font-bold text-white">{event.tag}</span>
                </div>
                {(localRating || 0) > 0 && (
                  <div className="absolute top-3 right-14 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1">
                    <FiStar className="text-amber-400" size={12} fill="currentColor" />
                    <span className="text-xs font-bold text-white">{localRating}</span>
                    {(localReviews || 0) > 0 && (
                      <span className="text-xs text-white/70">({localReviews})</span>
                    )}
                  </div>
                )}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{event.icon}</span>
                    <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{event.title}</h2>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="p-5 space-y-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{event.desc}</p>

                  <div className="grid grid-cols-1 gap-3">
                    <InfoRow icon={<FiMapPin size={16} />} label="Địa chỉ" value={event.address} />
                    <InfoRow icon={<FiClock size={16} />} label="Giờ mở cửa" value={event.openTime} />
                    <InfoRow icon={<FiDollarSign size={16} />} label="Giá vé" value={event.price} />
                    <InfoRow
                      icon={<FiUsers size={16} />}
                      label="Lượt check-in"
                      value={`${localJoined} người`}
                    />
                  </div>

                  {/* Check-in card */}
                  <div
                    className={`rounded-2xl border p-4 ${
                      hasCheckedIn
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20"
                    }`}
                  >
                    {!user?.uid ? (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">Check-in tại sự kiện</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Đăng nhập để ghi nhận lượt tham gia</p>
                        </div>
                        <button
                          onClick={() => router.push("/login")}
                          className="h-10 px-4 rounded-xl bg-blue-500 text-white text-sm font-semibold flex items-center gap-1.5"
                        >
                          <FiLogIn size={16} />
                          Đăng nhập
                        </button>
                      </div>
                    ) : hasCheckedIn ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <FiCheckCircle className="text-emerald-500" size={22} />
                          <div>
                            <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                              Đã check-in hôm nay
                            </p>
                            <p className="text-xs text-zinc-500">Cảm ơn bạn đã tham gia!</p>
                          </div>
                        </div>
                        <button
                          onClick={handleUncheckin}
                          disabled={checking}
                          className="text-xs font-semibold text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                        >
                          {checking ? "..." : "Huỷ"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-sm mb-1">Bạn đang ở đây?</p>
                        <p className="text-xs text-zinc-500 mb-3">Check-in để cộng đồng biết và nhận +15 XP</p>
                        <button
                          onClick={handleCheckin}
                          disabled={checking || loadingStatus}
                          className="w-full h-11 rounded-xl bg-blue-500 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
                        >
                          {checking || loadingStatus ? "Đang xử lý..." : "Check-in ngay"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Review card */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">Đánh giá của bạn</p>
                      {hasMyReview && (
                        <span className="text-xs font-semibold text-blue-500">Đã đánh giá</span>
                      )}
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setMyRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5"
                        >
                          <FiStar
                            size={30}
                            className={
                              star <= (hoverRating || myRating)
                                ? "text-amber-400 fill-amber-400"
                                : "text-zinc-300 dark:text-zinc-600"
                            }
                          />
                        </button>
                      ))}
                    </div>
                    {myRating > 0 && (
                      <div className="space-y-2">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Chia sẻ cảm nhận của bạn (tuỳ chọn)..."
                          maxLength={500}
                          className="w-full h-20 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none resize-none"
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={savingReview}
                          className="w-full h-10 bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                        >
                          {savingReview
                            ? "Đang gửi..."
                            : hasMyReview
                              ? "Cập nhật đánh giá"
                              : "Gửi đánh giá"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reviews list */}
                  <button
                    onClick={async () => {
                      if (!showReviews) await fetchReviews();
                      setShowReviews(!showReviews);
                    }}
                    className="w-full flex items-center justify-between py-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FiMessageSquare className="text-blue-500" size={18} />
                      <div>
                        <p className="font-semibold text-sm">Bài đánh giá</p>
                        <p className="text-xs text-zinc-500">{localReviews} đánh giá</p>
                      </div>
                    </div>
                    <span className="text-xs text-blue-500 font-semibold">
                      {showReviews ? "Thu gọn" : "Xem"}
                    </span>
                  </button>

                  {showReviews && (
                    <div className="space-y-3">
                      {reviews.length === 0 ? (
                        <p className="text-sm text-center text-zinc-400 py-4">Chưa có đánh giá nào</p>
                      ) : (
                        reviews.map((r) => {
                          const isMine = r.userId === user?.uid;
                          return (
                            <div
                              key={r.id}
                              className={`rounded-xl p-3 ${
                                isMine
                                  ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30"
                                  : "bg-zinc-50 dark:bg-zinc-800/50"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {isMine ? "Bạn" : r.userName || "Người dùng"}
                                  </p>
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <FiStar
                                        key={i}
                                        size={12}
                                        className={
                                          i < r.rating
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-zinc-300"
                                        }
                                      />
                                    ))}
                                  </div>
                                </div>
                                <span className="text-[10px] text-zinc-400 shrink-0">
                                  {r.createdAt
                                    ? new Date(r.createdAt).toLocaleDateString("vi-VN")
                                    : ""}
                                </span>
                              </div>
                              {r.comment && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">{r.comment}</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {event.tips?.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
                        Tips từ cộng đồng
                      </p>
                      <ul className="space-y-1">
                        {event.tips.map((tip, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                            <span className="text-amber-500">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.gallery?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Ảnh từ cộng đồng</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {event.gallery.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            className="w-full aspect-square rounded-lg object-cover"
                            loading="lazy"
                            alt=""
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={handleShare}
                  className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <FiShare2 size={18} />
                  Gửi cho bạn
                </button>
                <button
                  onClick={() => window.open(event.mapUrl, "_blank")}
                  className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <FiNavigation size={18} />
                  Chỉ đường
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showShareModal && event && (
        <ShareEventModal event={event} onClose={() => setShowShareModal(false)} />
      )}
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="text-blue-500 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        <p className="text-zinc-500 text-xs mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

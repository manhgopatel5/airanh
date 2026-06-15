"use client";
import { FiX, FiMapPin, FiClock, FiDollarSign, FiUsers, FiShare2, FiNavigation, FiStar, FiMessageSquare } from "react-icons/fi";
import { EventItem } from "@/data/events";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type Review = {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export default function EventDetailModal({
  event,
  onClose,
  onCheckinSuccess
}: {
  event: EventItem | null;
  onClose: () => void;
  onCheckinSuccess?: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [localJoined, setLocalJoined] = useState(event?.joined || 0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const getUserId = () => {
    let uid = localStorage.getItem('userId');
    if (!uid) {
      uid = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('userId', uid);
    }
    return uid;
  };

  const fetchReviews = async () => {
    if (!event) return;
    try {
      const res = await fetch(`/api/admin/reviews?eventId=${event.id}`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        const myReview = data.reviews?.find((r: Review) => r.userId === getUserId());
        if (myReview) {
          setMyRating(myReview.rating);
          setComment(myReview.comment);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!event) return;
    setLocalJoined(event.joined || 0);
    fetchReviews();

    const userId = getUserId();
    const checkedInToday = localStorage.getItem(`checked_${event.id}_${userId}_${new Date().toDateString()}`);
    setHasCheckedIn(!!checkedInToday);
  }, [event]);

  const handleCheckin = async () => {
    if (!event || checking || hasCheckedIn) return;
    setChecking(true);
    const userId = getUserId();
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, userId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Check-in thất bại");
        return;
      }
      setHasCheckedIn(true);
      setLocalJoined(prev => prev + 1);
      localStorage.setItem(`checked_${event.id}_${userId}_${new Date().toDateString()}`, '1');
      toast.success("Check-in thành công! 🎉");
      onCheckinSuccess?.();
    } catch (error) {
      toast.error("Lỗi mạng");
    } finally {
      setChecking(false);
    }
  };

  const handleUncheckin = async () => {
    if (!event || checking ||!hasCheckedIn) return;
    setChecking(true);
    const userId = getUserId();
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, userId })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bỏ check-in thất bại");
        return;
      }
      setHasCheckedIn(false);
      setLocalJoined(prev => Math.max(0, prev - 1));
      localStorage.removeItem(`checked_${event.id}_${userId}_${new Date().toDateString()}`);
      toast.success("Đã bỏ check-in");
      onCheckinSuccess?.();
    } catch (error) {
      toast.error("Lỗi mạng");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!event || myRating === 0 || savingReview) return;
    setSavingReview(true);
    const userId = getUserId();
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, userId, rating: myRating, comment })
      });
      if (!res.ok) {
        toast.error("Gửi đánh giá thất bại");
        return;
      }
      toast.success("Đã gửi đánh giá");
      fetchReviews();
      onCheckinSuccess?.(); // Refresh để update avg rating
    } catch (err) {
      toast.error("Lỗi mạng");
    } finally {
      setSavingReview(false);
    }
  };

  if (!event) return null;

  return (
    <AnimatePresence>
      {event && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 rounded-3xl max-h-[calc(100vh-160px)] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="relative h-48 flex-shrink-0 rounded-t-3xl overflow-hidden">
              <img src={event.image} className="w-full h-full object-cover" alt={event.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                <FiX className="text-white" size={20} />
              </button>
              <div className={`absolute top-3 left-4 px-2.5 py-1 bg-gradient-to-r ${event.tagColor} rounded-lg`}>
                <span className="text-xs font-[800] text-white">{event.tag}</span>
              </div>
              {event.rating > 0 && (
                <div className="absolute top-3 right-14 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1">
                  <FiStar className="text-amber-400" size={12} fill="currentColor" />
                  <span className="text-xs font-[700] text-white">{event.rating}</span>
                  {event.reviews > 0 && <span className="text-xs text-white/70">({event.reviews})</span>}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{event.icon}</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-[700] leading-tight">{event.title}</h2>
                    <p className="text-sm text-[#8e8e93] mt-1">{event.desc}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3 text-sm">
                    <FiMapPin className="text-[#0a84ff] mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <p className="font-[550]">Địa chỉ</p>
                      <p className="text-[#8e8e93] text-xs mt-0.5">{event.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <FiClock className="text-[#0a84ff] mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <p className="font-[550]">Giờ mở cửa</p>
                      <p className="text-[#8e8e93] text-xs mt-0.5">{event.openTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <FiDollarSign className="text-[#0a84ff] mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <p className="font-[550]">Giá vé</p>
                      <p className="text-[#8e8e93] text-xs mt-0.5">{event.price}</p>
                    </div>
                    </div>
                  <div className="flex items-start gap-3 text-sm">
                    <FiUsers className="text-[#0a84ff] mt-0.5 flex-shrink-0" size={18} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-[550]">Lượt check-in</p>
                          <p className="text-[#8e8e93] text-xs mt-0.5">
                            {localJoined} người
                          </p>
                        </div>
                        <button
                          onClick={hasCheckedIn? handleUncheckin : handleCheckin}
                          disabled={checking}
                          className={`px-3 h-8 rounded-lg text-xs font-[600] flex items-center gap-1.5 ${
                            hasCheckedIn
                             ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 active:scale-95'
                              : 'bg-[#0a84ff] text-white active:scale-95'
                          } disabled:opacity-50 transition-transform`}
                        >
                          {checking? "Đang xử lý..." : hasCheckedIn? "Bỏ check-in" : "Check-in"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Đánh giá */}
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-[600]">Đánh giá của bạn</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          onClick={() => setMyRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                        >
                          <FiStar
                            size={24}
                            className={star <= (hoverRating || myRating)
                             ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-300 dark:text-zinc-600'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Viết cảm nhận..."
                    className="w-full h-20 px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm outline-none resize-none"
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={myRating === 0 || savingReview}
                    className="mt-2 w-full h-9 bg-[#0a84ff] text-white rounded-lg text-sm font-[600] disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {savingReview? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </div>

                {/* Bài đánh giá */}
                <button
                  onClick={() => setShowReviews(!showReviews)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-5 active:scale-95 transition-transform"
                >
                  <div className="flex items-center gap-2">
                    <FiMessageSquare className="text-[#0a84ff]" size={18} />
                    <div className="text-left">
                      <p className="text-sm font-[600]">Bài đánh giá</p>
                      <p className="text-xs text-[#8e8e93]">{event.reviews || 0} đánh giá</p>
                    </div>
                  </div>
                  <FiX className={`transform transition-transform ${showReviews? 'rotate-0' : 'rotate-45'}`} size={20} />
                </button>

                {showReviews && (
                  <div className="space-y-3 mb-5">
                    {reviews.length === 0? (
                      <p className="text-sm text-center text-[#8e8e93] py-4">Chưa có đánh giá nào</p>
                    ) : (
                      reviews.map(r => (
                        <div key={r.id} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <FiStar
                                  key={i}
                                  size={14}
                                  className={i < r.rating? 'text-amber-400 fill-amber-400' : 'text-zinc-300 dark:text-zinc-600'}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-[#8e8e93]">
                              {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          {r.comment && <p className="text-sm">{r.comment}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {event.tips?.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 rounded-xl p-3 mb-5">
                    <p className="text-xs font-[700] text-amber-700 dark:text-amber-400 mb-2">💡 Tips từ cộng đồng</p>
                    <ul className="space-y-1.5">
                      {event.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {event.gallery?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-[600] mb-2">Ảnh từ cộng đồng</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {event.gallery.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          className="w-full aspect-square rounded-lg object-cover"
                          loading="lazy"
                          alt={`Gallery ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-black/5 dark:border-white/5 grid grid-cols-2 gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${event.title} - ${event.address}`);
                  toast.success("Đã copy địa chỉ");
                }}
                className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <FiShare2 size={18} />
                Chia sẻ
              </button>
              <button
                onClick={() => window.open(event.mapUrl, '_blank')}
                className="h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <FiNavigation size={18} />
                Chỉ đường
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
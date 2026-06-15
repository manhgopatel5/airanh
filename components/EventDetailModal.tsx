"use client";
import { FiX, FiMapPin, FiClock, FiDollarSign, FiUsers, FiShare2, FiNavigation, FiStar, FiCheckCircle } from "react-icons/fi";
import { EventItem } from "@/data/events";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function EventDetailModal({
  event,
  onClose
}: {
  event: EventItem | null;
  onClose: () => void;
}) {
  const [checkinCount, setCheckinCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    if (!event) return;

    fetch(`/api/admin/checkin?eventId=${event.id}`)
   .then(res => res.json())
   .then(data => setCheckinCount(data.count || 0));

    const checkedInToday = localStorage.getItem(`checked_${event.id}_${new Date().toDateString()}`);
    setHasCheckedIn(!!checkedInToday);
  }, [event]);

  const handleCheckin = async () => {
    if (!event || checking || hasCheckedIn) return;

    setChecking(true);
    const userId = localStorage.getItem('userId') || `guest_${Date.now()}`;
    localStorage.setItem('userId', userId);

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

      setCheckinCount(prev => prev + 1);
      setHasCheckedIn(true);
      localStorage.setItem(`checked_${event.id}_${new Date().toDateString()}`, '1');
      toast.success("Check-in thành công! 🎉");
    } catch (error) {
      toast.error("Lỗi mạng");
    } finally {
      setChecking(false);
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
            {/* Cover */}
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
              {event.rating && (
                <div className="absolute top-3 right-14 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg flex items-center gap-1">
                  <FiStar className="text-amber-400" size={12} fill="currentColor" />
                  <span className="text-xs font-[700] text-white">{event.rating}</span>
                  {event.reviews && <span className="text-xs text-white/70">({event.reviews})</span>}
                </div>
              )}
            </div>

            {/* Content */}
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
                          <p className="text-[#8e8e93] text-xs mt-0.5">{checkinCount} người tuần này</p>
                        </div>
                        <button
                          onClick={handleCheckin}
                          disabled={checking || hasCheckedIn}
                          className={`px-3 h-8 rounded-lg text-xs font-[600] flex items-center gap-1.5 ${
                            hasCheckedIn
                           ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-[#0a84ff] text-white active:scale-95'
                          } disabled:opacity-50 transition-transform`}
                        >
                          {hasCheckedIn? (
                            <>
                              <FiCheckCircle size={14} />
                              Đã check-in
                            </>
                          ) : checking? (
                            "Đang xử lý..."
                          ) : (
                            "Check-in"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

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

            {/* Buttons */}
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
import { motion, AnimatePresence } from "framer-motion";
import { FiNavigation, FiShield, FiMapPin, FiCheck, FiX, FiSmartphone } from "react-icons/fi";

function GpsRequiredModal({ 
  open, 
  onClose, 
  onRetry, 
  loading,
  mode 
}: { 
  open: boolean; 
  onClose: () => void; 
  onRetry: () => void; 
  loading: boolean;
  mode: Mode;
}) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isTask = mode === "task";
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A84FF] to-[#0051D5]">
              <FiNavigation className="text-3xl text-white" />
            </div>

            {/* Title */}
            <h2 className="text-center text-2xl font-black text-zinc-900 dark:text-white">
              Bật GPS để {isTask? "tạo Task" : "tạo Plan"}
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Chúng tôi cần vị trí của bạn để hiển thị {isTask? "công việc" : "sự kiện"} gần nhất và giúp người khác tìm thấy bạn dễ dàng hơn.
            </p>

            {/* Benefits */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                <FiMapPin className="mt-0.5 flex-shrink-0 text-lg text-[#0A84FF]" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">Sắp xếp gần bạn</p>
                  <p className="text-xs text-zinc-500">Tự động ưu tiên hiển thị {isTask? "task" : "plan"} trong bán kính 5km</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                <FiShield className="mt-0.5 flex-shrink-0 text-lg text-[#30D158]" />
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">An toàn & Riêng tư</p>
                  <p className="text-xs text-zinc-500">Chỉ dùng để tính khoảng cách. Không chia sẻ vị trí chính xác</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                <FiSmartphone /> Cách bật trên {isIOS? "iPhone" : "Android"}:
              </p>
              <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                {isIOS? (
                  <>
                    <li className="flex gap-2"><span className="font-bold">1.</span> Mở Cài đặt → Safari → Vị trí</li>
                    <li className="flex gap-2"><span className="font-bold">2.</span> Chọn "Hỏi" hoặc "Cho phép"</li>
                    <li className="flex gap-2"><span className="font-bold">3.</span> Quay lại và bấm "Thử lại"</li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2"><span className="font-bold">1.</span> Bấm icon ổ khóa trên thanh URL</li>
                    <li className="flex gap-2"><span className="font-bold">2.</span> Chọn "Quyền" → Vị trí → Cho phép</li>
                    <li className="flex gap-2"><span className="font-bold">3.</span> Bấm "Thử lại" bên dưới</li>
                  </>
                )}
              </ol>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="h-12 flex-1 rounded-xl bg-zinc-100 text-sm font-bold text-zinc-700 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Để sau
              </button>
              <button
                onClick={onRetry}
                disabled={loading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A84FF] to-[#0051D5] text-sm font-bold text-white shadow-lg active:scale-95 disabled:opacity-60"
              >
                {loading? "Đang kiểm tra..." : "Thử lại"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
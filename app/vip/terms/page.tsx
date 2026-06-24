"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export default function VipTermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-950">
    {/* Header */}
<div className="bg-white dark:bg-zinc-950 border-b border-black/5 dark:border-white/5">
  <div className="flex items-center h-14 px-4 gap-3">
    <button
      onClick={() => router.back()}
      className="w-9 h-9 flex items-center justify-center -ml-2 active:scale-90 transition-transform"
    >
      <FiArrowLeft size={24} strokeWidth={2} />
    </button>
    <h1 className="text-base font-semibold">Điều khoản VIP</h1>
  </div>
</div>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-[13px] text-[#8e8e93] mb-6">Cập nhật lần cuối: 24/06/2026</p>

          <h2 className="text-lg font-bold mb-3">1. Định nghĩa dịch vụ</h2>
          <p className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-4">
            VIP là gói dịch vụ trả phí của Huha, cung cấp các tính năng nâng cao ngoài gói Free. Bao gồm VIP Pro và VIP Elite với quyền lợi khác nhau được mô tả tại trang Nâng cấp VIP.
          </p>

          <h2 className="text-lg font-bold mb-3">2. Thanh toán và Gia hạn</h2>
          <ul className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-4 space-y-2">
            <li>2.1. Giá gói VIP đã bao gồm VAT. Thanh toán bằng VNĐ qua Momo, ZaloPay, VNPay, thẻ ngân hàng.</li>
            <li>2.2. VIP có hiệu lực 30 ngày từ thời điểm thanh toán thành công.</li>
            <li>2.3. Tự động gia hạn mỗi 30 ngày. Hệ thống trừ tiền trước ngày hết hạn 24h và gửi thông báo trước 3 ngày.</li>
            <li>2.4. Bạn có thể tắt tự động gia hạn trong Cài đặt {'>'} VIP {'>'} Quản lý gói trước ngày gia hạn.</li>
            <li>2.5. Giá có thể thay đổi. User đang dùng VIP sẽ giữ nguyên giá cũ đến hết chu kỳ, chu kỳ sau áp dụng giá mới.</li>
          </ul>

        <h2 className="text-lg font-bold mb-3">3. Hủy và Hoàn tiền</h2>
<ul className="text- leading-6 text-zinc-700 dark:text-zinc-300 mb-4 space-y-2">
  <li>3.1. Hủy VIP: Vào Cài đặt tắt gia hạn. Bạn vẫn dùng VIP đến hết ngày đã trả tiền.</li>
  <li>3.2. Hoàn tiền: Chỉ hoàn trong 24h từ lúc mua nếu chưa dùng quá 10% tính năng VIP. Liên hệ hỗ trợ kèm mã giao dịch.</li>
  <li>3.3. Không hoàn tiền khi: Đã qua 24h, đã dùng nhiều tính năng, vi phạm điều khoản bị khóa VIP.</li>
  <li>3.4. Nâng cấp gói: Chỉ tính phần chênh lệch, thời gian được cộng dồn.</li>
</ul>

<h2 className="text-lg font-bold mb-3">4. Quyền lợi và Giới hạn</h2>
<ul className="text- leading-6 text-zinc-700 dark:text-zinc-300 mb-4 space-y-2">
  <li>4.1. VIP gắn với 1 tài khoản, dùng được trên nhiều thiết bị nhưng không chia sẻ cho người khác.</li>
  <li>4.2. Khi hết VIP: Nhóm trên 10 thành viên không thêm người mới được. Ghim chat quá 3 tự bỏ ghim. File trên 10MB không up mới. Dữ liệu cũ vẫn giữ nguyên.</li>
  <li>4.3. Huha có quyền điều chỉnh tính năng VIP, sẽ thông báo trước 7 ngày nếu giảm quyền lợi.</li>
</ul>

          <h2 className="text-lg font-bold mb-3">5. Hành vi bị cấm</h2>
          <ul className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-4 space-y-2">
            <li>5.1. Mua bán, chuyển nhượng gói VIP cho tài khoản khác.</li>
            <li>5.2. Dùng VIP để spam, lừa đảo, phát tán nội dung vi phạm pháp luật.</li>
            <li>5.3. Dùng tool/hack để bypass giới hạn VIP.</li>
            <li>5.4. Vi phạm sẽ khóa VIP vĩnh viễn, không hoàn tiền.</li>
          </ul>

          <h2 className="text-lg font-bold mb-3">6. Miễn trừ trách nhiệm</h2>
          <p className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-4">
            6.1. Huha không chịu trách nhiệm nếu gián đoạn dịch vụ do lỗi mạng, bảo trì, thiên tai. Thời gian VIP sẽ được bù tương ứng nếu lỗi từ phía Huha {'>'} 24h.<br/>
            6.2. Không chịu trách nhiệm mất dữ liệu do user xóa nhầm, chia sẻ tài khoản.
          </p>

          <h2 className="text-lg font-bold mb-3">7. Liên hệ</h2>
          <p className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-8">
            Mọi thắc mắc về VIP: Email support@Huha.vn hoặc mục Hỗ trợ trong app. Thời gian phản hồi: 24h với user VIP Elite, 48h với VIP Pro.
          </p>

          <p className="text-[13px] text-[#8e8e93]">
            Bằng việc mua VIP, bạn đã đọc và đồng ý toàn bộ điều khoản này.
          </p>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, Copy, Share2, QrCode, Link as LinkIcon, Check, Facebook, Twitter } from "lucide-react";
import { useState } from "react";
import { toast, Toaster } from "sonner";

export default function ShareProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const displayName = user.displayName || "Người dùng";
  const username = user.email?.split("@")[0] || user.uid.slice(0, 8);
  const profileUrl = `https://air.vn/u/${username}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Đã sao chép liên kết");
      if ("vibrate" in navigator) navigator.vibrate(8);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Kết nối với ${displayName} trên AIR`,
          text: `Theo dõi ${displayName} và cùng nhau làm việc hiệu quả hơn`,
          url: profileUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank");
  };

  const shareToTwitter = () => {
    const text = `Kết nối với tôi trên AIR @${username}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="absolute left-4 p-1 active:opacity-60 transition"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text- font-bold text-[#0F172A]">Chia sẻ hồ sơ</h1>
        </div>
      </div>

      <div className="px-6 pt-8 pb-24">
        <div className="bg-[#F8FAFC] rounded-3xl p-8 mb-6">
          <div className="flex flex-col items-center">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F172A&color=fff&size=128`}
              className="w-20 h-20 rounded-full object-cover bg-[#E2E8F0] mb-3"
              alt={displayName}
            />
            <p className="text- font-bold text-[#0F172A]">{displayName}</p>
            <p className="text- text-[#64748B] mt-0.5">@{username}</p>

            <div className="w-full bg-white rounded-2xl p-4 mt-6 flex items-center gap-3 border border-gray-100">
              <LinkIcon className="w-5 h-5 text-[#64748B] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text- text-[#64748B] truncate">{profileUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-2 active:opacity-60 transition"
              >
                {copied? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-[#0F172A]" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-2xl bg-[#0F172A] text-white font-semibold active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Chia sẻ qua ứng dụng khác
          </button>

          <button
            onClick={() => router.push("/settings/qr")}
            className="w-full h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
          >
            <QrCode className="w-5 h-5" />
            Hiển thị mã QR
          </button>

          <div className="pt-4">
            <p className="text- font-bold text-[#64748B] tracking-wider mb-3 px-1">CHIA SẺ LÊN</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareToFacebook}
                className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                Facebook
              </button>
              <button
                onClick={shareToTwitter}
                className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                Twitter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
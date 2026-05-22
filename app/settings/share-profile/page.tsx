"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, Copy, Share2, QrCode, Link as LinkIcon, Check, Facebook, Twitter, Linkedin, Send, Contact, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export default function ShareProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedVCard, setCopiedVCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  if (!user) return null;

  const displayName = user.displayName || "Người dùng";
  const username = user.email?.split("@")[0] || user.uid.slice(0, 8);
  const profileUrl = `https://air.vn/u/${username}`;
  const phone = user.phoneNumber || "";

  // Tạo vCard cho danh bạ
  const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
N:${displayName};;;;
NICKNAME:${username}
${phone? `TEL;TYPE=CELL:${phone}` : ""}
${user.email? `EMAIL;TYPE=INTERNET:${user.email}` : ""}
URL:${profileUrl}
ORG:AIR
END:VCARD`;

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

  const handleCopyVCard = async () => {
    try {
      await navigator.clipboard.writeText(vCardData);
      setCopiedVCard(true);
      toast.success("Đã sao chép danh bạ");
      if ("vibrate" in navigator) navigator.vibrate(8);
      setTimeout(() => setCopiedVCard(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleDownloadVCard = () => {
    const blob = new Blob([vCardData], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải danh bạ");
  };



    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      ctx!.fillStyle = "#FFFFFF";
      ctx!.fillRect(0, 0, 1024, 1024);
      ctx!.drawImage(img, 0, 0, 1024, 1024);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qr-${username}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải mã QR");
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyQRImage = async () => {
    const svg = document.getElementById("profile-qr");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = async () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx!.fillStyle = "#FFFFFF";
      ctx!.fillRect(0, 0, 512, 512);
      ctx!.drawImage(img, 0, 0, 512, 512);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("Đã sao chép ảnh QR");
          if ("vibrate" in navigator) navigator.vibrate(8);
        } catch {
          toast.error("Trình duyệt không hỗ trợ copy ảnh");
        }
      });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
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

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, "_blank");
  };

  const shareToTelegram = () => {
    const text = `Kết nối với ${displayName} trên AIR`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="h-14" />
        </div>
        <div className="px-6 pt-8">
          <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse mb-3" />
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-100">
          <div className="flex flex-col items-center">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F172A&color=fff&size=128`}
              className="w-20 h-20 rounded-full object-cover bg-[#E2E8F0] mb-3"
              alt={displayName}
            />
            <p className="text- font-bold text-[#0F172A]">{displayName}</p>
            <p className="text- text-[#64748B] mt-0.5">@{username}</p>

            {/* QR ẩn để copy/tải */}
            <div className="hidden">
              <QRCodeSVG
                id="profile-qr"
                value={profileUrl}
                size={512}
                level="H"
                includeMargin
                imageSettings={{
                  src: user.photoURL || "",
                  x: undefined,
                  y: undefined,
                  height: 100,
                  width: 100,
                  excavate: true,
                }}
              />
            </div>

            <div className="w-full bg-[#F8FAFC] rounded-2xl p-4 mt-6 flex items-center gap-3">
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

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/settings/qr")}
              className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Hiển thị QR
            </button>
            <button
              onClick={handleCopyQRImage}
              className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Copy ảnh QR
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadVCard}
              className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Contact className="w-5 h-5" />
              Tải danh bạ
            </button>
            <button
              onClick={handleCopyVCard}
              className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
            >
              {copiedVCard? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              Copy vCard
            </button>
          </div>

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
              <button
                onClick={shareToLinkedIn}
                className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                LinkedIn
              </button>
              <button
                onClick={shareToTelegram}
                className="h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5 text-[#0088CC]" />
                Telegram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
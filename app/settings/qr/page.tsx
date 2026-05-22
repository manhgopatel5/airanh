"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, Download, Share2, Copy, Check, Palette } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

const QR_COLORS = [
  { name: "Đen", fg: "#0F172A", bg: "#FFFFFF" },
  { name: "Xanh dương", fg: "#2563EB", bg: "#FFFFFF" },
  { name: "Xanh lá", fg: "#059669", bg: "#FFFFFF" },
  { name: "Tím", fg: "#7C3AED", bg: "#FFFFFF" },
  { name: "Hồng", fg: "#DB2777", bg: "#FFFFFF" },
  { name: "Trắng", fg: "#FFFFFF", bg: "#0F172A" }, // QR trắng nền tối
];

export default function QRPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!user) return null;

  const qrValue = `https://air.vn/u/${user.uid}`;
  const displayName = user.displayName || "Người dùng";
  const username = user.email?.split("@")[0] || user.uid.slice(0, 8);
  const currentColor = QR_COLORS[colorIndex];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      toast.success("Đã sao chép liên kết");
      if ("vibrate" in navigator) navigator.vibrate(8);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      ctx!.fillStyle = currentColor.bg;
      ctx!.fillRect(0, 0, 1024, 1024);
      ctx!.drawImage(img, 0, 0, 1024, 1024);
      
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${username}.png`;
      a.click();
      toast.success("Đã tải QR");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Kết nối với ${displayName}`,
          text: "Quét mã QR để thêm tôi vào danh bạ",
          url: qrValue,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            onClick={() => router.back()}
            className="absolute left-4 p-1 active:opacity-60 transition"
          >
            <ChevronLeft className="w-6 h-6 text-[#0F172A]" />
          </button>
          <h1 className="text- font-bold text-[#0F172A]">
            Mã QR của tôi
          </h1>
          <button
            onClick={() => setShowColorPicker(true)}
            className="absolute right-4 p-1 active:opacity-60 transition"
          >
            <Palette className="w-6 h-6 text-[#0F172A]" />
          </button>
        </div>
      </div>

      <div className="px-6 pt-8 pb-24">
        {/* Card QR */}
        <div className="bg-[#F8FAFC] rounded-3xl p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0F172A&color=fff&size=128`}
              className="w-20 h-20 rounded-full object-cover bg-[#E2E8F0] mb-3"
              alt={displayName}
            />
            <p className="text- font-bold text-[#0F172A]">
              {displayName}
            </p>
            <p className="text- text-[#64748B] mt-0.5">
              @{username}
            </p>
          </div>

          <div 
            className="rounded-2xl p-6 mb-6 shadow-sm transition-colors"
            style={{ backgroundColor: currentColor.bg }}
          >
            <QRCodeSVG
              id="qr-code"
              value={qrValue}
              size={240}
              level="H"
              fgColor={currentColor.fg}
              bgColor={currentColor.bg}
              className="w-full h-auto"
            />
          </div>

          <p className="text- text-[#64748B] text-center leading-relaxed">
            Quét mã này để kết bạn với tôi trên Air
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-2xl bg-[#0F172A] text-white font-semibold active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Chia sẻ mã QR
          </button>

          <button
            onClick={handleDownload}
            className="w-full h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Lưu vào thư viện
          </button>

          <button
            onClick={handleCopyLink}
            className="w-full h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-500" />
                Đã sao chép
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Sao chép liên kết
              </>
            )}
          </button>
        </div>
      </div>

      {/* Color Picker Dialog */}
      <Dialog.Root open={showColorPicker} onOpenChange={setShowColorPicker}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <Dialog.Title className="text- font-bold text-[#0F172A] mb-4">
              Chọn màu mã QR
            </Dialog.Title>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {QR_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setColorIndex(idx);
                    setShowColorPicker(false);
                    toast.success(`Đã đổi sang màu ${color.name}`);
                  }}
                  className={`p-4 rounded-2xl border-2 transition ${
                    idx === colorIndex
                      ? "border-[#0F172A]"
                      : "border-gray-200"
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded-xl mb-2 flex items-center justify-center"
                    style={{ backgroundColor: color.bg }}
                  >
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: color.fg }}
                    />
                  </div>
                  <p className="text- font-medium text-[#0F172A]">
                    {color.name}
                  </p>
                </button>
              ))}
            </div>
            <Dialog.Close className="w-full h-12 rounded-2xl bg-[#F1F5F9] text-[#0F172A] font-semibold active:scale-95 transition">
              Đóng
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
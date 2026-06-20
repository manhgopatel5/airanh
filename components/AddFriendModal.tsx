"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiUserPlus, FiLoader, FiUpload } from "react-icons/fi";
import { ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddFriendModal({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const db = getFirebaseDB();

  const stopScan = async (closeModal = true) => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
    if (closeModal) {
      setShowScanQR(false);
    }
  };

  const handleScanFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let qrReader = document.getElementById("qr-reader-file-add");
    if (!qrReader) {
      qrReader = document.createElement("div");
      qrReader.id = "qr-reader-file-add";
      qrReader.style.display = "none";
      document.body.appendChild(qrReader);
    }

    const html5QrCode = new Html5Qrcode("qr-reader-file-add");
    try {
      const result = await html5QrCode.scanFile(file, false);
      let userId = "";

      if (result.includes("/u/")) {
        userId = result.split("/u/")[1] || "";
      } else if (result.startsWith("@")) {
        userId = result.slice(1);
      } else {
        userId = result.trim();
      }

      if (userId) {
        setSearch(userId);
        toast.success("Đã quét QR thành công");
      } else {
        toast.error("Mã QR không hợp lệ");
      }
    } catch {
      toast.error("Không đọc được QR từ ảnh");
    } finally {
      await html5QrCode.clear();
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!showScanQR || scanMode!== "camera") return;

    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader-add");
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            let userId = "";

            if (decodedText.includes("/u/")) {
              userId = decodedText.split("/u/")[1] || "";
            } else if (decodedText.startsWith("@")) {
              userId = decodedText.slice(1);
            } else {
              userId = decodedText.trim();
            }

            if (userId) {
              setSearch(userId);
              stopScan();
              toast.success("Đã quét QR");
            } else {
              toast.error("Mã QR không hợp lệ");
            }
          },
          () => {}
        );
      } catch {
        toast.error("Không mở được camera");
        setShowScanQR(false);
      }
    };

    startScan();
    return () => {
      stopScan(false);
    };
  }, [showScanQR, scanMode]);

  const handleAddFriend = async (event?: React.FormEvent): Promise<void> => {
    event?.preventDefault();
    setAdding(true);

    try {
      const auth = getAuth();
      await auth.authStateReady();
      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        toast.error("Chưa đăng nhập");
        return;
      }

      const keyword = search.trim().replace("@", "");
      if (!keyword) {
        toast.error("Vui lòng nhập username");
        return;
      }

      let targetUserId: string | null = null;
      const lowerKeyword = keyword.toLowerCase();

      const usernameDoc = await getDoc(doc(db, "usernames", lowerKeyword));
      if (usernameDoc.exists()) targetUserId = usernameDoc.data().uid;

      if (!targetUserId) {
        toast.error(`Không tìm thấy @${keyword}`);
        return;
      }

      if (targetUserId === currentUser.uid) {
        toast.error("Không thể thêm chính mình");
        return;
      }

      const requestId = `${currentUser.uid}_${targetUserId}`;
      await setDoc(doc(db, "friendRequests", requestId), {
        from: currentUser.uid,
        to: targetUserId,
        status: "pending",
        createdAt: serverTimestamp()
      });

      toast.success("Đã gửi lời mời kết bạn");
      setSearch("");
      onClose();
    } catch (error: any) {
      console.error("Add friend error:", error.code, error.message);
      if (error.code === 'permission-denied') {
        toast.error("Đã gửi lời mời hoặc các bạn đã là bạn bè");
      } else {
        toast.error(`Lỗi: ${error.message || "Không thể gửi lời mời"}`);
      }
    } finally {
      setAdding(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-2xl z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] bg-white dark:bg-zinc-900 rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col sm:max-w-[440px] sm:mx-auto sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-[28px]"
          >
            <div className="w-[36px] h-[5px] bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden flex-shrink-0" />

            <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                  <FiUserPlus className="text-white" size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight">Mời bạn</h2>
                  <p className="text-[13px] text-[#8e8e93] dark:text-zinc-500">Kết nối với bạn bè</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 -mr-1 flex items-center justify-center text-[#8e8e93] active:opacity-60 transition-opacity"
                aria-label="Đóng"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 pb-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowScanQR(true); setScanMode("camera"); }}
                  className="h-[52px] bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl text-[14px] font-[600] text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                >
                  <ScanLine size={18} /> Quét QR
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[52px] bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl text-[14px] font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <FiUpload size={18} /> Ảnh QR
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="h-[52px] bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl text-[14px] font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <FiUserPlus size={18} /> Thủ công
                </button>
              </div>

              <form onSubmit={handleAddFriend} className="space-y-3">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none" size={20} />
                  <input
                    type="search"
                    inputMode="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nhập ID hoặc @username"
                    className="w-full h-[52px] pl-12 pr-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[16px] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:bg-white dark:focus:bg-zinc-700 transition-all"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding ||!search.trim()}
                  className="w-full h-[52px] bg-gradient-to-r from-[#0a84ff] to-purple-500 hover:from-[#007aff] hover:to-purple-600 active:from-[#0051d5] active:to-purple-700 disabled:opacity-40 text-white rounded-2xl text-[16px] font-[600] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {adding && <FiLoader className="animate-spin" size={18} />}
                  {adding? "Đang tìm..." : "Gửi lời mời"}
                </button>
              </form>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScanFromFile} />
            </div>
          </motion.div>

          {showScanQR && (
            <div className="fixed inset-0 bg-black z-[70]">
              <div id="qr-reader-add" className={scanMode === "camera"? "w-full h-full" : "hidden"} />
              <div id="qr-reader-file-add" className="hidden" />
              <button
                onClick={() => stopScan()}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition"
              >
                <FiX className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
                <p className="font-bold">Đưa mã QR vào khung</p>
                <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
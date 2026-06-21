"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch, FiUserPlus, FiLoader, FiUpload, FiCheck } from "react-icons/fi";
import { ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";

type Props = {
  open: boolean;
  onClose: () => void;
};

type UserSuggestion = {
  uid: string;
  username: string;
  name: string;
  avatarUrl?: string;
};

export default function AddFriendModal({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "qr">("manual");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const db = getFirebaseDB();
  const debouncedSearch = useDebounce(search, 300);

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

  useEffect(() => {
    return () => {
      stopScan(false);
      const el = document.getElementById("qr-reader-file-add");
      if (el) el.remove();
    };
  }, []);

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
        setActiveTab("manual");
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
              setActiveTab("manual");
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

  // Autocomplete username
  useEffect(() => {
    const fetchSuggestions = async () => {
      const keyword = debouncedSearch.trim().replace("@", "").toLowerCase();
      if (!keyword || keyword.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoadingSuggest(true);
      try {
        const auth = getAuth();
        const currentUid = auth.currentUser?.uid;

        const usernamesRef = collection(db, "usernames");
        const q = query(
          usernamesRef,
          where("__name__", ">=", keyword),
          where("__name__", "<=", keyword + "\uf8ff"),
          limit(5)
        );

        const snap = await getDocs(q);
        const results: UserSuggestion[] = [];

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          if (data.uid === currentUid) continue;

          const userDoc = await getDoc(doc(db, "users", data.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            results.push({
              uid: data.uid,
              username: docSnap.id,
              name: userData.name || docSnap.id,
              avatarUrl: userData.avatarUrl
            });
          }
        }
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSuggest(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch, db]);

  const handleAddFriend = async (userId?: string) => {
    setAdding(true);

    try {
      const auth = getAuth();
      await auth.authStateReady();
      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        toast.error("Chưa đăng nhập");
        return;
      }

      const keyword = userId || search.trim().replace("@", "");
      if (!keyword) {
        toast.error("Vui lòng nhập username");
        return;
      }

      let targetUserId: string | null = null;
      const lowerKeyword = keyword.toLowerCase();

      // Nếu truyền userId trực tiếp từ suggestion
      if (userId) {
        targetUserId = userId;
      } else {
        const usernameDoc = await getDoc(doc(db, "usernames", lowerKeyword));
        if (usernameDoc.exists()) targetUserId = usernameDoc.data().uid;
      }

      if (!targetUserId) {
        toast.error(`Không tìm thấy @${keyword}`);
        return;
      }

      if (targetUserId === currentUser.uid) {
        toast.error("Không thể thêm chính mình");
        return;
      }

      // Check đã là bạn bè chưa
      const friendDoc = await getDoc(doc(db, "users", currentUser.uid, "friends", targetUserId));
      if (friendDoc.exists()) {
        toast.error("Các bạn đã là bạn bè");
        return;
      }

      // Check đã gửi lời mời chưa
      const requestId = `${currentUser.uid}_${targetUserId}`;
      const requestDoc = await getDoc(doc(db, "friendRequests", requestId));
      if (requestDoc.exists() && requestDoc.data().status === "pending") {
        toast.error("Đã gửi lời mời rồi");
        return;
      }

      await setDoc(doc(db, "friendRequests", requestId), {
        from: currentUser.uid,
        to: targetUserId,
        status: "pending",
        createdAt: serverTimestamp()
      });

      toast.success("Đã gửi lời mời kết bạn");
      setSearch("");
      setSuggestions([]);
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
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-4 inset-x-4 z-[61] bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl max-h-[85vh] flex flex-col sm:max-w-[440px] sm:mx-auto sm:left-1/2 sm:-translate-x-1/2"
          >
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowScanQR(true); setScanMode("camera"); setActiveTab("qr"); }}
                  className={`h-12 rounded-2xl text-[14px] font-[600] flex items-center justify-center gap-2 active:scale-95 transition-all ${
                    activeTab === "qr"
                     ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30"
                      : "bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10"
                  }`}
                >
                  <ScanLine size={18} /> Quét QR
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-2xl text-[14px] font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <FiUpload size={18} /> Ảnh QR
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddFriend(); }} className="space-y-3">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none z-10" size={20} />
                  <input
                    type="search"
                    inputMode="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowSuggestions(true);
                      setActiveTab("manual");
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Nhập ID hoặc @username"
                    className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[16px] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:bg-white dark:focus:bg-zinc-700 transition-all"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />

                  {/* Autocomplete dropdown */}
                  <AnimatePresence>
                    {showSuggestions && (search.length >= 2) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden z-20"
                      >
                        {loadingSuggest && (
                          <div className="px-4 py-3 text-center text-[#8e8e93]">
                            <FiLoader className="animate-spin inline mr-2" size={16} />
                            Đang tìm...
                          </div>
                        )}
                        {!loadingSuggest && suggestions.length === 0 && (
                          <div className="px-4 py-3 text-center text-[#8e8e93] text-sm">
                            Không tìm thấy @{search.replace("@", "")}
                          </div>
                        )}
                        {!loadingSuggest && suggestions.map((user) => (
                          <button
                            key={user.uid}
                            type="button"
                            onClick={() => {
                              handleAddFriend(user.uid);
                              setShowSuggestions(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                          >
                            {user.avatarUrl? (
                              <Image
                                src={user.avatarUrl}
                                alt={user.name}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {user.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-[600] text-[15px] truncate">{user.name}</p>
                              <p className="text-[13px] text-[#8e8e93] dark:text-zinc-500">@{user.username}</p>
                            </div>
                            <FiUserPlus className="text-[#0a84ff] flex-shrink-0" size={18} />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  disabled={adding ||!search.trim()}
                  className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 hover:from-[#007aff] hover:to-purple-600 active:from-[#0051d5] active:to-purple-700 disabled:opacity-40 text-white rounded-2xl text-[16px] font-[600] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {adding && <FiLoader className="animate-spin" size={18} />}
                  {adding? "Đang gửi..." : "Gửi lời mời"}
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
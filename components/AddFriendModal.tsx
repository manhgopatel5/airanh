"use client";

import { useState, useRef, useEffect } from "react";
import { FiSearch, FiUserPlus, FiLoader, FiUpload, FiCheck, FiClock, FiShare2, FiLink, FiArrowLeft } from "react-icons/fi";
import { ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import Image from "next/image";
import { useDebounce } from "@/hooks/useDebounce";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type UserSuggestion = {
  uid: string;
  username: string;
  name: string;
  avatarUrl?: string;
  status?: "none" | "friend" | "sent" | "received";
};

const RECENT_SEARCH_KEY = "friend_search_recent";

export default function AddFriendPage() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "qr">("manual");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [myUsername, setMyUsername] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const db = getFirebaseDB();
  const router = useRouter();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const recent = localStorage.getItem(RECENT_SEARCH_KEY);
    if (recent) setRecentSearches(JSON.parse(recent).slice(0, 5));

    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (uid) {
      getDoc(doc(db, "users", uid)).then((snap) => {
        if (snap.exists()) setMyUsername(snap.data().username || "");
      });
    }
  }, [db]);

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
    if (closeModal) setShowScanQR(false);
  };

  useEffect(() => {
    return () => {
      void stopScan(false);
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
        if ("vibrate" in navigator) navigator.vibrate([10, 30, 10]);
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
            if ("vibrate" in navigator) navigator.vibrate([10, 30, 10]);
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
      void stopScan(false);
    };
  }, [showScanQR, scanMode]);

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
        if (!currentUid) return;

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
          if (!userDoc.exists()) continue;

          const userData = userDoc.data();

          let status: UserSuggestion["status"] = "none";
          const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", data.uid));
          if (friendDoc.exists()) {
            status = "friend";
          } else {
            const sentReq = await getDoc(doc(db, "friendRequests", `${currentUid}_${data.uid}`));
            if (sentReq.exists() && sentReq.data().status === "pending") {
              status = "sent";
            } else {
              const receivedReq = await getDoc(doc(db, "friendRequests", `${data.uid}_${currentUid}`));
              if (receivedReq.exists() && receivedReq.data().status === "pending") {
                status = "received";
              }
            }
          }

          results.push({
            uid: data.uid,
            username: docSnap.id,
            name: userData.name || docSnap.id,
            avatarUrl: userData.avatarUrl,
            status
          });
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

  const saveRecentSearch = (username: string) => {
    const updated = [username,...recentSearches.filter(s => s!== username)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(updated));
  };

  const handleAddFriend = async (userId?: string, username?: string) => {
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

      let targetUserId: string | null = userId || null;
      const lowerKeyword = keyword.toLowerCase();

      if (!targetUserId) {
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

      const friendDoc = await getDoc(doc(db, "users", currentUser.uid, "friends", targetUserId));
      if (friendDoc.exists()) {
        toast.error("Các bạn đã là bạn bè");
        return;
      }

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

      if (username) saveRecentSearch(username);
      toast.success("Đã gửi lời mời kết bạn");
      setSearch("");
      setSuggestions([]);
    } catch (error: any) {
      console.error("Add friend error:", error.code, error.message);
      toast.error(error.code === 'permission-denied'? "Đã gửi lời mời hoặc các bạn đã là bạn bè" : `Lỗi: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  const copyMyLink = () => {
    if (!myUsername) {
      toast.error("Chưa có username");
      return;
    }
    const link = `${window.location.origin}/u/${myUsername}`;
    navigator.clipboard.writeText(link);
    if ("vibrate" in navigator) navigator.vibrate(10);
    toast.success("Đã copy link");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 -ml-1 flex items-center justify-center text-[#0a84ff] active:opacity-60 transition-opacity"
          >
            <FiArrowLeft size={22} />
          </button>
          <h1 className="text- font-bold">Mời bạn</h1>
          <div className="w-8" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <FiUserPlus className="text-white" size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text- font-[600]">Kết nối với bạn bè</p>
            <p className="text- text-[#8e8e93] dark:text-zinc-500">Tìm và thêm bạn bè mới</p>
          </div>
          {myUsername && (
            <button
              onClick={copyMyLink}
              className="w-9 h-9 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-xl text-[#0a84ff] active:scale-95 transition-transform flex-shrink-0"
            >
              <FiLink size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setShowScanQR(true); setScanMode("camera"); setActiveTab("qr"); }}
            className={`h-12 rounded-2xl text- font-[600] flex items-center justify-center gap-2 active:scale-95 transition-all ${
              activeTab === "qr"
             ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5"
            }`}
          >
            <ScanLine size={18} /> Quét QR
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl text- font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
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
              className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text- outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:bg-white dark:focus:bg-zinc-700 transition-all"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            <AnimatePresence>
              {(showSuggestions && search.length >= 2) || (search.length === 0 && recentSearches.length > 0)? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden z-20 max-h-[320px] overflow-y-auto"
                >
                  {search.length === 0 && recentSearches.length > 0 && (
                    <>
                      <div className="px-4 py-2 text- font-[600] text-[#8e8e93] dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50">
                        Tìm kiếm gần đây
                      </div>
                      {recentSearches.map((uname) => (
                        <button
                          key={uname}
                          type="button"
                          onClick={() => {
                            setSearch(uname);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <FiClock className="text-[#8e8e93]" size={18} />
                          <span className="text-">@{uname}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {search.length >= 2 && (
                    <>
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
                            if (user.status === "friend") {
                              toast.error("Các bạn đã là bạn bè");
                              return;
                            }
                            if (user.status === "sent") {
                              toast.error("Đã gửi lời mời rồi");
                              return;
                            }
                            handleAddFriend(user.uid, user.username);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
                        >
                          <div
                            className="relative"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              navigator.clipboard.writeText(`@${user.username}`);
                              toast.success("Đã copy @" + user.username);
                            }}
                          >
                            {user.avatarUrl? (
                              <Image src={user.avatarUrl} alt={user.name} width={40} height={40} className="rounded-full" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {user.name[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-[600] text- truncate">{user.name}</p>
                            <p className="text- text-[#8e8e93] dark:text-zinc-500">@{user.username}</p>
                          </div>
                          {user.status === "friend" && (
                            <div className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text- font-[600] flex items-center gap-1">
                              <FiCheck size={14} /> Bạn bè
                            </div>
                          )}
                          {user.status === "sent" && (
                            <div className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text- font-[600]">
                              Đã gửi
                            </div>
                          )}
                          {user.status === "received" && (
                            <div className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text- font-[600]">
                              Chờ xác nhận
                            </div>
                          )}
                          {user.status === "none" && (
                            <FiUserPlus className="text-[#0a84ff] flex-shrink-0" size={18} />
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={adding ||!search.trim()}
            className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 hover:from-[#007aff] hover:to-purple-600 active:from-[#0051d5] active:to-purple-700 disabled:opacity-40 text-white rounded-2xl text- font-[600] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            {adding && <FiLoader className="animate-spin" size={18} />}
            {adding? "Đang gửi..." : "Gửi lời mời"}
          </button>
        </form>

        {myUsername && (
          <button
            onClick={copyMyLink}
            className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text- font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <FiShare2 size={18} /> Chia sẻ link của tôi
          </button>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScanFromFile} />
      </div>

      {showScanQR && (
        <div className="fixed inset-0 bg-black z-[70]">
          <div id="qr-reader-add" className={scanMode === "camera"? "w-full h-full" : "hidden"} />
          <div id="qr-reader-file-add" className="hidden" />
          <button
            onClick={() => stopScan()}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition"
            style={{ top: "max(24px, env(safe-area-inset-top))" }}
          >
            <FiX className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold">Đưa mã QR vào khung</p>
            <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}
    </div>
  );
}
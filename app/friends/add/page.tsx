"use client";

import { useState, useRef, useEffect } from "react";
import { FiSearch, FiX, FiLoader, FiUpload, FiCheck, FiClock, FiShare2, FiArrowLeft, FiMapPin, FiNavigation } from "react-icons/fi";
import { ScanLine, SlidersHorizontal } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, getDocs, limit } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import Image from "next/image";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type UserSuggestion = {
  uid: string;
  username: string;
  name: string;
  avatarUrl?: string;
  status?: "none" | "friend" | "sent" | "received";
  distance?: number;
  age?: number;
  gender?: "male" | "female" | "other";
};

type FilterOptions = {
  gender: "all" | "male" | "female";
  minAge: number;
  maxAge: number;
  maxDistance: number;
};

const RECENT_SEARCH_KEY = "friend_search_recent";

export default function AddFriendPage() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [myUsername, setMyUsername] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<UserSuggestion[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    gender: "all",
    minAge: 18,
    maxAge: 50,
    maxDistance: 50
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const db = getFirebaseDB();
  const router = useRouter();


  // Chặn scroll bounce
  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "auto";
    };
  }, []);

  // Yêu cầu định vị ngay khi vào
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationDenied(false);
        },
        () => {
          setLocationDenied(true);
          toast.error("Cần bật định vị để tìm bạn bè gần bạn");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

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

  // Load nearby users khi có location
  useEffect(() => {
    if (!userLocation) return;
    fetchNearbyUsers();
  }, [userLocation, filters]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyUsers = async () => {
    if (!userLocation) return;
    setLoadingNearby(true);

    try {
      const auth = getAuth();
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(50));
      const snap = await getDocs(q);
      const results: UserSuggestion[] = [];

      for (const docSnap of snap.docs) {
        if (docSnap.id === currentUid) continue;
        const data = docSnap.data();

        if (!data.location?.lat ||!data.location?.lng) continue;

        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          data.location.lat,
          data.location.lng
        );

        if (distance > filters.maxDistance) continue;
        if (filters.gender!== "all" && data.gender!== filters.gender) continue;
        if (data.age && (data.age < filters.minAge || data.age > filters.maxAge)) continue;

        let status: UserSuggestion["status"] = "none";
        const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", docSnap.id));
        if (friendDoc.exists()) {
          status = "friend";
        } else {
          const sentReq = await getDoc(doc(db, "friendRequests", `${currentUid}_${docSnap.id}`));
          if (sentReq.exists() && sentReq.data().status === "pending") {
            status = "sent";
          } else {
            const receivedReq = await getDoc(doc(db, "friendRequests", `${docSnap.id}_${currentUid}`));
            if (receivedReq.exists() && receivedReq.data().status === "pending") {
              status = "received";
            }
          }
        }

        results.push({
          uid: docSnap.id,
          username: data.username || "",
          name: data.name || "",
          avatarUrl: data.avatarUrl,
          status,
          distance: Math.round(distance * 10) / 10,
          age: data.age,
          gender: data.gender
        });
      }

      results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      setNearbyUsers(results.slice(0, 20));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNearby(false);
    }
  };

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
      fetchNearbyUsers();
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

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationDenied(false);
          toast.success("Đã bật định vị");
        },
        () => {
          toast.error("Vui lòng bật định vị trong cài đặt");
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-[env(safe-area-inset-bottom)]">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 -ml-1 flex items-center justify-center text-[#0a84ff] active:opacity-60 transition-opacity"
          >
            <FiArrowLeft size={22} />
          </button>
          <h1 className="text- font-bold">Mời bạn</h1>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="w-8 h-8 flex items-center justify-center text-[#0a84ff] active:opacity-60 transition-opacity"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {locationDenied && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl">
            <div className="flex items-start gap-3">
              <FiMapPin className="text-orange-600 dark:text-orange-400 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text- font-[600] text-orange-900 dark:text-orange-100">Cần bật định vị</p>
                <p className="text- text-orange-700 dark:text-orange-300 mt-1">Bật định vị để tìm bạn bè gần bạn</p>
                <button
                  onClick={requestLocation}
                  className="mt-3 px-4 h-9 bg-orange-600 text-white rounded-xl text- font-[600] active:scale-95 transition"
                >
                  Bật định vị
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl space-y-4">
                <div>
                  <p className="text- font-[600] mb-2">Giới tính</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Tất cả", value: "all" },
                      { label: "Nam", value: "male" },
                      { label: "Nữ", value: "female" }
                    ].map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setFilters({...filters, gender: g.value as any })}
                        className={`h-9 rounded-xl text- font-[600] transition-all ${
                          filters.gender === g.value
                        ? "bg-[#0a84ff] text-white"
                            : "bg-white dark:bg-zinc-800"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text- font-[600] mb-2">Tuổi: {filters.minAge} - {filters.maxAge}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="18"
                      max="70"
                      value={filters.minAge}
                      onChange={(e) => setFilters({...filters, minAge: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <input
                      type="range"
                      min="18"
                      max="70"
                      value={filters.maxAge}
                      onChange={(e) => setFilters({...filters, maxAge: Number(e.target.value) })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <p className="text- font-[600] mb-2">Khoảng cách: {filters.maxDistance}km</p>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={filters.maxDistance}
                    onChange={(e) => setFilters({...filters, maxDistance: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setShowScanQR(true); setScanMode("camera"); }}
            className="h-12 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-2xl text- font-[600] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập ID hoặc @username"
              className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text- outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:bg-white dark:focus:bg-zinc-700 transition-all"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
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

        {recentSearches.length > 0 && (
          <div>
            <p className="text- font-[600] text-[#8e8e93] dark:text-zinc-500 mb-2">Tìm kiếm gần đây</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((uname) => (
                <button
                  key={uname}
                  onClick={() => setSearch(uname)}
                  className="px-3 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg text- flex items-center gap-1.5 active:scale-95 transition"
                >
                  <FiClock size={14} className="text-[#8e8e93]" />
                  @{uname}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text- font-[600]">Gần bạn</p>
            {userLocation && (
              <button
                onClick={fetchNearbyUsers}
                className="text- text-[#0a84ff] font-[600] flex items-center gap-1"
              >
                <FiNavigation size={14} />
                Làm mới
              </button>
            )}
          </div>

          {loadingNearby && (
            <div className="py-12 text-center text-[#8e8e93]">
              <FiLoader className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-">Đang tìm bạn bè gần bạn...</p>
            </div>
          )}

          {!loadingNearby && nearbyUsers.length === 0 && userLocation && (
            <div className="py-12 text-center text-[#8e8e93]">
              <FiMapPin className="mx-auto mb-2" size={32} />
              <p className="text-">Không tìm thấy ai gần bạn</p>
              <p className="text- mt-1">Thử mở rộng khoảng cách tìm kiếm</p>
            </div>
          )}

          {!loadingNearby && nearbyUsers.length > 0 && (
            <div className="space-y-2">
              {nearbyUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl"
                >
                  {user.avatarUrl? (
                    <Image src={user.avatarUrl} alt={user.name} width={48} height={48} className="rounded-full" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.name[0]?.toUpperCase()}
                    </div>
                  )}
            <div className="flex-1 min-w-0">
  <p className="font-[600] text- truncate">{user.name}</p>
  <div className="flex items-center gap-2 text-sm text-[#8e8e93] dark:text-zinc-500">
    <span>@{user.username}</span>
    {user.distance!== undefined && (
      <>
        <span>•</span>
        <span className="flex items-center gap-0.5">
          <FiMapPin size={12} />
          {user.distance}km
        </span>
      </>
    )}
    {user.age && (
      <>
        <span>•</span>
        <span>{user.age}t</span>
      </>
    )}
  </div>
</div> {/* Thêm dòng này */}
{user.status === "friend" && (
                    <div className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text- font-[600] flex items-center gap-1">
                      <FiCheck size={14} /> Bạn bè
                    </div>
                  )}
                  {user.status === "sent" && (
                    <div className="px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text- font-[600]">
                      Đã gửi
                    </div>
                  )}
                  {user.status === "received" && (
                    <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text- font-[600]">
                      Chờ xác nhận
                    </div>
                  )}
                  {user.status === "none" && (
                    <button
                      onClick={() => handleAddFriend(user.uid, user.username)}
                      disabled={adding}
                      className="px-4 h-9 bg-[#0a84ff] text-white rounded-xl text- font-[600] active:scale-95 transition-all disabled:opacity-40"
                    >
                      Kết bạn
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
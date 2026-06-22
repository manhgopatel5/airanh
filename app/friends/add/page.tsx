"use client";

import { useState, useRef, useEffect } from "react";
import { FiSearch, FiX, FiLoader, FiUpload, FiCheck, FiClock, FiShare2, FiArrowLeft, FiMapPin, FiNavigation, FiRefreshCw, FiUsers } from "react-icons/fi";
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
  mutualFriends?: number;
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
  const [suggestedUsers, setSuggestedUsers] = useState<UserSuggestion[]>([]);
  const [searchResult, setSearchResult] = useState<UserSuggestion | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
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
    fetchSuggestedUsers();
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
      const q = query(usersRef, limit(100));
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
        if (friendDoc.exists()) continue; // Bỏ qua bạn bè

        const sentReq = await getDoc(doc(db, "friendRequests", `${currentUid}_${docSnap.id}`));
        if (sentReq.exists() && sentReq.data().status === "pending") {
          status = "sent";
        } else {
          const receivedReq = await getDoc(doc(db, "friendRequests", `${docSnap.id}_${currentUid}`));
          if (receivedReq.exists() && receivedReq.data().status === "pending") {
            status = "received";
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

  const fetchSuggestedUsers = async () => {
  setLoadingSuggested(true);
  try {
    const auth = getAuth();
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const usersRef = collection(db, "users");
    const q = query(usersRef, limit(50));
    const snap = await getDocs(q);
    const results: UserSuggestion[] = [];
    const randomUsers: UserSuggestion[] = [];

    for (const docSnap of snap.docs) {
      if (docSnap.id === currentUid) continue;
      const data = docSnap.data();

      const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", docSnap.id));
      if (friendDoc.exists()) continue;

      // Đếm bạn chung
      const myFriendsSnap = await getDocs(collection(db, "users", currentUid, "friends"));
      const theirFriendsSnap = await getDocs(collection(db, "users", docSnap.id, "friends"));
      const myFriends = new Set(myFriendsSnap.docs.map(d => d.id));
      const mutualCount = theirFriendsSnap.docs.filter(d => myFriends.has(d.id)).length;

      const userData: UserSuggestion = {
        uid: docSnap.id,
        username: data.username || "",
        name: data.name || "",
        avatarUrl: data.avatarUrl,
        status: "none",
        mutualFriends: mutualCount,
        age: data.age,
        gender: data.gender
      };

      if (mutualCount > 0) {
        results.push(userData);
      } else {
        randomUsers.push(userData);
      }
    }

    results.sort((a, b) => (b.mutualFriends || 0) - (a.mutualFriends || 0));

    // Nếu không có bạn chung thì lấy random 10 người
    if (results.length === 0) {
      const shuffled = randomUsers.sort(() => 0.5 - Math.random());
      setSuggestedUsers(shuffled.slice(0, 10));
    } else {
      setSuggestedUsers(results.slice(0, 10));
    }
  } catch (e) {
    console.error(e);
  } finally {
    setLoadingSuggested(false);
  }
};

  const handleSearchUser = async () => {
    const keyword = search.trim().replace("@", "").toLowerCase();
    if (!keyword) {
      toast.error("Vui lòng nhập username");
      return;
    }

    setLoadingSearch(true);
    setSearchResult(null);

    try {
      const auth = getAuth();
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const usernameDoc = await getDoc(doc(db, "usernames", keyword));
      if (!usernameDoc.exists()) {
        toast.error(`Không tìm thấy @${keyword}`);
        setLoadingSearch(false);
        return;
      }

      const targetUid = usernameDoc.data().uid;
      if (targetUid === currentUid) {
        toast.error("Không thể thêm chính mình");
        setLoadingSearch(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", targetUid));
      if (!userDoc.exists()) {
        toast.error("User không tồn tại");
        setLoadingSearch(false);
        return;
      }

      const data = userDoc.data();
      let status: UserSuggestion["status"] = "none";
      const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", targetUid));
      if (friendDoc.exists()) {
        status = "friend";
      } else {
        const sentReq = await getDoc(doc(db, "friendRequests", `${currentUid}_${targetUid}`));
        if (sentReq.exists() && sentReq.data().status === "pending") {
          status = "sent";
        } else {
          const receivedReq = await getDoc(doc(db, "friendRequests", `${targetUid}_${currentUid}`));
          if (receivedReq.exists() && receivedReq.data().status === "pending") {
            status = "received";
          }
        }
      }

      setSearchResult({
        uid: targetUid,
        username: data.username || "",
        name: data.name || "",
        avatarUrl: data.avatarUrl,
        status,
        age: data.age,
        gender: data.gender
      });
    } catch (e) {
      console.error(e);
      toast.error("Lỗi tìm kiếm");
    } finally {
      setLoadingSearch(false);
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
        handleSearchUser();
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
              handleSearchUser();
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
      setSearchResult(null);
      fetchNearbyUsers();
      fetchSuggestedUsers();
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

  // Dual Range Slider Component
  // Thêm vào đầu file, sau type FilterOptions
const RangeSlider = ({ min, max, value, onChange, label, unit = "" }: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (val: [number, number]) => void;
  label: string;
  unit?: string;
}) => {
  const [active, setActive] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!active ||!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e? e.touches[0]?.clientX?? 0 : e.clientX;
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const val = Math.round(min + (percent / 100) * (max - min));

    if (active === 'min') {
      onChange([Math.min(val, value[1] - 1), value[1]]);
    } else {
      onChange([value[0], Math.max(val, value[0] + 1)]);
    }
  };

  useEffect(() => {
    if (!active) return;
    const move = (e: TouchEvent | MouseEvent) => handleMove(e);
    const up = () => setActive(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [active, value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text- font-[600]">{label}</p>
        <p className="text- font-[700] text-[#0a84ff]">{value[0]} - {value[1]}{unit}</p>
      </div>
      <div ref={sliderRef} className="relative h-12 flex items-center">
        <div className="absolute w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
        <div
          className="absolute h-1.5 bg-gradient-to-r from-[#0a84ff] to-purple-500 rounded-full"
          style={{
            left: `${getPercent(value[0])}%`,
            width: `${getPercent(value[1]) - getPercent(value[0])}%`
          }}
        />
        <div
          onMouseDown={() => setActive('min')}
          onTouchStart={() => setActive('min')}
          className="absolute w-7 h-7 bg-white dark:bg-zinc-800 rounded-full shadow-lg border-2 border-[#0a84ff] -ml-3.5 active:scale-110 transition-transform"
          style={{ left: `${getPercent(value[0])}%` }}
        />
        <div
          onMouseDown={() => setActive('max')}
          onTouchStart={() => setActive('max')}
          className="absolute w-7 h-7 bg-white dark:bg-zinc-800 rounded-full shadow-lg border-2 border-[#0a84ff] -ml-3.5 active:scale-110 transition-transform"
          style={{ left: `${getPercent(value[1])}%` }}
        />
      </div>
    </div>
  );
};
  return (
  <div className="h-screen bg-white dark:bg-black flex flex-col overflow-hidden">
    {/* Header fixed */}
    <div className="flex-shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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

    {/* Content scroll riêng */}
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4" style={{ overscrollBehavior: 'contain' }}>
      {locationDenied && (
          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-2xl">
            <div className="flex items-start gap-3">
              <FiMapPin className="text-orange-600 dark:text-orange-400 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-[600] text-orange-900 dark:text-orange-100">Cần bật định vị</p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Bật định vị để tìm bạn bè gần bạn</p>
                <button
                  onClick={requestLocation}
                  className="mt-3 px-4 h-9 bg-orange-600 text-white rounded-xl text-sm font-[600] active:scale-95 transition"
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
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl space-y-5">
        <div>
          <p className="text- font-[600] mb-3">Giới tính</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Tất cả", value: "all" },
              { label: "Nam", value: "male" },
              { label: "Nữ", value: "female" }
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => setFilters({...filters, gender: g.value as any })}
                className={`h-10 rounded-xl text- font-[600] transition-all active:scale-95 ${
                  filters.gender === g.value
               ? "bg-gradient-to-br from-[#0a84ff] to-purple-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white dark:bg-zinc-800"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <RangeSlider
          min={18}
          max={70}
          value={[filters.minAge, filters.maxAge]}
          onChange={([min, max]) => setFilters({...filters, minAge: min, maxAge: max})}
          label="Tuổi"
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text- font-[600]">Khoảng cách</p>
            <p className="text- font-[700] text-[#0a84ff]">{filters.maxDistance}km</p>
          </div>
          <div className="relative h-12 flex items-center px-3.5">
            <div className="absolute left-0 right-0 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            <div
              className="absolute left-0 h-1.5 bg-gradient-to-r from-[#0a84ff] to-purple-500 rounded-full"
              style={{ width: `${(filters.maxDistance / 100) * 100}%` }}
            />
            <input
              type="range"
              min="1"
              max="100"
              value={filters.maxDistance}
              onChange={(e) => setFilters({...filters, maxDistance: Number(e.target.value) })}
              className="absolute inset-0 w-full h-12 opacity-0 cursor-pointer"
            />
            <div
              className="absolute w-7 h-7 bg-white dark:bg-zinc-800 rounded-full shadow-lg border-2 border-[#0a84ff] -ml-3.5 pointer-events-none"
              style={{ left: `${(filters.maxDistance / 100) * 100}%` }}
            />
          </div>
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
            className="h-12 bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-2xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <FiUpload size={18} /> Ảnh QR
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSearchUser(); }} className="space-y-3">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none z-10" size={20} />
            <input
              type="search"
              inputMode="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
              placeholder="Nhập ID hoặc @username"
              className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text- outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:bg-white dark:focus:bg-zinc-700 transition-all"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={loadingSearch ||!search.trim()}
            className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 hover:from-[#007aff] hover:to-purple-600 active:from-[#0051d5] active:to-purple-700 disabled:opacity-40 text-white rounded-2xl text- font-[600] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
          >
            {loadingSearch && <FiLoader className="animate-spin" size={18} />}
            {loadingSearch? "Đang tìm..." : "Tìm kiếm"}
          </button>
        </form>

        {searchResult && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
            <p className="text- font-[600] text-[#8e8e93] dark:text-zinc-500 mb-3">Kết quả tìm kiếm</p>
            <div className="flex items-center gap-3">
              {searchResult.avatarUrl? (
                <Image src={searchResult.avatarUrl} alt={searchResult.name} width={48} height={48} className="rounded-full" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {searchResult.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-[600] text- truncate">{searchResult.name}</p>
                <p className="text- text-[#8e8e93] dark:text-zinc-500">@{searchResult.username}</p>
              </div>
              {searchResult.status === "friend" && (
                <div className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text- font-[600] flex items-center gap-1">
                  <FiCheck size={14} /> Bạn bè
                </div>
              )}
              {searchResult.status === "sent" && (
                <div className="px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text- font-[600]">
                  Đã gửi
                </div>
              )}
              {searchResult.status === "received" && (
                <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text- font-[600]">
                  Chờ xác nhận
                </div>
              )}
              {searchResult.status === "none" && (
                <button
                  onClick={() => handleAddFriend(searchResult.uid, searchResult.username)}
                  disabled={adding}
                  className="px-4 h-9 bg-[#0a84ff] text-white rounded-xl text- font-[600] active:scale-95 transition-all disabled:opacity-40"
                >
                  Kết bạn
                </button>
              )}
            </div>
          </div>
        )}

        {recentSearches.length > 0 &&!searchResult && (
          <div>
            <p className="text- font-[600] text-[#8e8e93] dark:text-zinc-500 mb-2">Tìm kiếm gần đây</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((uname) => (
                <button
                  key={uname}
                  onClick={() => {
                    setSearch(uname);
                    handleSearchUser();
                  }}
                  className="px-3 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg text- flex items-center gap-1.5 active:scale-95 transition"
                >
                  <FiClock size={14} className="text-[#8e8e93]" />
                  @{uname}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tìm xung quanh */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <FiNavigation className="text-white" size={20} />
              </div>
              <div>
                <p className="text- font-[700]">Tìm xung quanh</p>
                <p className="text- text-[#8e8e93] dark:text-zinc-500">Bạn bè gần bạn</p>
              </div>
            </div>
            {userLocation && (
              <button
                onClick={fetchNearbyUsers}
                className="px-4 h-9 bg-white/80 dark:bg-zinc-800/80 backdrop-blur text-[#0a84ff] rounded-xl text- font-[600] flex items-center gap-1.5 active:scale-95 transition"
              >
                <FiRefreshCw size={16} />
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
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-white/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiMapPin className="text-[#8e8e93]" size={28} />
              </div>
              <p className="text- font-[600]">Không tìm thấy ai gần bạn</p>
              <p className="text- text-[#8e8e93] dark:text-zinc-500 mt-1">Thử mở rộng khoảng cách tìm kiếm</p>
            </div>
          )}

          {!loadingNearby && nearbyUsers.length > 0 && (
            <div className="space-y-2">
              {nearbyUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl"
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
                    <div className="flex items-center gap-2 text- text-[#8e8e93] dark:text-zinc-500">
                      <span>@{user.username}</span>
                      {user.distance!== undefined && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-[600] text-[#0a84ff]">
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
                  </div>
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

    {/* Gợi ý cho bạn */}
{!loadingSuggested && (
  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
        <FiUsers className="text-white" size={20} />
      </div>
      <div>
        <p className="text- font-[700]">
          {suggestedUsers.some(u => u.mutualFriends && u.mutualFriends > 0)
      ? "Những người bạn có thể biết"
            : "Gợi ý cho bạn"}
        </p>
        <p className="text- text-[#8e8e93] dark:text-zinc-500">
          {suggestedUsers.some(u => u.mutualFriends && u.mutualFriends > 0)
      ? "Dựa trên bạn chung"
            : "Người dùng mới"}
        </p>
      </div>
    </div>

    {suggestedUsers.length === 0? (
      <div className="py-12 text-center">
        <div className="w-16 h-16 bg-white/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
          <FiUsers className="text-[#8e8e93]" size={28} />
        </div>
        <p className="text- font-[600]">Chưa có gợi ý nào</p>
        <p className="text- text-[#8e8e93] dark:text-zinc-500 mt-1">Hãy thử lại sau</p>
      </div>
    ) : (
      <div className="space-y-2">
        {suggestedUsers.map((user) => (
          <div
            key={user.uid}
            className="flex items-center gap-3 p-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl"
          >
            {user.avatarUrl? (
              <Image src={user.avatarUrl} alt={user.name} width={48} height={48} className="rounded-full" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-[600] text- truncate">{user.name}</p>
              <div className="flex items-center gap-2 text- text-[#8e8e93] dark:text-zinc-500">
                <span>@{user.username}</span>
                {user.mutualFriends && user.mutualFriends > 0? (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 font-[600] text-purple-600 dark:text-purple-400">
                      <FiUsers size={12} />
                      {user.mutualFriends} bạn chung
                    </span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="font-[600] text-green-600 dark:text-green-400">Mới tham gia</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAddFriend(user.uid, user.username)}
              disabled={adding}
              className="px-4 h-9 bg-[#0a84ff] text-white rounded-xl text- font-[600] active:scale-95 transition-all disabled:opacity-40"
            >
              Kết bạn
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{myUsername && (
          <button
            onClick={copyMyLink}
            className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition"
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
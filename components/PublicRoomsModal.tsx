"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { FiX, FiUsers, FiTrendingUp, FiLoader } from "react-icons/fi";
import { toast } from "sonner";

type PublicRoomItem = {
  id: string;
  name: string;
  city: string;
  emoji: string;
  color: string;
  desc: string;
  memberCount: number;
  onlineCount: number;
  lastMessage?: string;
  isHot: boolean;
};

const PUBLIC_CITIES = [
  { id: "hcm", name: "SÀI GÒN", emoji: "🏙️", color: "from-blue-500 to-cyan-500", desc: "Sài Gòn năng động, không ngủ" },
  { id: "hn", name: "HÀ NỘI", emoji: "🏛️", color: "from-orange-500 to-red-500", desc: "Thủ đô ngàn năm văn hiến" },
  { id: "dn", name: "ĐÀ NẴNG", emoji: "🌉", color: "from-teal-500 to-emerald-500", desc: "Thành phố đáng sống nhất VN" },
  { id: "ct", name: "CẦN THƠ", emoji: "🌾", color: "from-green-500 to-lime-500", desc: "Miền Tây sông nước hữu tình" },
  { id: "hp", name: "HẢI PHÒNG", emoji: "⚓", color: "from-purple-500 to-pink-500", desc: "Thành phố Cảng anh hùng" },
  { id: "dl", name: "ĐÀ LẠT", emoji: "🌸", color: "from-pink-500 to-rose-500", desc: "Xứ sở sương mù mộng mơ" },
  { id: "nt", name: "NHA TRANG", emoji: "🏖️", color: "from-sky-500 to-blue-500", desc: "Biển xanh cát trắng nắng vàng" },
  { id: "hue", name: "HUẾ", emoji: "🏯", color: "from-violet-500 to-purple-500", desc: "Cố đô thơ mộng, trữ tình" },
  { id: "vt", name: "VŨNG TÀU", emoji: "🌊", color: "from-cyan-500 to-blue-500", desc: "Thành phố biển xinh đẹp" },
  { id: "pq", name: "PHÚ QUỐC", emoji: "🏝️", color: "from-emerald-500 to-teal-500", desc: "Đảo ngọc thiên đường" },
];

export default function PublicRoomsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [rooms, setRooms] = useState<PublicRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState<string | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    PUBLIC_CITIES.forEach((city) => {
      const roomId = `public_${city.id}`;
      const unsub = onSnapshot(doc(db, "public_rooms", roomId), (snap) => {
        const data = snap.data();
        setRooms((prev) => {
          const filtered = prev.filter((r) => r.id!== roomId);
          const newRoom: PublicRoomItem = {
            id: roomId,
            name: city.name,
            city: city.id,
            emoji: city.emoji,
            color: city.color,
            desc: city.desc,
            memberCount: data?.memberCount || 0,
            onlineCount: data?.onlineCount || 0,
            lastMessage: data?.lastMessage || `Chào mừng đến ${city.name}!`,
            isHot: (data?.onlineCount || 0) > 20,
          };
          return [...filtered, newRoom].sort((a, b) => b.onlineCount - a.onlineCount);
        });
        setLoading(false);
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [db]);

  const handleEnterRoom = async (room: PublicRoomItem) => {
    if (!user?.uid) {
      toast.error("Vui lòng đăng nhập để chat");
      return;
    }
    setEntering(room.id);

    try {
      // Tự tạo chats/public_xxx nếu chưa có
      const chatRef = doc(db, "chats", room.id);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          isGroup: true,
          isPublicRoom: true,
          status: 'active',
          groupName: room.name,
          groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(room.emoji)}&background=random&color=fff&bold=true&size=128`,
          members: [], // Phòng công cộng không cần members
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: `Chào mừng đến ${room.name}`,
          lastMessageTime: serverTimestamp(),
        });
      }

      onClose();
      router.push(`/chat/${room.id}`);
    } catch (error: any) {
      console.error("Enter room error:", error);
      toast.error("Lỗi: " + error.message);
    } finally {
      setEntering(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={onClose} />
      <div className="relative w-full sm:max-w-[540px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300">
        <div className="w-9 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">Phòng Chat Công Cộng</h2>
              <p className="text-[13px] text-[#8e8e93] mt-0.5">Bấm vào phòng để vào chat ngay</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#8e8e93] active:opacity-60">
              <FiX size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-2.5">
          {loading? (
            <div className="flex items-center justify-center py-20">
              <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleEnterRoom(room)}
                disabled={entering === room.id}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-black/5 dark:border-white/5 text-left active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-14 h-14 bg-gradient-to-br ${room.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                    {room.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-[700] tracking-tight">{room.name}</h3>
                      {room.isHot && (
                        <span className="px-1.5 py-0.5 bg-red-500 rounded-md flex items-center gap-1">
                          <FiTrendingUp size={10} className="text-white" />
                          <span className="text-[10px] font-[800] text-white">HOT</span>
                        </span>
                      )}
                      {entering === room.id && <FiLoader className="animate-spin" size={14} />}
                    </div>
                    <p className="text-[13px] text-[#8e8e93] mb-2 line-clamp-1">{room.desc}</p>
                    <div className="flex items-center gap-3 text-[12px] text-[#8e8e93]">
                      <span className="flex items-center gap-1">
                        <FiUsers size={12} />
                        <span className="font-[600]">{room.memberCount}</span>
                        <span>thành viên</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-[600]">{room.onlineCount}</span>
                        <span>online</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
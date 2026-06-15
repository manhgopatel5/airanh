"use client";
import { useState } from "react";
import { FiX } from "react-icons/fi";
import { toast } from "sonner";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function CreateGroupModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user?.uid) return toast.error("Vui lòng đăng nhập");
    if (!name.trim()) return toast.error("Nhập tên nhóm");

    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "chats"), {
        name: name.trim(),
        members: [user.uid],
        admins: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isGroup: true,
        avatar: "",
      });
      toast.success("Đã tạo nhóm");
      onCreated(docRef.id);
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-[700]">Tạo nhóm mới</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5">
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#8e8e93] mb-2 block">Tên nhóm</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhóm bạn thân"
              className="w-full h-12 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-[#0a84ff]"
              maxLength={50}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={creating ||!name.trim()}
            className="w-full h-12 bg-[#0a84ff] text-white rounded-xl font-[600] disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {creating? "Đang tạo..." : "Tạo nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
}
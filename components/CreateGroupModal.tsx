"use client";
import { useState } from "react";
import { FiX, FiLock, FiEye, FiEyeOff, FiHash } from "react-icons/fi";
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
  onCreated: (groupId: string) => void;
}) {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [name, setName] = useState("");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const hashPassword = async (pwd: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Tạo mã nhóm 6 số - không query để tránh lỗi permission
  const generateGroupCode = () => {
    const time = Date.now().toString().slice(-4); // 4 số cuối timestamp
    const random = Math.floor(10 + Math.random() * 90).toString(); // 2 số random
    return time + random;
  };

  const resetForm = () => {
    setName("");
    setPassword("");
    setEnablePassword(false);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!user?.uid) return toast.error("Vui lòng đăng nhập");

    const trimmedName = name.trim();
    if (!trimmedName) return toast.error("Nhập tên nhóm");
    if (trimmedName.length < 3) return toast.error("Tên nhóm tối thiểu 3 ký tự");
    if (trimmedName.length > 50) return toast.error("Tên nhóm tối đa 50 ký tự");

    if (enablePassword) {
      if (!password) return toast.error("Nhập mật khẩu nhóm");
      if (password.length < 4) return toast.error("Mật khẩu tối thiểu 4 ký tự");
      if (password.length > 20) return toast.error("Mật khẩu tối đa 20 ký tự");
    }

    setCreating(true);
    try {
      const groupCode = generateGroupCode();
      const groupData: any = {
        name: trimmedName,
        groupCode,
        members: [user.uid],
        admins: [user.uid],
        ownerId: user.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isGroup: true,
        avatar: "",
        memberCount: 1,
        lastMessage: "",
        lastSenderId: "",
        unreadCount: { [user.uid]: 0 },
        hasPassword: enablePassword,
        membersInfo: {
          [user.uid]: {
            name: user.displayName || "User",
            avatar: user.photoURL || "",
            username: "",
          },
        },
      };

      if (enablePassword) {
        groupData.passwordHash = await hashPassword(password);
      }

      const docRef = await addDoc(collection(db, "groups"), groupData);

      toast.success(`Đã tạo nhóm. Mã: ${groupCode}`, { duration: 4000 });
      onCreated(docRef.id);
      handleClose();
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' &&!creating) {
      handleCreate();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-[700]">Tạo nhóm mới</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] text-[#8e8e93] dark:text-zinc-500 mb-2 block font-[500]">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="VD: Nhóm bạn thân"
              className="w-full h-12 px-4 bg-[#f2f2f7] dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-[#0a84ff] text-[15px] font-[500] transition-all"
              maxLength={50}
              autoFocus
            />
            <div className="text-[11px] text-[#8e8e93] dark:text-zinc-500 mt-1 text-right">
              {name.length}/50
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <FiHash className="text-[#0a84ff] mt-0.5 flex-shrink-0" size={16} />
            <div className="text-[12px] text-[#0a84ff] dark:text-blue-400 leading-[18px]">
              Hệ thống sẽ tự tạo mã nhóm 6 số. Bạn bè dùng mã này để tìm và vào nhóm
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#f2f2f7] dark:bg-zinc-800 rounded-xl">
            <div className="flex items-center gap-2">
              <FiLock className="text-[#8e8e93] dark:text-zinc-500" size={18} />
              <span className="text-[15px] font-[500]">Đặt mật khẩu</span>
            </div>
            <button
              onClick={() => {
                setEnablePassword(!enablePassword);
                setPassword("");
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                enablePassword? 'bg-[#0a84ff]' : 'bg-[#d1d1d6] dark:bg-zinc-700'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                enablePassword? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {enablePassword && (
            <div className="animate-in slide-in-from-top duration-200">
              <label className="text-[13px] text-[#8e8e93] dark:text-zinc-500 mb-2 block font-[500]">
                Mật khẩu nhóm <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tối thiểu 4 ký tự"
                  className="w-full h-12 px-4 pr-12 bg-[#f2f2f7] dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-[#0a84ff] text-[15px] font-[500]"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {showPassword? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div className="text-[11px] text-[#8e8e93] dark:text-zinc-500 mt-1">
                Thành viên cần nhập mật khẩu để vào nhóm
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating ||!name.trim() || (enablePassword &&!password)}
            className="w-full h-12 bg-[#0a84ff] hover:bg-[#0a84ff]/90 text-white rounded-xl font-[600] text-[15px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {creating? "Đang tạo..." : "Tạo nhóm"}
          </button>
        </div>
      </div>
    </div>
  );
}
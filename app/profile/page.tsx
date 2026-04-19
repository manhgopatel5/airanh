"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase.client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  HelpCircle,
  LogOut,
  Trash2,
  User,
  Star,
  Users,
  Shield,
  Lock,
} from "lucide-react";

// ✅ tạo userId
const generateUserId = () =>
  "AIR" + Math.floor(100000 + Math.random() * 900000);

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();

  const [userData, setUserData] = useState<any>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);

  /* AUTH */
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user]);

  /* REALTIME USER */
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      if (!data) return;

      setUserData((prev: any) =>
        JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
      );

      setName(data.name || "");
    });

    return () => unsub();
  }, [user]);

  /* AUTO CREATE userId */
  useEffect(() => {
    if (!user || !userData) return;

    if (!userData.userId) {
      const newId = generateUserId();

      updateDoc(doc(db, "users", user.uid), {
        userId: newId,
      }).catch(() => {}); // 🔥 tránh crash
    }
  }, [userData, user]);

  /* UPDATE NAME */
  const handleUpdate = async () => {
    if (!user) return;
    setEditing(false);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
      });
    } catch (err) {
      console.error(err);
    }
  };

  /* UPLOAD AVATAR */
  const handleUpload = async (e: any) => {
    const file = e.target.files[0];

    if (!file || !user) {
      alert("Không có file hoặc user");
      return;
    }

    try {
      const storageRef = ref(storage, `avatars/${user.uid}.jpg`);

      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), {
        avatar: url,
      });

      alert("Upload thành công!");
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload lỗi!");
    }
  };

  /* LOGOUT FIX FULL */
  const handleLogout = async () => {
    if (!user) return;

    const confirmLogout = confirm("Bạn có chắc muốn đăng xuất không?");
    if (!confirmLogout) return;

    try {
      // 🔥 update online nhưng KHÔNG cho fail crash
      try {
        await updateDoc(doc(db, "users", user.uid), {
          online: false,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Skip update online:", e);
      }

      // 🔥 logout luôn
      await signOut(auth);

      // 🔥 redirect chắc chắn
      router.replace("/login");

      // 🔥 tránh cache state
      setTimeout(() => {
        window.location.reload();
      }, 200);

    } catch (err) {
      console.error("Logout error:", err);
      alert("Đăng xuất thất bại!");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-24">

      {/* HEADER */}
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-4 shadow-sm">

        {/* AVATAR */}
        <div className="relative w-fit">
          <img
            src={userData?.avatar || "/avatar.png"}
            key={userData?.avatar}
            className="w-16 h-16 rounded-full object-cover"
          />
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleUpload}
          />
        </div>

        {/* NAME + ID */}
        <div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate();
              }}
              autoFocus
              className="text-xl font-semibold border-b outline-none"
            />
          ) : (
            <div>
              <p
                onClick={() => setEditing(true)}
                className="font-semibold text-lg cursor-pointer"
              >
                {userData?.name || "Người dùng"}
              </p>

              <div className="text-sm text-gray-500">
                User ID: {userData?.userId || user.uid}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* MENU */}
      <div className="px-4 mt-4 space-y-4">

        <Group title="Hồ sơ">
          <Item label="Thông Tin Cá Nhân" icon={User} />
          <Item label="Kỹ Năng" icon={Star} />
          <Item label="Giới thiệu bạn bè" icon={Users} />
        </Group>

        <Group title="Bảo mật, quyền riêng tư">
          <Item label="Xác thực CCCD" icon={Shield} />
          <Item label="Đổi mật khẩu" icon={Lock} />
        </Group>

        <Group title="Thiết lập & hỗ trợ">
          <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
          <Item label="Đăng xuất" onClick={handleLogout} icon={LogOut} danger />
          <Item label="Xoá tài khoản" icon={Trash2} danger />
        </Group>

      </div>
    </div>
  );
}

/* COMPONENT */

function Group({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl shadow p-3">
      <div className="font-semibold mb-2 text-gray-700 uppercase text-sm">
        {title}
      </div>
      {children}
    </div>
  );
}

function Item({ label, onClick, danger, icon: Icon }: any) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-3 border-b last:border-0 px-1 rounded-lg cursor-pointer
      ${danger ? "text-red-500" : "text-gray-800"}
      active:bg-gray-100`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} />}
        <span>{label}</span>
      </div>

      <span className="text-gray-400">›</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Heart, Users, Clock } from "lucide-react";
import { joinTask } from "@/lib/joinTask";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  user: string;
  userId: string;
  avatar: string;
  time?: string;
  title: string;
  description: string;
  images?: string[];
  price: number;
  totalSlots: number;
  joined: number;
  deadline: any; // 🔥 cho phép Timestamp
  likes: number;
};

export default function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  /* ================= FIX DEADLINE ================= */
  const deadline =
    typeof task.deadline === "number"
      ? task.deadline
      : task.deadline?.toMillis?.() || 0;

  const priceFormatted = task.price.toLocaleString("vi-VN");

  /* ================= COUNTDOWN (client-only; avoids SSR/client Date mismatch) ================= */
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      setIsExpired(deadline <= now);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("Hết hạn");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  /* ================= JOIN TASK ================= */
  const handleJoin = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Bạn cần đăng nhập");
        return;
      }

      if (deadline <= Date.now()) {
        alert("Task đã hết hạn");
        return;
      }

      const chatId = await joinTask(task, user);
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      alert(err);
    }
  };

  const isFull = task.joined >= task.totalSlots;

  const progress =
    task.totalSlots > 0
      ? (task.joined / task.totalSlots) * 100
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
      {/* HEADER */}
      <div className="flex items-center p-3">
        <img
          src={task.avatar}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3">
          <p className="font-semibold text-sm">{task.user}</p>
          <p className="text-xs text-gray-400">
            {task.time || "Vừa xong"}
          </p>
        </div>
      </div>

      {/* TITLE */}
      <div className="px-3">
        <p className="font-semibold text-[15px]">{task.title}</p>
      </div>

      {/* DESCRIPTION */}
      <div className="px-3 py-2">
        <p className="text-sm text-gray-600 line-clamp-3">
          {task.description}
        </p>
      </div>

      {/* IMAGES */}
      {task.images && task.images.length > 0 && (
        <div className="flex overflow-x-auto space-x-2 px-3 pb-2">
          {task.images.map((img, i) => (
            <img
              key={i}
              src={img}
              className="w-40 h-32 object-cover rounded-lg flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* INFO */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-green-600 font-semibold">
            💰 {priceFormatted}đ
          </span>

          <span className="flex items-center gap-1 text-gray-500">
            <Users size={16} />
            {task.joined}/{task.totalSlots}
          </span>

          <span
            className={`flex items-center gap-1 ${
              isExpired ? "text-gray-400" : "text-red-500"
            }`}
          >
            <Clock size={16} />
            {timeLeft}
          </span>
        </div>

        {/* PROGRESS */}
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ACTION */}
      <div className="flex justify-between items-center p-3 pt-1">
        <button className="flex items-center gap-1 text-gray-500">
          <Heart size={18} />
          <span>{task.likes}</span>
        </button>

        <button
          onClick={handleJoin}
          disabled={isFull || isExpired}
          className={`px-4 py-1.5 rounded-lg text-sm transition ${
            isFull || isExpired
              ? "bg-gray-300 text-gray-500"
              : "bg-black text-white hover:opacity-80"
          }`}
        >
          {isExpired
            ? "Hết hạn"
            : isFull
            ? "Đã đủ"
            : "Nhận task"}
        </button>
      </div>
    </div>
  );
}

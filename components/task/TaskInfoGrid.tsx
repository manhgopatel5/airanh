"use client";

import { useEffect, useState } from "react";
import { isTask, type Task } from "@/types/task";

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
};

type Props = {
  task: Task;
  applications: Application[];
};

export default function TaskInfoGrid({ task, applications }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!isTask(task) ||!task.deadline?.seconds || task.status === "completed") {
      setIsUrgent(false);
      return;
    }
    const tick = () => {
      const diff = task.deadline!.seconds * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        setIsUrgent(true);
        return;
      }
      const totalHours = diff / 3600000;
      setIsUrgent(totalHours <= 1);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Còn ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task]);

  const taskDate = isTask(task) && task.createdAt?.seconds
  ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "Chưa xác định";

  const taskDeadline = isTask(task) && task.deadline?.seconds
  ? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "";

  const acceptedCount = applications.filter(a => a.status === 'accepted').length;
  const totalApplied = applications.length;

  return (
    <div className="mt-4">
      <h2 className="font-semibold text- leading-snug text-[#1C1C1E] dark:text-zinc-100">{task.title}</h2>

      <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 my-3" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="space-y-3">
          {isTask(task) && task.price > 0 && (
            <div>
              <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Tiền công</p>
              <p className="text- font-semibold text-[#0A84FF] mt-0.5">
                {task.price.toLocaleString("vi-VN")} đ
              </p>
            </div>
          )}
          {isTask(task) && (
            <div>
              <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Ứng tuyển</p>
              {/* Đổi: hiện "10 người" thay vì "0/1" */}
              <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
                {totalApplied} người
              </p>
            </div>
          )}
          {isTask(task) && task.deadline?.seconds && (
            <div>
              <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Hạn chót</p>
              <p className={`text- font-semibold mt-0.5 ${isUrgent? 'text-[#FF3B30]' : 'text-[#1C1C1E] dark:text-zinc-100'}`}>
                {timeLeft || taskDeadline}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Địa chỉ</p>
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5 truncate">
              {task.location?.address || task.location?.city || "Online"}
            </p>
          </div>
          <div>
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Đã nhận</p>
            {/* Đổi: hiện "0/2 người" thay vì "0 người" */}
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
              {acceptedCount}/{task.totalSlots} người
            </p>
          </div>
          <div>
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100">Ngày đăng</p>
            <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
              {taskDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
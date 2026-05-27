"use client";

import { useEffect, useState } from "react";
import { isTask, type Task } from "@/types/task";
import { motion } from "framer-motion";

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
};

type Props = {
  task: Task;
  applications: Application[];
  theme?: "task" | "plan";
};

export default function TaskInfoGrid({ task, applications, theme = "task" }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const accentColor = theme === "task" ? "#0A84FF" : "#30D158";

  useEffect(() => {
    if (!isTask(task) || !task.deadline?.seconds || task.status === "completed") {
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

  const taskDate = task.createdAt?.seconds
    ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "Chưa xác định";

  const taskDeadline = isTask(task) && task.deadline?.seconds
    ? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "";

  const acceptedCount = applications.filter(a => a.status === 'accepted').length;
  const totalApplied = applications.length;
  const totalSlots = task.totalSlots ?? 0;

  const InfoItem = ({ label, value, highlight = false, urgent = false }: { 
    label: string; 
    value: string; 
    highlight?: boolean;
    urgent?: boolean;
  }) => (
    <div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${
        urgent ? 'text-[#FF3B30]' : 
        highlight ? `text-[${accentColor}]` : 
        'text-zinc-900 dark:text-zinc-100'
      }`}>
        {value}
      </p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <h2 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-100">
        {task.title}
      </h2>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-3" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="space-y-3">
          {isTask(task) && task.price > 0 && (
            <InfoItem 
              label="Tiền công" 
              value={`${task.price.toLocaleString("vi-VN")} đ`}
              highlight
            />
          )}
          {isTask(task) && (
            <InfoItem 
              label="Ứng tuyển" 
              value={`${totalApplied} người`}
              highlight
            />
          )}
          {isTask(task) && task.deadline?.seconds && (
            <InfoItem 
              label="Hạn chót" 
              value={timeLeft || taskDeadline}
              urgent={isUrgent}
            />
          )}
        </div>

        <div className="space-y-3">
          <InfoItem 
            label="Địa chỉ" 
            value={task.location?.address || task.location?.city || "Online"}
            highlight
          />
          <InfoItem 
            label="Đã nhận" 
            value={`${acceptedCount}/${totalSlots} người`}
            highlight
          />
          <InfoItem 
            label="Ngày đăng" 
            value={taskDate}
            highlight
          />
        </div>
      </div>
    </motion.div>
  );
}
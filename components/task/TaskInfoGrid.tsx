"use client";

import { useEffect, useState } from "react";
import { isTask, type Task } from "@/types/task";
import { motion } from "framer-motion";
import { FiDollarSign, FiUsers, FiClock, FiMapPin, FiUserCheck, FiCalendar } from "react-icons/fi";

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
      setIsUrgent(totalHours <= 5); // Đổi 1h → 5h
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

  const InfoItem = ({ icon: Icon, label, value, highlight = false, urgent = false, blinking = false }: { 
    icon: any;
    label: string; 
    value: string; 
    highlight?: boolean;
    urgent?: boolean;
    blinking?: boolean;
  }) => (
    <div className="flex items-start gap-2">
      <motion.div
        animate={blinking ? { opacity: [1, 0.3, 1] } : {}}
        transition={blinking ? { duration: 1, repeat: Infinity } : {}}
      >
        <Icon 
          size={16} 
          className={`mt-0.5 shrink-0 ${
            urgent ? 'text-[#FF3B30]' : 
            highlight ? `text-[${accentColor}]` : 
            'text-zinc-500 dark:text-zinc-400'
          }`}
        />
      </motion.div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
        <motion.p 
          animate={blinking ? { opacity: [1, 0.3, 1] } : {}}
          transition={blinking ? { duration: 1, repeat: Infinity } : {}}
          className={`text-sm font-semibold mt-0.5 ${
            urgent ? 'text-[#FF3B30]' : 
            highlight ? `text-[${accentColor}]` : 
            'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {value}
        </motion.p>
      </div>
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

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-4">
          {isTask(task) && task.price > 0 && (
            <InfoItem 
              icon={FiDollarSign}
              label="Tiền công" 
              value={`${task.price.toLocaleString("vi-VN")} đ`}
              highlight
            />
          )}
          {isTask(task) && (
            <InfoItem 
              icon={FiUsers}
              label="Ứng tuyển" 
              value={`${totalApplied} người`}
              highlight
            />
          )}
          {isTask(task) && task.deadline?.seconds && (
            <InfoItem 
              icon={FiClock}
              label="Hạn chót" 
              value={timeLeft || taskDeadline}
              highlight={!isUrgent}
              urgent={isUrgent}
              blinking={isUrgent}
            />
          )}
        </div>

        <div className="space-y-4">
          <InfoItem 
            icon={FiMapPin}
            label="Địa chỉ" 
            value={task.location?.address || task.location?.city || "Online"}
            highlight
          />
          <InfoItem 
            icon={FiUserCheck}
            label="Đã nhận" 
            value={`${acceptedCount}/${totalSlots} người`}
            highlight
          />
          <InfoItem 
            icon={FiCalendar}
            label="Ngày đăng" 
            value={taskDate}
            highlight
          />
        </div>
      </div>
    </motion.div>
  );
}
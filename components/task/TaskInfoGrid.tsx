"use client";

import { useEffect, useState } from "react";
import { isTask, isPlan, type FeedTask } from "@/types/task";
import { motion } from "framer-motion";
import { FiDollarSign, FiUsers, FiClock, FiMapPin, FiUserCheck, FiCalendar } from "react-icons/fi";

type Application = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

type Props = {
  task: FeedTask;
  applications: Application[];
  theme?: "task" | "plan";
};

export default function TaskInfoGrid({ task, applications, theme }: Props) {
  const resolvedTheme = theme ?? (task.type === "plan" ? "plan" : "task");
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const accentClass = resolvedTheme === "task" ? "text-[#0A84FF]" : "text-[#30D158]";

  const targetDate = isTask(task) ? task.deadline : isPlan(task) ? task.eventDate : null;

  useEffect(() => {
    if (!targetDate || task.status === "completed") {
      setIsUrgent(false);
      return;
    }

    const deadlineMs = new Date(targetDate).getTime();
    if (isNaN(deadlineMs)) {
      setIsUrgent(false);
      return;
    }

    const tick = () => {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) {
        setTimeLeft(isPlan(task) ? "Đã diễn ra" : "Đã hết hạn");
        setIsUrgent(true);
        return;
      }
      const totalHours = diff / 3600000;
      setIsUrgent(totalHours <= 5);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Còn ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate, task.status, task]);

  const taskDate = task.createdAt
    ? new Date(task.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Chưa xác định";

  const formattedTarget = targetDate
    ? new Date(targetDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const acceptedCount = applications.filter((a) => a.status === "accepted").length;
  const totalApplied = applications.length;

  const planCost = isPlan(task)
    ? task.costType === "free"
      ? "Miễn phí"
      : task.costType === "share"
        ? task.costAmount
          ? `~${Math.ceil(task.costAmount / Math.max(task.maxParticipants ?? task.totalSlots ?? 1, 1)).toLocaleString("vi-VN")}đ/người (chia đều)`
          : "Chia đều"
        : task.costType === "host"
          ? "Chủ bao"
          : task.costType === "ticket"
            ? task.costAmount
              ? `${task.costAmount.toLocaleString("vi-VN")}đ/vé`
              : "Bán vé"
            : task.costAmount
              ? `${task.costAmount.toLocaleString("vi-VN")}đ`
              : "Linh hoạt"
    : "";

  const taskPriceLabel = isTask(task) && task.price > 0
    ? task.budgetType === "hourly"
      ? `${task.price.toLocaleString("vi-VN")} đ/giờ`
      : `${task.price.toLocaleString("vi-VN")} đ`
    : "";

  const slotLabel = isPlan(task)
    ? `${task.currentParticipants ?? 0}/${task.maxParticipants ?? task.totalSlots ?? 0} người`
    : `${acceptedCount}/${task.totalSlots ?? 0} người`;

  const InfoItem = ({
    icon: Icon,
    label,
    value,
    highlight = false,
    urgent = false,
    blinking = false,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
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
            urgent ? "text-[#FF3B30]" : highlight ? accentClass : "text-zinc-500 dark:text-zinc-400"
          }`}
        />
      </motion.div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
        <motion.p
          animate={blinking ? { opacity: [1, 0.3, 1] } : {}}
          transition={blinking ? { duration: 1, repeat: Infinity } : {}}
          className={`text-sm font-semibold mt-0.5 ${
            urgent ? "text-[#FF3B30]" : highlight ? accentClass : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {value}
        </motion.p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
      <h2 className="text-base font-bold leading-snug text-zinc-900 dark:text-zinc-100">{task.title}</h2>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-3" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-4">
          {isTask(task) && task.price > 0 && (
            <InfoItem
              icon={FiDollarSign}
              label={task.budgetType === "hourly" ? "Tiền công / giờ" : "Tiền công"}
              value={taskPriceLabel}
              highlight
            />
          )}
          {isPlan(task) && (
            <InfoItem icon={FiDollarSign} label="Chi phí" value={planCost} highlight />
          )}
          {isTask(task) && (
            <InfoItem icon={FiUsers} label="Ứng tuyển" value={`${totalApplied} người`} highlight />
          )}
          {isPlan(task) && (
            <InfoItem icon={FiUsers} label="Tham gia" value={`${task.currentParticipants ?? 0} người`} highlight />
          )}
          {targetDate && (
            <InfoItem
              icon={FiClock}
              label={isPlan(task) ? "Diễn ra" : "Hạn chót"}
              value={timeLeft || formattedTarget}
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
          <InfoItem icon={FiUserCheck} label={isPlan(task) ? "Số chỗ" : "Đã nhận"} value={slotLabel} highlight />
          <InfoItem icon={FiCalendar} label="Ngày đăng" value={taskDate} highlight />
        </div>
      </div>
    </motion.div>
  );
}

"use client";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { AppMode } from "@/types/app";
import { useRouter } from "next/navigation";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: TaskListItem[];
  mode: AppMode;
  activeTab: TabId;
};

const emptyConfig = {
  task: {
    hot: {
      icon: "🔥",
      title: "Chưa có gì bùng nổ",
      desc: "Đăng việc đầu tiên, nhận offer sau 5 phút",
      tags: ["Ship đồ gấp", "Mua đồ hộ", "Dọn nhà", "Sửa điện nước"],
      gradient: "from-orange-500 to-pink-500",
      tagBg: "bg-orange-500/10",
      tagText: "text-orange-600 dark:text-orange-400",
      tagHover: "hover:bg-orange-500/20",
    },
    near: {
      icon: "📍",
      title: "Quanh bạn đang yên ắng",
      desc: "Bật định vị để thấy việc gần bạn nhất trong 1km",
      tags: ["Việc trong 1km", "Làm ngay", "Ship nội thành", "Grab food"],
      gradient: "from-emerald-500 to-teal-500",
      tagBg: "bg-emerald-500/10",
      tagText: "text-emerald-600 dark:text-emerald-400",
      tagHover: "hover:bg-emerald-500/20",
    },
    friends: {
      icon: "👥",
      title: "Bạn bè chưa đăng gì",
      desc: "Mời bạn bè vào để nhận việc uy tín từ người quen",
      tags: ["Mời bạn bè", "Xem người quen", "Tạo nhóm", "Chia sẻ"],
      gradient: "from-blue-500 to-cyan-500",
      tagBg: "bg-blue-500/10",
      tagText: "text-blue-600 dark:text-blue-400",
      tagHover: "hover:bg-blue-500/20",
    },
    new: {
      icon: "✨",
      title: "Chưa có việc mới",
      desc: "Việc mới sẽ xuất hiện ở đây đầu tiên mỗi phút",
      tags: ["Đăng việc", "Theo dõi tag", "Bật thông báo", "Refresh"],
      gradient: "from-purple-500 to-pink-500",
      tagBg: "bg-purple-500/10",
      tagText: "text-purple-600 dark:text-purple-400",
      tagHover: "hover:bg-purple-500/20",
    },
  },
  plan: {
    hot: {
      icon: "🎉",
      title: "Chưa có kèo nào hot",
      desc: "Tạo lịch hẹn đầu tiên, rủ 100+ người quanh bạn đi chơi",
      tags: ["Cafe cuối tuần", "Nhậu tối nay", "Chill rooftop", "Đi phượt"],
      gradient: "from-blue-500 to-indigo-500",
      tagBg: "bg-blue-500/10",
      tagText: "text-blue-600 dark:text-blue-400",
      tagHover: "hover:bg-blue-500/20",
    },
    near: {
      icon: "🗺️",
      title: "Quanh đây chưa có hẹn",
      desc: "Khám phá điểm hẹn hot, event trong bán kính 2km",
      tags: ["Quán gần đây", "Event hôm nay", "Check-in hot", "Workshop"],
      gradient: "from-teal-500 to-cyan-500",
      tagBg: "bg-teal-500/10",
      tagText: "text-teal-600 dark:text-teal-400",
      tagHover: "hover:bg-teal-500/20",
    },
    friends: {
      icon: "💬",
      title: "Bạn bè chưa rủ gì",
      desc: "Tạo lịch rủ bạn bè đi chơi, ăn uống, xem phim ngay",
      tags: ["Rủ bạn bè", "Lập team", "Đi chung", "Sinh nhật"],
      gradient: "from-indigo-500 to-violet-500",
      tagBg: "bg-indigo-500/10",
      tagText: "text-indigo-600 dark:text-indigo-400",
      tagHover: "hover:bg-indigo-500/20",
    },
    new: {
      icon: "🗓️",
      title: "Lịch hẹn mới chưa có",
      desc: "Những cuộc hẹn mới nhất sẽ hiện ở đây mỗi giờ",
      tags: ["Tạo lịch hẹn", "Theo dõi khu vực", "Bật thông báo", "Lưu lịch"],
      gradient: "from-sky-500 to-blue-500",
      tagBg: "bg-sky-500/10",
      tagText: "text-sky-600 dark:text-sky-400",
      tagHover: "hover:bg-sky-500/20",
    },
  },
};

export default function TaskFeed({ tasks, mode, activeTab }: Props) {
  const router = useRouter();

  if (tasks.length === 0) {
    const config = emptyConfig[mode][activeTab];
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center animate-in fade-in duration-300">
        <div className="text-6xl mb-4 animate-bounce">{config.icon}</div>
        <h2
          className={`text-2xl font-extrabold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}
        >
          {config.title}
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed">
          {config.desc}
        </p>

        <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-sm">
          {config.tags.map((t) => (
            <button
              key={t}
              onClick={() => router.push(`/create?mode=${mode}&suggest=${encodeURIComponent(t)}`)}
              className={`px-4 py-2 rounded-full ${config.tagBg} ${config.tagText} text-sm font-semibold active:scale-95 transition-all ${config.tagHover}`}
            >
              + {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push(`/create?mode=${mode}`)}
          className={`mt-8 px-6 py-3 rounded-2xl bg-gradient-to-r ${config.gradient} text-white font-bold text-sm shadow-lg active:scale-95 transition-all`}
        >
          {mode === "task"? "Đăng việc ngay" : "Tạo lịch hẹn"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="px-4">
          <TaskCard task={task} mode={mode} />
        </div>
      ))}
    </
"use client";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";

type Props = {
  tasks: TaskListItem[];
};

export default function TaskFeed({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-6xl mb-4 animate-bounce">🔥</div>
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
          Chưa có gì bùng nổ
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 mt-2 max-w-xs">
          Đăng việc đầu tiên, nhận offer sau 5 phút
        </p>
        
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {["Ship đồ gấp", "Mua đồ hộ", "Dọn nhà"].map((t) => (
            <button 
              key={t} 
              className="px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-semibold active:scale-95 transition"
            >
              + {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="px-4">
          <TaskCard task={task} mode="task" />
        </div>
      ))}
    </div>
  );
}
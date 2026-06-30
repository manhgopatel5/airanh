"use client";

import { TaskListItem, FeedTask, isActiveFeedItem } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";

type Props = {
  plans: TaskListItem[];
  onPlanUpdate?: (id: string, updates: Partial<FeedTask>) => void;
};

export default function PlanFeed({ plans, onPlanUpdate }: Props) {
  const toFeedTask = (t: TaskListItem): FeedTask => {
    const raw = t as any;
    return {
      ...raw,
      createdAt: raw.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: raw.updatedAt?.toDate?.()?.toISOString() || null,
      deadline: raw.deadline?.toDate?.()?.toISOString() || null,
      eventDate: raw.eventDate?.toDate?.()?.toISOString() || null,
      endDate: raw.endDate?.toDate?.()?.toISOString() || null,
      startDate: raw.startDate?.toDate?.()?.toISOString() || null,
      applicationDeadline: raw.applicationDeadline?.toDate?.()?.toISOString() || null,
    };
  };

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="text-6xl mb-4">🗓️</div>
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          Thành phố đang yên ắng
        </h2>
        <p className="text-gray-500 dark:text-zinc-400 mt-2 max-w-xs">
          Tạo lịch hẹn đầu tiên, rủ 100+ người quanh bạn
        </p>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {["🍜 Ăn tối", "🎉 Bar", "🥾 Leo núi"].map((t) => (
            <button 
              key={t} 
              className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-semibold active:scale-95 transition"
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
      {plans.filter((plan) => isActiveFeedItem(plan as FeedTask)).map((plan) => (
        <div key={plan.id} className="px-4">
          <TaskCard 
            task={toFeedTask(plan)} 
            theme="plan"
            {...(onPlanUpdate && { onTaskUpdate: onPlanUpdate })}
          />
        </div>
      ))}
    </div>
  );
}
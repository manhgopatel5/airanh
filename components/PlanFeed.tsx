"use client";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { motion } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import taskLottie from "@/public/lotties/huha-task.json";

type Props = {
  plans: TaskListItem[];
};

export default function PlanFeed({ plans }: Props) {
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:18}} className="w-24 h-24 mb-4">
          <LottiePlayer animationData={taskLottie} autoplay loop className="w-24 h-24" />
        </motion.div>
        <h2 className="text-2xl font-black tracking-tight" style={{background:'linear-gradient(135deg,#0042B2,#0066FF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Thành phố đang yên ắng
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs text-sm">
          Tạo lịch hẹn đầu tiên, rủ 100+ người quanh bạn
        </p>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {["🍜 Ăn tối", "🎉 Bar", "🥾 Leo núi"].map((t) => (
            <motion.button 
              key={t}
              whileTap={{scale:0.95}}
              whileHover={{scale:1.03}}
              className="px-4 py-2 rounded-full text-sm font-semibold active:scale-95 transition"
              style={{background:'rgba(0,66,178,0.08)',color:'#0042B2'}}
            >
              + {t}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {plans.map((plan, i) => (
        <motion.div
          key={plan.id}
          initial={{opacity:0,y:12}}
          animate={{opacity:1,y:0}}
          transition={{delay:i*0.04,duration:0.3}}
          className="px-4"
        >
          <TaskCard task={plan} mode="plan" />
        </motion.div>
      ))}
    </div>
  );
}
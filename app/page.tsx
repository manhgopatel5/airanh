
import TaskCard from "@/components/TaskCard";

export default function Home() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">🔥 Hot Tasks</h1>
      <TaskCard />
      <TaskCard />
    </div>
  );
}

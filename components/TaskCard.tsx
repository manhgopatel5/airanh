"use client";

type TaskCardProps = {
  title: string;
  points: number;
  onApply?: () => void;
};

export default function TaskCard({
  title,
  points,
  onApply,
}: TaskCardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-md space-y-3 border hover:shadow-lg transition">
      
      {/* Title */}
      <h3 className="font-semibold text-lg">{title}</h3>

      {/* Info */}
      <div className="flex items-center justify-between">
        <span className="text-green-500 font-semibold">
          {points} pts
        </span>

        <button
          onClick={onApply}
          className="bg-blue-500 text-white px-4 py-1 rounded-lg text-sm hover:bg-blue-600 transition"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

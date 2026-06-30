interface JobSkeletonProps {
  count?: number;
  theme?: "task" | "plan";
}

export default function JobSkeleton({ count = 3, theme = "task" }: JobSkeletonProps) {
  const accent =
    theme === "task"
      ? "bg-blue-200/80 dark:bg-blue-900/40"
      : "bg-green-200/80 dark:bg-green-900/40";
  const block = "bg-zinc-200/90 dark:bg-zinc-800/80";

  return (
    <div className="space-y-3 px-4 pt-3 pb-2" aria-label="Đang tải dữ liệu" role="status">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
          aria-hidden="true"
        >
          <div className="p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <div className={`h-9 w-9 shrink-0 rounded-xl ${block} animate-pulse`} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className={`h-3 w-24 rounded-md ${block} animate-pulse`} />
                <div className={`h-2.5 w-16 rounded-md ${block} animate-pulse`} />
              </div>
            </div>
            <div className={`mb-2 h-3.5 w-4/5 rounded-md ${block} animate-pulse`} />
            <div className="grid grid-cols-3 gap-1.5">
              <div className={`h-10 rounded-lg ${block} animate-pulse`} />
              <div className={`h-10 rounded-lg ${block} animate-pulse`} />
              <div className={`h-10 rounded-lg ${block} animate-pulse`} />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`h-8 w-8 rounded-lg ${block} animate-pulse`} />
              ))}
            </div>
            <div className={`h-6 w-16 rounded-md ${accent} animate-pulse`} />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải danh sách...</span>
    </div>
  );
}

interface JobSkeletonProps {
  count?: number;
  theme?: 'task' | 'plan';
}

export default function JobSkeleton({ count = 3, theme = 'task' }: JobSkeletonProps) {
  const colors = {
    task: {
      primary: 'bg-blue-200 dark:bg-blue-900/50',
      secondary: 'bg-zinc-200 dark:bg-zinc-800',
    },
    plan: {
      primary: 'bg-green-200 dark:bg-green-900/50', 
      secondary: 'bg-zinc-200 dark:bg-zinc-800',
    }
  };

  const c = colors[theme];

  return (
    <div className="space-y-3 p-4" aria-label="Đang tải dữ liệu" role="status">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800"
          aria-hidden="true"
        >
          <div className="flex gap-3">
            {/* Avatar + Badge */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 ${c.secondary} rounded-xl animate-pulse`} />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${c.primary} rounded-full border-2 border-white dark:border-zinc-900 animate-pulse`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Title 2 dòng */}
              <div className="space-y-2">
                <div className={`h-4 w-4/5 ${c.secondary} rounded-lg animate-pulse`} />
                <div className={`h-4 w-2/3 ${c.secondary} rounded-lg animate-pulse`} />
              </div>

              {/* Tags row */}
              <div className="flex gap-2">
                <div className={`h-5 w-16 ${c.secondary} rounded-md animate-pulse`} />
                <div className={`h-5 w-20 ${c.secondary} rounded-md animate-pulse`} />
              </div>

              {/* Bottom row: price + stats */}
              <div className="flex items-center justify-between pt-1">
                <div className={`h-6 w-24 ${c.primary} rounded-lg animate-pulse`} />
                <div className="flex gap-3">
                  <div className={`h-4 w-10 ${c.secondary} rounded-md animate-pulse`} />
                  <div className={`h-4 w-10 ${c.secondary} rounded-md animate-pulse`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải danh sách công việc...</span>
    </div>
  );
}
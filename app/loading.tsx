// app/loading.tsx

const Shimmer = ({ className }: { className: string }) => (
  <div
    className={`relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />
  </div>
);

const JobCardSkeleton = () => (
  <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <Shimmer className="h-6 w-24 rounded-full" />
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>

        <Shimmer className="h-5 w-3/4 rounded-lg" />

        <div className="flex items-center gap-4">
          <Shimmer className="h-4 w-16 rounded" />
          <Shimmer className="h-4 w-12 rounded" />
        </div>
      </div>

      <div className="flex gap-2">
        <Shimmer className="h-8 w-8 rounded-lg" />
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  </div>
);

export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 select-none"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <Shimmer className="h-10 w-36 rounded-2xl" />
          <Shimmer className="h-6 w-20 rounded-lg" />
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <Shimmer className="h-9 w-20 rounded-full shrink-0 bg-blue-600/50" />
          <Shimmer className="h-9 w-24 rounded-full shrink-0" />
          <Shimmer className="h-9 w-20 rounded-full shrink-0" />
          <Shimmer className="h-9 w-16 rounded-full shrink-0" />
        </div>

        {/* Search */}
        <Shimmer className="h-12 w-full rounded-2xl mb-5" />
      </div>

      {/* List */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 space-y-3 pb-28">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
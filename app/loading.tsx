"use client";

// app/loading.tsx
// Server Component: render ngay 0ms, không JS
// Mục đích: Hết màn hình trắng, FCP < 0.3s

// 1. KHÔNG import icon lib. Dùng inline SVG = 0KB JS
const HomeIcon = () => (
  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const MessageIcon = () => (
  <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const GridIcon = () => (
  <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
  </svg>
);

// 2. Shimmer effect đẹp hơn pulse, nhẹ hơn
const Shimmer = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${className}`}>
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 select-none" aria-hidden="true">
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

 

      {/* Dùng keyframes Tailwind thay vì <style> để tránh CLS */}
      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
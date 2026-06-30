export default function PublicRoomsLoading() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] to-white p-4">
      <div className="mb-4 h-14 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="mb-3 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-zinc-100" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}

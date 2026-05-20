export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1 uppercase mt-2">{children}</p>;
}
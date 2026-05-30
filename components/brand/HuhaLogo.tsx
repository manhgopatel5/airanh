// components/brand/HuhaLogo.tsx
export default function HuhaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="text-[40px] font-black leading-none tracking-tight">
        <span className="bg-gradient-to-r from-[#0A84FF] to-[#0051D5] bg-clip-text text-transparent">
          hu
        </span>
        <span className="text-[#34C759]">ha</span>
      </div>
      <p className="mt-1.5 text-sm font-bold text-zinc-500 dark:text-zinc-400">
        Kết nối không giới hạn
      </p>
    </div>
  );
}
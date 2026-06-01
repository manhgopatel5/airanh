// components/brand/HuhaLogo.tsx
export default function HuhaLogo({
  className = "",
  showTagline = true,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <h1
          className="
            relative
            text-[48px]
            sm:text-[56px]
            font-bold
            leading-none
            tracking-[0.02em]
            select-none
          "
          style={{
            fontFamily: "var(--font-logo)",
          }}
        >
          {/* hu - xanh dương bo tròn */}
          <span
            className="
              bg-gradient-to-br
              from-[#0A84FF]
              via-[#2F8DFF]
              via-[#00C4FF]
              to-[#00D4AA]
              bg-clip-text
              text-transparent
            "
          >
            hu
          </span>

          {/* ha - xanh lá bo tròn */}
          <span
            className="
              bg-gradient-to-bl
              from-[#00D4AA]
              via-[#34D399]
              via-[#34C759]
              to-[#22C55E]
              bg-clip-text
              text-transparent
            "
          >
            ha
          </span>
        </h1>
      </div>

      {showTagline && (
        <div className="mt-2 flex items-center gap-2">
          <div className="h-px w-4 rounded-full bg-gradient-to-r from-transparent to-[#0A84FF]" />

          <p
            className="
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.25em]
              text-zinc-400
            "
            style={{ fontFamily: "'Quicksand', sans-serif" }}
          >
            Kết nối không giới hạn
          </p>

          <div className="h-px w-4 rounded-full bg-gradient-to-l from-transparent to-[#34C759]" />
        </div>
      )}
    </div>
  );
}
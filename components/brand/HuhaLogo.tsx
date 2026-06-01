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
        {/* Glow phía sau */}
        <div
          className="
            absolute
            left-1/2
            top-[55%]
            h-16
            w-48
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-gradient-to-r
            from-[#0A84FF]/30
            via-[#00D4AA]/20
            to-[#34C759]/30
            blur-2xl
          "
        />

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
            textShadow: "0 4px 20px rgba(10, 132, 255, 0.15)",
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
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-px w-6 rounded-full bg-gradient-to-r from-transparent to-[#0A84FF]" />

          <p
            className="
              text-[10px]
              sm:text-[11px]
              font-semibold
              uppercase
              tracking-[0.3em]
              text-zinc-400
            "
            style={{ fontFamily: "'Quicksand', sans-serif" }}
          >
            Kết nối không giới hạn
          </p>

          <div className="h-px w-6 rounded-full bg-gradient-to-l from-transparent to-[#34C759]" />
        </div>
      )}
    </div>
  );
}
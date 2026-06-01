// components/brand/HuhaLogo.tsx
import { cn } from "@/lib/utils"; // optional: nếu bạn dùng shadcn

export default function HuhaLogo({
  className = "",
  showTagline = true,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        {/* Glow phía sau - mềm hơn */}
        <div
          className="
            absolute
            left-1/2
            top-[55%]
            h-12
            w-40
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
            text-[58px]
            font-bold
            leading-none
            tracking-[-0.04em]
            select-none
          "
          style={{
            fontFamily: "'Comfortaa', 'Quicksand', 'Nunito', sans-serif",
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

          {/* Signature node - có pulse */}
          <span
            className="
              absolute
              left-[50%]
              top-[56%]
              h-3
              w-3
              -translate-x-1/2
              -translate-y-1/2
            "
          >
            <span
              className="
                absolute
                inset-0
                animate-ping
                rounded-full
                bg-gradient-to-r
                from-[#0A84FF]
                to-[#34C759]
                opacity-75
              "
            />
            <span
              className="
                relative
                block
                h-3
                w-3
                rounded-full
                bg-gradient-to-r
                from-[#0A84FF]
                to-[#34C759]
                shadow-lg
                shadow-cyan-500/50
              "
            />
          </span>
        </h1>

        {/* Underline bo cong theo chữ */}
        <svg
          className="absolute -bottom-1 left-1/2 -translate-x-1/2"
          width="120"
          height="8"
          viewBox="0 0 120 8"
          fill="none"
        >
          <path
            d="M2 4C20 6.5 40 7 60 4C80 1 100 1.5 118 4"
            stroke="url(#logo-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="120" y2="0">
              <stop offset="0%" stopColor="#0A84FF" />
              <stop offset="50%" stopColor="#00D4AA" />
              <stop offset="100%" stopColor="#34C759" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showTagline && (
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-px w-6 rounded-full bg-gradient-to-r from-transparent to-[#0A84FF]" />

          <p
            className="
              text-[10px]
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
// components/brand/HuhaLogo.tsx

export default function HuhaLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">

        {/* Connection Flow */}
        <div
          className="
            absolute
            left-[46%]
            top-[52%]
            h-[10px]
            w-[42px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-gradient-to-r
            from-[#0A84FF]
            via-[#3B9EFF]
            to-[#34C759]
            opacity-20
            blur-[8px]
          "
        />

        <h1
          className="
            relative
            text-[54px]
            font-black
            leading-none
            tracking-[-0.09em]
            select-none
          "
          style={{
            fontFamily:
              "'Fredoka','Baloo 2','Nunito',sans-serif",
          }}
        >
          <span
            className="
              bg-gradient-to-r
              from-[#0A84FF]
              via-[#2F8DFF]
              to-[#56A8FF]
              bg-clip-text
              text-transparent
            "
          >
            hu
          </span>

          <span
            className="
              bg-gradient-to-r
              from-[#56D76A]
              via-[#34C759]
              to-[#16A34A]
              bg-clip-text
              text-transparent
            "
          >
            ha
          </span>

          {/* Signature node */}
          <span
            className="
              absolute
              left-[49.8%]
              top-[53%]
              h-2.5
              w-2.5
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-gradient-to-r
              from-[#0A84FF]
              to-[#34C759]
            "
          />
        </h1>
      </div>

      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-[2px] w-8 rounded-full bg-[#0A84FF]" />

        <p
          className="
            text-[11px]
            font-bold
            uppercase
            tracking-[0.22em]
            text-zinc-500
          "
        >
          Kết nối không giới hạn
        </p>

        <div className="h-[2px] w-8 rounded-full bg-[#34C759]" />
      </div>
    </div>
  );
}
"use client";

import Image from "next/image";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

export function UserAvatar({ src, name, size = 40, className = "" }: Props) {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=0a84ff&color=fff&size=${size * 2}`;

  return (
    <Image
      src={src || fallback}
      alt={name || "User avatar"}
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
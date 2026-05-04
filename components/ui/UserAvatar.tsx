"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null | undefined;
  name?: string | null;
  size?: number;
  className?: string;
};

export function UserAvatar({ src, name, size = 40, className }: Props) {
  const imageSrc = src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=0a84ff&color=fff&size=${size * 2}`;

  return (
    <Image
      src={imageSrc}
      alt={name || "User avatar"}
      width={size}
      height={size}
      className={cn("rounded-full flex-shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null | undefined;
  name?: string | null | undefined;
  size?: number;
  className?: string;
  priority?: boolean; // cho avatar ở header
};

export function UserAvatar({ src, name, size = 40, className, priority = false }: Props) {
  const [imgError, setImgError] = useState(false);
  
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const fallbackSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=0A84FF&color=fff&size=${size * 2}&bold=true&format=svg`;
  
  // Nếu src rỗng/null/undefined/lỗi thì dùng fallback
  const shouldUseFallback = !src || imgError;
  const imageSrc = shouldUseFallback ? fallbackSrc : src;

  return (
    <div 
      className={cn("relative rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc}
        alt={name || "Avatar"}
        width={size}
        height={size}
        priority={priority}
        unoptimized={shouldUseFallback} // ui-avatars không cần optimize
        onError={() => setImgError(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        placeholder={shouldUseFallback ? "empty" : "blur"}
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI0UyRTJFMiIvPjwvc3ZnPg=="
      />
    </div>
  );
}
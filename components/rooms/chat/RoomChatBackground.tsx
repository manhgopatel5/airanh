"use client";

import { memo } from "react";

type Props = {
  imageUrl: string;
  accent: string;
};

function RoomChatBackground({ imageUrl, accent }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[1px]"
          loading="eager"
        />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: `linear-gradient(160deg, ${accent}33 0%, #0f172a 100%)` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent}55 0%, transparent 55%)`,
        }}
      />
    </div>
  );
}

export default memo(RoomChatBackground);

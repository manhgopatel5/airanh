"use client";

import { FiMapPin, FiClock, FiNavigation } from "react-icons/fi";

type Props = {
  eventId?: string;
  eventTitle?: string;
  eventImage?: string;
  eventAddress?: string;
  eventTag?: string;
  eventDesc?: string;
  eventPrice?: string;
  eventOpenTime?: string;
  mapUrl?: string;
};

export default function SharedEventMessage({
  eventTitle = "Sự kiện",
  eventImage,
  eventAddress,
  eventTag,
  eventDesc,
  eventPrice,
  eventOpenTime,
  mapUrl,
}: Props) {
  return (
    <div className="w-[min(100%,300px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {eventImage && (
        <div className="relative h-28 w-full">
          <img src={eventImage} alt={eventTitle} className="h-full w-full object-cover" />
          {eventTag && (
            <span className="absolute left-2 top-2 rounded-lg bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              {eventTag}
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Sự kiện</p>
        <p className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-2">{eventTitle}</p>
        {eventDesc && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{eventDesc}</p>
        )}
        <div className="mt-2 space-y-1">
          {eventAddress && (
            <p className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <FiMapPin className="mt-0.5 shrink-0 text-blue-500" size={12} />
              <span className="line-clamp-2">{eventAddress}</span>
            </p>
          )}
          {eventOpenTime && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <FiClock size={12} />
              {eventOpenTime}
            </p>
          )}
          {eventPrice && (
            <p className="text-xs font-semibold text-emerald-600">{eventPrice}</p>
          )}
        </div>
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-500 text-xs font-semibold text-white active:scale-95"
          >
            <FiNavigation size={14} />
            Chỉ đường
          </a>
        )}
      </div>
    </div>
  );
}

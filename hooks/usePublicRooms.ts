"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import {
  PUBLIC_CITIES,
  buildDefaultRooms,
  type PublicRoomItem,
} from "@/lib/publicRooms";

type Snapshot = {
  rooms: PublicRoomItem[];
  loading: boolean;
};

type CacheEntry = {
  snapshot: Snapshot;
  listeners: Set<(snapshot: Snapshot) => void>;
  unsubs: (() => void)[];
  refCount: number;
};

const caches = new Map<string, CacheEntry>();

function mergeRoomData(
  cityId: string,
  data: Record<string, unknown> | null,
  userId?: string
): PublicRoomItem {
  const city = PUBLIC_CITIES.find((c) => c.id === cityId);
  if (!city) return buildDefaultRooms()[0]!;

  const roomId = `public_${cityId}`;
  const onlineCount = (data?.onlineCount as number) || 0;
  const members = (data?.members as string[]) || [];

  return {
    id: roomId,
    cityId,
    name: city.name,
    emoji: city.emoji,
    color: city.color,
    tag: city.tag,
    tagColor: city.tagColor,
    region: city.region,
    desc: city.desc,
    imageUrl: city.imageUrl,
    memberCount: (data?.memberCount as number) || members.length || 0,
    onlineCount,
    lastMessage:
      (typeof data?.lastMessage === "string"
        ? data.lastMessage
        : (data?.lastMessage as { text?: string })?.text) ||
      `Chào mừng đến ${city.name}!`,
    isJoined: userId ? members.includes(userId) : false,
    isHot: onlineCount > 20,
  };
}

function getCacheKey(userId?: string) {
  return userId || "__guest__";
}

function ensureCache(userId?: string): CacheEntry {
  const key = getCacheKey(userId);
  const existing = caches.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const roomMap = new Map(buildDefaultRooms().map((room) => [room.cityId, room]));
  const entry: CacheEntry = {
    snapshot: { rooms: buildDefaultRooms(), loading: true },
    listeners: new Set(),
    unsubs: [],
    refCount: 1,
  };

  const publish = () => {
    entry.snapshot = {
      rooms: Array.from(roomMap.values()).sort((a, b) => b.onlineCount - a.onlineCount),
      loading: false,
    };
    entry.listeners.forEach((listener) => listener(entry.snapshot));
  };

  try {
    const db = getFirebaseDB();
    entry.unsubs = PUBLIC_CITIES.map((city) =>
      onSnapshot(
        doc(db, "chats", `public_${city.id}`),
        (snap) => {
          roomMap.set(
            city.id,
            mergeRoomData(city.id, snap.exists() ? snap.data() : null, userId)
          );
          publish();
        },
        () => {
          entry.snapshot = { ...entry.snapshot, loading: false };
          entry.listeners.forEach((listener) => listener(entry.snapshot));
        }
      )
    );
  } catch (error) {
    console.error("usePublicRooms init error:", error);
    entry.snapshot = { rooms: buildDefaultRooms(), loading: false };
  }

  caches.set(key, entry);
  return entry;
}

function releaseCache(userId?: string) {
  const key = getCacheKey(userId);
  const entry = caches.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.unsubs.forEach((unsub) => unsub());
    caches.delete(key);
  }
}

export function usePublicRooms(userId?: string) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    rooms: buildDefaultRooms(),
    loading: true,
  });

  useEffect(() => {
    const entry = ensureCache(userId);
    setSnapshot(entry.snapshot);
    entry.listeners.add(setSnapshot);
    return () => {
      entry.listeners.delete(setSnapshot);
      releaseCache(userId);
    };
  }, [userId]);

  return snapshot;
}

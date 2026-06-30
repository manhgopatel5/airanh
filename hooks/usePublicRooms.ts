"use client";

import { useSyncExternalStore } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import {
  PUBLIC_CITIES,
  buildDefaultRooms,
  type PublicRoomItem,
} from "@/lib/publicRooms";

type StoreSnapshot = {
  rooms: PublicRoomItem[];
  loading: boolean;
};

type StoreEntry = {
  snapshot: StoreSnapshot;
  listeners: Set<() => void>;
  unsubs: (() => void)[];
  refCount: number;
};

const stores = new Map<string, StoreEntry>();

function getStoreKey(userId?: string) {
  return userId || "__guest__";
}

function notify(entry: StoreEntry) {
  entry.listeners.forEach((listener) => listener());
}

function mergeRoomData(
  cityId: string,
  data: Record<string, unknown> | null,
  userId?: string
): PublicRoomItem {
  const city = PUBLIC_CITIES.find((c) => c.id === cityId)!;
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

function ensureStore(userId?: string): StoreEntry {
  const key = getStoreKey(userId);
  const existing = stores.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const roomMap = new Map<string, PublicRoomItem>(
    buildDefaultRooms().map((r) => [r.cityId, r])
  );

  const entry: StoreEntry = {
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
    notify(entry);
  };

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
        notify(entry);
      }
    )
  );

  stores.set(key, entry);
  return entry;
}

function releaseStore(userId?: string) {
  const key = getStoreKey(userId);
  const entry = stores.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.unsubs.forEach((u) => u());
    stores.delete(key);
  }
}

const EMPTY_SNAPSHOT: StoreSnapshot = { rooms: buildDefaultRooms(), loading: true };

export function usePublicRooms(userId?: string) {
  return useSyncExternalStore(
    (listener) => {
      const entry = ensureStore(userId);
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
        releaseStore(userId);
      };
    },
    () => stores.get(getStoreKey(userId))?.snapshot ?? EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT
  );
}

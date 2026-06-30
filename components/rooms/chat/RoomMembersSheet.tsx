"use client";

import { memo } from "react";
import { FiLoader, FiUsers, FiX } from "react-icons/fi";

type Member = {
  uid: string;
  displayName: string;
  photoURL: string;
};

type Props = {
  open: boolean;
  accent: string;
  roomName: string;
  members: Member[];
  onlineCount: number;
  loading?: boolean;
  onClose: () => void;
};

function RoomMembersSheet({
  open,
  accent,
  roomName,
  members,
  onlineCount,
  loading,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[75vh] w-full flex-col rounded-t-3xl border border-zinc-200 bg-white animate-in slide-in-from-bottom-5">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900">{roomName}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
              <FiUsers size={12} />
              {members.length} thành viên • {onlineCount} online
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <FiLoader className="animate-spin text-zinc-400" size={24} />
            </div>
          ) : members.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Chưa có thành viên</p>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 active:bg-zinc-50"
                >
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-zinc-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{member.displayName}</p>
                  </div>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: accent }}
                    title="Online"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(RoomMembersSheet);

"use client";

import { memo, useState } from "react";
import { FiClipboard, FiLoader, FiPlus, FiSearch, FiSend, FiUserPlus, FiX } from "react-icons/fi";

type Props = {
  message: string;
  sending: boolean;
  accent: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSearch: () => void;
  onInvite: () => void;
  onPoll: () => void;
};

function RoomChatInput({
  message,
  sending,
  accent,
  onChange,
  onSend,
  onSearch,
  onInvite,
  onPoll,
}: Props) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative z-50 shrink-0 border-t border-zinc-200/80 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-white">
      {showActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
          <div className="absolute bottom-full left-3 z-50 mb-2 flex gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
            {[
              { label: "Bình chọn", icon: FiClipboard, onClick: onPoll },
              { label: "Mời bạn", icon: FiUserPlus, onClick: onInvite },
              { label: "Tìm kiếm", icon: FiSearch, onClick: onSearch },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setShowActions(false);
                  action.onClick();
                }}
                className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-zinc-700 active:bg-zinc-50"
              >
                <action.icon size={20} />
                <span className="text-[10px] font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setShowActions((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95"
        >
          {showActions ? <FiX size={20} /> : <FiPlus size={20} />}
        </button>

        <textarea
          value={message}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Nhắn tin..."
          disabled={sending}
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={!message.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          {sending ? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
        </button>
      </div>
    </div>
  );
}

export default memo(RoomChatInput);

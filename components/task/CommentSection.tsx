<div className="sticky bottom-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl py-3">
  {replyTo && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2 rounded-xl"
    >
      <span>Đang trả lời <b className="text-zinc-900 dark:text-zinc-100 font-semibold">{replyTo.userName}</b></span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setReplyTo(null);
          navigator.vibrate?.(5);
        }}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg active:scale-90 transition-all"
      >
        <FiX size={14} />
      </motion.button>
    </motion.div>
  )}
  <div className="flex gap-2 items-center relative"> // <-- ĐỔI items-end → items-center
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSend()}
      placeholder={currentUser? "Viết bình luận..." : "Đăng nhập để bình luận"}
      className="flex-1 px-4 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] transition-all"
      disabled={sending ||!currentUser}
    />
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleSend}
      disabled={!text.trim() || sending ||!currentUser}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A84FF] hover:bg-[#0071e3] text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-90 transition-all shrink-0"
    >
      <FiSend size={18} />
    </motion.button>
  </div>
</div>
export default function ProfileModal({ title, desc, onClose, onConfirm, confirmText, danger }: { title: string; desc: string; onClose: () => void; onConfirm: () => void; confirmText: string; danger?: boolean; }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-t-3xl p-6 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-2xl font-semibold mb-3 active:scale-[0.98] transition ${danger ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full py-3.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl font-semibold">Hủy</button>
      </div>
    </div>
  );
}
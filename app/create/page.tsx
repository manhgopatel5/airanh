"use client";
import Link from "next/link";
import { FiBriefcase, FiCalendar } from "react-icons/fi";

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8">
          Bạn muốn tạo gì?
        </h1>
        <div className="grid gap-4">
          <Link
            href="/create/task"
            className="p-6 rounded-2xl border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <FiBriefcase className="text-3xl text-blue-500 mb-3" />
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Công việc</div>
            <div className="text-sm text-gray-500 dark:text-zinc-400">
              Thuê người làm, giao hàng, freelance...
            </div>
          </Link>

          <Link
            href="/create/plan"
            className="p-6 rounded-2xl border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <FiCalendar className="text-3xl text-blue-500 mb-3" />
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Kế hoạch</div>
            <div className="text-sm text-gray-500 dark:text-zinc-400">
              Hẹn hò, offline, sự kiện, du lịch...
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
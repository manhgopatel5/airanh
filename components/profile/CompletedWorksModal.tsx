"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Briefcase, Calendar, Loader2 } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app";

type CompletedItem = {
  id: string;
  slug: string;
  title: string;
  type: "task" | "plan";
  status: string;
  updatedAt?: string | null;
  role: "owner" | "assignee";
};

type CompletedWorksModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  count: number;
};

export default function CompletedWorksModal({ open, onOpenChange, uid, count }: CompletedWorksModalProps) {
  const router = useRouter();
  const setHideTabBar = useAppStore((s) => s.setHideTabBar);
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHideTabBar(open);
    return () => setHideTabBar(false);
  }, [open, setHideTabBar]);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/users/${uid}/completed?limit=30`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const body = await res.json();
        setItems(body.items || []);
      }
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-hidden bg-white rounded-3xl z-[90] shadow-2xl flex flex-col">
          <div className="p-5 border-b border-zinc-100">
            <Dialog.Title className="text-xl font-bold text-zinc-900">Đã hoàn thành</Dialog.Title>
            <p className="text-sm text-zinc-500 mt-1">{count} mục trong hồ sơ</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-10">Chưa có task/plan hoàn thành</p>
            )}
            {!loading &&
              items.map((item) => {
                const Icon = item.type === "plan" ? Calendar : Briefcase;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/task/${item.slug || item.id}`);
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-50 ring-1 ring-zinc-100 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.type === "plan" ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-zinc-900 line-clamp-2">{item.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {item.type === "plan" ? "Sự kiện" : "Công việc"} ·{" "}
                          {item.role === "owner" ? "Chủ mục" : "Tham gia"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="p-4">
            <Dialog.Close className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold">
              Đóng
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

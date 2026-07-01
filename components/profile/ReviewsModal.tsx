"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Star, Pencil, X, Check } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { toast } from "sonner";

export type ProfileReview = {
  id: string;
  taskId?: string;
  taskTitle?: string;
  fromUserId?: string;
  fromUserName: string;
  toUserId?: string;
  rating: number;
  feedback: string;
  role?: string;
  createdAt?: string | null;
};

type ReviewsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  currentUserId?: string;
};

function StarRow({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={readonly ? "cursor-default" : "active:scale-90 transition-transform"}
        >
          <Star
            className={`w-4 h-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsModal({ open, onOpenChange, uid, currentUserId }: ReviewsModalProps) {
  const [tab, setTab] = useState<"received" | "given">("received");
  const [received, setReceived] = useState<ProfileReview[]>([]);
  const [given, setGiven] = useState<ProfileReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editFeedback, setEditFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [recvRes, givenRes] = await Promise.all([
        fetch(`/api/users/${uid}/reviews?limit=30`),
        currentUserId === uid
          ? fetch(`/api/users/${uid}/reviews?type=given&limit=30`)
          : Promise.resolve(null),
      ]);
      if (recvRes.ok) {
        const body = await recvRes.json();
        setReceived(body.reviews || []);
      }
      if (givenRes?.ok) {
        const body = await givenRes.json();
        setGiven(body.reviews || []);
      }
    } catch {
      toast.error("Không tải được đánh giá");
    } finally {
      setLoading(false);
    }
  }, [uid, currentUserId]);

  useEffect(() => {
    if (open) loadReviews();
  }, [open, loadReviews]);

  const startEdit = (rev: ProfileReview) => {
    setEditingId(rev.id);
    setEditRating(rev.rating);
    setEditFeedback(rev.feedback);
  };

  const saveEdit = async () => {
    if (!editingId || !editFeedback.trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá");
      return;
    }
    setSaving(true);
    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/users/${uid}/reviews/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: editRating, feedback: editFeedback.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Đã cập nhật đánh giá");
      setEditingId(null);
      loadReviews();
    } catch {
      toast.error("Không thể cập nhật đánh giá");
    } finally {
      setSaving(false);
    }
  };

  const list = tab === "received" ? received : given;
  const isOwn = currentUserId === uid;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[85vh] overflow-hidden bg-white rounded-3xl z-[90] shadow-2xl flex flex-col">
          <div className="p-5 pb-3 border-b border-zinc-100">
            <Dialog.Title className="text-xl font-bold text-zinc-900">Đánh giá</Dialog.Title>
            {isOwn && (
              <div className="mt-3 flex gap-2">
                {[
                  { key: "received" as const, label: "Nhận được" },
                  { key: "given" as const, label: "Của tôi" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex-1 h-9 rounded-xl text-sm font-bold transition-all ${
                      tab === t.key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-3">
            {loading && <p className="text-sm text-zinc-400 text-center py-8">Đang tải...</p>}
            {!loading && list.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-8">
                {tab === "received" ? "Chưa có đánh giá nào" : "Bạn chưa viết đánh giá nào"}
              </p>
            )}
            {!loading &&
              list.map((rev) => {
                const isEditing = editingId === rev.id;
                const canEdit = isOwn && tab === "given" && rev.fromUserId === currentUserId;

                return (
                  <div key={rev.id} className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-zinc-900">
                          {tab === "received" ? rev.fromUserName : rev.taskTitle || "Đánh giá"}
                        </p>
                        {rev.taskTitle && tab === "received" && (
                          <p className="text-xs text-zinc-500 mt-0.5">{rev.taskTitle}</p>
                        )}
                      </div>
                      {canEdit && !isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(rev)}
                          className="w-8 h-8 rounded-full bg-white flex items-center justify-center ring-1 ring-zinc-200"
                        >
                          <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <StarRow value={editRating} onChange={setEditRating} />
                        <textarea
                          value={editFeedback}
                          onChange={(e) => setEditFeedback(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-zinc-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex-1 h-10 rounded-xl bg-zinc-200 text-sm font-semibold flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> Hủy
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={saving}
                            className="flex-1 h-10 rounded-xl bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" /> Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <StarRow value={rev.rating} readonly />
                        <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{rev.feedback}</p>
                      </>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="p-5 pt-0">
            <Dialog.Close className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold active:scale-[0.98] transition-all">
              Đóng
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

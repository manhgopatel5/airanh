"use client"
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { CheckCircle, XCircle, ExternalLink, Search, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { isAdminUser } from "@/lib/adminAuth";

type Report = {
  id: string;
  type: string;
  targetId: string;
  targetName: string;
  targetShortId: string;
  targetAvatar?: string;
  from: string;
  fromName: string;
  reason: string;
  note?: string;
  status: "pending" | "resolved" | "rejected";
  createdAt: { toDate?: () => Date };
  reviewedAt?: { toDate?: () => Date };
}

type Tab = "pending" | "resolved" | "rejected";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam / Quảng cáo",
  fake: "Tài khoản giả mạo",
  quay_roi: "Quấy rối / Bắt nạt",
  adult: "Nội dung 18+",
  violence: "Bạo lực",
  other: "Lý do khác"
};

export default function AdminReports() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const [user, loading] = useAuthState(auth);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = isAdminUser(user?.uid, user?.email);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "reports"),
      where("status", "==", tab),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
    }, (err) => {
      console.error(err);
      toast.error("Không tải được báo cáo");
    });

    return unsub;
  }, [isAdmin, tab, db]);

  const handleAction = async (report: Report, action: "resolved" | "rejected", banDays?: number) => {
    if (!user || actionLoading) return;
    setActionLoading(report.id);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/reports/action", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: report.id,
          action,
          banDays,
          targetId: report.targetId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Thao tác thất bại");
      }

      if (action === "resolved") {
        toast.success(banDays ? `Đã ban ${banDays} ngày` : "Đã ban vĩnh viễn");
      } else {
        toast.info("Đã bỏ qua báo cáo");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#0a84ff]" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredReports = reports.filter(r =>
    r.targetName?.toLowerCase().includes(search.toLowerCase()) ||
    r.targetShortId?.toLowerCase().includes(search.toLowerCase()) ||
    r.fromName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 pb-24">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(["pending", "resolved", "rejected"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  tab === t ? "bg-[#0a84ff] text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {t === "pending" && `Chờ xử lý${tab === t ? ` (${reports.length})` : ""}`}
                {t === "resolved" && `Đã xử lý${tab === t ? ` (${reports.length})` : ""}`}
                {t === "rejected" && `Đã bỏ qua${tab === t ? ` (${reports.length})` : ""}`}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl w-full md:w-64 bg-white"
            />
          </div>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-white rounded-2xl border border-zinc-200">
          Không có báo cáo nào
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <img
                  src={r.targetAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.targetName || "U")}`}
                  className="w-12 h-12 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold truncate">{r.targetName}</p>
                    <Link
                      href={`/profile/${r.targetId}`}
                      target="_blank"
                      className="text-[#0a84ff] hover:underline text-sm inline-flex items-center gap-1"
                    >
                      @{r.targetShortId || "user"} <ExternalLink className="w-3 h-3" />
                    </Link>
                    <span className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">{r.type}</span>
                  </div>

                  <div className="text-sm text-zinc-600 space-y-1">
                    <p><b>Lý do:</b> {REASON_LABEL[r.reason] || r.reason}</p>
                    {r.note && <p><b>Ghi chú:</b> {r.note}</p>}
                    <p><b>Người báo cáo:</b> {r.fromName}</p>
                    <p><b>Thời gian:</b> {r.createdAt?.toDate?.().toLocaleString("vi-VN") || "—"}</p>
                  </div>
                </div>
              </div>

              {tab === "pending" && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => handleAction(r, "resolved", 7)}
                    disabled={actionLoading === r.id}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Ban 7 ngày
                  </button>
                  <button
                    onClick={() => handleAction(r, "resolved")}
                    disabled={actionLoading === r.id}
                    className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    Ban vĩnh viễn
                  </button>
                  <button
                    onClick={() => handleAction(r, "rejected")}
                    disabled={actionLoading === r.id}
                    className="flex items-center gap-2 bg-zinc-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Bỏ qua
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

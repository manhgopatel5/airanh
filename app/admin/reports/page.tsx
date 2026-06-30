"use client";

import { useCallback, useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { isAdminUser } from "@/lib/adminAuth";
import {
  type AdminReport,
  type ReportStatus,
  REPORT_REASON_LABEL,
  REPORT_TYPE_LABEL,
} from "@/lib/adminReports";

type Tab = ReportStatus;

type ReportCounts = Record<Tab, number>;

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
}

function targetHref(report: AdminReport) {
  if (report.type === "task") return `/task/${report.targetId}`;
  if (report.type === "comment") return `/task/${report.targetId}`;
  return `/profile/${report.targetId}`;
}

export default function AdminReports() {
  const auth = getFirebaseAuth();
  const [user, loading] = useAuthState(auth);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [counts, setCounts] = useState<ReportCounts>({
    pending: 0,
    resolved: 0,
    rejected: 0,
  });
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isAdmin = isAdminUser(user?.uid, user?.email);

  const loadReports = useCallback(async () => {
    if (!user || !isAdmin) return;

    setListLoading(true);
    setLoadError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/reports?status=${tab}&counts=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Không tải được báo cáo (${res.status})`);
      }

      setReports(body.reports || []);
      if (body.counts) {
        setCounts(body.counts);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không tải được báo cáo";
      setLoadError(message);
      console.error(err);
    } finally {
      setListLoading(false);
    }
  }, [user, isAdmin, tab]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    void loadReports();
  }, [isAdmin, user, loadReports]);

  const handleAction = async (
    report: AdminReport,
    action: "resolved" | "rejected",
    banDays?: number
  ) => {
    if (!user || actionLoading) return;

    if (action === "resolved") {
      const label = banDays ? `ban ${banDays} ngày` : "ban vĩnh viễn";
      if (!confirm(`Xác nhận ${label} cho @${report.targetShortId || report.targetName}?`)) {
        return;
      }
    } else if (!confirm("Bỏ qua báo cáo này?")) {
      return;
    }

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

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Thao tác thất bại");
      }

      if (action === "resolved") {
        toast.success(banDays ? `Đã ban ${banDays} ngày` : "Đã ban vĩnh viễn");
      } else {
        toast.info("Đã bỏ qua báo cáo");
      }

      await loadReports();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-[#0a84ff]" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filteredReports = reports.filter(
    (r) =>
      r.targetName?.toLowerCase().includes(search.toLowerCase()) ||
      r.targetShortId?.toLowerCase().includes(search.toLowerCase()) ||
      r.fromName?.toLowerCase().includes(search.toLowerCase())
  );

  const tabLabel: Record<Tab, string> = {
    pending: "Chờ xử lý",
    resolved: "Đã xử lý",
    rejected: "Đã bỏ qua",
  };

  return (
    <div className="p-4 md:p-6 pb-24">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(["pending", "resolved", "rejected"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  tab === t ? "bg-[#0a84ff] text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {tabLabel[t]} ({counts[t]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={listLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 disabled:opacity-50"
              aria-label="Tải lại"
            >
              <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
            </button>
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zinc-200 rounded-xl w-full md:w-64 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="font-semibold text-red-700">{loadError}</p>
          <p className="mt-1 text-sm text-red-600">
            Kiểm tra quyền admin hoặc cấu hình Firebase server.
          </p>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white"
          >
            Thử lại
          </button>
        </div>
      ) : listLoading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#0a84ff]" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-white rounded-2xl border border-zinc-200">
          {search ? "Không tìm thấy báo cáo phù hợp" : "Không có báo cáo nào"}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <img
                  src={
                    r.targetAvatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(r.targetName || "U")}`
                  }
                  className="w-12 h-12 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold truncate">{r.targetName}</p>
                    <Link
                      href={targetHref(r)}
                      target="_blank"
                      className="text-[#0a84ff] hover:underline text-sm inline-flex items-center gap-1"
                    >
                      @{r.targetShortId || "user"} <ExternalLink className="w-3 h-3" />
                    </Link>
                    <span className="text-xs rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">
                      {REPORT_TYPE_LABEL[r.type] || r.type}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-600 space-y-1">
                    <p>
                      <b>Lý do:</b> {REPORT_REASON_LABEL[r.reason] || r.reason}
                    </p>
                    {r.note && (
                      <p>
                        <b>Ghi chú:</b> {r.note}
                      </p>
                    )}
                    <p>
                      <b>Người báo cáo:</b>{" "}
                      <Link href={`/profile/${r.from}`} className="text-[#0a84ff] hover:underline">
                        {r.fromName}
                      </Link>
                    </p>
                    <p>
                      <b>Thời gian:</b> {formatDate(r.createdAt)}
                    </p>
                    {r.reviewedAt && (
                      <p>
                        <b>Đã xử lý lúc:</b> {formatDate(r.reviewedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {tab === "pending" && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-100">
                  {r.type === "user" && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleAction(r, "resolved", 7)}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        {actionLoading === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Ban 7 ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction(r, "resolved")}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        Ban vĩnh viễn
                      </button>
                    </>
                  )}
                  {r.type !== "user" && (
                    <button
                      type="button"
                      onClick={() => void handleAction(r, "resolved")}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {actionLoading === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Đánh dấu đã xử lý
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleAction(r, "rejected")}
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
  );
}

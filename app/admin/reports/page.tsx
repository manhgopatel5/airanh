"use client"
import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, serverTimestamp, writeBatch, limit, startAfter, getDocs } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Shield, CheckCircle, ExternalLink, Search, Loader2, Download, Filter, AlertTriangle, Ban, UserX, Clock, FileText, ChevronDown, Users, TrendingUp } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

const ADMIN_UIDS = ["xKsvMeFGeCcM4dgyMrxQmH70FBE3", "ceWtvtIxZQMgWCzYxZiB3p0mSNi1"];
const PAGE_SIZE = 20;

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
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewedByName?: string;
}

type Tab = "pending" | "resolved" | "rejected" | "all";
type ReasonFilter = "all" | "spam" | "fake" | "quay_roi" | "adult" | "violence" | "other";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam / Quảng cáo",
  fake: "Tài khoản giả mạo",
  quay_roi: "Quấy rối / Bắt nạt",
  adult: "Nội dung 18+",
  violence: "Bạo lực",
  other: "Lý do khác"
};

const REASON_COLOR: Record<string, string> = {
  spam: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  fake: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  quay_roi: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  adult: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  violence: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
};

export default function AdminReports() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const [user, loading] = useAuthState(auth);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ pending: 0, resolved: 0, rejected: 0, today: 0 });
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, type: string, report?: Report, bulk?: boolean}>({show: false, type: ""});

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "reports"), (snap) => {
      let p = 0, r = 0, rej = 0, today = 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      snap.forEach(d => {
        const data = d.data();
        const s = data.status;
        if (s === "pending") p++;
        else if (s === "resolved") r++;
        else if (s === "rejected") rej++;
        if (data.createdAt?.toDate() >= todayStart) today++;
      });
      setStats({ pending: p, resolved: r, rejected: rej, today });
    });
    return unsub;
  }, [isAdmin, db]);

  useEffect(() => {
    if (!isAdmin) return;

    let q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    if (tab !== "all") q = query(q, where("status", "==", tab));
    if (reasonFilter !== "all") q = query(q, where("reason", "==", reasonFilter));

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setReports(docs);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    });

    return unsub;
  }, [user, isAdmin, tab, reasonFilter, db]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      let q = query(collection(db, "reports"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(PAGE_SIZE));
      if (tab !== "all") q = query(q, where("status", "==", tab));
      if (reasonFilter !== "all") q = query(q, where("reason", "==", reasonFilter));

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setReports(prev => [...prev, ...newDocs]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải thêm");
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, tab, reasonFilter, db]);

  const executeAction = async (report: Report, action: "resolved" | "rejected", banDays?: number) => {
    if (!user) return;
    setActionLoading(report.id);

    try {
      const batch = writeBatch(db);
      const reportRef = doc(db, "reports", report.id);
      
      batch.update(reportRef, {
        status: action,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewedByName: user.displayName || "Admin"
      });

      if (action === "resolved") {
        const userRef = doc(db, "users", report.targetId);
        const updateData: any = { banned: true, bannedAt: serverTimestamp(), bannedBy: user.uid };
        if (banDays) {
          const banUntil = new Date();
          banUntil.setDate(banUntil.getDate() + banDays);
          updateData.bannedUntil = banUntil;
        }
        batch.update(userRef, updateData);
      }

      await batch.commit();
      toast.success(action === "resolved" ? `Đã ban @${report.targetShortId}` : "Đã bỏ qua báo cáo");
      setConfirmModal({show: false, type: ""});
    } catch (err) {
      console.error(err);
      toast.error("Thao tác thất bại");
    } finally {
      setActionLoading(null);
    }
  }

  const handleAction = (report: Report, action: "resolved" | "rejected", banDays?: number) => {
    setConfirmModal({show: true, type: action, report, bulk: false});
  }

  const handleBulkAction = async (action: "resolved" | "rejected") => {
    if (!user || selectedIds.length === 0) return;
    setActionLoading("bulk");
    
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, "reports", id), {
          status: action,
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByName: user.displayName || "Admin"
        });
      });
      await batch.commit();
      toast.success(`Đã ${action === "resolved" ? "ban" : "bỏ qua"} ${selectedIds.length} báo cáo`);
      setSelectedIds([]);
      setConfirmModal({show: false, type: ""});
    } catch (err) {
      console.error(err);
      toast.error("Thao tác bulk thất bại");
    } finally {
      setActionLoading(null);
    }
  }

  const handleExport = () => {
    const csv = [
      ["ID", "User bị báo cáo", "Username", "Lý do", "Ghi chú", "Người báo cáo", "Thời gian", "Trạng thái", "Xử lý bởi"].join(","),
      ...filteredReports.map(r => [
        r.id,
        r.targetName,
        r.targetShortId,
        REASON_LABEL[r.reason] || r.reason,
        r.note || "",
        r.fromName,
        r.createdAt?.toDate().toLocaleString("vi-VN"),
        r.status,
        r.reviewedByName || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${tab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Đã xuất CSV");
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-screen text-red-500 text-xl font-semibold">403 - Không có quyền</div>;

  const filteredReports = useMemo(() => reports.filter(r => {
    const s = search.toLowerCase();
    return r.targetName.toLowerCase().includes(s) ||
           r.targetShortId.toLowerCase().includes(s) ||
           r.fromName.toLowerCase().includes(s) ||
           r.note?.toLowerCase().includes(s);
  }), [reports, search]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-center" />
      
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal({show: false, type: ""})}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.type === "resolved" ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                {confirmModal.type === "resolved" ? <Ban className="w-6 h-6 text-red-600" /> : <CheckCircle className="w-6 h-6 text-gray-600" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  {confirmModal.bulk ? `${confirmModal.type === "resolved" ? "Ban" : "Bỏ qua"} ${selectedIds.length} báo cáo?` : 
                   confirmModal.type === "resolved" ? `Ban @${confirmModal.report?.targetShortId}?` : "Bỏ qua báo cáo?"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {confirmModal.type === "resolved" ? "User sẽ bị cấm truy cập hệ thống" : "Báo cáo sẽ được đánh dấu đã xử lý"}
                </p>
              </div>
            </div>
            {!confirmModal.bulk && confirmModal.type === "resolved" && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm font-medium mb-2">Thời gian ban:</p>
                <div className="flex gap-2">
                  <button onClick={() => executeAction(confirmModal.report!, "resolved", 7)} className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">7 ngày</button>
                  <button onClick={() => executeAction(confirmModal.report!, "resolved", 30)} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">30 ngày</button>
                  <button onClick={() => executeAction(confirmModal.report!, "resolved")} className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-medium">Vĩnh viễn</button>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal({show: false, type: ""})} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium">
                Hủy
              </button>
              {confirmModal.bulk ? (
                <button onClick={() => handleBulkAction(confirmModal.type as any)} className={`flex-1 px-4 py-2 ${confirmModal.type === "resolved" ? "bg-red-600 hover:bg-red-700" : "bg-gray-600 hover:bg-gray-700"} text-white rounded-lg font-medium`}>
                  Xác nhận
                </button>
              ) : confirmModal.type !== "resolved" && (
                <button onClick={() => executeAction(confirmModal.report!, "rejected")} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium">
                  Xác nhận
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">

    <div className="flex items-center justify-between mb-4">

      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-600" />

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Quản lý báo cáo
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Xử lý vi phạm cộng đồng
          </p>
        </div>
      </div>

      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
      >
        <Download className="w-4 h-4" />

        <span className="hidden sm:inline">
          Xuất CSV
        </span>
      </button>

    </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Chờ xử lý</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.pending}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Ban className="w-4 h-4 text-red-600" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Đã ban</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.resolved}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Đã bỏ qua</span>
              </div>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.rejected}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Hôm nay</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.today}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["pending", "resolved", "rejected", "all"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  tab === t ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {t === "pending" && `Chờ xử lý (${stats.pending})`}
                {t === "resolved" && `Đã ban (${stats.resolved})`}
                {t === "rejected" && `Đã bỏ qua (${stats.rejected})`}
                {t === "all" && "Tất cả"}
              </button>
            ))}
            <button onClick={() => setShowFilters(!showFilters)} className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg">
              <Filter className="w-4 h-4" />
              Lọc
              {reasonFilter !== "all" && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => setReasonFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reasonFilter === "all" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`}>
                  Tất cả lý do
                </button>
                {Object.entries(REASON_LABEL).map(([key, label]) => (
                  <button key={key} onClick={() => setReasonFilter(key as ReasonFilter)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reasonFilter === key ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, username, ghi chú..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                />
              </div>
            </div>
          )}

          {selectedIds.length > 0 && tab === "pending" && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Đã chọn {selectedIds.length} báo cáo
              </span>
              <div className="flex gap-2">
                <button onClick={() => setConfirmModal({show: true, type: "resolved", bulk: true})} disabled={actionLoading === "bulk"} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Ban tất cả
                </button>
                <button onClick={() => setConfirmModal({show: true, type: "rejected", bulk: true})} disabled={actionLoading === "bulk"} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Bỏ qua tất cả
                </button>
                <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-medium">
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {filteredReports.length === 0 ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Không có báo cáo nào</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {filteredReports.map(r => (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition p-5">
                  <div className="flex items-start gap-4">
                    {tab === "pending" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, r.id]);
                          else setSelectedIds(selectedIds.filter(id => id !== r.id));
                        }}
                        className="mt-1 w-5 h-5 rounded border-gray-300"
                      />
                    )}
                    <img 
                      src={r.targetAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.targetName)}&background=random`} 
                      className="w-12 h-12 rounded-full object-cover"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg">{r.targetName}</p>
                            <Link 
                              href={`/profile/${r.targetId}`} 
                              target="_blank"
                              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                              @{r.targetShortId} <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${REASON_COLOR[r.reason] || REASON_COLOR.other}`}>
                              {REASON_LABEL[r.reason] || r.reason}
                            </span>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              r.status === "pending" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                              r.status === "resolved" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              {r.status === "pending" ? "Chờ xử lý" : r.status === "resolved" ? "Đã ban" : "Đã bỏ qua"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                          <p>{r.createdAt?.toDate().toLocaleDateString("vi-VN")}</p>
                          <p>{r.createdAt?.toDate().toLocaleTimeString("vi-VN")}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {r.note && (
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-500">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Ghi chú từ người báo cáo:</p>
                                <p className="text-gray-700 dark:text-gray-300">{r.note}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                          <span><b>Người báo cáo:</b> {r.fromName}</span>
                        </div>
                        {r.reviewedAt && (
                          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-xs">
                            <span>Xử lý bởi: {r.reviewedByName || "Admin"}</span>
                            <span>{r.reviewedAt.toDate().toLocaleString("vi-VN")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === "pending" && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                      <button
                        onClick={() => handleAction(r, "resolved", 7)}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-medium"
                      >
                        {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                        Ban 7 ngày
                      </button>
                      <button
                        onClick={() => handleAction(r, "resolved")}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-medium"
                      >
                        <Ban className="w-4 h-4" />
                        Ban vĩnh viễn
                      </button>
                      <button
                        onClick={() => handleAction(r, "rejected")}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Bỏ qua
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Tải thêm
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
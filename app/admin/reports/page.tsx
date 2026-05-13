"use client"
import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, serverTimestamp, writeBatch, limit, startAfter, getDocs, increment, updateDoc, deleteDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Shield, CheckCircle, ExternalLink, Search, Loader2, Download, Filter, AlertTriangle, Ban, Clock, FileText, ChevronDown, TrendingUp, MessageSquare, Unlock, XCircle, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

type Appeal = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  reason: string;
  appealText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewedByName?: string;
  violationCount: number;
}

type Tab = "pending" | "resolved" | "rejected" | "appeals" | "all";
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
  spam: "bg-[#FFF8E1] text-[#F9A825] dark:bg-[#F9A825]/20 dark:text-[#FFD54F]",
  fake: "bg-[#F3E5F5] text-[#AB47BC] dark:bg-[#AB47BC]/20 dark:text-[#CE93D8]",
  quay_roi: "bg-[#FFEBEE] text-[#E53935] dark:bg-[#E53935]/20 dark:text-[#EF5350]",
  adult: "bg-[#FCE4EC] text-[#D81B60] dark:bg-[#D81B60]/20 dark:text-[#F06292]",
  violence: "bg-[#FFF3E0] text-[#FB8C00] dark:bg-[#FB8C00]/20 dark:text-[#FFB74D]",
  other: "bg-[#F5F5F5] text-[#616161] dark:bg-zinc-700 dark:text-zinc-300"
};

export default function AdminReports() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
 const [user, loading, authError] = useAuthState(auth);

  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ pending: 0, resolved: 0, rejected: 0, appeals: 0, today: 0 });
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean,
    type: string,
    report?: Report,
    appeal?: Appeal,
    bulk?: boolean,
    violationCount?: number
  }>({show: false, type: ""});

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
if (authError) {
  return (
    <div className="flex items-center justify-center h-screen">
      {authError.message}
    </div>
  );
}
  useEffect(() => {
    if (!isAdmin) return;


    const unsubReports = onSnapshot(collection(db, "reports"), (snap) => {
      let p = 0, r = 0, rej = 0, today = 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      snap.forEach(d => {
        const data = d.data();
        const s = data.status;
        if (s === "pending") p++;
        else if (s === "resolved") r++;
        else if (s === "rejected") rej++;
        const createdAt = data.createdAt?.toDate();
if (createdAt && createdAt >= todayStart) today++;
      });
      setStats(prev => ({...prev, pending: p, resolved: r, rejected: rej, today }));
    });

    const unsubAppeals = onSnapshot(
      query(collection(db, "appeals"), where("status", "==", "pending")),
      (snap) => {
        setStats(prev => ({...prev, appeals: snap.size }));
      }
    );

    return () => {
      unsubReports();
      unsubAppeals();
    };
  }, [isAdmin, db]);

  useEffect(() => {
    if (!isAdmin) return;

    if (tab === "appeals") {
      const q = query(
        collection(db, "appeals"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id,...d.data() } as Appeal));
        setAppeals(docs);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      });
      return unsub;
    } else {
      let q = query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
      if (tab!== "all") q = query(q, where("status", "==", tab));
      if (reasonFilter!== "all") q = query(q, where("reason", "==", reasonFilter));

      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id,...d.data() } as Report));
        setReports(docs);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      });
      return unsub;
    }
  }, [user, isAdmin, tab, reasonFilter, db]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore ||!hasMore) return;
    setLoadingMore(true);

    try {
      if (tab === "appeals") {
        const q = query(
          collection(db, "appeals"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
        const snap = await getDocs(q);
        const newDocs = snap.docs.map(d => ({ id: d.id,...d.data() } as Appeal));
        setAppeals(prev => [...prev,...newDocs]);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } else {
        const constraints: any[] = [
  orderBy("createdAt", "desc"),
  limit(PAGE_SIZE)
];

if (tab !== "all") {
  constraints.push(where("status", "==", tab));
}

if (reasonFilter !== "all") {
  constraints.push(where("reason", "==", reasonFilter));
}

const q = query(collection(db, "reports"), ...constraints);

        const snap = await getDocs(q);
        const newDocs = snap.docs.map(d => ({ id: d.id,...d.data() } as Report));
        setReports(prev => [...prev,...newDocs]);
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải thêm");
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, loadingMore, hasMore, tab, reasonFilter, db]);

  const executeAction = async (report: Report, action: "resolved" | "rejected") => {
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
      // BỎ QUA VIỆC LẤY TASK, TÌM USER BẰNG SHORTID LUÔN
      const q = query(
        collection(db, "users"), 
        where("shortId", "==", report.targetShortId), 
        limit(1)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error(`Không tìm thấy user @${report.targetShortId}`);
        setActionLoading(null);
        return;
      }

      const userRef = snap.docs[0].ref;
      const userData = snap.docs[0].data();
      const currentViolationCount = userData?.violationCount || 0;
      const newCount = currentViolationCount + 1;
      const targetShortId = userData?.shortId || report.targetShortId;

      const updateData: any = {
        violationCount: increment(1),
        lastViolationAt: serverTimestamp(),
      };

      if (newCount === 1) {
        updateData.warning = true;
        updateData.warningReason = REASON_LABEL[report.reason] || report.reason;
        updateData.warningAt = serverTimestamp();
        toast.success(`Đã cảnh cáo @${targetShortId} lần 1`);
      } else if (newCount === 2) {
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + 3);
        updateData.banned = true;
        updateData.bannedUntil = banUntil;
        updateData.bannedReason = REASON_LABEL[report.reason] || report.reason;
        updateData.bannedAt = serverTimestamp();
        updateData.bannedBy = user.uid;
        toast.success(`Đã ban @${targetShortId} 3 ngày`);
      } else if (newCount === 3) {
        const banUntil = new Date();
        banUntil.setDate(banUntil.getDate() + 7);
        updateData.banned = true;
        updateData.bannedUntil = banUntil;
        updateData.bannedReason = REASON_LABEL[report.reason] || report.reason;
        updateData.bannedAt = serverTimestamp();
        updateData.bannedBy = user.uid;
        toast.success(`Đã ban @${targetShortId} 7 ngày`);
      } else {
        updateData.banned = true;
        updateData.bannedUntil = null;
        updateData.bannedReason = REASON_LABEL[report.reason] || report.reason;
        updateData.bannedAt = serverTimestamp();
        updateData.bannedBy = user.uid;
        toast.success(`Đã ban vĩnh viễn @${targetShortId}`);
      }

      batch.update(userRef, updateData);
    } else {
      toast.success("Đã bỏ qua báo cáo");
    }

    await batch.commit();
    setConfirmModal({show: false, type: ""});
  } catch (err: any) {
    console.error("Lỗi executeAction:", err);
    toast.error(`Thao tác thất bại: ${err.message}`);
  } finally {
    setActionLoading(null);
  }
}
  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if (!user) return;
    setActionLoading(taskId);

    try {
      await deleteDoc(doc(db, "tasks", taskId));
      toast.success(`Đã xoá task "${taskName}"`);
      setConfirmModal({show: false, type: ""});
    } catch (err) {
      console.error(err);
      toast.error("Xoá task thất bại");
    } finally {
      setActionLoading(null);
    }
  }
  const executeAppeal = async (appeal: Appeal, action: "approved" | "rejected") => {
    if (!user) return;
    setActionLoading(appeal.id);

    try {
      const batch = writeBatch(db);
      const appealRef = doc(db, "appeals", appeal.id);
      const userRef = doc(db, "users", appeal.userId);

      batch.update(appealRef, {
        status: action,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid,
        reviewedByName: user.displayName || "Admin"
      });

      if (action === "approved") {
        batch.update(userRef, {
          banned: false,
          bannedUntil: null,
          unbannedAt: serverTimestamp(),
          unbannedBy: user.uid,
          unbanReason: "Kháng cáo được chấp nhận"
        });
        toast.success(`Đã gỡ ban cho @${appeal.userName}`);
      } else {
        toast.success("Đã từ chối kháng cáo");
      }

      await batch.commit();
      setConfirmModal({show: false, type: ""});
    } catch (err) {
      console.error(err);
      toast.error("Thao tác thất bại");
    } finally {
      setActionLoading(null);
    }
  }

  const handleUnban = async (userId: string, userName: string) => {
    if (!user) return;
    setActionLoading(userId);

    try {
      await updateDoc(doc(db, "users", userId), {
        banned: false,
        bannedUntil: null,
        unbannedAt: serverTimestamp(),
        unbannedBy: user.uid,
        unbanReason: "Gỡ ban thủ công bởi admin"
      });
      toast.success(`Đã gỡ ban cho @${userName}`);
      setConfirmModal({show: false, type: ""});
    } catch (err) {
      console.error(err);
      toast.error("Gỡ ban thất bại");
    } finally {
      setActionLoading(null);
    }
  }

const handleAction = async (report: Report, action: "resolved" | "rejected") => {
  setConfirmModal({show: false, type: ""});
  
  if (action === "resolved") {
    try {
      // Fix: bỏ dấu ) dư
      const userSnap = await getDocs(query(
        collection(db, "users"), 
        where("uid", "==", report.targetId), 
        limit(1)
      ));
      
      const firstDoc = userSnap.docs[0];

if (!firstDoc) {
  toast.error("Không tìm thấy user");
  return;
}

const violationCount = firstDoc.data()?.violationCount || 0;
      setConfirmModal({
        show: true,
        type: action,
        report,
        bulk: false,
        violationCount: violationCount + 1
      });
    } catch (err) {
      console.error("Lỗi load violation:", err);
      toast.error("Không load được thông tin user");
      // Vẫn cho mở modal nhưng không có violationCount
      setConfirmModal({
        show: true,
        type: action,
        report,
        bulk: false,
        violationCount: 1
      });
    }
  } else {
    setConfirmModal({
      show: true,
      type: action,
      report,
      bulk: false,
    });
  }
};

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
      toast.success(`Đã ${action === "resolved"? "xử lý" : "bỏ qua"} ${selectedIds.length} báo cáo`);
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
        r.createdAt?.toDate()?.toLocaleString("vi-VN"),
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

  if (loading) return <div className="flex items-center justify-center h-screen bg-white dark:bg-black"><Loader2 className="animate-spin w-8 h-8 text-[#0A84FF]" /></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-screen bg-white dark:bg-black text-red-500 text-xl font-semibold">403 - Không có quyền</div>;

  const filteredReports = useMemo(() => reports.filter(r => {
    const s = search.toLowerCase();
    return r.targetName.toLowerCase().includes(s) ||
           r.targetShortId.toLowerCase().includes(s) ||
           r.fromName.toLowerCase().includes(s) ||
           r.note?.toLowerCase().includes(s);
  }), [reports, search]);

  const filteredAppeals = useMemo(() => appeals.filter(a => {
    const s = search.toLowerCase();
    return a.userName.toLowerCase().includes(s) ||
           a.appealText.toLowerCase().includes(s);
  }), [appeals, search]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black pb-24">
      <Toaster position="top-center" />

      <AnimatePresence>
        {confirmModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmModal({show: false, type: ""})}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border-[#E5E5E7] dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  confirmModal.type === "resolved"? "bg-[#FFE5E5] dark:bg-[#FF3B30]/20" :
                  confirmModal.type === "unban"? "bg-[#E8F5E9] dark:bg-[#34C759]/20" :
                  confirmModal.type === "approved"? "bg-[#E8F5E9] dark:bg-[#34C759]/20" :
                  confirmModal.type === "delete"? "bg-[#FFE5E5] dark:bg-[#FF3B30]/20" :
                  "bg-[#F2F2F7] dark:bg-zinc-800"
                }`}>
                  {confirmModal.type === "resolved" && <Ban className="w-7 h-7 text-[#FF3B30]" />}
                  {confirmModal.type === "unban" && <Unlock className="w-7 h-7 text-[#34C759]" />}
                  {confirmModal.type === "approved" && <CheckCircle className="w-7 h-7 text-[#34C759]" />}
                  {confirmModal.type === "rejected" && <XCircle className="w-7 h-7 text-[#8E8E93]" />}
                  {confirmModal.type === "delete" && <Trash2 className="w-7 h-7 text-[#FF3B30]" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1.5 text-[#1C1C1E] dark:text-white">
                    {confirmModal.bulk? `${confirmModal.type === "resolved"? "Xử lý" : "Bỏ qua"} ${selectedIds.length} báo cáo?` :
                     confirmModal.type === "resolved"? `Xử lý @${confirmModal.report?.targetShortId}?` :
                     confirmModal.type === "unban"? `Gỡ ban cho @${confirmModal.report?.targetShortId}?` :
                     confirmModal.type === "approved"? `Chấp nhận kháng cáo của @${confirmModal.appeal?.userName}?` :
                     confirmModal.type === "rejected" && confirmModal.appeal? `Từ chối kháng cáo của @${confirmModal.appeal?.userName}?` :
                     confirmModal.type === "delete"? `Xoá task "${confirmModal.report?.targetName}"?` :
                     "Bỏ qua báo cáo?"}
                  </h3>
                  <p className="text-sm text-[#8E8E93] dark:text-zinc-400 leading-relaxed">
                    {confirmModal.type === "resolved" && confirmModal.violationCount === 1 && "Lần 1: Cảnh cáo user"}
                    {confirmModal.type === "resolved" && confirmModal.violationCount === 2 && "Lần 2: Ban 3 ngày"}
                    {confirmModal.type === "resolved" && confirmModal.violationCount === 3 && "Lần 3: Ban 7 ngày"}
                    {confirmModal.type === "resolved" && (confirmModal.violationCount || 0) >= 4 && `Lần ${confirmModal.violationCount}: Ban vĩnh viễn`}
                    {confirmModal.type === "unban" && "User sẽ được gỡ ban ngay lập tức"}
                    {confirmModal.type === "approved" && "User sẽ được gỡ ban ngay lập tức"}
                    {confirmModal.type === "rejected" && "Báo cáo/Kháng cáo sẽ được đánh dấu đã xử lý"}
                    {confirmModal.type === "delete" && "Hành động này không thể hoàn tác. Task sẽ bị xoá vĩnh viễn."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({show: false, type: ""})}
                  disabled={!!actionLoading}
                  className="flex-1 px-4 py-3 bg-[#F2F2F7] dark:bg-zinc-800 hover:bg-[#E5E5EA] dark:hover:bg-zinc-700 rounded-2xl font-semibold text-[#1C1C1E] dark:text-white disabled:opacity-50 transition-all active:scale-95"
                >
                  Hủy
                </button>
                <button
     onClick={() => {
  console.log('Modal confirm:', confirmModal); // Debug
  
  if (confirmModal.bulk) {
    handleBulkAction(confirmModal.type as any);
  } else if (confirmModal.type === "unban") {
    handleUnban(confirmModal.report!.targetId, confirmModal.report!.targetShortId);
  } else if (confirmModal.type === "delete") {
    handleDeleteTask(confirmModal.report!.targetId, confirmModal.report!.targetName);
  } else if (confirmModal.type === "approved") {
    executeAppeal(confirmModal.appeal!, confirmModal.type as any);
  } else if (confirmModal.type === "rejected") {
    // Tách riêng: nếu có appeal thì gọi appeal, có report thì gọi report
    if (confirmModal.appeal) {
      executeAppeal(confirmModal.appeal, confirmModal.type as any);
    } else if (confirmModal.report) {
      executeAction(confirmModal.report, confirmModal.type as any);
    }
  } else {
    executeAction(confirmModal.report!, confirmModal.type as any);
  }
}}
                  disabled={!!actionLoading}
                  className={`flex-1 px-4 py-3 ${
                    confirmModal.type === "resolved" || confirmModal.type === "delete"? "bg-[#FF3B30] hover:bg-[#FF2D20]" :
                    confirmModal.type === "unban" || confirmModal.type === "approved"? "bg-[#34C759] hover:bg-[#30B350]" :
                    "bg-[#8E8E93] hover:bg-[#7A7A7A]"
                  } text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95`}
                >
                  {actionLoading? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {confirmModal.type === "unban"? "Gỡ ban" : confirmModal.type === "delete"? "Xoá task" : "Xác nhận"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A84FF] to-[#007AFF] flex items-center justify-center shadow-lg shadow-[#0A84FF]/30">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[#1C1C1E] dark:text-white tracking-tight">
              Quản lý báo cáo
            </h1>
            <p className="text-sm text-[#8E8E93] dark:text-zinc-500 font-medium">
              Xử lý vi phạm cộng đồng
            </p>
          </div>
          <button
            onClick={handleExport}
            className="ml-auto w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5E7] dark:border-zinc-800 flex items-center justify-center active:scale-90 transition-all"
          >
            <Download className="w-5 h-5 text-[#1C1C1E] dark:text-zinc-300" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2.5 mb-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-[#E5E5E7] dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#FFF3E0] dark:bg-[#FF9500]/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#FF9500]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-0.5">{stats.pending}</p>
            <p className="text-[11px] font-medium text-[#8E8E93] dark:text-zinc-500">Chờ xử lý</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-[#E5E5E7] dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#FFE5E5] dark:bg-[#FF3B30]/20 flex items-center justify-center">
                <Ban className="w-4 h-4 text-[#FF3B30]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-0.5">{stats.resolved}</p>
            <p className="text-[11px] font-medium text-[#8E8E93] dark:text-zinc-500">Đã ban</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-[#E5E5E7] dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-[#8E8E93]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-0.5">{stats.rejected}</p>
            <p className="text-[11px] font-medium text-[#8E8E93] dark:text-zinc-500">Đã bỏ qua</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-[#E5E5E7] dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#E3F2FD] dark:bg-[#0A84FF]/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0A84FF]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-0.5">{stats.today}</p>
            <p className="text-[11px] font-medium text-[#8E8E93] dark:text-zinc-500">Hôm nay</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-[#E5E5E7] dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-[#F3E5F5] dark:bg-[#AF52DE]/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#AF52DE]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-0.5">{stats.appeals}</p>
            <p className="text-[11px] font-medium text-[#8E8E93] dark:text-zinc-500">Kháng cáo</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {(["pending", "resolved", "rejected", "appeals", "all"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all active:scale-95 ${
                tab === t
                 ? "bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/30"
                  : "bg-white dark:bg-zinc-900 text-[#1C1C1E] dark:text-zinc-300 border border-[#E5E5E7] dark:border-zinc-800"
              }`}
            >
              {t === "pending" && `Chờ xử lý ${stats.pending > 0? `(${stats.pending})` : ''}`}
              {t === "resolved" && `Đã ban ${stats.resolved > 0? `(${stats.resolved})` : ''}`}
              {t === "rejected" && `Đã bỏ qua ${stats.rejected > 0? `(${stats.rejected})` : ''}`}
              {t === "appeals" && `Kháng cáo ${stats.appeals > 0? `(${stats.appeals})` : ''}`}
              {t === "all" && "Tất cả"}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-auto w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E5E7] dark:border-zinc-800 flex items-center justify-center active:scale-90 transition-all relative"
          >
            <Filter className="w-5 h-5 text-[#1C1C1E] dark:text-zinc-300" />
            {reasonFilter!== "all" && <span className="absolute top-2 right-2 w-2 h-2 bg-[#0A84FF] rounded-full" />}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && tab!== "appeals" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5E7] dark:border-zinc-800 p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setReasonFilter("all")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${reasonFilter === "all"? "bg-[#0A84FF] text-white" : "bg-[#F2F2F7] dark:bg-zinc-800 text-[#1C1C1E] dark:text-zinc-300"}`}
                  >
                    Tất cả
                  </button>
                  {Object.entries(REASON_LABEL).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setReasonFilter(key as ReasonFilter)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${reasonFilter === key? "bg-[#0A84FF] text-white" : "bg-[#F2F2F7] dark:bg-zinc-800 text-[#1C1C1E] dark:text-zinc-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E8E93]" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, username, ghi chú..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl text-[#1C1C1E] dark:text-white placeholder-[#8E8E93] outline-none focus:ring-2 focus:ring-[#0A84FF]/30"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedIds.length > 0 && tab === "pending" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="bg-[#E3F2FD] dark:bg-[#0A84FF]/20 rounded-2xl p-4 border border-[#0A84FF]/30 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0A84FF]">
                  Đã chọn {selectedIds.length} báo cáo
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmModal({show: true, type: "resolved", bulk: true})}
                    disabled={actionLoading === "bulk"}
                    className="px-4 py-2 bg-[#FF3B30] hover:bg-[#FF2D20] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
                  >
                    Xử lý tất cả
                  </button>
                  <button
                    onClick={() => setConfirmModal({show: true, type: "rejected", bulk: true})}
                    disabled={actionLoading === "bulk"}
                    className="px-4 py-2 bg-[#8E8E93] hover:bg-[#7A7A7A] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all active:scale-95"
                  >
                    Bỏ qua tất cả
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 text-[#1C1C1E] dark:text-zinc-300 rounded-xl text-sm font-semibold border border-[#E5E5E7] dark:border-zinc-700 transition-all active:scale-95"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5">
        {tab === "appeals"? (
          filteredAppeals.length === 0? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-[#F2F2F7] dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-[#8E8E93]" />
              </div>
              <p className="text-[#8E8E93] dark:text-zinc-500 text-lg font-medium">Không có kháng cáo nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppeals.map(a => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#E5E5E7] dark:border-zinc-800 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#F3E5F5] dark:bg-[#AF52DE]/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-[#AF52DE]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-lg text-[#1C1C1E] dark:text-white mb-0.5">{a.userName}</p>
                          <p className="text-sm text-[#8E8E93] dark:text-zinc-500">{a.userEmail}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-3 py-1 bg-[#F3E5F5] dark:bg-[#AF52DE]/20 text-[#AF52DE] rounded-xl text-xs font-semibold">
                              Vi phạm lần {a.violationCount}
                            </span>
                            <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                              a.status === "pending"? "bg-[#FFF3E0] dark:bg-[#FF9500]/20 text-[#FF9500]" :
                              a.status === "approved"? "bg-[#E8F5E9] dark:bg-[#34C759]/20 text-[#34C759]" :
                              "bg-[#F2F2F7] dark:bg-zinc-800 text-[#8E8E93]"
                            }`}>
                              {a.status === "pending"? "Chờ duyệt" : a.status === "approved"? "Đã chấp nhận" : "Đã từ chối"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#8E8E93] dark:text-zinc-500 font-medium">
                          <p>{a.createdAt?.toDate()?.toLocaleDateString("vi-VN")}</p>
                          <p>{a.createdAt?.toDate()?.toLocaleTimeString("vi-VN")}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-[#FFE5E5] dark:bg-[#FF3B30]/10 rounded-2xl p-3.5 border-l-4 border-[#FF3B30]">
                          <p className="text-xs font-semibold text-[#8E8E93] dark:text-zinc-500 mb-1">Lý do bị khóa:</p>
                          <p className="text-sm font-medium text-[#FF3B30]">{a.reason}</p>
                        </div>

                        <div className="bg-[#E3F2FD] dark:bg-[#0A84FF]/10 rounded-2xl p-3.5 border-l-4 border-[#0A84FF]">
                          <p className="text-xs font-semibold text-[#8E8E93] dark:text-zinc-500 mb-1">Nội dung kháng cáo:</p>
                          <p className="text-sm text-[#1C1C1E] dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{a.appealText}</p>
                        </div>

                        {a.reviewedAt && (
                          <div className="flex items-center gap-4 text-[#8E8E93] dark:text-zinc-500 text-xs font-medium">
                            <span>Xử lý bởi: {a.reviewedByName || "Admin"}</span>
                            <span>{a.reviewedAt?.toDate()?.toLocaleString("vi-VN")}</span>
                          </div>
                        )}
                      </div>

                      {a.status === "pending" && (
                        <div className="flex gap-2.5 mt-4 pt-4 border-t border-[#E5E5E7] dark:border-zinc-800">
                          <button
                            onClick={() => setConfirmModal({
                              show: true,
                              type: "approved",
                              appeal: a
                            })}
                            disabled={actionLoading === a.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#34C759] hover:bg-[#30B350] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
                          >
                            {actionLoading === a.id? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Chấp nhận & Gỡ ban
                          </button>
                          <button
                            onClick={() => setConfirmModal({
                              show: true,
                              type: "rejected",
                              appeal: a
                            })}
                            disabled={actionLoading === a.id}
                            className="flex-1 flex items-center justify-center gap-2 bg-[#8E8E93] hover:bg-[#7A7A7A] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
                          >
                            <XCircle className="w-4 h-4" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : filteredReports.length === 0? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-[#F2F2F7] dark:bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10 text-[#8E8E93]" />
            </div>
            <p className="text-[#8E8E93] dark:text-zinc-500 text-lg font-medium">Không có báo cáo nào</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredReports.map(r => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-[#E5E5E7] dark:border-zinc-800 p-5"
                >
                  <div className="flex items-start gap-4">
                    {tab === "pending" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, r.id]);
                          else setSelectedIds(selectedIds.filter(id => id!== r.id));
                        }}
                        className="mt-1.5 w-5 h-5 rounded-lg border-[#E5E5E7] dark:border-zinc-700 text-[#0A84FF] focus:ring-[#0A84FF]"
                      />
                    )}
                    <img
                      src={r.targetAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.targetName)}&background=random`}
                      className="w-12 h-12 rounded-2xl object-cover"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="font-bold text-lg text-[#1C1C1E] dark:text-white">{r.targetName}</p>
                            <Link
                              href={`/profile/${r.targetId}`}
                              target="_blank"
                              className="text-[#0A84FF] hover:underline text-sm font-medium flex items-center gap-1"
                            >
                              @{r.targetShortId} <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${REASON_COLOR[r.reason] || REASON_COLOR.other}`}>
                              {REASON_LABEL[r.reason] || r.reason}
                            </span>
                                                      <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                              r.status === "pending"? "bg-[#FFF3E0] dark:bg-[#FF9500]/20 text-[#FF9500]" :
                              r.status === "resolved"? "bg-[#FFE5E5] dark:bg-[#FF3B30]/20 text-[#FF3B30]" :
                              "bg-[#F2F2F7] dark:bg-zinc-800 text-[#8E8E93]"
                            }`}>
                              {r.status === "pending"? "Chờ xử lý" : r.status === "resolved"? "Đã ban" : "Đã bỏ qua"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#8E8E93] dark:text-zinc-500 font-medium">
                          <p>{r.createdAt?.toDate()?.toLocaleDateString("vi-VN")}</p>
                          <p>{r.createdAt?.toDate()?.toLocaleTimeString("vi-VN")}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-sm">
                        {r.note && (
                          <div className="bg-[#F2F2F7] dark:bg-zinc-800/50 rounded-2xl p-3.5 border-l-4 border-[#0A84FF]">
                            <div className="flex items-start gap-2.5">
                              <FileText className="w-4 h-4 text-[#0A84FF] mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-[#8E8E93] dark:text-zinc-500 mb-0.5">Ghi chú từ người báo cáo:</p>
                                <p className="text-[#1C1C1E] dark:text-zinc-300 leading-relaxed">{r.note}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-[#8E8E93] dark:text-zinc-500">
                          <span className="font-medium"><b className="text-[#1C1C1E] dark:text-zinc-300">Người báo cáo:</b> {r.fromName}</span>
                        </div>
                        {r.reviewedAt && (
                          <div className="flex items-center gap-4 text-[#8E8E93] dark:text-zinc-500 text-xs font-medium">
                            <span>Xử lý bởi: {r.reviewedByName || "Admin"}</span>
                            <span>{r.reviewedAt?.toDate()?.toLocaleString("vi-VN")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {tab === "pending" && (
                    <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-[#E5E5E7] dark:border-zinc-800">
                      <button
                        onClick={() => handleAction(r, "resolved")}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-[#FF3B30] hover:bg-[#FF2D20] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
                      >
                        {actionLoading === r.id? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                        Xử lý vi phạm
                      </button>
                      {r.type === "task" && (
                        <button
                          onClick={() => setConfirmModal({
                            show: true,
                            type: "delete",
                            report: r
                          })}
                          disabled={actionLoading === r.id}
                          className="flex items-center gap-2 bg-[#FF9500] hover:bg-[#E88500] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
                        >
                          {actionLoading === r.id? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Xoá task
                        </button>
                      )}
                    <button
  onClick={() => setConfirmModal({
    show: true,
    type: "rejected",
    report: r  // Thiếu dòng này nên bấm Xác nhận không có gì
  })}
  disabled={actionLoading === r.id}
  className="flex items-center gap-2 bg-[#8E8E93] hover:bg-[#7A7A7A] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
>
  <CheckCircle className="w-4 h-4" />
  Bỏ qua
</button>
                    </div>
                  )}

                  {tab === "resolved" && (
                    <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-[#E5E5E7] dark:border-zinc-800">
                      <button
                        onClick={() => setConfirmModal({
                          show: true,
                          type: "unban",
                          report: r
                        })}
                        disabled={actionLoading === r.id}
                        className="flex items-center gap-2 bg-[#34C759] hover:bg-[#30B350] text-white px-4 py-3 rounded-2xl disabled:opacity-50 font-semibold transition-all active:scale-95"
                      >
                        {actionLoading === r.id? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                        Gỡ ban trước hạn
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3.5 bg-[#0A84FF] hover:bg-[#007AFF] text-white rounded-2xl font-semibold disabled:opacity-50 inline-flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#0A84FF]/30"
                >
                  {loadingMore? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
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
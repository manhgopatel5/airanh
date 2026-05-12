"use client"
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase"; // Đổi path nếu file bạn ở chỗ khác
import { useAuthState } from "react-firebase-hooks/auth";
import { Shield, CheckCircle, XCircle, ExternalLink, Search, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

const ADMIN_UIDS = ["xKsvMeFGeCcM4dgyMrxQmH70FBE3", "ceWtvtIxZQMgWCzYxZiB3p0mSNi1"];

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
  const auth = getFirebaseAuth(); // ← Thêm dòng này
  const db = getFirebaseDB(); // ← Thêm dòng này
  const [user, loading] = useAuthState(auth);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "reports"),
      where("status", "==", tab),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id,...d.data() } as Report)));
    });

    return unsub;
  }, [user, isAdmin, tab, db]);

  const handleAction = async (report: Report, action: "resolved" | "rejected", banDays?: number) => {
    if (!user || actionLoading) return;
    setActionLoading(report.id);

    try {
      await updateDoc(doc(db, "reports", report.id), {
        status: action,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid
      });

      if (action === "resolved") {
        const updateData: any = { banned: true };
        if (banDays) {
          const banUntil = new Date();
          banUntil.setDate(banUntil.getDate() + banDays);
          updateData.bannedUntil = banUntil;
        }
        await updateDoc(doc(db, "users", report.targetId), updateData);
        toast.success(`Đã ban @${report.targetShortId}`);
      } else {
        toast.info("Đã bỏ qua báo cáo");
      }
    } catch (err) {
      console.error(err);
      toast.error("Thao tác thất bại");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-screen text-red-500">403 - Không có quyền</div>;

  const filteredReports = reports.filter(r => 
    r.targetName.toLowerCase().includes(search.toLowerCase()) ||
    r.targetShortId.toLowerCase().includes(search.toLowerCase()) ||
    r.fromName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold">Quản lý báo cáo</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              {(["pending", "resolved", "rejected"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    tab === t 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t === "pending" && `Chờ xử lý ${tab === t ? `(${reports.length})` : ""}`}
                  {t === "resolved" && `Đã ban ${tab === t ? `(${reports.length})` : ""}`}
                  {t === "rejected" && `Đã bỏ qua ${tab === t ? `(${reports.length})` : ""}`}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            Không có báo cáo nào
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <img 
                    src={r.targetAvatar || `https://ui-avatars.com/api/?name=${r.targetName}`} 
                    className="w-12 h-12 rounded-full object-cover"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">{r.targetName}</p>
                      <Link 
                        href={`/profile/${r.targetId}`} 
                        target="_blank"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        @{r.targetShortId} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><b>Lý do:</b> {REASON_LABEL[r.reason] || r.reason}</p>
                      {r.note && <p><b>Ghi chú:</b> {r.note}</p>}
                      <p><b>Người báo cáo:</b> {r.fromName}</p>
                      <p><b>Thời gian:</b> {r.createdAt?.toDate().toLocaleString("vi-VN")}</p>
                      {r.reviewedAt && (
                        <p><b>Xử lý lúc:</b> {r.reviewedAt.toDate().toLocaleString("vi-VN")}</p>
                      )}
                    </div>
                  </div>
                </div>

                {tab === "pending" && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                    <button
                      onClick={() => handleAction(r, "resolved", 7)}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {actionLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Ban 7 ngày
                    </button>
                    <button
                      onClick={() => handleAction(r, "resolved")}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Ban vĩnh viễn
                    </button>
                    <button
                      onClick={() => handleAction(r, "rejected")}
                      disabled={actionLoading === r.id}
                      className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
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
    </div>
  )
}
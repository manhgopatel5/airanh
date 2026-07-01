"use client";

import { useEffect, useState } from "react";
import { FiX, FiUserMinus, FiUserPlus } from "react-icons/fi";
import { doc, updateDoc, arrayRemove, increment, serverTimestamp, deleteField } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import FriendPicker from "@/components/create/FriendPicker";
import { inviteFriendToPlanGroup } from "@/lib/planGroup";

type Member = {
  uid: string;
  name: string;
  avatar: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  members: Member[];
  ownerId: string;
  currentUid: string;
  allowInvite?: boolean;
  onUpdated?: () => void;
};

export default function GroupMembersModal({
  open,
  onClose,
  groupId,
  groupName,
  members,
  ownerId,
  currentUid,
  allowInvite = false,
  onUpdated,
}: Props) {
  const db = getFirebaseDB();
  const [removing, setRemoving] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const isOwner = currentUid === ownerId;
  const memberSet = new Set(members.map((m) => m.uid));
  const canInvite = allowInvite && currentUid && memberSet.has(currentUid);

  useEffect(() => {
    if (!open) {
      setShowInvite(false);
      setInviteIds([]);
    }
  }, [open]);

  const handleRemove = async (uid: string, name: string) => {
    if (!isOwner) return;
    if (uid === ownerId) return toast.error("Không thể xóa chủ nhóm");
    if (!confirm(`Xóa ${name} khỏi nhóm?`)) return;

    setRemoving(uid);
    try {
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayRemove(uid),
        admins: arrayRemove(uid),
        memberCount: increment(-1),
        [`membersInfo.${uid}`]: deleteField(),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Đã xóa ${name}`);
      onUpdated?.();
    } catch {
      toast.error("Không xóa được thành viên");
    } finally {
      setRemoving(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteIds.length || inviting) return;
    setInviting(true);
    try {
      const toInvite = inviteIds.filter((id) => !memberSet.has(id));
      for (const friendUid of toInvite) {
        await inviteFriendToPlanGroup(db, groupId, friendUid);
      }
      toast.success(`Đã mời ${toInvite.length} người vào nhóm`);
      setInviteIds([]);
      setShowInvite(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mời thất bại");
    } finally {
      setInviting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold">Thành viên</h3>
                <p className="text-xs text-zinc-500">{groupName} · {members.length} người</p>
              </div>
              <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FiX size={18} />
              </button>
            </div>

            {canInvite && (
              <div className="px-3 pt-3">
                {!showInvite ? (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF]/10 px-4 py-3 text-sm font-bold text-[#0A84FF]"
                  >
                    <FiUserPlus size={16} />
                    Mời bạn vào nhóm
                  </button>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <FriendPicker
                      userId={currentUid}
                      selectedIds={inviteIds}
                      onChange={setInviteIds}
                      accent="#0A84FF"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInvite(false);
                          setInviteIds([]);
                        }}
                        className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold dark:bg-zinc-800"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={!inviteIds.length || inviting}
                        onClick={handleInvite}
                        className="flex-1 rounded-xl bg-[#0A84FF] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {inviting ? "Đang mời..." : "Mời"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-y-auto p-3 space-y-1">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <img
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random`}
                    alt={m.name}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-xs text-zinc-500">
                      {m.uid === ownerId ? "Chủ nhóm" : m.uid === currentUid ? "Bạn" : "Thành viên"}
                    </p>
                  </div>
                  {isOwner && m.uid !== ownerId && (
                    <button
                      type="button"
                      disabled={removing === m.uid}
                      onClick={() => handleRemove(m.uid, m.name)}
                      className="h-9 px-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      <FiUserMinus size={14} />
                      {removing === m.uid ? "..." : "Xóa"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

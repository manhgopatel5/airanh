import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

export type PartnerProfile = {
  uid: string;
  name: string;
  avatar: string;
  username?: string;
};

export async function fetchPartnerProfile(uid: string): Promise<PartnerProfile> {
  if (!uid) {
    return { uid: "", name: "Người lạ", avatar: "" };
  }
  try {
    const snap = await getDoc(doc(getFirebaseDB(), "users", uid));
    const data = snap.data();
    return {
      uid,
      name: data?.displayName || data?.name || "Người lạ",
      avatar: data?.photoURL || data?.avatar || "",
      username: data?.username,
    };
  } catch {
    return { uid, name: "Người lạ", avatar: "" };
  }
}

export function partnerFromChatData(
  data: Record<string, unknown> | undefined,
  partnerId: string
): PartnerProfile {
  if (!data || !partnerId) {
    return { uid: partnerId, name: "Người lạ", avatar: "" };
  }

  const names = data.partnerNames as Record<string, string> | undefined;
  const avatars = data.partnerAvatars as Record<string, string> | undefined;

  return {
    uid: partnerId,
    name: names?.[partnerId] || (data.partnerName as string) || "Người lạ",
    avatar: avatars?.[partnerId] || (data.partnerAvatar as string) || "",
  };
}

export function unreadForUser(data: Record<string, unknown> | undefined, uid: string): number {
  const counts = data?.unreadCounts as Record<string, number> | undefined;
  return counts?.[uid] || Number(data?.unreadCount) || 0;
}

export function partnerOnline(data: Record<string, unknown> | undefined, partnerId: string): boolean {
  const status = data?.onlineStatus as Record<string, boolean> | undefined;
  return status?.[partnerId] || Boolean(data?.isPartnerOnline);
}

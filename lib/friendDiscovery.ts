import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";

export type FriendRequestStatus = "none" | "sent" | "received" | "friend";

export function getUserAvatar(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;
  const avatar =
    (data.avatar as string) ||
    (data.photoURL as string) ||
    (data.avatarUrl as string);
  return avatar || undefined;
}

export async function getMyFriendIds(db: Firestore, uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, "users", uid, "friends"));
  const ids = new Set<string>();
  for (const d of snap.docs) {
    const status = d.data().status;
    if (status === "removed") continue;
    ids.add(d.id);
  }
  return ids;
}

export async function loadPendingRequestSets(
  db: Firestore,
  uid: string
): Promise<{ sent: Set<string>; received: Set<string> }> {
  const [sentSnap, receivedSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", uid),
        where("status", "==", "pending"),
        limit(100)
      )
    ),
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("toUserId", "==", uid),
        where("status", "==", "pending"),
        limit(100)
      )
    ),
  ]);

  return {
    sent: new Set(sentSnap.docs.map((d) => d.data().toUserId as string)),
    received: new Set(receivedSnap.docs.map((d) => d.data().fromUserId as string)),
  };
}

export function resolveRequestStatus(
  uid: string,
  sent: Set<string>,
  received: Set<string>
): FriendRequestStatus {
  if (sent.has(uid)) return "sent";
  if (received.has(uid)) return "received";
  return "none";
}

export async function getFriendRequestStatus(
  db: Firestore,
  currentUid: string,
  otherUid: string
): Promise<FriendRequestStatus> {
  const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", otherUid));
  if (friendDoc.exists() && friendDoc.data()?.status !== "removed") {
    return "friend";
  }

  const [sentSnap, receivedSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", currentUid),
        where("toUserId", "==", otherUid),
        where("status", "==", "pending"),
        limit(1)
      )
    ),
    getDocs(
      query(
        collection(db, "friendRequests"),
        where("fromUserId", "==", otherUid),
        where("toUserId", "==", currentUid),
        where("status", "==", "pending"),
        limit(1)
      )
    ),
  ]);

  if (!sentSnap.empty) return "sent";
  if (!receivedSnap.empty) return "received";
  return "none";
}

export async function saveUserLocation(
  db: Firestore,
  uid: string,
  lat: number,
  lng: number
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      location: { lat, lng, updatedAt: serverTimestamp() },
    },
    { merge: true }
  );
}

export async function getMutualFriendCounts(
  db: Firestore,
  myFriendIds: Set<string>,
  candidateUids: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  candidateUids.forEach((id) => counts.set(id, 0));
  if (!myFriendIds.size || !candidateUids.length) return counts;

  const batches: string[][] = [];
  for (let i = 0; i < candidateUids.length; i += 10) {
    batches.push(candidateUids.slice(i, i + 10));
  }

  await Promise.all(
    batches.map(async (batch) => {
      const results = await Promise.all(
        batch.map(async (candidateUid) => {
          try {
            const theirFriends = await getMyFriendIds(db, candidateUid);
            let mutual = 0;
            myFriendIds.forEach((id) => {
              if (theirFriends.has(id)) mutual++;
            });
            return { candidateUid, mutual };
          } catch {
            return { candidateUid, mutual: 0 };
          }
        })
      );
      results.forEach(({ candidateUid, mutual }) => counts.set(candidateUid, mutual));
    })
  );

  return counts;
}

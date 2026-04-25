import { NextResponse } from "next/server";
import { getDocs, collection, setDoc, doc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

export async function GET() {
  const db = getFirebaseDB();
  const users = await getDocs(collection(db, "users"));
  let count = 0;

  for (const user of users.docs) {
    const data = user.data();
    if (data.shortId) {
      await setDoc(doc(db, "shortIds", data.shortId.toUpperCase()), { uid: user.id });
      count++;
    }
    if (data.username) {
      await setDoc(doc(db, "usernames", data.username.toLowerCase()), { uid: user.id });
      count++;
    }
  }

  return NextResponse.json({ success: true, migrated: count });
}
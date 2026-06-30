import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PlanSlugRedirect({ params }: Props) {
  const { slug } = await params;

  const snap = await adminDb()
    .collection("tasks")
    .where("slug", "==", slug)
    .where("type", "==", "plan")
    .limit(1)
    .get();

  if (snap.empty) {
    notFound();
  }

  const doc = snap.docs[0];
  if (!doc) notFound();
  redirect(`/task/${doc.id}`);
}

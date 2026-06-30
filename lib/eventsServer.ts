import { adminDb } from "@/lib/firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";
import type { EventItem } from "@/data/events";

type RatingAgg = { total: number; count: number };

function serializeEvent(
  id: string,
  data: DocumentData,
  countMap: Record<string, number>,
  ratingMap: Record<string, RatingAgg>
): EventItem {
  const ratingData = ratingMap[id];
  const avgFromReviews = ratingData
    ? Number((ratingData.total / ratingData.count).toFixed(1))
    : 0;
  const reviewCount = ratingData?.count ?? 0;

  const joined =
    typeof data.joined === "number"
      ? data.joined
      : typeof data.checkinCount === "number"
        ? data.checkinCount
        : countMap[id] || 0;

  const rating =
    typeof data.rating === "number" && data.rating > 0
      ? data.rating
      : avgFromReviews;

  const reviews =
    typeof data.reviews === "number" && data.reviews > 0
      ? data.reviews
      : reviewCount;

  return {
    id,
    title: data.title || data.name || "",
    name: data.name || data.title || "",
    tag: data.tag || "NEW",
    tagColor: data.tagColor || "from-blue-500 to-cyan-500",
    desc: data.desc || data.description || "",
    description: data.description || data.desc || "",
    image: data.image || data.imageUrl || "",
    imageUrl: data.imageUrl || data.image || "",
    icon: data.icon || "🎉",
    category: data.category || "other",
    province: data.province || "",
    address: data.address || "",
    openTime: data.openTime || "",
    price: data.price || "Free",
    tips: Array.isArray(data.tips) ? data.tips : [],
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    mapUrl: data.mapUrl || "",
    lat: data.lat != null ? Number(data.lat) : undefined,
    lng: data.lng != null ? Number(data.lng) : undefined,
    joined,
    rating,
    reviews,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  } as EventItem;
}

export async function getActiveEvents(): Promise<EventItem[]> {
  const db = adminDb();
  const eventsSnap = await db.collection("events").where("isActive", "==", true).get();

  if (eventsSnap.empty) return [];

  const needsCheckins = eventsSnap.docs.some(
    (d) => d.data().joined == null && d.data().checkinCount == null
  );
  const needsReviews = eventsSnap.docs.some(
    (d) => d.data().rating == null || d.data().reviews == null
  );

  const countMap: Record<string, number> = {};
  const ratingMap: Record<string, RatingAgg> = {};

  const [checkinsSnap, reviewsSnap] = await Promise.all([
    needsCheckins ? db.collection("checkins").select("eventId").get() : null,
    needsReviews ? db.collection("reviews").select("eventId", "rating").get() : null,
  ]);

  checkinsSnap?.docs.forEach((doc) => {
    const eventId = doc.data().eventId as string;
    if (eventId) countMap[eventId] = (countMap[eventId] || 0) + 1;
  });

  reviewsSnap?.docs.forEach((doc) => {
    const { eventId, rating } = doc.data();
    if (!eventId) return;
    if (!ratingMap[eventId]) ratingMap[eventId] = { total: 0, count: 0 };
    ratingMap[eventId].total += Number(rating) || 0;
    ratingMap[eventId].count += 1;
  });

  return eventsSnap.docs
    .map((doc) => serializeEvent(doc.id, doc.data(), countMap, ratingMap))
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
}

export async function syncEventStats(eventId: string): Promise<void> {
  const db = adminDb();
  const [checkinsSnap, reviewsSnap] = await Promise.all([
    db.collection("checkins").where("eventId", "==", eventId).select().get(),
    db.collection("reviews").where("eventId", "==", eventId).get(),
  ]);

  let rating = 0;
  let reviews = 0;
  if (!reviewsSnap.empty) {
    let total = 0;
    reviewsSnap.docs.forEach((doc) => {
      total += Number(doc.data().rating) || 0;
    });
    reviews = reviewsSnap.size;
    rating = Number((total / reviews).toFixed(1));
  }

  await db.collection("events").doc(eventId).set(
    {
      joined: checkinsSnap.size,
      checkinCount: checkinsSnap.size,
      rating,
      reviews,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

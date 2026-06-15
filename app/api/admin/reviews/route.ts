export async function POST(request: Request) {
  try {
    const { eventId, userId, rating, comment } = await request.json();
    if (!eventId ||!userId ||!rating) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = adminDb();
    const reviewId = `${eventId}_${userId}`;
    const eventRef = db.collection('events').doc(eventId);

    // Dùng transaction để update atomic
    await db.runTransaction(async (t) => {
      const eventSnap = await t.get(eventRef);
      if (!eventSnap.exists) throw new Error('Event not found');

      const reviewRef = db.collection('reviews').doc(reviewId);
      const oldReviewSnap = await t.get(reviewRef);
      const oldRating = oldReviewSnap.exists? oldReviewSnap.data()?.rating : 0;

      const data = eventSnap.data() || {};
      const currentTotal = (data.rating || 0) * (data.reviews || 0);
      const currentCount = data.reviews || 0;

      let newCount = currentCount;
      let newTotal = currentTotal;

      if (oldRating > 0) {
        // Update: trừ rating cũ, cộng rating mới
        newTotal = newTotal - oldRating + Number(rating);
      } else {
        // New: cộng rating mới, tăng count
        newTotal = newTotal + Number(rating);
        newCount = newCount + 1;
      }

      const newAvg = newCount > 0? Number((newTotal / newCount).toFixed(1)) : 0;

      t.set(reviewRef, {
        eventId,
        userId,
        rating: Number(rating),
        comment: comment || '',
        createdAt: oldReviewSnap.exists? oldReviewSnap.data()?.createdAt : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      t.update(eventRef, {
        rating: newAvg,
        reviews: newCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/admin/reviews error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}
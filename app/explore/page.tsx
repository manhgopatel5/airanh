import type { EventItem } from "@/data/events";
import { getActiveEvents } from "@/lib/eventsServer";
import ExploreClient from "./ExploreClient";

export const revalidate = 60;

export default async function ExplorePage() {
  let initialEvents: EventItem[] = [];

  try {
    initialEvents = await getActiveEvents();
  } catch (error) {
    console.error("Failed to prefetch explore events:", error);
  }

  return <ExploreClient initialEvents={initialEvents} />;
}

import { useQuery } from "@tanstack/react-query";
import { eventContentQuery } from "@/lib/event-content";
import { targetedAnnouncements } from "@/lib/content-rules";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

// Shows staff updates aimed at a division or hall on the pages where they apply.
export function TargetedAnnouncements(target: { divisionIds?: (string | null | undefined)[]; areaIds?: (string | null | undefined)[] }) {
  const { data } = useQuery(eventContentQuery);
  if (!data) return null;
  return <AnnouncementBanner announcements={targetedAnnouncements(data.announcements, target)} />;
}

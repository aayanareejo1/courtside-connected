import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { eventContentQuery } from "@/lib/event-content";
import { generalAnnouncements } from "@/lib/content-rules";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/announcements")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(eventContentQuery); },
  head: () => ({ meta: [
    { title: "Announcements — Courtside Connected" },
    { name: "description", content: "Every staff announcement for this event, urgent first." },
    { property: "og:title", content: "Announcements — Courtside Connected" },
    { property: "og:description", content: "Every staff announcement for this event, urgent first." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AnnouncementsPage,
  errorComponent: () => <p role="alert">{t.search.error}</p>,
});

function AnnouncementsPage() {
  const { data } = useSuspenseQuery(eventContentQuery);
  const all = generalAnnouncements(data.announcements);
  return <div className="space-y-4">
    <Link to="/" className="tap inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />{t.nav.home}</Link>
    {all.length ? <AnnouncementBanner announcements={all} /> : <p className="text-muted-foreground">{t.announcements.empty}</p>}
  </div>;
}

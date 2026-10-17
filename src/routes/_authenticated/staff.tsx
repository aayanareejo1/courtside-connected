import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteAnnouncement, loadStaff, saveAnnouncement } from "@/lib/admin.functions";
import { torontoInput, torontoTimestamp } from "@/lib/admin-rules";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [
    { title: "Post an announcement · Courtside Connected" },
    { name: "description", content: "OVA staff post event announcements for participants." },
    { property: "og:title", content: "Post an announcement · Courtside Connected" },
    { property: "og:description", content: "OVA staff post event announcements for participants." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: StaffPage,
});

const fieldClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-base";

function StaffPage() {
  const load = useServerFn(loadStaff);
  const save = useServerFn(saveAnnouncement);
  const remove = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["staff"], queryFn: () => load(), retry: false });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"info" | "important" | "urgent">("info");
  const [target, setTarget] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  if (q.isLoading) return <p role="status">{t.admin.loading}</p>;
  if (q.error || !q.data) return <div className="space-y-4 py-6"><p role="alert">{t.admin.denied}</p><Button className="tap" variant="outline" onClick={signOut}>{t.admin.signOut}</Button></div>;
  const { event, announcements, divisions, halls } = q.data;
  const targetName = (a: { division_id: string | null; area_id: string | null }) =>
    divisions.find((d) => d.id === a.division_id)?.name ?? halls.find((h) => h.id === a.area_id)?.name ?? t.admin.everyone;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const [kind, id] = target.split(":");
      await save({ data: {
        event_id: event.id, title, body, severity,
        starts_at: torontoTimestamp(start), ends_at: torontoTimestamp(end),
        division_id: kind === "division" ? id! : null, area_id: kind === "hall" ? id! : null, published: true,
      } });
      setTitle(""); setBody(""); setSeverity("info"); setTarget("all"); setStart(""); setEnd("");
      setMessage(t.admin.posted);
      await Promise.all([qc.invalidateQueries({ queryKey: ["staff"] }), qc.invalidateQueries({ queryKey: ["event-content"] })]);
    } catch (err) { setMessage(err instanceof Error && err.message.includes("End must") ? t.admin.endAfterStart : t.admin.error); }
    finally { setBusy(false); }
  }
  async function del(id: string) {
    if (!window.confirm(t.admin.confirmDelete)) return;
    try {
      await remove({ data: { id, event_id: event.id } });
      setMessage(t.admin.deleted);
      await Promise.all([qc.invalidateQueries({ queryKey: ["staff"] }), qc.invalidateQueries({ queryKey: ["event-content"] })]);
    } catch { setMessage(t.admin.error); }
  }

  return <div className="space-y-8 py-4">
    <header className="flex items-start justify-between gap-3">
      <div><p className="text-muted-foreground">{event.name}</p><h1 className="text-4xl font-bold uppercase">{t.admin.postTitle}</h1></div>
      <Button variant="outline" className="tap h-11" onClick={signOut}>{t.admin.signOut}</Button>
    </header>
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-card p-4">
      <label className="block space-y-2"><span className="font-medium">{t.admin.titleField}</span><Input className="h-11" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block space-y-2"><span className="font-medium">{t.admin.body}</span><Textarea rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} /></label>
      <label className="block space-y-2"><span className="font-medium">{t.admin.severity}</span>
        <select className={fieldClass} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
          <option value="info">{t.announcements.info}</option><option value="important">{t.announcements.important}</option><option value="urgent">{t.announcements.urgent}</option>
        </select></label>
      <label className="block space-y-2"><span className="font-medium">{t.admin.showTo}</span>
        <select className={fieldClass} value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="all">{t.admin.everyone}</option>
          <optgroup label={t.admin.division}>{divisions.map((d) => <option key={d.id} value={`division:${d.id}`}>{d.name}</option>)}</optgroup>
          <optgroup label={t.admin.hall}>{halls.map((h) => <option key={h.id} value={`hall:${h.id}`}>{h.name}</option>)}</optgroup>
        </select></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2"><span className="font-medium">{t.admin.start}</span><Input className="h-11" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block space-y-2"><span className="font-medium">{t.admin.end}</span><Input className="h-11" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <p className="text-sm text-muted-foreground">{t.admin.timesHint}</p>
      <Button disabled={busy} className="tap h-11 w-full">{t.admin.publish}</Button>
      {message && <p role="status" aria-live="polite" className="font-medium">{message}</p>}
    </form>
    <section aria-labelledby="posted">
      <h2 id="posted" className="text-2xl font-bold uppercase">{t.admin.announcements}</h2>
      {!announcements.length ? <p className="mt-2 text-muted-foreground">{t.admin.empty}</p> :
        <ul className="mt-2 space-y-2">{announcements.map((a) => <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-card p-3">
          <div className="min-w-0"><p className="font-semibold">{a.title}</p>
            <p className="text-sm text-muted-foreground">{targetName(a)}{a.ends_at ? ` · ${t.admin.until} ${torontoInput(a.ends_at).replace("T", " ")}` : ""}</p></div>
          <Button variant="outline" className="tap h-11 shrink-0" onClick={() => del(a.id)} aria-label={`${t.admin.remove}: ${a.title}`}>{t.admin.remove}</Button>
        </li>)}</ul>}
    </section>
  </div>;
}

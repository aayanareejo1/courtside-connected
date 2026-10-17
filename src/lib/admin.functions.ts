import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { announcementSchema } from "@/lib/admin-rules";

type Ctx = { supabase: { rpc: (fn: "is_staff", args: { _user_id: string }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string };
async function assertStaff(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error || data !== true) throw new Error("Staff access required");
}

export const loadStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertStaff(context as unknown as Ctx);
  const db = context.supabase;
  const { data: event, error } = await db.from("events").select("id,name,venue_id").eq("published", true).limit(1).single();
  if (error) throw error;
  const [announcements, divisions, halls] = await Promise.all([
    db.from("announcements").select("id,title,body,severity,starts_at,ends_at,published,division_id,area_id,created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
    db.from("divisions").select("id,name").eq("event_id", event.id).order("name"),
    db.from("areas").select("id,name").eq("venue_id", event.venue_id ?? "").eq("kind", "hall").order("name"),
  ]);
  for (const r of [announcements, divisions, halls]) if (r.error) throw r.error;
  return { event, announcements: announcements.data ?? [], divisions: divisions.data ?? [], halls: halls.data ?? [] };
});

export const saveAnnouncement = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => announcementSchema.parse(input)).handler(async ({ data, context }) => {
  await assertStaff(context as unknown as Ctx);
  const db = context.supabase;
  const { data: event } = await db.from("events").select("id,venue_id").eq("id", data.event_id).single();
  if (!event) throw new Error("Event not found");
  if (data.division_id) {
    const { data: d } = await db.from("divisions").select("event_id").eq("id", data.division_id).single();
    if (d?.event_id !== event.id) throw new Error("Division must belong to this event");
  }
  if (data.area_id) {
    const { data: a } = await db.from("areas").select("venue_id").eq("id", data.area_id).single();
    if (a?.venue_id !== event.venue_id) throw new Error("Hall must belong to this venue");
  }
  const row = { event_id: data.event_id, title: data.title, body: data.body, severity: data.severity, starts_at: data.starts_at, ends_at: data.ends_at, division_id: data.division_id, area_id: data.area_id, published: data.published };
  const result = data.id
    ? await db.from("announcements").update(row).eq("id", data.id).eq("event_id", data.event_id).select("id").single()
    : await db.from("announcements").insert(row).select("id").single();
  if (result.error) throw result.error;
  return { ok: true };
});

export const deleteAnnouncement = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: z.string().uuid(), event_id: z.string().uuid() })).handler(async ({ data, context }) => {
  await assertStaff(context as unknown as Ctx);
  const result = await context.supabase.from("announcements").delete().eq("id", data.id).eq("event_id", data.event_id).select("id").single();
  if (result.error) throw result.error;
  return { ok: true };
});

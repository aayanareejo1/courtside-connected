import { z } from "zod";

export const staffAllowed = (roles: string[]) => roles.some((role) => role === "staff" || role === "admin");
const id = z.string().uuid();
const timestamp = z.string().datetime().nullable();

// One simple announcement form: optional division or hall target, no approval flow.
export const announcementSchema = z.object({
  id: id.optional(),
  event_id: id,
  title: z.string().trim().min(1, "Add a title").max(120),
  body: z.string().trim().max(1000).default(""),
  severity: z.enum(["info", "important", "urgent"]),
  starts_at: timestamp,
  ends_at: timestamp,
  division_id: id.nullable(),
  area_id: id.nullable(),
  published: z.boolean(),
}).refine((v) => !v.starts_at || !v.ends_at || Date.parse(v.ends_at) > Date.parse(v.starts_at), "End must be after start")
  .refine((v) => !(v.division_id && v.area_id), "Choose a division or a hall, not both");
export type AnnouncementInput = z.infer<typeof announcementSchema>;

// Date inputs use Toronto venue clocks, independently of the staff device timezone.
export function torontoInput(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
export function torontoTimestamp(input: string): string | null {
  if (!input) return null;
  const utc = Date.parse(`${input}:00Z`);
  for (const offset of [4, 5]) {
    const candidate = new Date(utc + offset * 3600000).toISOString();
    if (torontoInput(candidate) === input) return candidate;
  }
  throw new Error("Invalid Toronto time");
}

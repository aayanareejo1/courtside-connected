import { describe, expect, it } from "vitest";
import { announcementSchema, staffAllowed, torontoTimestamp } from "@/lib/admin-rules";
import { generalAnnouncements, targetedAnnouncements } from "@/lib/content-rules";
const event_id = "00000000-0000-4000-8000-000000000001";
const div = "00000000-0000-4000-8000-000000000002";
const hall = "00000000-0000-4000-8000-000000000003";
const base = { event_id, title: "Update", body: "", severity: "info", starts_at: null, ends_at: null, division_id: null, area_id: null, published: true };
describe("staff announcement rules", () => {
  it("only staff or admin roles count as staff", () => {
    expect(staffAllowed(["staff"])).toBe(true);
    expect(staffAllowed(["user"])).toBe(false);
  });
  it("rejects reversed windows", () => {
    expect(announcementSchema.safeParse({ ...base, starts_at: "2026-10-17T14:00:00Z", ends_at: "2026-10-17T13:00:00Z" }).success).toBe(false);
  });
  it("allows a division or a hall target but not both", () => {
    expect(announcementSchema.safeParse({ ...base, division_id: div }).success).toBe(true);
    expect(announcementSchema.safeParse({ ...base, division_id: div, area_id: hall }).success).toBe(false);
  });
  it("requires a title", () => {
    expect(announcementSchema.safeParse({ ...base, title: "  " }).success).toBe(false);
  });
  it("converts venue clocks in summer and winter", () => {
    expect(torontoTimestamp("2026-10-17T09:00")).toBe("2026-10-17T13:00:00.000Z");
    expect(torontoTimestamp("2026-12-17T09:00")).toBe("2026-12-17T14:00:00.000Z");
  });
});
describe("announcement targeting", () => {
  const rows = [{ id: "all", division_id: null, area_id: null }, { id: "d", division_id: div, area_id: null }, { id: "h", division_id: null, area_id: hall }];
  it("home shows only untargeted updates", () => {
    expect(generalAnnouncements(rows).map((r) => r.id)).toEqual(["all"]);
  });
  it("division updates show only for that division", () => {
    expect(targetedAnnouncements(rows, { divisionIds: [div] }).map((r) => r.id)).toEqual(["d"]);
    expect(targetedAnnouncements(rows, { divisionIds: ["other"] })).toEqual([]);
  });
  it("hall updates show only for courts in that hall", () => {
    expect(targetedAnnouncements(rows, { areaIds: [hall] }).map((r) => r.id)).toEqual(["h"]);
  });
});

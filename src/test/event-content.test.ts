import { describe, expect, it } from "vitest";
import { activeAnnouncements, safeExternalUrl } from "@/lib/content-rules";

describe("event announcements", () => {
  const now = Date.parse("2026-10-17T19:57:00Z");
  const base = { published: true, starts_at: null, ends_at: null, severity: "info" };
  it("does not expose unpublished announcements", () => {
    expect(activeAnnouncements([{ ...base, published: false }], now)).toEqual([]);
  });
  it("shows only announcements within their active window", () => {
    const active = { ...base, starts_at: "2026-10-17T19:57:00Z", ends_at: "2026-10-17T20:00:00Z" };
    expect(activeAnnouncements([active, { ...base, starts_at: "2026-10-18T00:00:00Z" }, { ...base, ends_at: "2026-10-17T19:57:00Z" }], now)).toEqual([active]);
  });
  it("prioritizes urgent and important announcements", () => {
    expect(activeAnnouncements([base, { ...base, severity: "important" }, { ...base, severity: "urgent" }], now).map((a) => a.severity)).toEqual(["urgent", "important", "info"]);
  });
});

describe("outbound event links", () => {
  it("allows web links but never executable schemes", () => {
    expect(safeExternalUrl("https://example.com/parking")).toBe("https://example.com/parking");
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,test")).toBeUndefined();
  });
});
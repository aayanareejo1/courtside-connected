import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { activeAnnouncements } from "@/lib/content-rules";

afterEach(cleanup);

const rows = [
  { id: "1", title: "Court 9 doors open", body: "Use the east entrance.", severity: "info", created_at: "2026-10-18T12:00:00Z", published: true, starts_at: null, ends_at: null },
  { id: "2", title: "Hall B evacuation drill", body: "Follow staff directions.", severity: "urgent", created_at: "2026-10-18T11:00:00Z", published: true, starts_at: null, ends_at: null },
  { id: "3", title: "Raffle draw at 6 pm", body: "Near the main desk.", severity: "important", created_at: "2026-10-18T13:00:00Z", published: true, starts_at: null, ends_at: null },
];

describe("Announcement list presentation", () => {
  it("shows urgent first, then most recent, marked only with the word Urgent", () => {
    const ordered = activeAnnouncements(rows, Date.parse("2026-10-18T14:00:00Z"));
    expect(ordered.map((a) => a.id)).toEqual(["2", "3", "1"]);
    render(<AnnouncementBanner announcements={ordered} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]!).getByText("Urgent")).toBeDefined();
    expect(within(items[0]!).getByText("Hall B evacuation drill")).toBeDefined();
    expect(screen.queryByText("Event update")).toBeNull();
    expect(screen.queryByText("Important")).toBeNull();
  });
  it("shows a small grey Toronto time for each announcement", () => {
    render(<AnnouncementBanner announcements={[rows[0]!]} />);
    const time = screen.getByText(/Oct 18/);
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe("2026-10-18T12:00:00Z");
  });
  it("renders nothing when there are no announcements", () => {
    const { container } = render(<AnnouncementBanner announcements={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

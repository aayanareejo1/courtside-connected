import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import type { EventData } from "@/lib/event-data";
import * as calendar from "@/lib/calendar";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
const data = { teams: [{ id: "a", name: "Team A" }, { id: "b", name: "A very long opponent name" }], players: [], courts: [{ id: "c", label: "13" }] } as unknown as EventData;
const matches = [{ id: "one", home_team_id: "a", away_team_id: "b", court_id: "c", start_at: "2026-04-19T17:00:00Z", est_duration_min: 60, status: "scheduled" }, { id: "two", home_team_id: "a", away_team_id: "b", court_id: "d", start_at: "2026-04-19T17:30:00Z", est_duration_min: 60, status: "scheduled" }] as EventData["matches"];
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("schedule views", () => {
  it("retains every match and buildCalendar leave time when switching views", () => {
    render(<ScheduleCalendar data={data} matches={matches} follows={[{ type: "team", id: "a" }]} />);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("12:45 p.m.")).toBeDefined();
    expect(screen.getAllByText("Clash")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Day view" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("12:45 p.m.")).toBeDefined();
    expect(screen.getByText("Go here first")).toBeDefined();
  });
  it("exports all followed matches through the existing download helper", () => {
    const download = vi.spyOn(calendar, "downloadIcs").mockImplementation(() => {});
    render(<ScheduleCalendar data={data} matches={matches} follows={[{ type: "team", id: "a" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));
    expect(download).toHaveBeenCalledWith("ovachamps-my-schedule.ics", expect.stringContaining("X-WR-CALNAME:OVAchamps"));
    const payload = download.mock.calls[0]?.[1] ?? "";
    expect(payload.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});

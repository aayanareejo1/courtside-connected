import { describe, expect, it } from "vitest";
import { pairInitials } from "@/lib/privacy";
import { arrivalTime } from "@/lib/schedule";
describe("minor privacy", () => {
  it("shows beach pairs as initials only", () => {
    expect(pairInitials("E.Kent Elmido/J.Reyes")).toBe("E.E. / J.R.");
    expect(pairInitials("H.Mccracken/V.Mccracken")).toBe("H.M. / V.M.");
  });
});
describe("OVA 5-5 warm-up arrival", () => {
  it("arrives 15 minutes before start (10 warm-up + 5 walk)", () => {
    expect(arrivalTime("2026-04-20T14:00:00Z", 10, 5).toISOString()).toBe("2026-04-20T13:45:00.000Z");
  });
});

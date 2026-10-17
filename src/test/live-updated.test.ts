import { describe, expect, it } from "vitest";
import { updatedLabel } from "@/components/LiveUpdated";

describe("updated label", () => {
  it("says just now under 10 seconds", () => expect(updatedLabel(0, 9_000)).toBe("Updated just now"));
  it("counts seconds under a minute", () => expect(updatedLabel(0, 42_000)).toBe("Updated 42s ago"));
  it("counts minutes after that", () => expect(updatedLabel(0, 125_000)).toBe("Updated 2 min ago"));
});

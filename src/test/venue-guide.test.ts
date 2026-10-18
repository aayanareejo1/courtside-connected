import { describe, expect, it } from "vitest";
import { areaFeature, floorPlanUrl } from "@/lib/venue";

describe("venue guide", () => {
  it("uses the area kind for halls, warm up and meeting rooms", () => {
    expect(areaFeature("hall", "Hall 1")).toBe("hall");
    expect(areaFeature("warmup", "Hall 2 warm up")).toBe("warmup");
    expect(areaFeature("meeting", "Meeting Room A")).toBe("meeting");
  });
  it("tells other areas apart by name", () => {
    expect(areaFeature("other", "Washrooms")).toBe("washroom");
    expect(areaFeature("other", "Main entrance")).toBe("entrance");
    expect(areaFeature("other", "Food court")).toBe("food");
    expect(areaFeature("other", "Registration desk")).toBe("registration");
    expect(areaFeature("other", "Lost and found")).toBe("other");
  });
  it("only accepts https or app file floor plans", () => {
    expect(floorPlanUrl("/floor-plan.png")).toBe("/floor-plan.png");
    expect(floorPlanUrl("https://x.example/plan.png")).toBe("https://x.example/plan.png");
    expect(floorPlanUrl("http://x.example/plan.png")).toBeNull();
    expect(floorPlanUrl(null)).toBeNull();
  });
});

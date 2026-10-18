import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const demo = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/clock", () => ({ isDemoClock: () => demo.on }));
vi.mock("@tanstack/react-router", () => ({ useLocation: () => ({ pathname: "/courts/5", href: "/courts/5" }) }));
import { DemoBanner, DEMO_BANNER_TEXT, exitDemoHref } from "@/components/DemoBanner";

afterEach(() => { cleanup(); demo.on = false; });

describe("Demo banner", () => {
  it("is hidden when the demo clock is off", () => {
    render(<DemoBanner />);
    expect(screen.queryByText(DEMO_BANNER_TEXT)).toBeNull();
  });
  it("shows the exact text and an Exit demo link to the same page with demo=0", async () => {
    demo.on = true;
    render(<DemoBanner />);
    expect(await screen.findByText("Demo mode: showing the event as of 12:30 PM, April 19")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Exit demo" }).getAttribute("href")).toBe("/courts/5?demo=0");
  });
  it("keeps other query values and replaces demo=1", () => {
    expect(exitDemoHref("/search", "?q=storm&demo=1")).toBe("/search?q=storm&demo=0");
  });
});

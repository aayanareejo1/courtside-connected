import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AskWidget, openAsk } from "@/components/AskWidget";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, variant: _v, size: _s, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: string; size?: string }) =>
    asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));
vi.mock("@/lib/clock", () => ({ appNow: () => 1 }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("floating Ask Courtside chat", () => {
  it("starts closed and opens from the button in the corner, then closes with Escape", () => {
    render(<AskWidget />);
    const button = screen.getByRole("button", { name: "Ask" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("ask-panel")!.hidden).toBe(true);
    fireEvent.click(button);
    expect(document.getElementById("ask-panel")!.hidden).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.getElementById("ask-panel")!.hidden).toBe(true);
  });
  it("opens and sends a question when something in the app calls openAsk", async () => {
    const fetchMock = vi.fn(async (_url?: unknown) => new Response(JSON.stringify({ answer: "Court 9, Hall 1", links: [], mode: "ai" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AskWidget />);
    act(() => openAsk("Where is court 9?"));
    expect(document.getElementById("ask-panel")!.hidden).toBe(false);
    await screen.findByText("Court 9, Hall 1");
    await waitFor(() => expect(fetchMock.mock.calls.filter((c: unknown[]) => String(c[0]).includes("/api/public/ask"))).toHaveLength(1));
  });
});

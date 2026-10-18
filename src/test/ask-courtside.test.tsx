import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AskCourtside, MAX_EXCHANGES } from "@/components/AskCourtside";
import { ASK_INTRO, ASK_SUGGESTIONS } from "@/lib/ask-courtside";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild, variant: _v, size: _s, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: string; size?: string }) =>
    asChild ? <>{children}</> : <button {...props}>{children}</button>,
}));
vi.mock("@/lib/clock", () => ({ appNow: () => 1234 }));

const reply = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
const send = (q: string) => { fireEvent.change(screen.getByLabelText("Your question"), { target: { value: q } }); fireEvent.click(screen.getByRole("button", { name: "Send question" })); };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("Ask Courtside screen", () => {
  it("shows the intro and four starter chips", () => {
    render(<AskCourtside />);
    expect(screen.getByText(ASK_INTRO)).toBeTruthy();
    for (const s of ASK_SUGGESTIONS) expect(screen.getByRole("button", { name: s })).toBeTruthy();
  });

  it("posts question, follows and now to the endpoint only", async () => {
    localStorage.setItem("courtside-follows", JSON.stringify([{ type: "team", id: "T1" }]));
    const fetchMock = reply(200, { answer: "Hi", links: [], mode: "ai" }); vi.stubGlobal("fetch", fetchMock);
    render(<AskCourtside />);
    send("Where is court 5?");
    await screen.findByText("Hi");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/public/ask");
    expect(JSON.parse(init.body as string)).toEqual({ question: "Where is court 5?", follows: [{ type: "team", id: "T1" }], now: 1234 });
    expect(localStorage.length).toBe(1);
  });

  it("renders markdown links safely, link buttons and the basic note", async () => {
    vi.stubGlobal("fetch", reply(200, { answer: "Buy [tickets](https://t.example/x) now.", links: [{ title: "Tickets", url: "https://t.example/x" }], mode: "basic" }));
    render(<AskCourtside />);
    send("tickets?");
    const inline = await screen.findByRole("link", { name: "tickets (opens in a new tab)" });
    expect(inline.getAttribute("target")).toBe("_blank");
    expect(inline.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "Tickets (opens in a new tab)" }).getAttribute("href")).toBe("https://t.example/x");
    expect(screen.getByText("Basic answer")).toBeTruthy();
  });

  it("shows a typing indicator while waiting", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => { resolve = r; })));
    render(<AskCourtside />);
    send("hello");
    expect(screen.getByRole("status", { name: "Ask Courtside is typing" })).toBeTruthy();
    resolve(new Response(JSON.stringify({ answer: "Done", links: [], mode: "ai" }), { status: 200 }));
    await screen.findByText("Done");
    expect(screen.queryByRole("status", { name: "Ask Courtside is typing" })).toBeNull();
  });

  it.each([
    [429, "Please wait a minute and try again."],
    [400, "Please ask a shorter question (300 characters or fewer)."],
    [503, "Ask Courtside is busy right now. Please try again shortly."],
  ])("shows a friendly message for HTTP %i", async (status, message) => {
    vi.stubGlobal("fetch", reply(status, { error: "x" }));
    render(<AskCourtside />);
    send("q");
    expect((await screen.findByRole("alert")).textContent).toBe(message);
  });

  it("shows a friendly message when offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    render(<AskCourtside />);
    send("q");
    expect((await screen.findByRole("alert")).textContent).toContain("check your connection");
  });

  it("caps the box at 300 characters with a counter", () => {
    render(<AskCourtside />);
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "x".repeat(350) } });
    expect(screen.getByText("300/300")).toBeTruthy();
  });

  it("keeps only the last 5 exchanges", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => new Response(JSON.stringify({ answer: `A:${JSON.parse(init.body as string).question}`, links: [], mode: "ai" }), { status: 200 })));
    render(<AskCourtside />);
    for (let i = 1; i <= 6; i++) { send(`q${i}`); await screen.findByText(`A:q${i}`); }
    await waitFor(() => expect(screen.queryByText("A:q1")).toBeNull());
    expect(screen.getAllByText(/^A:q/)).toHaveLength(MAX_EXCHANGES);
  });
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VoiceCall } from "@/components/VoiceCall";

const live = vi.hoisted(() => ({ onEvent: undefined as ((event: { type: string; links?: unknown }) => void) | undefined, history: undefined as unknown, start: vi.fn(), stop: vi.fn() }));
vi.mock("@/hooks/use-live-voice", () => ({ useLiveVoice: (options: { onEvent: typeof live.onEvent; history: unknown }) => {
  live.onEvent = options.onEvent;
  live.history = options.history;
  return { status: "connected", muted: false, start: live.start, stop: live.stop, audioRef: { current: null }, setMuted: vi.fn() };
} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("passes current chat context to the call and exposes verified answer links", () => {
  const onEnd = vi.fn();
  const history = [{ question: "Where is Aayan A playing?", answer: "Lakeshore Storm 13U" }];
  render(<VoiceCall onEnd={onEnd} history={history} />);
  expect(live.history).toEqual(history);
  act(() => live.onEvent?.({ type: "app.event.links", links: [{ title: "Tickets", url: "https://tickets.example/buy?qty=3" }, { title: "Unsafe", url: "javascript:alert(1)" }] }));
  expect(screen.getByRole("link", { name: /Tickets/ }).getAttribute("href")).toBe("https://tickets.example/buy?qty=3");
  expect(screen.queryByRole("link", { name: /Unsafe/ })).toBeNull();
  act(() => live.onEvent?.({ type: "app.delegation.pending" }));
  expect(screen.queryByRole("link", { name: /Tickets/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "End voice mode" }));
  expect(live.stop).toHaveBeenCalled();
  expect(onEnd).toHaveBeenCalledOnce();
});
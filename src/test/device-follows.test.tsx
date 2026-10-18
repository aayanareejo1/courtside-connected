import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { followsKey, parseFollows, useFollows } from "@/lib/follows";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Device-only follows without an account", () => {
  it("persists team and player follows locally, synchronizes controls, removes locally, and sends no requests", () => {
    const fetchSpy = vi.fn(() => { throw new Error("Following must not use the network"); });
    vi.stubGlobal("fetch", fetchSpy);
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "send");
    const beacon = vi.fn(); vi.stubGlobal("navigator", { ...navigator, sendBeacon: beacon });
    const first = renderHook(() => useFollows());
    const second = renderHook(() => useFollows());
    act(() => first.result.current.toggle({ type: "team", id: "team" }));
    act(() => first.result.current.toggle({ type: "player", id: "player" }));
    expect(JSON.parse(localStorage.getItem(followsKey) ?? "[]")).toEqual([{ type: "team", id: "team" }, { type: "player", id: "player" }]);
    expect(second.result.current.follows).toEqual(first.result.current.follows);
    first.unmount(); second.unmount();
    const restored = renderHook(() => useFollows());
    expect(restored.result.current.follows).toEqual([{ type: "team", id: "team" }, { type: "player", id: "player" }]);
    act(() => restored.result.current.toggle({ type: "team", id: "team" }));
    expect(parseFollows(localStorage.getItem(followsKey))).toEqual([{ type: "player", id: "player" }]);
    act(() => restored.result.current.toggle({ type: "player", id: "player" }));
    expect(parseFollows(localStorage.getItem(followsKey))).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled(); expect(xhr).not.toHaveBeenCalled(); expect(beacon).not.toHaveBeenCalled();
  });
  it("rejects malformed data and deduplicates saved follows", () => {
    expect(parseFollows("invalid")).toEqual([]);
    expect(parseFollows(JSON.stringify([{ type: "team", id: "x" }, { type: "team", id: "x" }, { type: "admin", id: "x" }]))).toEqual([{ type: "team", id: "x" }]);
  });
  it("keeps controls synchronized across storage events", () => {
    const hook = renderHook(() => useFollows());
    act(() => { localStorage.setItem(followsKey, JSON.stringify([{ type: "player", id: "external" }])); window.dispatchEvent(new StorageEvent("storage", { key: followsKey })); });
    expect(hook.result.current.follows).toEqual([{ type: "player", id: "external" }]);
  });
  it("retains in-memory follows when storage writes are blocked but reads work", () => {
    localStorage.clear();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Device storage blocked"); });
    const first = renderHook(() => useFollows()); const second = renderHook(() => useFollows());
    act(() => first.result.current.toggle({ type: "team", id: "memory-team" }));
    expect(first.result.current.follows).toEqual([{ type: "team", id: "memory-team" }]);
    expect(second.result.current.follows).toEqual([{ type: "team", id: "memory-team" }]);
    act(() => second.result.current.toggle({ type: "team", id: "memory-team" }));
    expect(first.result.current.follows).toEqual([]);
  });
});

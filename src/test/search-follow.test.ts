import { describe, expect, it } from "vitest";
import { matchesSearch, playerName } from "@/lib/search";
import { parseFollows } from "@/lib/follows";

describe("Search", () => {
  it("matches accents and partial team names regardless of case", () => {
    expect(matchesSearch("ÉTOILE 15u", "Etoile Volleyball 15U Blue")).toBe(true);
    expect(matchesSearch("17u", "Etoile Volleyball 15U Blue")).toBe(false);
  });
  it("matches a jersey alongside a team name", () => {
    expect(matchesSearch("skyline #12", "Alex B.", 12, "Toronto Skyline")).toBe(true);
    expect(matchesSearch("skyline #19", "Alex B.", 12, "Toronto Skyline")).toBe(false);
  });
  it("shows minors as First L. only", () => {
    expect(playerName("Alex Bennett")).toBe("Alex B.");
    expect(playerName("Alex B.")).toBe("Alex B.");
  });
});

describe("Device follows", () => {
  it("restores player and team follows without an account", () => {
    expect(parseFollows('[{"type":"team","id":"skyline"},{"type":"player","id":"alex"}]')).toEqual([{ type: "team", id: "skyline" }, { type: "player", id: "alex" }]);
  });
  it("ignores damaged data and duplicates", () => {
    expect(parseFollows("broken")).toEqual([]);
    expect(parseFollows('[{"type":"team","id":"skyline"},{"type":"team","id":"skyline"},{"type":"admin","id":"a"}]')).toEqual([{ type: "team", id: "skyline" }]);
  });
});

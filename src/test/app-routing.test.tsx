import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each(["/venue", "/info", "/following"])("keeps the participant page available at %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).toBe(path);
  });

  it.each(["/admin/login", "/admin/announcements", "/admin/settings"])("does not expose the old staff workspace at %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).toBe(rootRouteId);
  });
  it("puts the staff announcement page behind the sign-in gate", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const ids = router.matchRoutes("/staff").map((m) => m.routeId);
    expect(ids).toContain("/_authenticated");
  });
});

// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss, tsConfigPaths,
// nitro (build-only, cloudflare target), VITE_* env injection, @ alias and dedupe. Do not add them again.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { liveVoiceDev } from "./live-vite-plugin";

export default defineConfig({
  tanstackStart: {
    importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
    // Redirect TanStack Start's bundled server entry to src/server.ts (SSR error wrapper + /api/live voice relay).
    server: { entry: "server" },
  },
  vite: { plugins: [liveVoiceDev()] },
});

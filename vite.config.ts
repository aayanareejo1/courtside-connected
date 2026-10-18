// Standalone Vite config (replaces @lovable.dev/vite-tanstack-config).
// Plugin order matters: tailwind, tsconfig paths, TanStack Start, Nitro (build only), React.
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Expose VITE_* variables to the browser bundle at build time.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define = Object.fromEntries(Object.entries(env).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]));

  return {
    define,
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
    server: { host: "::", port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Server-only code must never be imported into the browser bundle.
        importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        server: { entry: "server" },
      }),
      // Cloudflare Workers output; override with NITRO_PRESET for another host.
      ...(command === "build" ? [nitro({ preset: process.env["NITRO_PRESET"] || "cloudflare-module", cloudflare: { nodeCompat: true, deployConfig: true, wrangler: { name: "courtside-connected", observability: { logs: { enabled: true } } } } })] : []),
      viteReact(),
    ],
  };
});

import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [preact(), tailwindcss()],
  build: {
    outDir: isSsrBuild ? "dist/server" : "dist/client",
    manifest: !isSsrBuild,
    rollupOptions: isSsrBuild
      ? {
          input: "src/server/worker.tsx",
          output: { entryFileNames: "worker.js" },
        }
      : undefined,
  },
  ssr: { noExternal: true },
  define: isSsrBuild
    ? {
        __CLIENT_ASSETS__: JSON.stringify(
          JSON.parse(readFileSync("dist/client/.vite/manifest.json", "utf8"))[
            "index.html"
          ],
        ),
      }
    : {},
}));

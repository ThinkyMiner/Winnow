import { crx, type ManifestV3Export } from "@crxjs/vite-plugin";
import { defineConfig } from "vitest/config";
import manifest from "./manifest.json" with { type: "json" };

export default defineConfig({
  plugins: [crx({ manifest: manifest as ManifestV3Export })],
  build: {
    // Onboarding is not referenced by the manifest; register it as an extra page.
    rollupOptions: { input: { onboarding: "src/onboarding/index.html" } },
  },
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});

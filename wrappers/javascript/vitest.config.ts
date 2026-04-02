import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [viteTsConfigPaths()],
  test: {
    testTimeout: 120000,
    watch: false,
    setupFiles: ["indy-vdr-nodejs/tests/setup.ts"],
  },
});

import { defineConfig } from "vite";
import { resolve } from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "DistrictLookup",
      fileName: "district-lookup",
      formats: ["iife"],
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});

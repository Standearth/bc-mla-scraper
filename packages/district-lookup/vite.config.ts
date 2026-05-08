import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "DistrictLookup", // Exposes the tool globally as window.DistrictLookup
      fileName: "district-lookup",
      formats: ["iife"], // Immediately Invoked Function Expression (perfect for <script> tags)
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});

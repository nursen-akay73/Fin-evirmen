import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "pages",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: "components/hero/main.jsx",
      output: {
        format: "es",
        entryFileNames: "hero-app.js",
        chunkFileNames: "hero-app-[name].js",
        assetFileNames: "hero-app.[ext]",
        inlineDynamicImports: true,
      },
    },
  },
});

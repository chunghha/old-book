import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: false,
    host: true,
  },
  preview: {
    port: 5174,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});

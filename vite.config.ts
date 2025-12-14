import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  plugins: [tailwindcss()],
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

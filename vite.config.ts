import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  base: command === "build" ? "./" : "/",
  build: {
    outDir: "dist"
  }
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Saat development tanpa Docker, /api diteruskan ke backend lokal.
// Di dalam container, peran ini diambil alih oleh Nginx (lihat nginx.conf).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});

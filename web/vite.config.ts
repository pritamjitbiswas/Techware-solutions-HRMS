import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      // Docker Desktop on Windows doesn't reliably forward native filesystem
      // events for bind-mounted volumes, so chokidar's default watcher never
      // fires. Polling works around it.
      usePolling: true,
      interval: 300,
    },
  },
});

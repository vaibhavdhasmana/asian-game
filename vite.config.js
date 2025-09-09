import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all addresses so LAN devices can connect
    allowedHosts: true,
    port: 5173,
  },
});

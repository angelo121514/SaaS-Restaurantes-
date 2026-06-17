import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    // Split heavy, stable dependencies into their own chunks so they cache
    // independently and don't bloat the per-route code-split chunks.
    rollupOptions: {
      output: {
        manualChunks: {
          // React core + router
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Charts (only used by Reports/Analytics dashboards)
          charts: ["recharts"],
          // PDF export libs (only used by a single button in RestaurantSettings)
          pdf: ["jspdf", "html2canvas"],
          // QR code generation (only used by RestaurantSettings)
          qr: ["qrcode.react"],
          // Client-side crypto for password hashing
          crypto: ["crypto-js"],
          // Icons
          icons: ["lucide-react"],
        },
      },
    },
  },
});

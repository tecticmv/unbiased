import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries into separate chunks
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-recharts": ["recharts"],
          "vendor-framer": ["framer-motion"],
          "vendor-radix": [
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-separator",
            "@radix-ui/react-label",
            "@radix-ui/react-progress",
            "@radix-ui/react-slot",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
          ],
          "vendor-i18n": [
            "i18next",
            "react-i18next",
            "i18next-browser-languagedetector",
          ],
          "vendor-markdown": ["react-markdown"],
          "vendor-icons": ["lucide-react"],
          "vendor-forms": [
            "react-hook-form",
            "@hookform/resolvers",
            "zod",
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
});

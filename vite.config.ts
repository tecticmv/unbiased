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

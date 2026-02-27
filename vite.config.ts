// vite.config.ts  —  전체 코드 (최종)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ✅ 아래 build 설정만 추가
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
}));

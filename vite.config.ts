// ============================================================
// vite.config.ts  —  전체 코드 (최종)
// ============================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// ✅ 빌드 시 pdf.worker.min.mjs 를 public 폴더에 자동 복사하는 플러그인
function copyPdfWorkerPlugin() {
  return {
    name: 'copy-pdf-worker',
    buildStart() {
      const src  = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
      const dest = path.resolve(__dirname, 'public/pdf.worker.min.mjs');
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log('✅ pdf.worker.min.mjs → public/ 복사 완료');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    copyPdfWorkerPlugin(),   // ✅ 추가
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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

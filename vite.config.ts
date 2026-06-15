// ============================================================
// vite.config.ts  —  전체 코드 (최종)
// ============================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    copyPdfWorkerPlugin(),   // ✅ 추가
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/": path.resolve(__dirname, "./src/"),
    },
  },
  build: {
    modulePreload: {
      resolveDependencies(filename, deps, context) {
        if (context.hostType !== 'html') return deps;
        const deferUntilWorkspaceOpen = [
          'audio-tools',
          'chart-tools',
          'document-tools',
          'pptxgen',
          'jspdf',
          'pdf-lib',
          'html2canvas',
          'pdfjs',
        ];
        return deps.filter((dep) => !deferUntilWorkspaceOpen.some((chunk) => dep.includes(chunk)));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('pptxgenjs')) return 'pptxgen';
          if (id.includes('jspdf')) return 'jspdf';
          if (id.includes('pdf-lib')) return 'pdf-lib';
          if (id.includes('html2canvas')) return 'html2canvas';
          if (id.includes('/docx/') || id.includes('/mammoth/') || id.includes('/file-saver/')) {
            return 'document-tools';
          }
          if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/')) {
            return 'chart-tools';
          }
          if (id.includes('/meyda/') || id.includes('@vercel/blob')) {
            return 'audio-tools';
          }
          if (id.includes('@supabase/supabase-js')) return 'supabase';
          if (id.includes('@google/generative-ai') || id.includes('@ai-sdk/') || id.includes('/ai/')) {
            return 'ai-sdk';
          }
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('@tanstack/react-query')) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui/') || id.includes('lucide-react') || id.includes('framer-motion') || id.includes('sonner')) {
            return 'ui-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
}));

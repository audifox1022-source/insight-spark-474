import { defineConfig, loadEnv } from "vite";
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

export default defineConfig(({ mode }) => {
  // ✅ Vite 내장 loadEnv를 사용하여 .env 파일을 로드합니다.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        // ✅ 로컬 개발 시 Vercel Function 역할을 대신 수행하는 프록시 설정
        '/api/gemini-proxy': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini-proxy/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                  try {
                    const payload = JSON.parse(body);
                    const model = payload.model || 'gemini-1.5-flash';
                    // loadEnv로 로드한 API 키 사용
                    const apiKey = env.GEMINI_API_KEY;
                    
                    proxyReq.path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    
                    proxyReq.setHeader('Content-Type', 'application/json');
                    proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
                    proxyReq.write(body);
                    proxyReq.end();
                  } catch (e) {
                    console.error('Proxy Error:', e);
                  }
                });
              }
            });
          }
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
  };
});

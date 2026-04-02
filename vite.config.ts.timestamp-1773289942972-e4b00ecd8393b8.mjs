// vite.config.ts
import { defineConfig } from "file:///C:/Users/TW_User/.gemini/antigravity/scratch/Work%20AI/insight-spark-474/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/TW_User/.gemini/antigravity/scratch/Work%20AI/insight-spark-474/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/TW_User/.gemini/antigravity/scratch/Work%20AI/insight-spark-474/node_modules/lovable-tagger/dist/index.js";
import fs from "fs";
var __vite_injected_original_dirname = "C:\\Users\\TW_User\\.gemini\\antigravity\\scratch\\Work AI\\insight-spark-474";
function copyPdfWorkerPlugin() {
  return {
    name: "copy-pdf-worker",
    buildStart() {
      const src = path.resolve(__vite_injected_original_dirname, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
      const dest = path.resolve(__vite_injected_original_dirname, "public/pdf.worker.min.mjs");
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log("\u2705 pdf.worker.min.mjs \u2192 public/ \uBCF5\uC0AC \uC644\uB8CC");
      }
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    copyPdfWorkerPlugin()
    // ✅ 추가
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  },
  optimizeDeps: {
    include: ["pdfjs-dist"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUV19Vc2VyXFxcXC5nZW1pbmlcXFxcYW50aWdyYXZpdHlcXFxcc2NyYXRjaFxcXFxXb3JrIEFJXFxcXGluc2lnaHQtc3BhcmstNDc0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUV19Vc2VyXFxcXC5nZW1pbmlcXFxcYW50aWdyYXZpdHlcXFxcc2NyYXRjaFxcXFxXb3JrIEFJXFxcXGluc2lnaHQtc3BhcmstNDc0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9UV19Vc2VyLy5nZW1pbmkvYW50aWdyYXZpdHkvc2NyYXRjaC9Xb3JrJTIwQUkvaW5zaWdodC1zcGFyay00NzQvdml0ZS5jb25maWcudHNcIjsvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuLy8gdml0ZS5jb25maWcudHMgIFx1MjAxNCAgXHVDODA0XHVDQ0I0IFx1Q0Y1NFx1QjREQyAoXHVDRDVDXHVDODg1KVxyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcclxuXHJcbi8vIFx1MjcwNSBcdUJFNENcdUI0REMgXHVDMkRDIHBkZi53b3JrZXIubWluLm1qcyBcdUI5N0MgcHVibGljIFx1RDNGNFx1QjM1NFx1QzVEMCBcdUM3OTBcdUIzRDkgXHVCQ0Y1XHVDMEFDXHVENTU4XHVCMjk0IFx1RDUwQ1x1QjdFQ1x1QURGOFx1Qzc3OFxyXG5mdW5jdGlvbiBjb3B5UGRmV29ya2VyUGx1Z2luKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnY29weS1wZGYtd29ya2VyJyxcclxuICAgIGJ1aWxkU3RhcnQoKSB7XHJcbiAgICAgIGNvbnN0IHNyYyAgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbm9kZV9tb2R1bGVzL3BkZmpzLWRpc3QvYnVpbGQvcGRmLndvcmtlci5taW4ubWpzJyk7XHJcbiAgICAgIGNvbnN0IGRlc3QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAncHVibGljL3BkZi53b3JrZXIubWluLm1qcycpO1xyXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhzcmMpICYmICFmcy5leGlzdHNTeW5jKGRlc3QpKSB7XHJcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKHNyYywgZGVzdCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBwZGYud29ya2VyLm1pbi5tanMgXHUyMTkyIHB1YmxpYy8gXHVCQ0Y1XHVDMEFDIFx1QzY0NFx1QjhDQycpO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiBcIjo6XCIsXHJcbiAgICBwb3J0OiA4MDgwLFxyXG4gICAgaG1yOiB7XHJcbiAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgbW9kZSA9PT0gXCJkZXZlbG9wbWVudFwiICYmIGNvbXBvbmVudFRhZ2dlcigpLFxyXG4gICAgY29weVBkZldvcmtlclBsdWdpbigpLCAgIC8vIFx1MjcwNSBcdUNEOTRcdUFDMDBcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygncGRmanMtZGlzdCcpKSByZXR1cm4gJ3BkZmpzJztcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybiAndmVuZG9yJztcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogWydwZGZqcy1kaXN0J10sXHJcbiAgfSxcclxufSkpO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBR0EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxPQUFPLFFBQVE7QUFQZixJQUFNLG1DQUFtQztBQVV6QyxTQUFTLHNCQUFzQjtBQUM3QixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixhQUFhO0FBQ1gsWUFBTSxNQUFPLEtBQUssUUFBUSxrQ0FBVyxrREFBa0Q7QUFDdkYsWUFBTSxPQUFPLEtBQUssUUFBUSxrQ0FBVywyQkFBMkI7QUFDaEUsVUFBSSxHQUFHLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxXQUFXLElBQUksR0FBRztBQUM5QyxXQUFHLGFBQWEsS0FBSyxJQUFJO0FBQ3pCLGdCQUFRLElBQUksb0VBQXNDO0FBQUEsTUFDcEQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsSUFDWDtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQWlCLGdCQUFnQjtBQUFBLElBQzFDLG9CQUFvQjtBQUFBO0FBQUEsRUFDdEIsRUFBRSxPQUFPLE9BQU87QUFBQSxFQUNoQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLEdBQUcsU0FBUyxZQUFZLEVBQUcsUUFBTztBQUN0QyxjQUFJLEdBQUcsU0FBUyxjQUFjLEVBQUcsUUFBTztBQUFBLFFBQzFDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsWUFBWTtBQUFBLEVBQ3hCO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K

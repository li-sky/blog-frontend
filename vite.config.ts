import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { editorDemoSession } from "./demo/devSession";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080';
  return {
  optimizeDeps: {
    // jSquash loads its WebAssembly binary at runtime inside a module worker.
    exclude: ["@jsquash/webp"],
  },

  worker: {
    format: "es",
  },

  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: env.DEV_ASSET_PROXY_TARGET || 'http://127.0.0.1:80', changeOrigin: true },
    },
  },

  plugins: [
    react(),
    ...(env.VITE_EDITOR_DEMO === 'true' ? [editorDemoSession(apiTarget, env.EDITOR_DEMO_USER, env.EDITOR_DEMO_PASSWORD, Number(env.EDITOR_DEMO_POST_ID || 1))] : []),

    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: "gzip",
      ext: ".gz",
    }),
  ],

  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  resolve: {
    // ProseMirror nodes must share the same model/state constructors.
    dedupe: ["prosemirror-model", "prosemirror-state", "prosemirror-view", "prosemirror-transform"],
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  };
});

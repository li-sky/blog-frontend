import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
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
  },

  plugins: [
    react(),

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
});

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },

  plugins: [
    react(),

    visualizer({
      open: true, 
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

    rollupOptions: {
      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        entryFileNames: "static/js/[name]-[hash].js",
        assetFileNames: "static/[ext]/[name]-[hash].[ext]",

        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router")
            ) {
              return "react-vendor";
            }
            return "vendor";
          }
        },
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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

    // rollupOptions: {
    //   output: {
    //     chunkFileNames: "static/js/[name]-[hash].js",
    //     entryFileNames: "static/js/[name]-[hash].js",
    //     assetFileNames: "static/[ext]/[name]-[hash].[ext]",

    //     manualChunks(id) {
    //       if (id.includes("node_modules")) {
    //         // React and core dependencies must be in a separate chunk
    //         if (
    //           id.includes("react") ||
    //           id.includes("react-dom") ||
    //           id.includes("react-router")
    //         ) {
    //           return "react-vendor";
    //         }
    //         // Animation library depends on React, so needs its own chunk after react
    //         if (id.includes("framer-motion")) {
    //           return "framer-vendor";
    //         }
    //         // Milkdown and related editors
    //         if (id.includes("@milkdown") || id.includes("milkdown")) {
    //           return "editor-vendor";
    //         }
    //         // Everything else
    //         return "vendor";
    //       }
    //     },
    //   },
    // },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

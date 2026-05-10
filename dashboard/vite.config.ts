import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three/fiber")) return "r3f-vendor";
          if (id.includes("@react-three/drei")) return "drei-vendor";
          if (id.includes("three/examples/jsm")) return "three-extras";
          if (id.includes("/three/")) {
            return "three-core";
          }
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});

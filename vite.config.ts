import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          const pathParts = id.split("node_modules/")[1]?.split("/");
          if (!pathParts?.length) {
            return undefined;
          }

          const packageName = pathParts[0].startsWith("@") ? `${pathParts[0]}/${pathParts[1]}` : pathParts[0];
          return `vendor-${packageName.replace("@", "").replace("/", "-")}`;
        },
      },
    },
  },
}));

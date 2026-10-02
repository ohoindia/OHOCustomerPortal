import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL(".", import.meta.url)),
    "VITE_",
  );
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_TARGET || "http://localhost:3000",
          changeOrigin: true,
          configure(proxy) {
            // The browser calls Vite on the same origin. The server-to-server
            // request does not need browser CORS; authentication is still enforced.
            proxy.on("proxyReq", (request) => request.removeHeader("origin"));
          },
        },
      },
      fs: {
        allow: [
          fileURLToPath(new URL(".", import.meta.url)),
          fileURLToPath(new URL("../common", import.meta.url)),
        ],
      },
    },
  };
});

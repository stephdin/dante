import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The proxy follows the PORT the server reads from server/.env.
  const serverEnv = loadEnv(mode, resolve(import.meta.dirname, "server"), "")
  const serverPort = serverEnv.PORT || "3000"

  return {
    plugins: [react({ compiler: { logDiagnostics: true } }), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      proxy: { "/api": `http://localhost:${serverPort}` },
    },
  }
})

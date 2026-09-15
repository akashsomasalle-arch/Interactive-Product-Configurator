import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const obfuscate = process.env.OBFUSCATE === "1";

export default defineConfig({
  plugins: [react()],
  publicDir: "assets",
  server: {
    host: true,
    open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: obfuscate ? false : true,
  },
});

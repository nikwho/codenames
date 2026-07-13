import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Local `npm run dev` → "/". Production build (VPS) → "/codenames/".
// Override with VITE_BASE_PATH if needed (must end with "/").
export default defineConfig(({ mode }) => {
  const baseFromEnv = process.env.VITE_BASE_PATH;
  const base =
    baseFromEnv ??
    (mode === "production" ? "/codenames/" : "/");

  return {
    plugins: [react()],
    base,
    server: {
      host: true,
      port: 5173
    }
  };
});

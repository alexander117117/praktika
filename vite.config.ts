import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Regex-anchored so it never rewrites scoped packages like "@supabase/…".
    alias: [{ find: /^@\//, replacement: "/src/" }],
  },
});

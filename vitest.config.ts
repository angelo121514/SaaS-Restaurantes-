import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@services": resolve(__dirname, "./src/services"),
      "@config": resolve(__dirname, "./src/config"),
      "@utils": resolve(__dirname, "./src/utils"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    css: true,
    include: [
      "src/tests/unit/**/*.test.{ts,tsx}",
      "src/tests/integration/**/*.test.{ts,tsx}",
      "src/tests/security/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", "src/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "src/tests/**",
        "src/config/supabase.ts", // mock client, no vale la pena testear
        "**/*.d.ts",
        "vite.config.ts",
        "vitest.config.ts",
      ],
      thresholds: {
        // Metas de cobertura Fase 0 (subir en Fase 2)
        // services: 70%, pages críticas: 50%, ui: 30%
        lines: 30,
        functions: 30,
        branches: 25,
        statements: 30,
      },
    },
  },
});

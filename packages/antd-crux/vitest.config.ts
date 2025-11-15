import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/test-setup.ts"],
    typecheck: {
      enabled: true,
    },
    dir: "./tests",
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: ["antd"],
        },
      },
    },
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        testTimeout: 60000,
        setupFiles: ["./test/customMatchers.ts"],
        exclude: ["**/test/performance/**", "**/node_modules/**"]
    }
});

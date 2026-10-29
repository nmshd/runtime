import { fileURLToPath } from "node:url";
import { createVitestConfig } from "../../vitest.shared.mts";

const root = fileURLToPath(new URL(".", import.meta.url));

export default createVitestConfig(root, {
    maxWorkers: 1,
    include: ["test/performance/**/*.test.ts"],
    setupFiles: ["./test/customMatchers.ts"],
    exclude: []
});

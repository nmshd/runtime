import { fileURLToPath } from "node:url";
import { createVitestConfig } from "../../vitest.shared.mts";

const root = fileURLToPath(new URL(".", import.meta.url));

export default createVitestConfig(root, {
    maxWorkers: 5,
    setupFiles: []
});

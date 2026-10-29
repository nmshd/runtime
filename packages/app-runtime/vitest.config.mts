import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createVitestConfig } from "../../vitest.shared.mts";

const root = fileURLToPath(new URL(".", import.meta.url));

export default createVitestConfig(root, {
    maxWorkers: 5,
    aliases: {
        "@verifiables/request-converter": resolve(root, "../../node_modules/@verifiables/request-converter/dist/index.js"),
        "webcrypto-core": resolve(root, "../../node_modules/webcrypto-core/build/webcrypto-core.js")
    },
    setupFiles: ["./test/customMatchers.ts"]
});

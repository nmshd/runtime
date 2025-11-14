import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({
    tsconfig: "./test/tsconfig.json"
});

export default {
    ...presetConfig,
    collectCoverageFrom: ["./src/**"],
    coverageProvider: "v8",
    coverageReporters: ["text-summary", "cobertura", "lcov"],
    maxWorkers: 5,
    setupFilesAfterEnv: ["jest-expect-message"],
    testEnvironment: "node",
    testPathIgnorePatterns: ["/test/performance/", "/node_modules/"],
    testTimeout: 60000
} satisfies Config;

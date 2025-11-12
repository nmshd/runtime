import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({
    tsconfig: "test/tsconfig.json"
});

export default {
    ...presetConfig,
    collectCoverageFrom: ["./src/**"],
    coverageProvider: "v8",
    coverageReporters: ["text-summary", "cobertura", "lcov"],
    maxWorkers: 5,
    preset: "ts-jest",
    setupFilesAfterEnv: ["./test/customMatchers.ts", "jest-expect-message"],
    testEnvironment: "node",
    testPathIgnorePatterns: ["/test/performance/", "/node_modules/"],
    testTimeout: 60000,
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    }
} satisfies Config;

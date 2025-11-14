import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const presetConfig = createDefaultEsmPreset({
    collectCoverageFrom: ["./src/**"],
    coverageProvider: "v8",
    coverageReporters: ["text-summary", "cobertura", "lcov"],
    maxWorkers: 5,
    setupFilesAfterEnv: ["jest-expect-message"],
    testEnvironment: "node",
    testTimeout: 60000
});

export default {
    ...presetConfig
} satisfies Config;

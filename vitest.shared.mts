import { resolve } from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

interface WorkspaceOptions {
    maxWorkers: number;
    setupFiles?: string[];
    aliases?: Record<string, string>;
    include?: string[];
    exclude?: string[];
}

export function createVitestConfig(root: string, options: WorkspaceOptions) {
    return defineConfig({
        root,
        // Vitest uses Vite's transform pipeline. unplugin-swc connects that pipeline to SWC, and @swc/core performs the transform.
        // SWC reads this tsconfig so legacy decorators and emitDecoratorMetadata keep working for the runtime's dependency injection.
        plugins: [swc.vite({ tsconfigFile: resolve(root, "test/tsconfig.json") })],
        resolve: {
            alias: options.aliases
        },
        test: {
            environment: "node",
            globals: true,
            include: options.include ?? ["test/**/*.test.ts"],
            exclude: options.exclude,
            setupFiles: [resolve(root, "../../vitest.setup.mts"), ...(options.setupFiles ?? [])],
            testTimeout: process.env.NODE_OPTIONS?.includes("inspect") ? 1_000_000_000 : 60_000,
            hookTimeout: 60_000,
            maxWorkers: options.maxWorkers,
            coverage: {
                provider: "v8",
                include: ["src/**/*.ts"],
                reporter: ["text-summary", "cobertura", "lcov"]
            }
        }
    });
}

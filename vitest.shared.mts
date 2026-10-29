import { basename, relative, resolve } from "node:path";
import { defineConfig } from "vitest/config";

interface WorkspaceOptions {
    maxWorkers: number;
    setupFiles?: string[];
    aliases?: Record<string, string>;
    include?: string[];
    exclude?: string[];
}

export function createVitestConfig(root: string, options: WorkspaceOptions) {
    const buildRoot = resolve(root, "../../.vitest-build/packages", basename(root));
    const buildRootRelative = relative(root, buildRoot);

    return defineConfig({
        root,
        resolve: {
            alias: options.aliases
        },
        test: {
            environment: "node",
            globals: true,
            include: options.include ?? [`${buildRootRelative}/test/**/*.test.js`],
            exclude: options.exclude,
            setupFiles: [
                resolve(root, "../../vitest.setup.mts"),
                ...(options.setupFiles ?? []).map((file) => resolve(buildRoot, file.replace(/^\.\//, "").replace(/\.ts$/, ".js")))
            ],
            testTimeout: process.env.NODE_OPTIONS?.includes("inspect") ? 1_000_000_000 : 60_000,
            hookTimeout: 60_000,
            maxWorkers: options.maxWorkers,
            coverage: {
                provider: "v8",
                include: [`${buildRootRelative}/src/**/*.js`],
                reporter: ["text-summary", "cobertura", "lcov"]
            }
        }
    });
}

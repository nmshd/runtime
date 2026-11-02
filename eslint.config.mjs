// @ts-check

import { configs } from "@js-soft/eslint-config-ts";
import { globalIgnores } from "eslint/config";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
    globalIgnores(["**/Schemas.ts", "**/dist", "**/scripts", "**/coverage", "**/.vitest-build", "**/node_modules", "eslint.config.mjs"]),
    {
        extends: [configs.base],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json", "./packages/*/test/tsconfig.json"]
            }
        },
        files: ["**/*.ts"],
        rules: {
            "@typescript-eslint/switch-exhaustiveness-check": ["error", { allowDefaultCaseForExhaustiveSwitch: true, considerDefaultExhaustiveForUnions: true }]
        }
    },
    {
        files: ["packages/**/test/**/*.ts"],
        extends: [vitest.configs.env],
        plugins: { vitest },
        rules: {
            ...vitest.configs.recommended.rules,
            "vitest/expect-expect": [
                "error",
                {
                    assertFunctionNames: [
                        "expect",
                        "verify",
                        "expectValid*",
                        "*.expectThrows*",
                        "expectValid*",
                        "*.expectThrows*",
                        "Then.*",
                        "*.expectPublishedEvents",
                        "*.expectLastPublishedEvent",
                        "*.executeTests",
                        "expectThrows*"
                    ]
                }
            ],
            "vitest/max-nested-describe": ["error", { max: 4 }],
            "vitest/no-conditional-in-test": "off",
            "vitest/no-conditional-expect": "off",
            "vitest/no-unneeded-async-expect-function": "off",
            "vitest/valid-title": "off"
        }
    }
);

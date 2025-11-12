// @ts-check

import { configs } from "@js-soft/eslint-config-ts";
import { globalIgnores } from "eslint/config.js";
import tseslint from "typescript-eslint";

export default tseslint.config(globalIgnores(["**/Schemas.ts", "**/dist", "**/scripts", "**/coverage", "**/node_modules", "eslint.config.mjs", "**/jest.config.ts"]), {
    extends: [configs.base, configs.jest],
    languageOptions: {
        parserOptions: {
            project: ["./tsconfig.eslint.json", "./packages/*/tsconfig.json", "./packages/*/test/tsconfig.json"]
        }
    },
    files: ["**/*.ts"],
    rules: {
        "jest/expect-expect": [
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
        "jest/max-nested-describe": ["error", { max: 4 }],
        "jest/no-conditional-in-test": "off",
        "jest/no-conditional-expect": "off",
        "@typescript-eslint/switch-exhaustiveness-check": ["error", { allowDefaultCaseForExhaustiveSwitch: true, considerDefaultExhaustiveForUnions: true }]
    }
});

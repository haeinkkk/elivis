import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Node·TypeScript 공통 Flat config (`@repo/database`, 서버, 데스크톱 등) */
export default tseslint.config(
    {
        ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        rules: eslintConfigPrettier.rules,
    },
);

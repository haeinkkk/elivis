import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import react from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** `@repo/ui` — React 19 + React Compiler ESLint */
export default tseslint.config(
    {
        ignores: ["**/node_modules/**", "**/dist/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    react.configs.flat["jsx-runtime"],
    reactHooks.configs.flat.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    {
        plugins: {
            "react-compiler": reactCompiler,
        },
        rules: {
            "react-hooks/set-state-in-effect": "off",
            "react-compiler/react-compiler": "error",
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

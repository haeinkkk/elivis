import { createRequire } from "node:module";

import eslintConfigPrettier from "eslint-config-prettier";
import { reactCompilerFlat } from "@repo/eslint-config/flat/react-compiler";

const require = createRequire(import.meta.url);

const coreWebVitals = require("eslint-config-next/core-web-vitals");

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...coreWebVitals,
    ...reactCompilerFlat(),
    {
        rules: eslintConfigPrettier.rules,
    },
    {
        rules: {
            "import/no-anonymous-default-export": "off",
            "react-hooks/set-state-in-effect": "off",
            "@next/next/no-img-element": "off",
        },
    },
    {
        ignores: [".next/**", "node_modules/**", "out/**", "dist/**", "next-env.d.ts"],
    },
];

export default config;

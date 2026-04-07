import base from "@repo/eslint-config/flat/node";

export default [
    ...base,
    {
        ignores: ["release/**", "out/**", "dist/**", "**/web-out/**"],
    },
];

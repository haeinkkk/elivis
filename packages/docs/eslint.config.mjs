import base from "@repo/eslint-config/flat/node";

export default [
    ...base,
    {
        ignores: ["dist/**"],
    },
];

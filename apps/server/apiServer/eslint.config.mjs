import base from "@repo/eslint-config/flat/node";

export default [
    ...base,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
];

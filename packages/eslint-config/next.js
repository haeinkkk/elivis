/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals", "prettier"],
  ignorePatterns: ["node_modules", "dist", ".next"],
};

const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    files: ["tests/**/*.cjs"],
    languageOptions: { globals: { __dirname: "readonly", Buffer: "readonly" } },
  },
  { ignores: ["dist/**", ".expo/**", "src/generated/**"] },
]);

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "apps/**",
      "data/**",
      "docs/**",
      "portal/**",
      "reconstruction/**",
      "runtimes/**",
      "skills/**",
      "launcher/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ["**/*.ts"] })),
  {
    files: ["core/node/src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node }
    },
    rules: {
      // 编译产物迁入 src 的存量告警按基线保留，只阻断新增 error。
      "no-unused-vars": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-fallthrough": "warn",
      "no-control-regex": "warn",
      "no-prototype-builtins": "warn"
    }
  },
  {
    files: ["replica/src/**/*.ts", "replica/tests/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node }
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn"
    }
  }
];

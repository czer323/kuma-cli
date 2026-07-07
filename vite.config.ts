import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    banner: "#!/usr/bin/env node",
    clean: true,
    dts: true,
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: "node",
  },
  lint: {
    plugins: ["typescript", "unicorn", "oxc", "vitest", "import"],
    rules: {
      "no-unused-vars": "off",
      "no-useless-escape": "off",
      "vitest/require-mock-type-parameters": "off",
      "typescript/no-floating-promises": "off",
      "typescript/no-redundant-type-constituents": "off",
      "typescript/restrict-template-expressions": "off",
      "import/no-duplicates": "error",
      "import/no-self-import": "error",
      "import/no-cycle": ["warn", { maxDepth: 10 }],
      "import/no-absolute-path": "error",
    },
    ignorePatterns: ["dist/", "node_modules/"],
    options: {
      typeCheck: true,
      typeAware: true,
    },
    overrides: [
      {
        files: ["src/**/*.test.{ts,tsx}"],
        plugins: ["typescript", "vitest"],
        env: { vitest: true },
        rules: {
          "vitest/no-focused-tests": "error",
          "vitest/no-disabled-tests": "warn",
        },
      },
    ],
  },
  fmt: {
    ignorePatterns: ["*.md", "**/*.md"],
  },
});

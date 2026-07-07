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
    plugins: ["typescript", "unicorn", "oxc", "vitest"],
    rules: {
      "no-unused-vars": "off",
      "no-useless-escape": "off",
      "vitest/require-mock-type-parameters": "off",
      "typescript/no-floating-promises": "off",
      "typescript/no-redundant-type-constituents": "off",
      "typescript/restrict-template-expressions": "off",
    },
    ignorePatterns: ["dist/", "node_modules/"],
    options: {
      typeCheck: true,
      typeAware: true,
    },
  },
  fmt: {
    ignorePatterns: ["*.md", "**/*.md"],
  },
});

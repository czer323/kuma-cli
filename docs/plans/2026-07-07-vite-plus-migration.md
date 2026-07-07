# Vite+ Migration Plan

Migrate kuma-cli from fragmented build tooling (tsup + vitest + oxlint + npm-run-all) to the unified [Vite+](https://viteplus.dev) toolchain (`vp` CLI + `vite-plus` package).

## Why

Current setup requires 4 separate tools with 3 config files (tsup.config.ts, vitest.config.ts, .oxlintrc.json)
plus npm-run-all for parallel script execution. Vite+ consolidates all of these into a single `vite.config.ts`
and a global `vp` CLI — with added benefits:

- Single `vp install` replaces `npm install` + `npm ci`
- `vp check` replaces `run-p typecheck test lint` (faster, Go-based)
- `vp fmt` (Oxfmt) gives us formatting we don't have today
- `vp env` gives managed Node.js versioning via `.node-version`
- Vite Task (`vp run`) replaces npm-run-all with caching and dependency graphs
- `vp pack` replaces tsup with tsdown/Rolldown — same banner/shebang support

## Pre-requisites (agent must verify on entry)

- [ ] Confirm working on branch `chore/quality-gates` (migration branch):
      `git branch --show-current`
- [ ] Confirm clean working tree:
      `git status --short`
- [ ] Read current `package.json` scripts, devDependencies, and `"bin"` field
- [ ] Read current `tsup.config.ts`, `vitest.config.ts`, `.oxlintrc.json` — these will be migrated
- [ ] Read current `tsconfig.json` — Vite+ will NOT manage this, keep as-is
- [ ] Read current `.github/workflows/ci.yml` and `release.yml` — these will be updated
- [ ] Verify `vp` CLI is installed globally: `vp --version`
      If not: `npm install -g vite-plus`
- [ ] Verify `vite-plus` package latest version on npm: `npm view vite-plus version`
- [ ] Read `docs/plans/2026-07-07-vite-plus-migration.md` (this file) — the migration plan

## Tooling state before migration

| Category         | Tool                            | Config file                 |
| ---------------- | ------------------------------- | --------------------------- |
| Bundler          | `tsup` v8.5.1                   | `tsup.config.ts`            |
| Test runner      | `vitest` v4.1.2                 | `vitest.config.ts`          |
| Linter           | `oxlint` v1.73.0                | `.oxlintrc.json`            |
| Formatter        | _none_                          | _none_                      |
| Type checker     | `tsc --noEmit`                  | `tsconfig.json` (keep)      |
| Parallel scripts | `npm-run-all` v4.1.5            | _scripts in package.json_   |
| Release          | `semantic-release` v25.0.3      | `release.config.cjs` (keep) |
| CI               | `actions/setup-node` + `npm ci` | `.github/workflows/ci.yml`  |

## Migration phases

### Phase 1 — Install Vite+ and run auto-migration

**What:** Install vite-plus as a dependency, run `vp migrate --no-interactive` to get the automated
tool changes, then review and fix.

**Steps:**

1. Add vite-plus as a devDependency:

   ```bash
   npm install -D vite-plus@latest
   ```

   Verify: `vp --version` and `node -e "require('vite-plus')"` both work.

2. Run the auto-migration tool:

   ```bash
   vp migrate --no-interactive
   ```

3. Review `git diff` carefully. The auto-migration will attempt to:
   - Add `vite.config.ts` with `pack`, `lint`, `fmt`, `test` blocks
   - Add `packageManager` field to `package.json` (may set to `npm`)
   - Rewrite `vitest` → `vite-plus/test` imports in test files
   - Configure `lint.options.typeCheck: true` + `typeAware: true`
   - May or may not remove old config files; verify manually

4. **Accept or reject each change manually:**
   - `vite.config.ts` — keep if correct
   - `package.json` changes — accept `packageManager` field, but verify scripts
   - Import rewrites in test files — accept
   - Old config files removal — do NOT trust auto-migration alone
   - Oxlint config merge into `vite.config.ts#lint` — verify rules are correct

5. Do NOT commit yet — proceed to Phase 2 for manual cleanup.

**Done when:** `vp` commands are available, `vite.config.ts` exists with correct pack/lint/test/fmt
blocks, and you've reviewed the diff.

### Phase 2 — Manual config consolidation

**What:** Remove old config files, update scripts, finalize vite.config.ts.

**Steps:**

2a. **Remove old config files:**

```bash
git rm tsup.config.ts vitest.config.ts .oxlintrc.json
```

2b. **Finalize `vite.config.ts`** — ensure it has the following structure:

```typescript
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    // banner adds #!/usr/bin/env node — required so npm's bin shim works
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
    },
    ignorePatterns: ["dist/", "node_modules/"],
    options: {
      typeCheck: true,
      typeAware: true,
    },
  },
  fmt: {},
});
```

- `pack.banner` replicates tsup's `banner: { js: "#!/usr/bin/env node" }`
- `test` block replicates vitest.config.ts options
- `lint` block replicates .oxlintrc.json rules and adds type-checking
- `fmt` block is new — enables `vp fmt` (Oxfmt) for formatting
- Keep `plugins`, `rules`, `ignorePatterns` exactly matching old `.oxlintrc.json`

2c. **Update `package.json` scripts:**

```diff
- "build": "tsup"
+ "build": "vp pack"

- "dev": "tsup --watch"
+ "dev": "vp pack --watch"

- "typecheck": "tsc --noEmit"
+ "typecheck": "vp check --no-fmt --no-lint"

- "test": "vitest run"
+ "test": "vp test"

- "test:watch": "vitest"
+ "test:watch": "vp test watch"

- "lint": "oxlint"
+ "lint": "vp lint"

- "fix": "oxlint --fix"
+ "fix": "vp check --fix"

- "check": "run-p typecheck test lint"
+ "check": "vp check"
+ "fmt": "vp fmt"
+ "format": "vp fmt --check"
```

Notes:

- `vp check` runs fmt + lint + type-check sequentially (it's fast because all three are Go-based).
  If parallel execution is preferred: `"check": "vp run --parallel typecheck test lint"`
- `vp check --no-fmt --no-lint` is type-check only (replaces `tsc --noEmit`)
- Keep `typecheck` as a separate script for CI clarity

2d. **Update `devDependencies` in `package.json`:**

```diff
- "npm-run-all": "^4.1.5",
- "oxlint": "^1.73.0",
- "tsup": "^8.5.1",
- "vitest": "^4.1.2",
+ "vite-plus": "^<latest>",
```

Keep: `typescript`, `@types/node`, `@types/react`, `@types/js-yaml`, all semantic-release plugins.

2e. **Verify `package.json#files` still includes `dist/`:**

```json
"files": ["dist/", "README.md"]
```

No change needed, but confirm.

2f. **Verify import paths in test files:**

```bash
grep -rn "from 'vitest'" src/
```

Should be rewritten to `from 'vite-plus/test'` — if Phase 1 auto-migration missed any, fix manually.

**Done when:** `vp build`, `vp test`, `vp lint`, `vp fmt --check`, `vp check` all pass.

### Phase 3 — CI/CD update

**What:** Update GitHub Actions workflows to use `voidzero-dev/setup-vp@v1`.

3a. **`.github/workflows/ci.yml`** — Replace:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"

- run: npm ci
- run: npm run typecheck
- run: npm run build
- run: node dist/index.js --version
```

With:

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    node-version: "20"
    cache: true

- run: vp install
- run: vp check
- run: vp build
- run: node dist/index.js --version
```

3b. **`.github/workflows/release.yml`** — Update the build step:

```diff
- run: npm run build
+ run: vp build
```

The `setup-node` + `npm ci` steps in the release workflow are handled by `setup-vp`:

```diff
- - uses: actions/setup-node@v4
-   with:
-     node-version: 22
-     cache: npm
- - run: npm ci
+ - uses: voidzero-dev/setup-vp@v1
+   with:
+     node-version: "22"
+     cache: true
+ - run: vp install
```

3c. The Homebrew tap update section in release.yml uses direct `curl` + `sha256sum` — no change needed there.

3d. **`.github/workflows/security.yml`** — This delegates to a reusable workflow, no change.

**Done when:** GitHub Actions workflows reference `setup-vp` and use `vp` commands, and you can
mentally trace each pipeline step.

### Phase 4 — Build & full validation

**What:** Run the full toolchain and verify everything works.

**Steps:**

4a. Clean install and validation:

```bash
# Remove old artifacts
rm -rf dist node_modules

# Fresh install via vite+
vp install

# Full static analysis gate
vp check

# Run tests
vp test

# Build
vp build

# Verify shebang is present
head -1 dist/index.js
# Expected: "#!/usr/bin/env node"

# Verify CLI works
node dist/index.js --version
node dist/index.js --help
```

4b. **Smoke tests** — verify actual functionality:

```bash
# Status (no login needed)
node dist/index.js status

# Monitors list (will fail without login but should not crash)
node dist/index.js monitors list

# TUI dashboard (launches ink/React, verify no bundling errors)
echo "q" | timeout 2 node dist/index.js 2>&1 || true
```

4c. **Verify formatting works:**

```bash
vp fmt --check
```

4d. **Verify type-check-only works:**

```bash
vp check --no-fmt --no-lint
```

**Done when:** All commands above exit 0 and produce expected output. Shebang is present.
TUI doesn't crash (or at minimum, error is about missing credentials — not a bundle error).

### Phase 5 — Cleanup and commit

**What:** Final tidying, remove unused deps, commit.

**Steps:**

5a. **Uninstall removed dependencies from local node_modules:**

```bash
npm uninstall tsup vitest oxlint npm-run-all
```

(They're already removed from package.json in Phase 2 — this cleans up node_modules)

5b. **Remove `np`m`-lock.json` reinstall if needed:**

```bash
vp install  # refresh lockfile
```

5c. **Final `git status` review** — expect these files changed:

- `package.json` — deps swapped, scripts updated
- `package-lock.json` — updated
- `vite.config.ts` — new (replaces 3 config files)
- `tsup.config.ts` — deleted
- `vitest.config.ts` — deleted
- `.oxlintrc.json` — deleted
- `.github/workflows/ci.yml` — updated
- `.github/workflows/release.yml` — updated
- `src/**/*.test.ts` — vitest import paths rewritten
- `docs/plans/2026-07-07-vite-plus-migration.md` — this plan (keep it)

5d. **Run tollgate:**

```bash
npm run check
```

5e. **Commit with conventional commit:**

```bash
git add -A
git commit -m "chore: migrate build toolchain to Vite+

Replace tsup + vitest + oxlint + npm-run-all with unified vite-plus package.
Consolidate tsup.config.ts, vitest.config.ts, .oxlintrc.json into single
vite.config.ts. Update CI workflows to use setup-vp@v1.

- vp pack replaces tsup (same banner/shebang via tsdown 'banner' option)
- vp test replaces vitest (imports from vite-plus/test)
- vp lint replaces oxlint (config in vite.config.ts#lint block)
- vp check replaces run-p typecheck test lint
- vp fmt adds Oxfmt formatting (was missing)
- voidzero-dev/setup-vp@v1 replaces actions/setup-node in CI"
```

**Done when:** Committed on `chore/quality-gates` branch, `poe check` passes.

## Verification checklist (final gate)

- [ ] `vp install` — fresh install works
- [ ] `vp check` — lint + type-check + format pass
- [ ] `vp test` — all tests pass
- [ ] `vp build` — clean build succeeds
- [ ] `head -1 dist/index.js` — shows `#!/usr/bin/env node`
- [ ] `node dist/index.js --version` — prints correct version
- [ ] `node dist/index.js status` — runs without crash
- [ ] `vp fmt --check` — no formatting issues
- [ ] CI workflow uses `voidzero-dev/setup-vp@v1` not `actions/setup-node`
- [ ] No `tsup`, `vitest`, `oxlint`, or `npm-run-all` in `package.json`
- [ ] No `tsup.config.ts`, `vitest.config.ts`, `.oxlintrc.json` in repo
- [ ] All `vitest` imports rewritten to `vite-plus/test`
- [ ] `poe check` passes

## Risks and rollback

**If `vp check` type-checking differs from `tsc --noEmit`:**
Keep `"typecheck": "tsc --noEmit"` as a fallback script. The project doesn't use `baseUrl`/`paths`
(which tsgolint doesn't support), so this should not happen. But if it does, skip the typecheck
script migration and keep `tsc --noEmit` in CI.

**If dist output differs between tsup and vp pack:**
Compare `dist/index.js` before and after migration. The key difference is bundler internals
(Rolldown vs esbuild). Verify the CLI still works. If the bundle breaks (unlikely), debug
by comparing the before/after bundles.

**Rollback:**

```bash
git checkout chore/quality-gates -- package.json package-lock.json tsup.config.ts vitest.config.ts .oxlintrc.json
git checkout main -- .github/workflows/ci.yml .github/workflows/release.yml
npm install  # restore old lockfile
git checkout chore/quality-gates -- src/  # restore any rewritten vitest imports
```

## Research references (for agent context)

Key findings from Vite+ research (context7 queries):

- `vp pack` uses tsdown (Rolldown-based) — config in `pack` block of vite.config.ts
- `vp pack` passes tsdown options through — `banner` works, confirmed by tsdown docs
- `vp check` with `typeCheck: true` uses tsgolint for full TypeScript type checking
- tsgolint does NOT support `baseUrl`/`paths` — not relevant here (tsconfig has neither)
- `vp test` expects imports from `vite-plus/test` not `vitest`
- `vp migrate --no-interactive` auto-migrates existing setup (idempotent)
- `voidzero-dev/setup-vp@v1` replaces `actions/setup-node` + `npm ci`

## Vite+ commands reference

| Command                       | Replaces                    | Notes                              |
| ----------------------------- | --------------------------- | ---------------------------------- |
| `vp install`                  | `npm install` / `npm ci`    | Delegates to package manager       |
| `vp add -D <pkg>`             | `npm install -D <pkg>`      |                                    |
| `vp remove <pkg>`             | `npm uninstall <pkg>`       |                                    |
| `vp pack`                     | `tsup`                      | Library bundler (Rolldown)         |
| `vp pack --watch`             | `tsup --watch`              | Watch mode                         |
| `vp test`                     | `vitest run`                |                                    |
| `vp test watch`               | `vitest`                    | Watch mode                         |
| `vp lint`                     | `oxlint`                    |                                    |
| `vp lint --fix`               | `oxlint --fix`              |                                    |
| `vp fmt`                      | _none_ (Oxfmt)              | New: auto-format                   |
| `vp fmt --check`              | _none_                      | New: format check                  |
| `vp check`                    | `run-p typecheck test lint` | Runs fmt + lint + type-check       |
| `vp check --fix`              | `run-p fix test`            | Format + lint fix + type-check     |
| `vp check --no-fmt --no-lint` | `tsc --noEmit`              | Type-check only                    |
| `vp run -r --parallel`        | `run-p` / `npm-run-all`     | Task runner with caching           |
| `vp env use 20`               | `nvm use 20`                | Node version management            |
| `vp env pin lts`              | _manual_                    | Pin node version to project        |
| `vp build`                    | `vite build`                | Web app builder (NOT for CLI libs) |

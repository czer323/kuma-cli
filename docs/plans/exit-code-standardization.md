# Exit Code Standardization

**Status:** Pending — captured for refinement later.

## Problem

Exit codes are inconsistent. Some commands use bare `process.exit(1)`, others use `EXIT_CODES.XXX` constants, and `upgrade.ts` invented its own ad-hoc scheme.

| Pattern | Files |
|---|---|
| `process.exit(1)` (bare number) | `commands/cluster.ts`, `instances.ts`, `login.ts`, `monitors.ts`, `use.ts` |
| `process.exit(EXIT_CODES.xxx)` (named) | `commands/heartbeat.ts` |
| `process.exit(2)`, `exit(3)`, `exit(4)` (magic numbers) | `commands/upgrade.ts` |
| `process.exit(code)` (via error handler) | `utils/errors.ts`, `utils/output.ts` |

## Acceptance Criteria

- All `process.exit(N)` calls use a named constant from `EXIT_CODES`
- `EXIT_CODES` enum covers every exit path in the project
- No `process.exit()` calls outside `src/utils/errors.ts` and `src/utils/output.ts` (exits routed through error utilities)
- Lint rule or convention prevents bare exit code numbers in the future

## Implementation Notes

Exit codes currently live in `src/utils/errors.ts`. May want to extract to `src/utils/exit-codes.ts`.

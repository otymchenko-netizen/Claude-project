---
name: requirements-check
description: Audit this project against its fixed requirements and report anything missing or wrong, grouped by file. Use after re-scaffolding, changing dependencies or package.json scripts, or touching the API routes or pricing module, and whenever the user asks to check/validate the project requirements.
---

# requirements-check

Read-only audit. Never fix anything, and never edit `src/lib/pricing.ts` (it is a sensitive payments/pricing module that must not be edited without review).

## Run

From the repository root:

```bash
node .claude/skills/requirements-check/check.mjs
```

Exit code 1 means at least one FAIL; WARNs do not fail the run.

## What it checks

| Requirement | File(s) | Rule |
|---|---|---|
| `POST /api/checkout` exists | `src/app/api/checkout/route.ts` | file exists and exports `POST` |
| `GET /api/products` exists | `src/app/api/products/route.ts` | file exists and exports `GET` |
| npm scripts | `package.json` | scripts are exactly `dev`, `build`, `test:ci` (no extras, none missing; `dev`=`next dev`, `build`=`next build`) |
| Pricing module | `src/lib/pricing.ts` | file exists, exports `calculateTotal` |
| Pricing never edited directly | `src/lib/pricing.ts`, `CLAUDE.md` | WARN if the file has uncommitted git changes (confirm reviewed); FAIL if `CLAUDE.md` lacks the never-edit rule |
| Money = floating-point dollars | `src/lib/pricing.ts`, `src/app/api/*/route.ts` | no "cents" naming, no string money from `toFixed`, product prices are numeric literals (WARN on integers >= 100, likely cents) |
## Report

Relay the script's output to the user as-is: findings grouped by file, each marked FAIL or WARN. If it prints `PASS`, say so in one line. Do not attempt fixes unless the user asks, and if a fix would touch `src/lib/pricing.ts`, stop and ask for review first.

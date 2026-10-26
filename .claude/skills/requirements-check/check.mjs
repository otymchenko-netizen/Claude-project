#!/usr/bin/env node
// Read-only requirements check. Reports problems grouped by file. Exit 1 if any FAIL.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const findings = {}; // file -> [{ level, msg }]
const add = (file, level, msg) => (findings[file] ??= []).push({ level, msg });
const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);

// 1. API routes exist and export the right handler
const routes = [
  ["src/app/api/checkout/route.ts", "POST", "POST /api/checkout"],
  ["src/app/api/products/route.ts", "GET", "GET /api/products"],
];
for (const [file, method, label] of routes) {
  const src = read(file);
  if (src === null) {
    add(file, "FAIL", `missing: ${label} has no route file`);
    continue;
  }
  const exported = new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${method}\\b`).test(src);
  if (!exported) add(file, "FAIL", `does not export ${method} handler for ${label}`);
}

// 2. package.json scripts are exactly dev / build / test:ci
const pkgSrc = read("package.json");
if (pkgSrc === null) {
  add("package.json", "FAIL", "missing");
} else {
  const pkg = JSON.parse(pkgSrc);
  const want = { dev: "next dev", build: "next build", "test:ci": null };
  const have = Object.keys(pkg.scripts ?? {});
  for (const k of Object.keys(want)) {
    if (!have.includes(k)) add("package.json", "FAIL", `script "${k}" is missing`);
  }
  for (const k of have) {
    if (!(k in want)) add("package.json", "FAIL", `extra script "${k}" (only dev/build/test:ci allowed)`);
  }
  if (pkg.scripts?.dev && pkg.scripts.dev !== want.dev) add("package.json", "WARN", `dev is "${pkg.scripts.dev}", expected "next dev"`);
  if (pkg.scripts?.build && pkg.scripts.build !== want.build) add("package.json", "WARN", `build is "${pkg.scripts.build}", expected "next build"`);
}

// 3. pricing module exists
const PRICING = "src/lib/pricing.ts";
const pricing = read(PRICING);
if (pricing === null) {
  add(PRICING, "FAIL", "missing");
} else {
  // 5. money representation: floating-point dollars, not cents / strings
  if (/\bcents?\b/i.test(pricing)) add(PRICING, "FAIL", "mentions cents; money must be floating-point dollars (e.g. 4.99)");
  if (/return[^;\n]*toFixed/.test(pricing)) add(PRICING, "FAIL", "returns a string via toFixed; money must be a number");
  if (!/export\s+function\s+calculateTotal\b/.test(pricing)) add(PRICING, "WARN", "calculateTotal is not exported");
}

// 5 (cont). product prices are numeric dollars
const products = read("src/app/api/products/route.ts");
if (products !== null) {
  for (const m of products.matchAll(/price\s*:\s*([^,}\n]+)/g)) {
    const v = m[1].trim();
    if (!/^\d+(\.\d+)?$/.test(v)) add("src/app/api/products/route.ts", "FAIL", `price "${v}" is not a numeric literal`);
    else if (/^\d+$/.test(v) && Number(v) >= 100) add("src/app/api/products/route.ts", "WARN", `price ${v} is an integer >= 100; is it cents? Use dollars like ${(Number(v) / 100).toFixed(2)}`);
  }
}
const checkout = read("src/app/api/checkout/route.ts");
if (checkout !== null && /\bcents?\b/i.test(checkout)) add("src/app/api/checkout/route.ts", "FAIL", "mentions cents; money must be floating-point dollars");

// 4. pricing is sensitive: flag uncommitted changes and check the rule is documented
try {
  const status = execFileSync("git", ["status", "--porcelain", "--", PRICING], { encoding: "utf8" }).trim();
  if (status) add(PRICING, "WARN", `has uncommitted changes (${status.slice(0, 2).trim()}): sensitive module, confirm the change was reviewed`);
} catch {
  add(PRICING, "WARN", "could not read git status; verify manually that the file was not edited without review");
}
const claudeMd = read("CLAUDE.md");
if (claudeMd === null || !/pricing/i.test(claudeMd) || !/never be edited/i.test(claudeMd)) {
  add("CLAUDE.md", "FAIL", "missing the rule that src/lib/pricing.ts must never be edited directly without review");
}

// Report
const files = Object.keys(findings).sort();
if (files.length === 0) {
  console.log("PASS: all requirement checks passed.");
  process.exit(0);
}
let fails = 0;
for (const f of files) {
  console.log(f);
  for (const { level, msg } of findings[f]) {
    if (level === "FAIL") fails++;
    console.log(`  ${level}: ${msg}`);
  }
}
console.log(`\n${fails} failure(s), ${files.reduce((n, f) => n + findings[f].length, 0) - fails} warning(s).`);
process.exit(fails > 0 ? 1 : 0);

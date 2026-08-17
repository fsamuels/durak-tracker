#!/usr/bin/env node
/**
 * Verifies every relative markdown link in the repo resolves — both the file
 * and, where present, the heading anchor.
 *
 * The docs cross-reference each other (e.g. CLAUDE.md links docs/architecture.md#metrics),
 * so a renamed heading breaks links silently. This catches that.
 *
 * Zero dependencies: run with `pnpm check:links` or `node scripts/check-links.mjs`.
 * Vendored from https://github.com/packagedeallabs-ship-it/carpooled/blob/main/scripts/check-links.mjs
 * per the sdlc-standards documentation.md convention — copied rather than shared, since it's ~100
 * dependency-free lines and this is the documented exception to "say it once."
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel", "out"]);
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

function markdownFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...markdownFiles(full));
    else if (extname(full) === ".md") found.push(full);
  }
  return found;
}

/**
 * GitHub's heading-slug rules: strip inline formatting, lowercase, drop
 * punctuation, then map each remaining space to its own hyphen. Runs of spaces
 * are NOT collapsed — "A & B" becomes "a--b".
 */
function slug(heading) {
  return heading
    .trim()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

/** Yields [lineNumber, lineText] for lines outside fenced code blocks. */
function* proseLines(text) {
  let inFence = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) yield [i + 1, lines[i]];
  }
}

const anchorCache = new Map();
function anchorsOf(file) {
  if (!anchorCache.has(file)) {
    const found = new Set();
    for (const [, line] of proseLines(readFileSync(file, "utf8"))) {
      const m = /^#{1,6} (.*)$/.exec(line);
      if (m) found.add(slug(m[1]));
    }
    anchorCache.set(file, found);
  }
  return anchorCache.get(file);
}

const files = markdownFiles(ROOT);
const broken = [];
let checked = 0;

for (const file of files) {
  for (const [lineNo, line] of proseLines(readFileSync(file, "utf8"))) {
    for (const [, target] of line.matchAll(LINK)) {
      if (/^(https?:|mailto:|#!)/.test(target)) continue;
      checked++;
      const hash = target.indexOf("#");
      const pathPart = hash === -1 ? target : target.slice(0, hash);
      const anchor =
        hash === -1 ? "" : decodeURIComponent(target.slice(hash + 1));
      const dest = pathPart ? resolve(dirname(file), pathPart) : file;
      const where = `${relative(ROOT, file)}:${lineNo}`;

      if (!existsSync(dest)) {
        broken.push(`${where}  ${target}  → file not found`);
      } else if (
        anchor &&
        extname(dest) === ".md" &&
        !anchorsOf(dest).has(anchor)
      ) {
        broken.push(`${where}  ${target}  → no heading with that anchor`);
      }
    }
  }
}

if (broken.length) {
  console.error(`\nBroken links (${broken.length}):\n`);
  for (const b of broken) console.error(`  ${b}`);
  console.error(
    `\nChecked ${checked} relative links across ${files.length} markdown files.\n`,
  );
  process.exit(1);
}

console.log(
  `OK — ${checked} relative links across ${files.length} markdown files resolve.`,
);

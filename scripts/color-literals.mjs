#!/usr/bin/env node
/**
 * Finds hardcoded color literals in UI source files.
 *
 * Every color in the Vines UI must come from a `--vines-*` token declared in
 * webcomponents/src/theme.ts. This script fails the build when a hex, rgb()/
 * rgba()/hsl()/hsla() literal, or a CSS named color used as a property value
 * appears anywhere else under webcomponents/src or webapp/src.
 *
 * Usage: node scripts/color-literals.mjs [--count]
 *   --count   print only the number of findings
 * Exit code 1 when any finding exists.
 *
 * A line containing `color-ok` in a comment is skipped.
 */
import {globSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const HEX_RE = /(?<![A-Za-z0-9_-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![A-Za-z0-9_-])/g;
const FN_RE = /\b(?:rgba?|hsla?)\(/gi;
const NAMED = [
  "white", "black", "red", "blue", "green", "gray", "grey", "yellow", "orange", "purple", "pink",
  "silver", "navy", "teal", "lime", "maroon", "olive", "aqua", "fuchsia", "brown", "cyan", "magenta",
  "gold", "violet", "indigo", "crimson", "salmon", "coral", "tomato", "lightgray", "lightgrey",
  "darkgray", "darkgrey", "dimgray", "dimgrey", "lightblue", "lightgreen", "darkgreen", "darkblue",
  "darkred", "whitesmoke",
];
const NAMED_ALT = NAMED.join("|");
/** A named color as a whole word inside a CSS declaration value: after a `:` and before the
 *  value ends (`;`, a quote, `}` or end of line), e.g. `border: 1px solid black;`. */
const NAMED_IN_VALUE_RE = new RegExp(`:[^;:"'{}]*?(?<![\\w-])(${NAMED_ALT})(?![\\w-])(?=[^;:"'{}]*(?:[;"'}]|$))`, "gi");
/** A named color that is the whole of a quoted string in a ternary branch or object value,
 *  e.g. the `"white"` in `color:${isSelected? "white" : ""}`. (`class="orange"` is not one.) */
const NAMED_QUOTED_RE = new RegExp(`(?<=[?:]\\s*)["'](${NAMED_ALT})["']`, "gi");

/** Drop comments so prose, URLs and commented-out markup are not reported. */
function stripComments(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return "";
  return line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
}

/** HTML entities like `&#123;` precede the hash with `&`, which is excluded by the lookbehind
 *  only if `&` is in the class; it is not, so filter them explicitly. */
function isEntity(line, index) {
  return index > 0 && line[index - 1] === "&";
}

/**
 * @param {string} source
 * @returns {Array<{line: number, match: string}>}
 */
export function findColorLiterals(source) {
  const findings = [];
  const lines = source.split("\n");
  lines.forEach((raw, i) => {
    if (raw.includes("color-ok")) return;
    const text = stripComments(raw);
    const line = i + 1;
    for (const m of text.matchAll(HEX_RE)) {
      if (isEntity(text, m.index)) continue;
      findings.push({line, match: m[0]});
    }
    for (const m of text.matchAll(FN_RE)) {
      findings.push({line, match: m[0]});
    }
    const seen = new Set();
    for (const re of [NAMED_IN_VALUE_RE, NAMED_QUOTED_RE]) {
      for (const m of text.matchAll(re)) {
        const key = m.index + m[0].length;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({line, match: m[1]});
      }
    }
  });
  return findings;
}

/**
 * @param {string[]} paths
 * @returns {Array<{file: string, line: number, match: string}>}
 */
export function checkFiles(paths) {
  const out = [];
  for (const file of paths) {
    const source = readFileSync(file, "utf8");
    for (const f of findColorLiterals(source)) {
      out.push({file, line: f.line, match: f.match});
    }
  }
  return out;
}

const DEFAULT_GLOBS = ["webcomponents/src/**/*.ts", "webapp/src/**/*.ts"];
const EXEMPT = new Set([
  "webcomponents/src/theme.ts",
  "webcomponents/src/markdown/code-css.ts",
]);

export function defaultFiles(root = process.cwd()) {
  const files = globSync(DEFAULT_GLOBS, {cwd: root});
  return files
    .map(f => f.split(path.sep).join("/"))
    .filter(f => !f.includes("/generated/"))
    .filter(f => !f.endsWith(".test.ts"))
    .filter(f => !EXEMPT.has(f))
    .sort()
    .map(f => path.join(root, f));
}

function main(argv) {
  const countOnly = argv.includes("--count");
  const root = process.cwd();
  const findings = checkFiles(defaultFiles(root));
  if (countOnly) {
    console.log(findings.length);
  } else {
    for (const f of findings) {
      console.log(`${path.relative(root, f.file)}:${f.line}: ${f.match}`);
    }
  }
  process.exitCode = findings.length > 0 ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}

import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, mkdirSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {findColorLiterals, defaultFiles} from "./color-literals.mjs";

test("defaultFiles skips generated, theme, code-css and test files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "vines-cl-"));
  for (const f of [
    "webcomponents/src/a.ts", "webcomponents/src/a.test.ts", "webcomponents/src/theme.ts",
    "webcomponents/src/markdown/code-css.ts", "webcomponents/src/generated/x.ts",
    "webapp/src/b.ts", "webapp/src/generated/version.ts",
  ]) {
    mkdirSync(path.dirname(path.join(root, f)), {recursive: true});
    writeFileSync(path.join(root, f), "");
  }
  const rel = defaultFiles(root).map(p => path.relative(root, p).split(path.sep).join("/"));
  assert.deepEqual(rel, ["webapp/src/b.ts", "webcomponents/src/a.ts"]);
});

test("finds hex of lengths 3, 4, 6, 8", () => {
  const src = "a{color:#fff}\nb{color:#ffff}\nc{color:#F6FAFC}\nd{color:#c6ddf594}";
  assert.deepEqual(findColorLiterals(src).map(f => f.line), [1, 2, 3, 4]);
});

test("ignores css ids and html entities", () => {
  assert.deepEqual(findColorLiterals("#topBar{}\n#leftSide {}\n&#123;"), []);
});

test("finds rgb/rgba/hsl", () => {
  const src = "x: rgb(1,2,3);\ny: RGBA(0,0,0,.5);\nz: hsl(1 2 3)";
  assert.equal(findColorLiterals(src).length, 3);
});

test("finds named colors only as property values", () => {
  const src = 'color: blue;\nbackground:white"\nmsg("green")\nconst x = "red"';
  assert.deepEqual(findColorLiterals(src).map(f => f.line), [1, 2]);
});

test("skips lines marked color-ok", () => {
  assert.deepEqual(findColorLiterals("x: #fff; /* color-ok */"), []);
});

test("reports 1-based line and the matched text", () => {
  assert.deepEqual(findColorLiterals("\n\nq: #abc;"), [{line: 3, match: "#abc"}]);
});

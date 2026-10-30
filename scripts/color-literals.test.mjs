import {test} from "node:test";
import assert from "node:assert/strict";
import {findColorLiterals} from "./color-literals.mjs";

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

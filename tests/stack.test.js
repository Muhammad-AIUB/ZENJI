import { test } from "node:test";
import assert from "node:assert/strict";
import { stackScale, MAX_SHRINK } from "../js/stack.js";

const base = { cardHeight: 800, count: 4, vh: 800 };

test("card is untouched before the next card enters the viewport", () => {
  assert.equal(stackScale({ ...base, index: 0, stageTop: 500 }), 1);
});

test("card shrinks gradually as the next card slides over it", () => {
  const s = stackScale({ ...base, index: 0, stageTop: -400 });
  assert.ok(s < 1 && s > 1 - MAX_SHRINK);
});

test("shrink is capped once the next card fully covers it", () => {
  assert.equal(stackScale({ ...base, index: 0, stageTop: -5000 }), 1 - MAX_SHRINK);
});

test("last card never scales", () => {
  assert.equal(stackScale({ ...base, index: 3, stageTop: -5000 }), 1);
});

test("result does not depend on any transform state (pure of inputs)", () => {
  const a = stackScale({ ...base, index: 1, stageTop: -900 });
  const b = stackScale({ ...base, index: 1, stageTop: -900 });
  assert.equal(a, b);
});

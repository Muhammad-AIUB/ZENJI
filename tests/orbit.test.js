import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapOffset, orbitPose } from "../js/orbit.js";

test("wrapOffset stays within [-n/2, n/2) for any position, including negatives", () => {
  for (const pos of [-13.4, -6, -0.5, 0, 2.5, 5.99, 6, 17.2]) {
    for (let i = 0; i < 6; i++) {
      const d = wrapOffset(i, pos, 6);
      assert.ok(d >= -3 && d < 3, `i=${i} pos=${pos} d=${d}`);
    }
  }
});

test("the tile at the current position is exactly centred", () => {
  assert.equal(wrapOffset(4, 4, 6), 0);
  assert.equal(wrapOffset(1, 7, 6), 0);
});

test("looping is seamless: advancing a full turn gives identical offsets", () => {
  for (let i = 0; i < 6; i++) assert.ok(Math.abs(wrapOffset(i, 1.3, 6) - wrapOffset(i, 7.3, 6)) < 1e-9);
});

test("centre pose faces the camera, full size, fully visible and undimmed", () => {
  const p = orbitPose(0, 300);
  assert.deepEqual(p, { x: 0, z: -0, rotY: 0, scale: 1, opacity: 1, dim: 0, zIndex: 100 });
});

test("side tiles turn inward, recede, shrink and dim, mirrored left and right", () => {
  const right = orbitPose(1, 300);
  const left = orbitPose(-1, 300);
  assert.ok(right.rotY < 0 && left.rotY > 0);
  assert.equal(right.x, -left.x);
  assert.ok(right.z < 0 && right.scale < 1 && right.dim > 0);
  assert.ok(right.zIndex < orbitPose(0, 300).zIndex);
});

test("far tiles fade out and rotation is capped", () => {
  assert.equal(orbitPose(3, 300).opacity, 0);
  assert.ok(Math.abs(orbitPose(3, 300).rotY) <= 66);
});

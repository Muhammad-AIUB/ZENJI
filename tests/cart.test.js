import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyCart,
  addItem,
  removeItem,
  setQty,
  itemCount,
  subtotalCents,
  lineKey,
  MAX_QTY,
} from "../js/cart.js";

const catalog = {
  a: { id: "a", price: 3399 },
  b: { id: "b", price: 3999 },
};

test("adding a new line creates it with qty 1", () => {
  const cart = addItem(emptyCart(), "a", "M");
  assert.deepEqual(cart.lines, [{ key: "a:M", id: "a", size: "M", qty: 1 }]);
});

test("adding the same product and size increments the line", () => {
  let cart = addItem(emptyCart(), "a", "M");
  cart = addItem(cart, "a", "M");
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].qty, 2);
});

test("same product in a different size is a separate line", () => {
  let cart = addItem(emptyCart(), "a", "M");
  cart = addItem(cart, "a", "L");
  assert.deepEqual(cart.lines.map((l) => l.key), ["a:M", "a:L"]);
});

test("setQty updates, clamps to MAX_QTY, and removes at 0", () => {
  let cart = addItem(emptyCart(), "a", "M");
  cart = setQty(cart, lineKey("a", "M"), 4);
  assert.equal(cart.lines[0].qty, 4);
  cart = setQty(cart, "a:M", 999);
  assert.equal(cart.lines[0].qty, MAX_QTY);
  cart = setQty(cart, "a:M", 0);
  assert.equal(cart.lines.length, 0);
});

test("removeItem drops only the matching line", () => {
  let cart = addItem(emptyCart(), "a", "M");
  cart = addItem(cart, "b", "S");
  cart = removeItem(cart, "a:M");
  assert.deepEqual(cart.lines.map((l) => l.key), ["b:S"]);
});

test("functions never mutate the input cart", () => {
  const before = addItem(emptyCart(), "a", "M");
  const snapshot = JSON.stringify(before);
  addItem(before, "a", "M");
  setQty(before, "a:M", 5);
  removeItem(before, "a:M");
  assert.equal(JSON.stringify(before), snapshot);
});

test("itemCount and subtotalCents sum across lines in integer cents", () => {
  let cart = addItem(emptyCart(), "a", "M");
  cart = setQty(cart, "a:M", 3);
  cart = addItem(cart, "b", "L");
  assert.equal(itemCount(cart), 4);
  assert.equal(subtotalCents(cart, catalog), 3 * 3399 + 3999);
});

test("subtotal ignores lines whose product no longer exists", () => {
  let cart = addItem(emptyCart(), "ghost", "M");
  cart = addItem(cart, "a", "M");
  assert.equal(subtotalCents(cart, catalog), 3399);
});

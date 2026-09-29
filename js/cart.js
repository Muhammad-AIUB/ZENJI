// Pure cart logic. Every function returns a new cart and never mutates its input,
// so the UI can treat the cart as an immutable value and re-render from it.
// Money is kept in integer cents to avoid floating-point rounding.

export const MAX_QTY = 10;

export const emptyCart = () => ({ lines: [] });

export const lineKey = (id, size) => `${id}:${size}`;

export function addItem(cart, id, size, qty = 1) {
  const key = lineKey(id, size);
  const existing = cart.lines.find((line) => line.key === key);
  if (existing) return setQty(cart, key, existing.qty + qty);
  return { lines: [...cart.lines, { key, id, size, qty: Math.min(qty, MAX_QTY) }] };
}

export function setQty(cart, key, qty) {
  const next = Math.min(Math.max(0, Math.floor(qty)), MAX_QTY);
  if (next === 0) return removeItem(cart, key);
  return {
    lines: cart.lines.map((line) => (line.key === key ? { ...line, qty: next } : line)),
  };
}

export function removeItem(cart, key) {
  return { lines: cart.lines.filter((line) => line.key !== key) };
}

export const itemCount = (cart) => cart.lines.reduce((sum, line) => sum + line.qty, 0);

export function subtotalCents(cart, catalog) {
  return cart.lines.reduce((sum, line) => {
    const product = catalog[line.id];
    return product ? sum + product.price * line.qty : sum;
  }, 0);
}

export const formatPrice = (cents) => `A$${(cents / 100).toFixed(2)}`;

export const FREE_SHIPPING_CENTS = 10000;
export const FLAT_SHIPPING_CENTS = 995;

export const shippingCents = (subtotal) =>
  subtotal === 0 || subtotal >= FREE_SHIPPING_CENTS ? 0 : FLAT_SHIPPING_CENTS;

export function orderTotals(cart, catalog) {
  const subtotal = subtotalCents(cart, catalog);
  const shipping = shippingCents(subtotal);
  return { subtotal, shipping, total: subtotal + shipping };
}

// Thin persistent store around the pure functions above.
const STORAGE_KEY = "zenji.cart.v1";

export function createStore(catalog) {
  let cart = load(catalog);
  const listeners = new Set();

  const commit = (next) => {
    cart = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage may be unavailable (private mode); cart still works in memory */
    }
    listeners.forEach((fn) => fn(cart));
  };

  return {
    get: () => cart,
    subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    add: (id, size) => commit(addItem(cart, id, size)),
    setQty: (key, qty) => commit(setQty(cart, key, qty)),
    remove: (key) => commit(removeItem(cart, key)),
    clear: () => commit(emptyCart()),
  };
}

function load(catalog) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.lines)) return emptyCart();
    // Drop anything that no longer matches the catalog.
    return {
      lines: saved.lines.filter(
        (l) => catalog[l.id] && catalog[l.id].sizes.includes(l.size) && l.qty > 0
      ),
    };
  } catch {
    return emptyCart();
  }
}

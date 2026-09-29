import { formatPrice, orderTotals, itemCount } from "./cart.js";
import { teeSVG } from "./tee.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const html = document.documentElement;

const open = (dialog) => {
  dialog.showModal();
  html.classList.add("no-scroll");
};

/** Size guide, product detail and demo checkout dialogs. */
export function setupModals({ store, catalog, toast, closeCart }) {
  const sizeGuide = $("#sizeguide");
  const detail = $("#detail");
  const checkout = $("#checkout");

  [sizeGuide, detail, checkout].forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close-modal]")) d.close();
    });
    // Leave scroll locked if another dialog (the bag) is still open underneath.
    d.addEventListener("close", () => {
      if (!$$("dialog[open]").length) html.classList.remove("no-scroll");
    });
  });

  // Any "[data-open=sizeguide]" trigger, including ones rendered later.
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open='sizeguide']")) open(sizeGuide);
  });

  /* ---------------------------------------------------------- Product detail */

  const sizesHTML = (p) =>
    p.sizes
      .map((s) => {
        const out = p.soldOut.includes(s);
        return `<label class="size${out ? " is-out" : ""}">
          <input type="radio" name="detail-size" value="${s}" ${out ? `disabled aria-label="${s}, sold out"` : ""} />
          <span>${s}</span></label>`;
      })
      .join("");

  function openDetail(id) {
    const p = catalog[id];
    const onSale = p.was && p.was > p.price;
    $("[data-detail-body]", detail).innerHTML = `
      <div class="detail-grid" style="--garment:${p.garment}">
        <div class="detail-media">
          <div class="detail-tee" data-detail-tee>${teeSVG(p, { title: true, side: "front" })}</div>
          <div class="detail-views" role="group" aria-label="Product view">
            <button type="button" class="chip" aria-pressed="true" data-side="front">Front</button>
            <button type="button" class="chip" aria-pressed="false" data-side="back">Back</button>
          </div>
        </div>
        <div class="detail-info">
          <p class="mono detail-reading">${esc(p.reading)}</p>
          <h3 class="detail-title" id="detail-title">${esc(p.name)} Tee</h3>
          <p class="price">
            <span class="visually-hidden">Price</span>
            <span class="now">${formatPrice(p.price)}</span>
            ${onSale ? `<s><span class="visually-hidden">was</span> ${formatPrice(p.was)}</s>` : ""}
          </p>
          <p class="colorway"><i style="background:${p.garment}" aria-hidden="true"></i>${esc(p.colorway)}</p>
          <ul class="specs">
            <li>240gsm heavyweight cotton</li>
            <li>Oversized, garment-washed fit</li>
            <li>Kanji back print, one graphic per piece</li>
            <li>Cold wash, inside out</li>
          </ul>
          <fieldset class="sizes">
            <legend>Size <button type="button" class="link-btn" data-open="sizeguide">Size guide</button></legend>
            <div class="size-row">${sizesHTML(p)}</div>
          </fieldset>
          <p class="size-error" data-detail-error aria-live="polite"></p>
          <button type="button" class="btn btn-primary btn-block" data-detail-add>Add to bag</button>
        </div>
      </div>`;
    detail.dataset.id = id;
    open(detail);
  }

  detail.addEventListener("click", (e) => {
    const side = e.target.closest("[data-side]");
    if (side) {
      const p = catalog[detail.dataset.id];
      $$("[data-side]", detail).forEach((b) => b.setAttribute("aria-pressed", String(b === side)));
      $("[data-detail-tee]", detail).innerHTML = teeSVG(p, { title: true, side: side.dataset.side });
    }
    if (e.target.closest("[data-detail-add]")) {
      const chosen = $('input[name="detail-size"]:checked', detail);
      if (!chosen) {
        $("[data-detail-error]", detail).textContent = "Pick a size first.";
        $('input[name="detail-size"]:not(:disabled)', detail).focus();
        return;
      }
      const p = catalog[detail.dataset.id];
      store.add(p.id, chosen.value);
      detail.close();
      toast(`Added ${p.name} Tee · ${chosen.value}`);
    }
  });
  detail.addEventListener("change", (e) => {
    if (e.target.matches('input[name="detail-size"]')) $("[data-detail-error]", detail).textContent = "";
  });

  /* ------------------------------------------------------------ Demo checkout */

  const body = $("[data-checkout-body]", checkout);

  function renderReview() {
    const cart = store.get();
    const t = orderTotals(cart, catalog);
    body.innerHTML = `
      <h3 class="co-title" tabindex="-1" data-focus-me>Review your order</h3>
      <ul class="co-lines" role="list">
        ${cart.lines
          .map((l) => {
            const p = catalog[l.id];
            return `<li><span>${esc(p.name)} Tee · ${l.size} × ${l.qty}</span><span>${formatPrice(p.price * l.qty)}</span></li>`;
          })
          .join("")}
      </ul>
      <dl class="totals co-totals">
        <div><dt>Subtotal</dt><dd>${formatPrice(t.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>${t.shipping === 0 ? "Free" : formatPrice(t.shipping)}</dd></div>
        <div class="co-total"><dt>Total</dt><dd>${formatPrice(t.total)}</dd></div>
      </dl>
      <p class="fine">Demo only. No payment details are collected and nothing is charged.</p>
      <div class="co-actions">
        <button type="button" class="btn btn-ghost" data-close-modal>Back to bag</button>
        <button type="button" class="btn btn-primary" data-place>Place demo order</button>
      </div>`;
  }

  function renderDone() {
    const cart = store.get();
    const t = orderTotals(cart, catalog);
    const items = itemCount(cart);
    const orderId = `ZJ-${Math.floor(100000 + Math.random() * 900000)}`;
    store.clear();
    body.innerHTML = `
      <p class="co-kanji" aria-hidden="true">完</p>
      <h3 class="co-title" tabindex="-1" data-focus-me>Order placed (demo)</h3>
      <p>Order <strong class="mono">${orderId}</strong> · ${items} item${items === 1 ? "" : "s"} · ${formatPrice(t.total)}</p>
      <p class="fine">This is a concept store. Nothing was charged and nothing will ship.</p>
      <div class="co-actions">
        <button type="button" class="btn btn-primary" data-done>Continue shopping</button>
      </div>`;
    $("[data-focus-me]", body).focus();
  }

  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-place]")) renderDone();
    if (e.target.closest("[data-done]")) {
      checkout.close();
      closeCart();
    }
  });

  return {
    openDetail,
    openCheckout() {
      if (!store.get().lines.length) return;
      renderReview();
      open(checkout);
      $("[data-focus-me]", body).focus();
    },
  };
}

/** Hamburger menu for the primary nav on small screens. */
export function setupMenu() {
  const btn = $(".menu-btn");
  const nav = $("#site-nav");
  if (!btn || !nav) return;

  const set = (isOpen) => {
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", isOpen);
  };
  const isOpen = () => btn.getAttribute("aria-expanded") === "true";

  btn.addEventListener("click", () => set(!isOpen()));
  nav.addEventListener("click", (e) => e.target.closest("a") && set(false));
  document.addEventListener("click", (e) => isOpen() && !e.target.closest(".site-header") && set(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      set(false);
      btn.focus();
    }
  });
  matchMedia("(max-width: 720px)").addEventListener("change", () => set(false));
}

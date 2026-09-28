import { products, catalog } from "./products.js";
import { createStore, itemCount, subtotalCents, formatPrice, MAX_QTY } from "./cart.js";
import { teeSVG } from "./tee.js";

const FREE_SHIPPING_CENTS = 10000;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const store = createStore(catalog);

/* ------------------------------------------------------------------ Product grid */

function cardHTML(p, i) {
  const onSale = p.was && p.was > p.price;
  const off = onSale ? Math.round((1 - p.price / p.was) * 100) : 0;
  const sizes = p.sizes
    .map((s) => {
      const out = p.soldOut.includes(s);
      return `<label class="size${out ? " is-out" : ""}">
          <input type="radio" name="size-${p.id}" value="${s}" ${out ? "disabled" : ""}
            ${out ? `aria-label="${s}, sold out"` : ""} />
          <span>${s}</span>
        </label>`;
    })
    .join("");

  return `
  <li class="card" style="--garment:${p.garment}; --i:${i}" data-id="${p.id}" ${onSale ? "data-sale" : ""}>
    <article aria-labelledby="name-${p.id}">
      <div class="card-media" data-tilt>
        <span class="card-no mono" aria-hidden="true">No.${String(i + 1).padStart(2, "0")}</span>
        ${onSale ? `<span class="badge">−${off}%</span>` : ""}
        <span class="card-kanji" aria-hidden="true">${p.kanji}</span>
        <div class="card-tee">${teeSVG(p, { title: true })}</div>
      </div>
      <div class="card-body">
        <div class="card-top">
          <h3 id="name-${p.id}" class="card-name">${esc(p.name)} <span>Tee</span></h3>
          <p class="price">
            <span class="visually-hidden">Price</span>
            <span class="now">${formatPrice(p.price)}</span>
            ${onSale ? `<s><span class="visually-hidden">was</span> ${formatPrice(p.was)}</s>` : ""}
          </p>
        </div>
        <p class="colorway"><i style="background:${p.garment}" aria-hidden="true"></i>${esc(p.colorway)}
          <span class="mono reading">${esc(p.reading)}</span></p>
        <fieldset class="sizes" aria-describedby="err-${p.id}">
          <legend>Size</legend>
          <div class="size-row">${sizes}</div>
        </fieldset>
        <p class="size-error" id="err-${p.id}" aria-live="polite"></p>
        <button type="button" class="btn btn-add" data-add>
          <span>Add to bag</span>
          <span class="btn-add-kanji" aria-hidden="true">追加</span>
        </button>
      </div>
    </article>
  </li>`;
}

function renderGrid() {
  const grid = $("[data-grid]");
  grid.innerHTML = products.map(cardHTML).join("");
  $("[data-count-all]").textContent = products.length;
  $("[data-count-sale]").textContent = products.filter((p) => p.was).length;

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) addFromCard(btn.closest(".card"), btn);
  });
  grid.addEventListener("change", (e) => {
    if (e.target.matches('input[type="radio"]')) {
      const card = e.target.closest(".card");
      card.classList.remove("needs-size");
      $(".size-error", card).textContent = "";
    }
  });
  enableTilt(grid);
}

function addFromCard(card, button) {
  const p = catalog[card.dataset.id];
  const chosen = $('input[type="radio"]:checked', card);
  if (!chosen) {
    card.classList.remove("needs-size");
    void card.offsetWidth; // restart the shake animation
    card.classList.add("needs-size");
    $(".size-error", card).textContent = "Pick a size first.";
    $('input[type="radio"]:not(:disabled)', card).focus();
    return;
  }
  store.add(p.id, chosen.value);
  impact(button);
  flyToBag(card);
  toast(`Added ${p.name} Tee · ${chosen.value}`);
}

function setupFilters() {
  const chips = $$("[data-filter]");
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      const saleOnly = chip.dataset.filter === "sale";
      $$(".card").forEach((card) => (card.hidden = saleOnly && !card.hasAttribute("data-sale")));
    })
  );
}

/* ------------------------------------------------------------------ Cart dialog */

const dialog = $("#cart");

function lineHTML(line) {
  const p = catalog[line.id];
  const label = `${p.name} Tee, size ${line.size}`;
  return `
  <li class="cart-line" data-key="${line.key}">
    <div class="line-thumb" style="--garment:${p.garment}">${teeSVG(p)}</div>
    <div class="line-info">
      <p class="line-name">${esc(p.name)} Tee</p>
      <p class="line-meta mono">${esc(p.colorway)} · ${line.size} · ${formatPrice(p.price)}</p>
      <div class="stepper" role="group" aria-label="Quantity for ${esc(label)}">
        <button type="button" data-step="-1" data-focus="${line.key}:dec"
          aria-label="Decrease quantity">−</button>
        <input type="number" inputmode="numeric" min="1" max="${MAX_QTY}" value="${line.qty}"
          data-qty data-focus="${line.key}:qty" aria-label="Quantity" />
        <button type="button" data-step="1" data-focus="${line.key}:inc"
          aria-label="Increase quantity" ${line.qty >= MAX_QTY ? "disabled" : ""}>+</button>
      </div>
    </div>
    <div class="line-end">
      <p class="line-total">${formatPrice(p.price * line.qty)}</p>
      <button type="button" class="link-btn" data-remove data-focus="${line.key}:rm"
        aria-label="Remove ${esc(label)}">Remove</button>
    </div>
  </li>`;
}

function renderCart(cart) {
  const count = itemCount(cart);
  const subtotal = subtotalCents(cart, catalog);

  // Keep keyboard focus stable across re-renders.
  const focusKey = document.activeElement?.dataset?.focus;
  const focusedIndex = cart.lines.length
    ? $$(".cart-line", dialog).findIndex((li) => li.contains(document.activeElement))
    : -1;

  $$("[data-cart-count]").forEach((el) => (el.textContent = count));
  $("[data-cart-count-sr]").textContent = `, ${count} item${count === 1 ? "" : "s"}`;
  $(".cart-btn").classList.toggle("has-items", count > 0);
  $("[data-cart-head-count]").textContent = count ? `(${count})` : "";

  $("[data-cart-lines]").innerHTML = cart.lines.map(lineHTML).join("");
  $("[data-cart-empty]").hidden = count > 0;
  $("[data-cart-foot]").hidden = count === 0;
  $("[data-subtotal]").textContent = formatPrice(subtotal);

  const remaining = FREE_SHIPPING_CENTS - subtotal;
  $("[data-ship]").hidden = count === 0;
  $("[data-ship-text]").innerHTML =
    remaining > 0
      ? `You're <strong>${formatPrice(remaining)}</strong> away from free shipping.`
      : `<strong>Free shipping unlocked.</strong> 送料無料`;
  $("[data-ship-bar]").style.width = `${Math.min(100, (subtotal / FREE_SHIPPING_CENTS) * 100)}%`;
  $("[data-shipping]").textContent = remaining > 0 ? "Calculated at checkout" : "Free";

  if (focusKey && dialog.open) {
    const again = $(`[data-focus="${CSS.escape(focusKey)}"]`, dialog);
    if (again && !again.disabled) again.focus();
    else {
      // The focused line was removed (or its button disabled): move to a sensible neighbour.
      const lines = $$(".cart-line", dialog);
      const target = lines[Math.min(Math.max(focusedIndex, 0), lines.length - 1)];
      (target ? $("[data-remove]", target) : $("[data-go-shop]", dialog)).focus();
    }
  }
}

function setupCart() {
  $(".cart-btn").addEventListener("click", openCart);
  $$("[data-close-cart]", dialog).forEach((b) => b.addEventListener("click", closeCart));
  $("[data-go-shop]", dialog).addEventListener("click", () =>
    $("#shop").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" })
  );
  dialog.addEventListener("click", (e) => e.target === dialog && closeCart()); // backdrop
  dialog.addEventListener("cancel", (e) => (e.preventDefault(), closeCart())); // Esc

  const lines = $("[data-cart-lines]");
  lines.addEventListener("click", (e) => {
    const key = e.target.closest(".cart-line")?.dataset.key;
    if (!key) return;
    const line = store.get().lines.find((l) => l.key === key);
    if (e.target.closest("[data-step]")) {
      store.setQty(key, line.qty + Number(e.target.closest("[data-step]").dataset.step));
    } else if (e.target.closest("[data-remove]")) {
      store.remove(key);
      toast(`Removed ${catalog[line.id].name} Tee · ${line.size}`);
    }
  });
  lines.addEventListener("change", (e) => {
    if (!e.target.matches("[data-qty]")) return;
    const key = e.target.closest(".cart-line").dataset.key;
    const qty = Number(e.target.value);
    // An empty or invalid entry snaps back to 1 rather than silently deleting the line.
    store.setQty(key, Number.isFinite(qty) && qty >= 1 ? qty : 1);
  });

  $("[data-checkout]").addEventListener("click", () =>
    toast("Demo store — checkout is switched off. Nothing was charged.")
  );

  store.subscribe(renderCart);
  renderCart(store.get());
}

function openCart() {
  dialog.classList.remove("is-closing");
  dialog.showModal();
  document.documentElement.classList.add("no-scroll");
}

let closing = false;
function closeCart() {
  if (!dialog.open || closing) return;
  const finish = () => {
    if (!dialog.open) return;
    closing = false;
    dialog.classList.remove("is-closing");
    dialog.close();
    document.documentElement.classList.remove("no-scroll");
  };
  if (reducedMotion.matches) return finish();
  closing = true;
  dialog.classList.add("is-closing"); // fades the backdrop
  // WAAPI's `finished` promise is more dependable than listening for `animationend`.
  const slide = dialog.animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], {
    duration: 280,
    easing: "ease-in",
    fill: "forwards",
  });
  slide.finished.then(() => {
    finish();
    slide.cancel();
  });
  setTimeout(finish, 500); // never leave the drawer stuck if frames are starved
}

// The dialog can also be closed natively (e.g. Esc without user activation); keep state in sync.
dialog.addEventListener("close", () => {
  closing = false;
  dialog.classList.remove("is-closing");
  document.documentElement.classList.remove("no-scroll");
});

/* ------------------------------------------------------------------ Hero */

function setupHero() {
  const hero = $("[data-hero]");
  const pager = $("[data-hero-pager]");
  let index = products.findIndex((p) => p.id === "will-of-the-sun");
  let timer = null;
  let paused = reducedMotion.matches;

  pager.innerHTML =
    products
      .map(
        (p, i) =>
          `<button type="button" class="pager-dot" data-go="${i}" aria-label="Show ${esc(p.name)} Tee">${String(i + 1).padStart(2, "0")}</button>`
      )
      .join("") +
    `<button type="button" class="pager-toggle" data-toggle aria-pressed="${paused}">
       <span class="visually-hidden">Pause rotation</span><i aria-hidden="true"></i></button>`;

  const show = (i) => {
    index = (i + products.length) % products.length;
    const p = products[index];
    hero.style.setProperty("--garment", p.garment);
    $("[data-hero-tee]").innerHTML = teeSVG(p, { title: true });
    $("[data-hero-kanji]").textContent = p.kanji;
    $("[data-hero-kanji]").dataset.len = p.kanji.length;
    $("[data-hero-name]").textContent = p.name;
    $("[data-hero-colorway]").textContent = p.colorway;
    $("[data-hero-index]").textContent = `${String(index + 1).padStart(2, "0")} / ${String(products.length).padStart(2, "0")}`;
    $$(".pager-dot", pager).forEach((b, n) => b.setAttribute("aria-current", n === index ? "true" : "false"));
    hero.classList.remove("swap");
    void hero.offsetWidth;
    hero.classList.add("swap");
  };

  const schedule = () => {
    clearInterval(timer);
    if (!paused) timer = setInterval(() => show(index + 1), 4200);
  };

  pager.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    const toggle = e.target.closest("[data-toggle]");
    if (go) show(Number(go.dataset.go));
    if (toggle) {
      paused = !paused;
      toggle.setAttribute("aria-pressed", String(paused));
      $(".visually-hidden", toggle).textContent = paused ? "Resume rotation" : "Pause rotation";
    }
    schedule();
  });
  // Don't move things while someone is reading or using them.
  hero.addEventListener("pointerenter", () => clearInterval(timer));
  hero.addEventListener("pointerleave", schedule);
  hero.addEventListener("focusin", () => clearInterval(timer));
  hero.addEventListener("focusout", schedule);

  show(index);
  schedule();
}

/* ------------------------------------------------------------------ Motion details */

function enableTilt(root) {
  if (reducedMotion.matches || !matchMedia("(hover: hover)").matches) return;
  root.addEventListener("pointermove", (e) => {
    const media = e.target.closest("[data-tilt]");
    if (!media) return;
    const r = media.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    media.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
    media.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
    media.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    media.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  });
  root.addEventListener("pointerout", (e) => {
    const media = e.target.closest("[data-tilt]");
    if (media && !media.contains(e.relatedTarget)) {
      media.style.removeProperty("--rx");
      media.style.removeProperty("--ry");
    }
  });
}

const SFX = ["ドン!", "バン!", "ズバッ!", "ゴッ!"];

function impact(button) {
  if (reducedMotion.matches) return;
  const burst = document.createElement("span");
  burst.className = "burst";
  burst.setAttribute("aria-hidden", "true");
  burst.textContent = SFX[Math.floor(Math.random() * SFX.length)];
  button.append(burst);
  burst.addEventListener("animationend", () => burst.remove(), { once: true });
}

function flyToBag(card) {
  const bag = $(".cart-btn");
  bag.classList.remove("bump");
  void bag.offsetWidth;
  bag.classList.add("bump");
  if (reducedMotion.matches) return;

  const from = $(".card-tee", card).getBoundingClientRect();
  const to = bag.getBoundingClientRect();
  const ghost = $(".card-tee svg", card).cloneNode(true);
  ghost.classList.add("ghost");
  Object.assign(ghost.style, {
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
  });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy - 120}px) scale(.5) rotate(-12deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(20deg)`, opacity: 0.2 },
      ],
      { duration: 720, easing: "cubic-bezier(.6,-0.2,.4,1)" }
    )
    .finished.then(() => ghost.remove());
}

let toastTimer;
function toast(message) {
  const el = $("[data-toast]");
  // Content behind a modal <dialog> is inert, so host the toast inside the dialog while it's open.
  const host = dialog.open ? dialog : document.body;
  if (el.parentElement !== host) host.append(el);
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function setupReveal() {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }),
    { rootMargin: "0px 0px -10% 0px" }
  );
  $$(".card, .story-panel, .section-head").forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ Boot */

renderGrid();
setupFilters();
setupCart();
setupHero();
setupReveal();

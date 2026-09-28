# ZENJI — Wear the Arc

A responsive one-page storefront concept inspired by [ZENJI](https://zenji.shop/)'s
anime × streetwear identity. It has a hero, six product cards with size selection, and a
working demo cart. There is no backend, no accounts and no real payments.

**Live demo:** _GitHub Pages link goes here once the repo is pushed_ (Settings → Pages →
deploy from `main`, root). The site is plain static files, so any static host works.

## Run it

It uses ES modules, so serve it over HTTP rather than opening it with `file://`:

```bash
npm start          # python -m http.server 5317 → http://localhost:5317
npm test           # cart logic unit tests (node --test)
```

No install step and no build step. The only dependency is Google Fonts.

## Design direction

**A manga spread as a storefront.** ZENJI's line is "wear your story", so the page reads
like a printed manga chapter rather than a generic shop template:

- **Panels and gutters.** The hero is a real CSS grid of skewed manga panels (`clip-path`)
  on black gutters. It holds the headline, a rotating featured tee on animated speed lines,
  a vertical Japanese panel (物語を着ろ, "wear your story") and the brand stats (240gsm · 06
  designs · 00 restocks).
- **Palette.** Ink, paper and one vermillion accent, plus each product's own colourway
  (Steel Blue, Crimson Pink, Void Purple…) taken from the real Origin Drop.
- **Type.** *Dela Gothic One* is a heavy Japanese display face, so the kanji and the Latin
  headlines share one voice. It's paired with *Schibsted Grotesk* for body copy and
  *DM Mono* for labels.
- **Texture.** Halftone dots, a paper-grain overlay and hard offset "ink" shadows in place
  of soft blur shadows.
- **Moments.**
  - Adding to the bag fires a manga *impact frame*: a starburst with a random sound effect
    (ドン! バン! ズバッ!). A ghost of the tee then arcs into the bag button.
  - Cards tilt in 3D with a glare that follows the pointer.
  - The headline reveals line by line and the ticker scrolls continuously.
  - Every motion effect is removed under `prefers-reduced-motion`.

### Imagery

Every T-shirt is **drawn in code as SVG** (`js/tee.js`): an oversized silhouette in the
product colourway, plus a chest print built from the design's theme (flame, oni slash,
domain rings, seigaiha waves, rising sun, katana) and its kanji. So:

- no borrowed photography or rights questions;
- images are resolution-independent and weigh almost nothing;
- adding a colourway is a single data change.

## Features against the brief

| Requirement | Where |
|---|---|
| Branded header, hero, clear Shop CTA | Sticky header with 力 mark and live bag count; hero with a "Shop the drop" button |
| ≥ 4 product cards with image, name, price, size | 6 cards: SVG tee, name, colourway, price (sale price + was-price), XS–XXL sizes with sold-out states |
| Demo cart: add / remove / quantity / subtotal | Side drawer with a −/+ stepper and typed quantity (1–10), remove, live subtotal, free-shipping meter (A$100) |
| Mobile + desktop polish | Fluid type with `clamp()`, 3 → 2 → 1 column grid, hero restacks under 1080px, drawer goes full-width on phones, 44px touch targets |
| Keyboard-friendly | See below |

Extras:
- the cart persists in `localStorage` and is validated against the catalogue on load;
- "On sale" filter;
- FAQ;
- a "pick a size first" message that shakes the sizes and moves focus to them.

### Accessibility

- **Sizes** are real radio groups (`fieldset` + `legend`), so arrow keys work. Sold-out
  sizes are `disabled` and labelled "sold out".
- **The cart** is a native `<dialog>` opened with `showModal()`. That gives focus
  containment, Esc to close and focus return for free. Clicking the backdrop also closes it.
- **Focus stays put** when the cart re-renders after a quantity change. If you remove a
  line, focus moves to the neighbouring line's Remove button, or to "Browse the drop" when
  the bag empties.
- **Announcements.** The bag count, "added" / "removed" toasts and size errors go through
  live regions. The toast moves inside the dialog while it's open, because content behind a
  modal is inert.
- **The hero carousel** pauses on hover and focus, has a pause button and numbered buttons
  to pick a design, and doesn't auto-advance at all under reduced motion.
- **The rest.** Visible `:focus-visible` rings, a skip link, AA-contrast body text (a darker
  red is used for small red text), and decorative kanji/SFX hidden from assistive tech.

## Code map

```
index.html        semantic page shell (header, hero, shop, story, FAQ, cart dialog)
css/styles.css    design tokens → components → responsive → reduced-motion
js/products.js    mock catalogue (prices in integer AUD cents)
js/cart.js        pure cart functions + a tiny persistent store
js/tee.js         SVG tee renderer (silhouette + per-design motif)
js/app.js         rendering, events, cart drawer, hero carousel, motion details
tests/cart.test.js  unit tests for the cart logic
diagram/          architecture diagram (Archify) of the page's data flow
```

The cart logic is **pure and immutable**: `addItem`, `setQty`, `removeItem`, `itemCount`
and `subtotalCents` each return a new value. The UI subscribes to one store and re-renders
from it. Money is kept in integer cents, so subtotals never pick up floating-point drift.

## Unfinished / known limits

- **Checkout is a stub.** The button shows a toast and nothing is charged. There are no
  real products, stock or orders.
- **Artwork is illustrative.** The tees are stylised SVG illustrations, not product
  photography, and each product has one front view (no gallery, zoom or back print).
- **No product detail page** or size guide. The fit note lives in the FAQ.
- **The announcement ticker** pauses on hover and stops under reduced motion, but has no
  dedicated pause button.
- **Browser coverage.** Tested in Chrome (desktop 1440×900, tablet 820×1180, mobile 390×844,
  via headless Chrome screenshots). Not yet tested in Safari or Firefox, or with a real
  screen reader.
- **Fonts** load from Google Fonts. Offline, it falls back to system fonts.

---

*Concept build for a design exercise. Not affiliated with or endorsed by ZENJI. Product
names and colourways reference the public Origin Drop for brand fit, and all artwork on
this page is original.*

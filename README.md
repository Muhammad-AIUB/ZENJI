# ZENJI — Wear the Arc

A responsive one-page storefront inspired by [ZENJI](https://zenji.shop/)'s anime × streetwear
identity, built as a hiring-assessment demo. It has a branded header, a hero with a clear
**Shop** call to action, six product cards with size selection, and a fully working demo
cart. There is no backend, no accounts and no real payments.

| | |
|---|---|
| **Live demo** | _add your deployed URL here_ (static site: GitHub Pages, Netlify or Vercel all work) |
| **Source** | <https://github.com/Muhammad-AIUB/ZENJI> |
| **Stack** | Vanilla HTML, CSS and ES modules. GSAP + ScrollTrigger (CDN) for scroll reveals. No build step. |

## Run it locally

The site uses ES modules, so it must be served over HTTP (opening `index.html` with `file://`
will not work).

```bash
npm start     # python -m http.server 5317  ->  http://localhost:5317
npm test      # node --test tests/          (Node 18+, no install needed)
```

There is nothing to install or build. Fonts come from Google Fonts and GSAP from jsDelivr.

## How it meets the brief

| Requirement | Where it lives |
|---|---|
| Branded header | Sticky header: 力 logo mark, ZENJI wordmark, nav, live bag count. Announcement ticker above it. |
| Hero with clear "Shop" CTA | Manga-panel hero with a red **Shop the drop** button that jumps to the products. |
| At least 4 product cards: image, name, price, size | 6 cards (`js/products.js`). Each has a drawn-in-code SVG tee, name, colourway, price (with was-price on sale) and XS–XXL size selection. Some sizes are marked sold out. |
| Demo cart: add / remove | Add from any card. Remove from the bag drawer. |
| Demo cart: update quantities | `-` / `+` stepper and a typed quantity (1–10). Going to 0 removes the line. |
| Demo cart: subtotal | Live subtotal, plus a free-shipping meter (free over A$100). |
| Checkout flow (demo) | "Checkout" opens a review dialog with subtotal, shipping (flat A$9.95, free over A$100) and total. "Place demo order" shows an order number and clears the bag. No payment details are collected. |
| 3D tile carousel | "Spin the drop" section: a looping 3D perspective carousel of the six tees. The centre tile faces you and the side tiles turn inward and recede. Drag, swipe, arrow keys or buttons move it. It auto-rotates with a pause toggle, and the centre tile opens its product dialog. |
| Product detail | Each card has a "Details & back view" dialog with a front/back toggle, specs, size selection and add to bag. |
| Size guide | A measurements table (XS–XXL) from the shop heading and from inside the product dialog. |
| Mobile and desktop layout | Fluid type and spacing with `clamp()`. Breakpoints at 1279, 1080, 960, 720 and 480px. The product grid runs 3, 2 or 1 columns. The bag becomes a full-width sheet on phones. |
| Readable text | 16px body copy, AA-contrast text colours (a darker red is used for small red text). |
| Keyboard-friendly controls | Full keyboard flow, described under [Accessibility](#accessibility). |

Extras beyond the brief: cart persistence in `localStorage`, an "On sale" filter, a FAQ,
a "pick a size first" prompt that moves focus to the sizes, a pinned "Featured in this
drop" card stack, a hamburger menu on phones, and a custom cursor for mouse users.

## Design direction

**A manga spread as a storefront.** ZENJI's line is "wear your story", so the page reads
like a printed manga chapter rather than a generic shop template.

- **Panels and gutters.** The hero is a CSS grid of skewed panels (`clip-path`) on black
  gutters: the headline, a rotating featured tee on animated speed lines, a vertical
  Japanese panel (物語を着ろ) and brand stats (240gsm · 06 designs · 00 restocks).
- **Palette.** Ink, paper and one vermillion accent, plus each product's own colourway
  (Steel Blue, Crimson Pink, Void Purple and so on).
- **Type.** *Dela Gothic One* is a heavy Japanese display face, so kanji and Latin
  headlines share one voice. It is paired with *Schibsted Grotesk* for body copy and
  *DM Mono* for labels.
- **Texture.** Halftone dots, a paper-grain overlay and hard offset "ink" shadows instead
  of soft blur.
- **Moments.** Adding to the bag fires a manga impact frame (a starburst with a random
  sound effect such as ドン!) and a ghost of the tee flies into the bag button. Cards tilt in
  3D with a pointer-following glare. Sections animate in on scroll.

### Imagery and permissions

Every T-shirt is **drawn in code as SVG** (`js/tee.js`): a silhouette in the product
colourway plus a chest print built from the design's theme (flame, oni slash, domain rings,
seigaiha waves, rising sun, katana) and its kanji. There is no borrowed photography, so
there are no rights questions. Images are resolution-independent and weigh almost nothing,
and a new colourway is a one-line data change.

## How it's built

```
index.html          semantic page shell: header, hero, shop, story, featured stack, FAQ, cart dialog
css/styles.css      design tokens -> components -> reveal/cursor -> responsive -> reduced-motion
js/products.js      mock catalogue (prices in integer AUD cents)
js/cart.js          pure cart functions + a small persistent store
js/tee.js           SVG tee renderer (silhouette + per-design motif)
js/app.js           rendering, events, cart drawer, hero carousel, filters
js/modals.js        size guide, product detail, demo checkout and the mobile menu
js/orbit.js         3D perspective tile carousel (pure pose maths + DOM wiring)
js/reveal.js        GSAP/ScrollTrigger scroll reveals and the hero entrance
js/stack.js         pure scale maths for the pinned "Featured" card stack
js/cursor.js        custom ink cursor (mouse only)
assets/grain.png    paper-grain tile
tests/              unit tests for the cart logic, the stack maths and the carousel maths
diagram/            architecture diagram of the page's data flow
```

### Cart logic

The cart is **pure and immutable**. `addItem`, `setQty`, `removeItem`, `itemCount` and
`subtotalCents` (in `js/cart.js`) each take a cart and return a new one, and never touch the
DOM. The UI subscribes to one small store and re-renders from it.

- Lines are keyed by product **and size**, so the same tee in two sizes is two lines.
- Money is stored as **integer cents**, so subtotals never pick up floating-point drift.
- Shipping and totals are pure functions too (`shippingCents`, `orderTotals`): flat A$9.95,
  free at A$100 or more, nothing for an empty bag.
- Quantity is clamped to 1–10. Setting it to 0 removes the line. A blank or invalid typed
  value snaps back to 1 rather than silently deleting the line.
- On load, the saved cart is validated against the catalogue, so stale or tampered
  `localStorage` data is dropped. If storage is unavailable (private mode), the cart still
  works in memory.

### Performance

- Motion animates only `transform`, `opacity` and `clip-path`, so it stays on the compositor.
- The reading-progress bar and parallax use CSS scroll-driven animations
  (`animation-timeline`). Browsers without support skip them.
- The pinned stack uses one passive, `requestAnimationFrame`-throttled scroll listener that
  runs only while the section is near the viewport.
- Looping animations (speed lines, ticker, tile loop) pause while off screen.
- No full-screen blur or blend layers. The paper grain is a small PNG tile, not a live SVG
  filter. Pointer effects are batched to one style write per frame.
- If the GSAP CDN fails to load, reveal animations are skipped and all content stays visible.

## Accessibility

- **Keyboard flow** (tested with real key presses). The tab order is logical: skip link,
  logo, nav, Bag, hero actions, hero pager, filters, then each card. Sizes are real radio
  groups, so arrow keys pick a size and sold-out sizes are skipped. Enter adds to the bag.
  Adding without a size shows "Pick a size first." and moves focus to the sizes.
- **The bag, size guide, product detail and checkout** are native `<dialog>`s opened with
  `showModal()`, which gives focus containment, Esc to close and focus return to the control
  that opened them. Backdrop click also closes them. Checkout stacks on top of the bag, and
  focus moves to its heading (including the order confirmation) so it is announced.
- **The mobile menu** is a button with `aria-expanded`. Esc closes it and returns focus to
  the button, and choosing a link closes it. All touch targets in the header are 44px.
- **Focus stays put** when the bag re-renders after a quantity change. If you remove a line,
  focus moves to the neighbouring line, or to "Browse the drop" when the bag empties.
- **Announcements.** The bag count, "added" and "removed" toasts and size errors use live
  regions. The toast moves inside the dialog while it is open, because content behind a
  modal is inert.
- **The hero carousel** pauses on hover and focus, has a pause button and numbered buttons,
  and does not auto-advance under reduced motion.
- **The rest.** Visible `:focus-visible` rings, a skip link, one `h1` with a sensible
  heading order, and decorative kanji and sound effects hidden from assistive tech.
- **The 3D carousel** has one tab stop (the centred tile). Arrow keys move it, and focus follows
  the centred tile. It auto-rotates only while visible and not hovered or focused, has an
  "Auto-rotate" pause toggle, and announces changes through a live region only when it is not
  rotating by itself. Under reduced motion it does not auto-rotate and jumps without easing.
- **Reduced motion.** Every motion effect is removed under `prefers-reduced-motion`.

## Testing

```bash
npm test
```

21 unit tests cover the cart (add, merge same size, separate sizes, quantity clamp and
remove-at-zero, no input mutation, integer-cent subtotals, unknown products, shipping and
order totals) and the featured-stack scale maths and the 3D carousel's wrap-around and pose maths.

Also checked by hand in Chrome:

- the full cart flow: add without a size, add with a size, step and type quantities, the
  quantity cap, remove, the empty state, persistence across reload, Esc to close;
- the full keyboard flow described above;
- size guide, product detail (front/back toggle, size validation, add to bag) and the whole
  checkout flow through to the order confirmation, including the shipping maths;
- the mobile menu at phone width: opens, links are 47px tall, Esc closes it, a link closes it;
- a responsive sweep at 15 sizes (320, 375, 414, 480, 600, 720, 721, 768, 820, 1024, 1280,
  1440, 1920 wide, plus 667x375 and 812x375 landscape phones). At each size: no sideways page
  scroll, correct header mode (hamburger up to 720px), tappable controls (at least 40px, most 44px),
  no tiny text, no clipped featured cards, and the size guide, product dialog, bag and checkout
  all fit the screen;
- scroll reveals and the pinned stack: every section becomes visible with no console errors.

## Known limits and unfinished

- **Checkout is a demo.** It shows a review, shipping and an order number, but there are no
  real products, stock levels, orders or payment step, as the brief allows.
- **Artwork is illustrative.** The tees are stylised SVGs, not product photography. Each
  product has a front and a back view, but no zoom or extra photos.
- **Size guide values are demo data**, not measured garments.
- **The announcement ticker** pauses on hover and stops under reduced motion, but has no
  dedicated pause button.
- **Browser coverage.** Tested in Chrome only. Not tested in Safari or Firefox, or with a
  real screen reader, so that remains open.
- **External assets.** Fonts (Google Fonts) and GSAP (jsDelivr) load from CDNs. Offline, the
  page falls back to system fonts and skips scroll reveals.

---

*The "Spin the drop" carousel is my own implementation of a 3D perspective tile loop, inspired
by the public preview video of Osmo's "3D Perspective Tiles Infinite Loop". The resource itself is
locked behind a membership, so none of its code was used.*

*Concept build for a design exercise. Not affiliated with or endorsed by ZENJI. Product names
and colourways reference the public Origin Drop for brand fit. All artwork on this page is
original.*

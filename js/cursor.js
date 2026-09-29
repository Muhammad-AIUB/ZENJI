// Custom ink cursor: a dot that tracks the pointer exactly and a ring that trails it.
// Only for real mice (hover + fine pointer) and never under reduced motion; touch and
// keyboard users keep the native behaviour. The rAF loop runs only while the ring is
// still catching up, so an idle page costs nothing.

const INTERACTIVE = "a, button, summary, label, [role='button'], [data-cursor]";

export function initCursor(dialog) {
  const canUse =
    matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    matchMedia("(min-width: 721px)").matches;
  const root = document.querySelector("[data-cursor-root]");
  if (!canUse || !root) return;

  const ring = root.querySelector(".cursor-ring");
  const skew = root.querySelector(".cursor-skew");
  const dot = root.querySelector(".cursor-dot");
  const label = root.querySelector(".cursor-label");

  // Put the cursor in the top layer so it also draws above the modal cart.
  const popover = typeof root.showPopover === "function";
  const raise = () => {
    if (!popover) return;
    if (root.matches(":popover-open")) root.hidePopover();
    root.showPopover();
  };
  if (popover) {
    root.popover = "manual";
    document.documentElement.classList.add("cursor-top");
  }
  raise();
  document.documentElement.classList.add("has-cursor");

  let x = -100, y = -100;          // raw pointer (snaps instantly)
  let dx = -100, dy = -100;        // dot (1:1 with pointer, runs every frame so it never trails)
  let rx = -100, ry = -100;        // ring (tight lerp — feels alive, not laggy)
  let tx = -100, ty = -100;        // outer "skew" ring (looser, gives motion sense)
  let vx = 0, vy = 0;              // velocity for tilt/squash
  let raf = 0;
  let lastMove = 0;

  const follow = (now) => {
    const dt = Math.min(48, lastMove ? now - lastMove : 16) / 16; // normalise to ~60fps frames

    // Dot: glide ~85% per frame so it stays glued to the pointer even between events.
    dx += (x - dx) * 0.85;
    dy += (y - dy) * 0.85;

    // Ring: tighter than before, frame-rate-independent.
    const ringEase = 1 - Math.pow(0.0001, dt);
    rx += (x - rx) * ringEase;
    ry += (y - ry) * ringEase;

    // Outer skew ring: looser so it visibly drags behind quick moves.
    const trailEase = 1 - Math.pow(0.02, dt);
    tx += (x - tx) * trailEase;
    ty += (y - ty) * trailEase;

    // Velocity (EMA) drives tilt + squash on the dot.
    vx = vx * 0.7 + (x - dx) * 0.3;
    vy = vy * 0.7 + (y - dy) * 0.3;

    dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) rotate(${vx * 0.4}deg) scale(${1 + Math.min(0.45, Math.hypot(vx, vy) * 0.02)}, ${1 - Math.min(0.35, Math.hypot(vx, vy) * 0.015)})`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    skew.style.transform = `translate3d(${tx}px, ${ty}px, 0) skewX(${vx * 0.6}deg)`;

    const settled = Math.hypot(x - rx, y - ry) < 0.15 && Math.hypot(vx, vy) < 0.05;
    raf = settled ? 0 : requestAnimationFrame(follow);
    if (raf) lastMove = now;
  };

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!root.classList.contains("is-visible")) {
        dx = rx = tx = x;
        dy = ry = ty = y;
        root.classList.add("is-visible");
      }
      if (!raf) {
        lastMove = performance.now();
        raf = requestAnimationFrame(follow);
      }
    },
    { passive: true }
  );

  document.addEventListener("pointerover", (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest("input[type='number']")) {
      root.dataset.state = "native"; // let the text caret show
      return;
    }
    const hit = target.closest(INTERACTIVE);
    let text = hit?.dataset.cursor || "";

    // Size picker: if we're over a <label for="…"> that points at a size radio, turn the
    // cursor into a hangtag showing that size.
    if (!text && hit?.tagName === "LABEL" && hit.htmlFor) {
      const radio = document.getElementById(hit.htmlFor);
      const sizeRadio = radio?.closest(".size") ?? null;
      if (sizeRadio) {
        const span = sizeRadio.querySelector("span");
        if (span) {
          text = `Size ${span.textContent.trim()}`;
          root.dataset.state = "size";
          label.textContent = text;
          return;
        }
      }
    }

    label.textContent = text;
    root.dataset.state = text ? "label" : hit ? "link" : "";
  });

  document.documentElement.addEventListener("pointerleave", () => root.classList.remove("is-visible"));
  document.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) {
      root.dataset.state = "";
      label.textContent = "";
    }
  });
  addEventListener("pointerdown", () => root.classList.add("is-down"));
  addEventListener("pointerup", () => root.classList.remove("is-down"));

  if (dialog) {
    new MutationObserver(() => dialog.open && raise()).observe(dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
  }

  // Re-check on viewport resize (laptop folded into tablet mode, phone rotated).
  matchMedia("(min-width: 721px)").addEventListener("change", (e) => {
    if (!e.matches) {
      root.dataset.state = "";
      label.textContent = "";
      root.classList.remove("is-visible", "is-down");
      document.documentElement.classList.remove("has-cursor");
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else {
      document.documentElement.classList.add("has-cursor");
    }
  });
}

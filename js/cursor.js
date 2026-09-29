// Custom ink cursor: a dot that tracks the pointer exactly and a ring that trails it.
// Only for real mice (hover + fine pointer) and never under reduced motion; touch and
// keyboard users keep the native behaviour. The rAF loop runs only while the ring is
// still catching up, so an idle page costs nothing.

const INTERACTIVE = "a, button, summary, label, [role='button'], [data-cursor]";

export function initCursor(dialog) {
  const canUse =
    matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.querySelector("[data-cursor-root]");
  if (!canUse || !root) return;

  const ring = root.querySelector(".cursor-ring");
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

  let x = -100, y = -100, rx = x, ry = y;
  let raf = 0;

  const follow = () => {
    rx += (x - rx) * 0.22;
    ry += (y - ry) * 0.22;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(follow) : 0;
  };

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!root.classList.contains("is-visible")) {
        rx = x;
        ry = y;
        root.classList.add("is-visible");
      }
      if (!raf) raf = requestAnimationFrame(follow);
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
    const text = hit?.dataset.cursor || "";
    label.textContent = text;
    root.dataset.state = text ? "label" : hit ? "link" : "";
  });

  document.documentElement.addEventListener("pointerleave", () => root.classList.remove("is-visible"));
  addEventListener("pointerdown", () => root.classList.add("is-down"));
  addEventListener("pointerup", () => root.classList.remove("is-down"));

  if (dialog) {
    new MutationObserver(() => dialog.open && raise()).observe(dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });
  }
}

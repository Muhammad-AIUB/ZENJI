// 3D perspective tile carousel that loops forever. Each tile's pose is a pure function of
// its signed, wrapped distance `d` from the centre, so wrapping around never "jumps".

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Signed distance of tile `i` from position `pos`, wrapped into [-n/2, n/2). */
export const wrapOffset = (i, pos, n) => ((((i - pos + n / 2) % n) + n) % n) - n / 2;

/** Pose for a tile `d` steps from the centre. `tileW` is the tile width in px. */
export function orbitPose(d, tileW) {
  const a = Math.abs(d);
  return {
    x: d * tileW * 0.66,
    z: -Math.min(a, 3) * 150,
    rotY: clamp(0 - d * 52, -66, 66),
    scale: 1 - Math.min(a, 2) * 0.06,
    opacity: clamp(1 - (a - 1.7) / 0.8, 0, 1),
    dim: Math.min(0.65, a * 0.3),
    zIndex: Math.round(100 - a * 10),
  };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function setupOrbit({ products, teeSVG, formatPrice, openDetail }) {
  const root = document.querySelector("[data-orbit]");
  if (!root) return;
  const stage = root.querySelector("[data-orbit-stage]");
  const track = root.querySelector("[data-orbit-track]");
  const status = root.querySelector("[data-orbit-status]");
  const toggle = root.querySelector("[data-orbit-toggle]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const n = products.length;

  track.innerHTML = products
    .map(
      (p, i) => `
    <button type="button" class="orbit-tile" style="--garment:${p.garment}" data-i="${i}" tabindex="-1"
      aria-label="${esc(p.name)} Tee, ${i + 1} of ${n}">
      <span class="orbit-no mono" aria-hidden="true">No.${String(i + 1).padStart(2, "0")}</span>
      <span class="orbit-kanji" aria-hidden="true">${p.kanji}</span>
      <span class="orbit-tee">${teeSVG(p)}</span>
      <span class="orbit-cap" aria-hidden="true"><strong>${esc(p.name)}</strong><span class="mono">${formatPrice(p.price)}</span></span>
    </button>`
    )
    .join("");
  const tiles = [...track.children];

  let pos = 0;
  let target = 0;
  let tileW = 300;
  let raf = 0;
  let last = 0;
  let timer = 0;
  let playing = !reduced.matches;
  let hovering = false;
  let focused = false;
  let visible = false;

  const activeIndex = () => ((Math.round(target) % n) + n) % n;

  const render = () => {
    tiles.forEach((el, i) => {
      const s = orbitPose(wrapOffset(i, pos, n), tileW);
      el.style.transform = `translate(-50%, -50%) translate3d(${s.x}px, 0, ${s.z}px) rotateY(${s.rotY}deg) scale(${s.scale})`;
      el.style.opacity = s.opacity;
      el.style.zIndex = s.zIndex;
      el.style.setProperty("--dim", s.dim);
      el.style.pointerEvents = s.opacity < 0.2 ? "none" : "";
    });
  };

  const syncActive = () => {
    const a = activeIndex();
    tiles.forEach((el, i) => {
      el.tabIndex = i === a ? 0 : -1;
      el.setAttribute("aria-current", String(i === a));
    });
    status.textContent = `${products[a].name} Tee · ${a + 1} of ${n}`;
    // Keep keyboard focus on the centred tile as it changes.
    if (track.contains(document.activeElement) && document.activeElement !== tiles[a]) {
      tiles[a].focus({ preventScroll: true });
    }
  };

  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pos += (target - pos) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(target - pos) < 0.002) {
      pos = target;
      raf = 0;
      render();
      return;
    }
    render();
    raf = requestAnimationFrame(tick);
  };

  const animate = () => {
    if (reduced.matches) {
      pos = target;
      render();
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };

  const schedule = () => {
    clearInterval(timer);
    const hold = hovering || focused;
    // Announce changes only when the carousel isn't rotating by itself.
    status.setAttribute("aria-live", playing && !hold ? "off" : "polite");
    if (playing && !hold && visible) timer = setInterval(() => go(target + 1), 3200);
  };

  const go = (t) => {
    target = t;
    syncActive();
    animate();
    schedule();
  };

  /* Controls */
  root.querySelectorAll("[data-orbit-step]").forEach((b) =>
    b.addEventListener("click", () => go(Math.round(target) + Number(b.dataset.orbitStep)))
  );
  toggle.setAttribute("aria-pressed", String(playing));
  toggle.addEventListener("click", () => {
    playing = !playing;
    toggle.setAttribute("aria-pressed", String(playing));
    schedule();
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      go(Math.round(target) + (e.key === "ArrowRight" ? 1 : -1));
    }
  });

  /* Tiles: side tiles rotate to centre, the centre tile opens its details. */
  track.addEventListener("click", (e) => {
    const tile = e.target.closest(".orbit-tile");
    if (!tile) return;
    const i = Number(tile.dataset.i);
    if (i === activeIndex()) openDetail(products[i].id);
    else go(Math.round(target + wrapOffset(i, target, n)));
  });

  /* Drag / swipe */
  let dragging = false;
  let dragged = false;
  let startX = 0;
  let startPos = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    dragged = false;
    startX = e.clientX;
    startPos = pos;
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!dragged && Math.abs(dx) < 6) return;
    if (!dragged) {
      dragged = true;
      stage.setPointerCapture(e.pointerId);
      cancelAnimationFrame(raf);
      raf = 0;
      stage.classList.add("is-dragging");
    }
    pos = startPos - dx / (tileW * 0.66);
    target = pos;
    render();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (dragged) go(Math.round(pos));
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener(
    "click",
    (e) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    },
    true
  );

  /* Pause while the user is interacting or the section is off screen. */
  root.addEventListener("pointerenter", () => ((hovering = true), schedule()));
  root.addEventListener("pointerleave", () => ((hovering = false), schedule()));
  root.addEventListener("focusin", () => ((focused = true), schedule()));
  root.addEventListener("focusout", () => ((focused = false), schedule()));
  new IntersectionObserver(([entry]) => ((visible = entry.isIntersecting), schedule())).observe(root);

  const measure = () => {
    tileW = tiles[0].offsetWidth || tileW;
    render();
  };
  window.addEventListener("resize", measure);

  measure();
  syncActive();
  schedule();
}

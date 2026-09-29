// GSAP-driven scroll reveal.
//
// Replaces the old IntersectionObserver + CSS transition system. Every
// [data-reveal] element animates in once as it scrolls into view. Heading
// text is split into per-character spans that fly in from alternating left
// and right (even index → from the left, odd → from the right).
//
// Honors `prefers-reduced-motion: reduce`: when set, no initial states are
// applied and content stays visible.

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

// GSAP and ScrollTrigger are loaded via <script> tags in index.html and
// attach to `window`. Bail gracefully if the CDN failed. We also retry for
// up to ~2s in case the module script beats the classic deferred scripts to
// execution (browser-dependent).
function getGsap() {
  if (typeof window === "undefined") return null;
  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    return window.gsap;
  }
  return null;
}

// Wait until `window.gsap` and `window.ScrollTrigger` exist, then resolve.
// Resolves immediately if they're already there. Caps at 2.5s.
function whenGsapReady() {
  return new Promise((resolve) => {
    if (getGsap()) return resolve(window.gsap);
    const start = performance.now();
    const tick = () => {
      if (getGsap()) return resolve(window.gsap);
      if (performance.now() - start > 2500) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// Walk the text nodes of an element and wrap every character in a
// <span class="ch">. CJK and surrogate pairs split correctly via Array.from.
// Spaces become non-breaking-space spans so word width is preserved.
function splitCharacters(el) {
  const text = el.textContent;
  if (!text) return [];
  const chars = Array.from(text);
  const html = chars
    .map((ch, i) => {
      if (ch === " " || ch === "\u00A0") {
        return `<span class="ch ch--space" style="--i:${i}" aria-hidden="true">&nbsp;</span>`;
      }
      return `<span class="ch" style="--i:${i}" aria-hidden="true">${ch}</span>`;
    })
    .join("");
  el.setAttribute("aria-label", text.trim());
  el.innerHTML = html;
  return $$(".ch", el);
}

// Walk text nodes of an element so we only wrap the visible string (skipping
// any existing inline tags). Returns the new character spans.
function splitCharactersSafe(el) {
  const text = el.textContent;
  if (!text || !text.trim()) return [];
  return splitCharacters(el);
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Apply the per-character alternating left/right animation to a list of
// .ch spans. Returns the GSAP timeline so callers can prepend it.
function buildCharTimeline(gsap, chars, baseDelay = 0) {
  if (!chars.length) return null;
  const tl = gsap.timeline({ paused: true });
  chars.forEach((ch, i) => {
    const fromLeft = i % 2 === 0;
    gsap.set(ch, {
      xPercent: fromLeft ? -120 : 120,
      opacity: 0,
      force3D: true,
    });
    tl.to(
      ch,
      {
        xPercent: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
      },
      baseDelay + i * 0.04
    );
  });
  return tl;
}

// Per-variant animation builders. Each receives the gsap instance, the
// element, and the freshly split character spans (may be empty).
const variants = {
  // Per-character alternating L/R, no panel-level motion here — the panel
  // container handles its own left/right slide.
  "letters-tight"(gsap, el, chars) {
    return buildCharTimeline(gsap, chars);
  },

  // Same treatment for the footer ZENJI mark.
  letters(gsap, el, chars) {
    return buildCharTimeline(gsap, chars);
  },

  // Horizontal wipe reveal for section titles.
  clip(gsap, el) {
    return gsap.fromTo(
      el,
      { clipPath: "inset(0 100% 0 0)", opacity: 1 },
      {
        clipPath: "inset(0 0% 0 0)",
        duration: 0.8,
        ease: "power4.inOut",
      }
    );
  },

  // Plain vertical slide-up, opacity included.
  up(gsap, el) {
    const d = Number(el.style.getPropertyValue("--d")) || 0;
    return gsap.fromTo(
      el,
      { y: 36, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
        delay: d * 0.08,
      }
    );
  },

  // Panel slides in from the left.
  left(gsap, el, chars) {
    const tl = gsap.timeline().fromTo(
      el,
      { x: -56, rotation: -1.5, opacity: 0 },
      {
        x: 0,
        rotation: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
      }
    );
    const charTl = buildCharTimeline(gsap, chars, 0.15);
    if (charTl) {
      tl.add(charTl.paused(false), "<");
    }
    return tl;
  },

  // Panel slides in from the right.
  right(gsap, el, chars) {
    const tl = gsap.timeline().fromTo(
      el,
      { x: 56, rotation: 1.5, opacity: 0 },
      {
        x: 0,
        rotation: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out",
      }
    );
    const charTl = buildCharTimeline(gsap, chars, 0.15);
    if (charTl) {
      tl.add(charTl.paused(false), "<");
    }
    return tl;
  },

  // Scale-up reveal for the middle story panel.
  scale(gsap, el, chars) {
    const tl = gsap.timeline().fromTo(
      el,
      { scale: 0.92, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
      }
    );
    const charTl = buildCharTimeline(gsap, chars, 0.15);
    if (charTl) {
      tl.add(charTl.paused(false), "<");
    }
    return tl;
  },
};

// Wire one element: split text if needed, build its timeline, attach a
// ScrollTrigger that plays the timeline once when 15% in from the bottom.
function wire(gsap, el) {
  if (el.dataset.revealed === "1") return;
  const variant = el.dataset.reveal;
  const builder = variants[variant];
  if (!builder) return;

  // Pre-split character spans for variants that need them.
  let chars = [];
  if (variant === "letters-tight" || variant === "letters") {
    chars = splitCharactersSafe(el);
  } else if (variant === "left" || variant === "right" || variant === "scale") {
    // For panel-level slides, also split the inner <h3 data-reveal="letters-tight">
    // so the heading characters fly in too. We don't split the panel itself.
    const heading = el.querySelector('[data-reveal="letters-tight"]');
    if (heading && heading.dataset.revealed !== "1") {
      chars = splitCharactersSafe(heading);
      heading.dataset.revealed = "1";
    }
  }

  const tween = builder(gsap, el, chars);
  if (!tween) return;

  // Allow callers (init/refresh) to play the animation immediately if the
  // element is already in view — we just trust ScrollTrigger's start.
  window.ScrollTrigger.create({
    trigger: el,
    start: "clamp(top 85%)",
    once: true,
    animation: tween,
  });

  el.dataset.revealed = "1";
}

// One-shot init: runs on page load. Batched FAQ details get one ScrollTrigger
// shared between siblings for a tidy stagger.
export async function initReveal() {
  if (reducedMotion.matches) return;

  const gsap = await whenGsapReady();
  if (!gsap) return;

  // Footer mark: per-character alternating L/R (it's a one-off, no ScrollTrigger
  // batching matters).
  const footerMark = $(".footer-mark");
  if (footerMark) wire(gsap, footerMark);

  // FAQ details benefit from a ScrollTrigger batch so they stagger cleanly as
  // the user scrolls past them.
  const faqDetails = $$(".faq details[data-reveal='up']");
  if (faqDetails.length) {
    faqDetails.forEach((d) => (d.dataset.revealed = "1")); // skip in main sweep
    gsap.set(faqDetails, { y: 36, opacity: 0 });
    window.ScrollTrigger.batch(faqDetails, {
      start: "clamp(top 85%)",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
        }),
    });
  }

  // Everything else: wire individually.
  $$("[data-reveal]").forEach((el) => {
    if (el.dataset.revealed === "1") return;
    if (faqDetails.includes(el)) return;
    wire(gsap, el);
  });

  // Recalculate trigger positions once web fonts have settled so titles
  // don't reflow mid-animation.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.ScrollTrigger.refresh());
  }
}

// Called after dynamic content (like the product grid) is re-rendered.
// Re-scans `root` (default: document) for un-revealed [data-reveal] nodes.
export async function refreshReveals(root = document) {
  if (reducedMotion.matches) return;
  const gsap = await whenGsapReady();
  if (!gsap) return;

  $$("[data-reveal]", root).forEach((el) => wire(gsap, el));
  window.ScrollTrigger.refresh();
}

// Split each child of a hero title line into per-character spans and animate
// them from alternating left/right. Returns the resulting timeline.
//
// The hero <h1> structure is:
//   <h1 class="hero-title">
//     <span class="line"><span>Wear</span></span>
//     <span class="line"><span>the</span> <em>Arc.</em></span>
//   </h1>
// We want characters from the whole title to share one continuous index, so
// the alternating L/R pattern flows across line breaks.
function animateHeroTitle(gsap, h1) {
  // Collect all leaf text-bearers in document order: each direct <span>/<em>
  // inside .line children. Walk in order, splitting each leaf's text.
  const leaves = [];
  $$(".line > span, .line > em", h1).forEach((leaf) => leaves.push(leaf));
  if (!leaves.length) return null;

  // Build per-character spans for each leaf, tracking the global char index
  // so the alternating L/R pattern flows across leaves.
  let charIndex = 0;
  const allChars = [];
  leaves.forEach((leaf) => {
    const text = leaf.textContent;
    if (!text) return;
    const chars = Array.from(text);
    const html = chars
      .map((ch) => {
        if (ch === " " || ch === "\u00A0") {
          return `<span class="ch ch--space" aria-hidden="true">&nbsp;</span>`;
        }
        const i = charIndex++;
        return `<span class="ch" style="--i:${i}" aria-hidden="true">${ch}</span>`;
      })
      .join("");
    leaf.innerHTML = html;
    leaf.setAttribute("aria-label", text);
    $$(".ch", leaf).forEach((c) => allChars.push(c));
  });

  // Build the timeline: set initial states, then animate each character in
  // with a position parameter so the stagger is 0.04s per char.
  const tl = gsap.timeline({ paused: true });
  allChars.forEach((ch, i) => {
    const fromLeft = i % 2 === 0;
    gsap.set(ch, {
      xPercent: fromLeft ? -120 : 120,
      yPercent: 8,
      opacity: 0,
      force3D: true,
    });
    tl.to(
      ch,
      {
        xPercent: 0,
        yPercent: 0,
        opacity: 1,
        duration: 0.75,
        ease: "power3.out",
      },
      i * 0.04
    );
  });
  return tl;
}

// On-load hero entrance: multi-element staggered timeline. No scroll trigger —
// plays once when the page loads. Gives the first paint some motion without
// competing with the auto-rotating hero pager.
export async function initHeroReveal() {
  if (reducedMotion.matches) return;
  const gsap = await whenGsapReady();
  if (!gsap) return;

  const hero = $(".hero");
  if (!hero) return;

  const h1 = $(".hero-title", hero);
  const eyebrow = $(".eyebrow", hero);
  const copy = $(".hero-copy", hero);
  const actions = $(".hero-actions", hero);
  const feature = $(".panel-feature", hero);
  const vertical = $(".panel-vertical", hero);
  const stats = $(".panel-stats", hero);

  // Set initial states for non-character elements.
  const slideEls = [eyebrow, copy, actions, stats].filter(Boolean);
  gsap.set(slideEls, { y: 36, opacity: 0 });
  if (feature) gsap.set(feature, { scale: 0.94, opacity: 0 });
  if (vertical) gsap.set(vertical, { x: -40, opacity: 0 });

  // Build the master timeline.
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // Hero title characters animate in first, fastest stagger.
  if (h1) {
    const charTl = animateHeroTitle(gsap, h1);
    if (charTl) tl.add(charTl.paused(false), 0);
  }

  // Eyebrow, copy, and buttons follow in a quick cascade.
  if (eyebrow) tl.to(eyebrow, { y: 0, opacity: 1, duration: 0.7 }, 0.15);
  if (copy) tl.to(copy, { y: 0, opacity: 1, duration: 0.7 }, 0.3);
  if (actions) tl.to(actions, { y: 0, opacity: 1, duration: 0.7 }, 0.45);

  // The feature panel (manga spread) scales in slightly after the headline.
  if (feature) tl.to(feature, { scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" }, 0.4);

  // Vertical kanji panel slides in from the left.
  if (vertical) tl.to(vertical, { x: 0, opacity: 1, duration: 0.9 }, 0.55);

  // Stats panel comes last.
  if (stats) tl.to(stats, { y: 0, opacity: 1, duration: 0.7 }, 0.7);

  tl.play();
}

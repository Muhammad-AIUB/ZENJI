// Draws each tee as inline SVG: an oversized silhouette in the product colourway
// plus a motif printed on the chest. No photography needed, so every image is ours.

const ACCENT = "#ff3d1f";
let renderCount = 0; // keeps SVG ids unique when a tee is drawn more than once

const SILHOUETTE =
  "M104 22 C120 40 180 40 196 22 L258 42 Q274 48 280 62 L300 122 L252 142 L238 112 " +
  "L240 304 Q150 316 60 304 L62 112 L48 142 L0 122 L20 62 Q26 48 42 42 Z";

const motifs = {
  flame: (ink) => `
    <circle cx="150" cy="150" r="46" fill="none" stroke="${ink}" stroke-width="3"/>
    <path d="M150 92 C168 120 184 130 176 160 C172 176 160 186 150 188 C140 186 128 176 124 160
      C120 142 132 130 138 116 C140 132 146 138 150 140 C150 124 146 110 150 92 Z"
      fill="${ACCENT}" opacity=".92"/>
    <path d="M150 128 C160 146 166 156 160 170 C156 178 144 178 140 170 C136 158 146 150 150 128 Z" fill="${ink}"/>`,
  slash: (ink) => `
    <path d="M92 204 L208 96" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
    <path d="M100 206 L214 104" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round"/>
    <path d="M168 140 q2 18 0 26 a4 4 0 0 1 -8 0 q-2 -8 0 -22 Z M132 172 q2 12 0 18 a3.5 3.5 0 0 1 -7 0 q-1 -6 0 -14 Z"
      fill="${ACCENT}"/>`,
  void: (ink) => `
    ${[56, 44, 32, 20]
      .map((r, i) => `<circle cx="150" cy="148" r="${r}" fill="none" stroke="${i === 3 ? ACCENT : ink}" stroke-width="${i === 3 ? 4 : 1.6}" ${i === 1 ? 'stroke-dasharray="4 5"' : ""}/>`)
      .join("")}
    <circle cx="150" cy="148" r="8" fill="${ink}"/>`,
  wave: (ink, uid) => {
    // Seigaiha (overlapping wave) pattern clipped to a circle.
    let arcs = "";
    for (let row = 0; row < 6; row++) {
      for (let col = -1; col < 6; col++) {
        const x = 96 + col * 24 + (row % 2) * 12;
        const y = 108 + row * 14;
        arcs += `<path d="M${x - 12} ${y} a12 12 0 0 1 24 0" fill="none" stroke="${ink}" stroke-width="1.6"/>`;
      }
    }
    return `<clipPath id="wave-${uid}"><circle cx="150" cy="148" r="50"/></clipPath>
      <g clip-path="url(#wave-${uid})">${arcs}</g>
      <circle cx="150" cy="148" r="50" fill="none" stroke="${ACCENT}" stroke-width="3"/>`;
  },
  sun: (ink) => `
    ${Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      const [r1, r2] = i % 2 ? [40, 54] : [40, 64];
      return `<line x1="${150 + Math.cos(a) * r1}" y1="${148 + Math.sin(a) * r1}"
        x2="${150 + Math.cos(a) * r2}" y2="${148 + Math.sin(a) * r2}" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`;
    }).join("")}
    <circle cx="150" cy="148" r="32" fill="${ACCENT}"/>`,
  blade: (ink) => `
    <path d="M150 84 L150 196" stroke="${ink}" stroke-width="3"/>
    <path d="M146 88 L150 76 L154 88 L154 184 L146 184 Z" fill="${ink}"/>
    <rect x="136" y="184" width="28" height="5" rx="2" fill="${ACCENT}"/>
    <rect x="146" y="189" width="8" height="24" fill="${ink}"/>
    <circle cx="150" cy="140" r="54" fill="none" stroke="${ink}" stroke-width="1.4" stroke-dasharray="2 6"/>`,
};

/**
 * @param {object} p product from products.js
 * @param {{ title?: boolean }} [opts] include an accessible <title> (off when a caption already names it)
 */
export function teeSVG(p, { title = false } = {}) {
  const uid = `${p.id}-${++renderCount}`;
  const shade = `shade-${uid}`;
  const kanjiSize = p.kanji.length > 2 ? 17 : p.kanji.length > 1 ? 22 : 28;
  return `
  <svg class="tee" viewBox="0 0 300 320" ${title ? 'role="img"' : 'aria-hidden="true"'} focusable="false">
    ${title ? `<title>${p.name} tee in ${p.colorway}</title>` : ""}
    <defs>
      <linearGradient id="${shade}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".16"/>
        <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".28"/>
      </linearGradient>
    </defs>
    <path d="${SILHOUETTE}" fill="${p.garment}"/>
    <path d="${SILHOUETTE}" fill="url(#${shade})"/>
    <path d="M104 22 C120 44 180 44 196 22" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="5"/>
    <path d="M62 112 L60 70 M238 112 L240 70" stroke="#000" stroke-opacity=".14" stroke-width="2"/>
    <path d="M100 250 q50 14 100 0" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="10"/>
    ${motifs[p.motif](p.ink, uid)}
    <text x="150" y="${p.motif === "blade" ? 238 : 232}" text-anchor="middle" class="tee-kanji"
      font-size="${kanjiSize}" fill="${p.ink}">${p.kanji}</text>
    <text x="150" y="256" text-anchor="middle" class="tee-word" fill="${p.ink}" opacity=".75">ZENJI · 力</text>
  </svg>`;
}

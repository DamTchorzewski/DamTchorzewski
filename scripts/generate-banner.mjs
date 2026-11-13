/**
 * Generates the main README banner (light + dark variants) as a small animated SVG:
 *  - img/banner/damreboot-dark.svg
 *  - img/banner/damreboot-light.svg
 *
 * Made to read in a second: everything is centered - the wordmark (the two "o" of "DamReboot" are a visor with blinking
 * eyes), the role and the four areas of work as chips under a thin line in their colors. The background carries the story: four soft glows, one
 * under each area in the order of the line (frontend, architecture, backend, devops - the colors of the README), over
 * a fine grid and a few dots that fade out towards the edges.
 *
 * Animation is kept to the minimum (pure CSS @keyframes, which GitHub renders when the file is used via <img>): the
 * eyes blink, the glows slowly breathe, a sheen sweeps over the wordmark and the dots of the background twinkle. It respects prefers-reduced-motion; the static state is a complete picture.
 * Text is pinned with textLength so the layout does not depend on the viewer's fonts.
 * Run when the banner changes: node scripts/generate-banner.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "img/banner");
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const SANS = "'Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',Arial,sans-serif";

const W = 1200;
const H = 260;

const THEMES = {
  dark: {
    bg: ["#0f1620", "#0b1017"], border: "#232c3a", grid: "#2a3647", dots: "#7dd3fc", sheen: "#22d3ee", accent2: "#22d3ee", glow: 0.42,
    word: ["#ffffff", "#b9e6ff"], muted: "#8b949e", pillar: "#9fb3c8", chip: ["#ffffff", 0.05, "#ffffff", 0.16],
    domains: ["#22d3ee", "#38bdf8", "#4ade80", "#c084fc"],
  },
  light: {
    bg: ["#ffffff", "#f1f6fb"], border: "#d0d7de", grid: "#cfdbe8", dots: "#0b7bb8", sheen: "#ffffff", accent2: "#0e7490", glow: 0.24,
    word: ["#0b1a33", "#0b5f95"], muted: "#57606a", pillar: "#425466", chip: ["#ffffff", 0.8, "#8aa4bd", 0.45],
    domains: ["#0e7490", "#0b7bb8", "#1a7f37", "#8250df"],
  },
};

// frontend first: it is the main area of work
const PILLARS = ["FRONTEND", "ARCHITECTURE", "BACKEND", "DEVOPS"];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Monospace token pinned to its width. `ls` adds letter spacing (px) on top of the natural advance. */
function mono(t, x, y, fill, { size = 14, weight = "", ls = 0 } = {}) {
  const len = t.length * (size * 0.6 + ls);
  return `<text x="${x.toFixed(1)}" y="${y}" textLength="${len.toFixed(1)}" lengthAdjust="spacing" xml:space="preserve" style="font:${weight}${size}px ${MONO};fill:${fill}">${esc(t)}</text>`;
}

// deterministic random numbers, so regenerating gives the same picture
let seed = 9;
const rnd = () => ((seed = (seed + 0x6d2b79f5) | 0), ((t) => ((t = Math.imul(t ^ (t >>> 15), t | 1)), (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)), ((t ^ (t >>> 14)) >>> 0) / 4294967296))(seed));

function banner(theme, c) {
  seed = 9; // identical layout in both themes

  // wordmark: "DamReb" + visor (the two o) + "t", every part pinned to its slot; it all scales with the font size
  const FS = 66;
  const S = FS / 104;
  const DW = Math.round(426 * S); // width of "DamReb"
  const GAP1 = Math.round(8 * S);
  const VW = Math.round(126 * S);
  const VH = Math.round(62 * S);
  const GAP2 = Math.round(12 * S);
  const TW = Math.round(47 * S);
  const total = DW + GAP1 + VW + GAP2 + TW;
  const WX = Math.round((W - total) / 2);
  const BASE = 104;
  const VX = WX + DW + GAP1;
  const VY = BASE - Math.round(56 * S);
  const eyes = [VX + Math.round(33 * S), VX + VW - Math.round(33 * S)];

  // the role, centered
  const SUB_W = 250;
  const SUB_X = Math.round((W - SUB_W) / 2);

  // the four areas of work as glassy chips (frontend highlighted), centered as a whole
  const CS = 12.5;
  const CLS = 2.2;
  const CH = 28;
  const CY = 174;
  const chipW = PILLARS.map((word) => Math.round(word.length * (CS * 0.6 + CLS) + 46));
  const CGAP = 10;
  const rowW = chipW.reduce((x, y) => x + y, 0) + CGAP * (PILLARS.length - 1);
  let px = Math.round((W - rowW) / 2);
  const rowX = px;
  const pillars = PILLARS.map((word, i) => {
    const col = c.domains[i];
    const hot = i === 0;
    const out = `<rect x="${px + 0.5}" y="${CY + 0.5}" width="${chipW[i] - 1}" height="${CH - 1}" rx="${CH / 2}" fill="${hot ? col : c.chip[0]}" fill-opacity="${hot ? 0.14 : c.chip[1]}" stroke="${hot ? col : c.chip[2]}" stroke-opacity="${hot ? 0.95 : c.chip[3]}"/>
<circle cx="${px + 15}" cy="${CY + CH / 2}" r="3.5" fill="${col}"/>
${mono(word, px + 28, CY + 18.4, hot ? c.word[1] : c.pillar, { size: CS, weight: hot ? "700 " : "600 ", ls: CLS })}`;
    px += chipW[i] + CGAP;
    return out;
  }).join("\n");
  // thin line in the four area colors between the role and the chips
  const LY = 159;
  const colorLine = `<rect x="${rowX}" y="${LY - 2}" width="${rowW}" height="5" rx="2.5" fill="url(#bar)" opacity=".5" filter="url(#blur)"/>
<rect x="${rowX}" y="${LY - 1}" width="${rowW}" height="2" rx="1" fill="url(#bar)"/>`;

  // background: a glow under each area, in the order of the line
  const glowX = [210, 470, 730, 990];
  const glows = glowX
    .map((x, i) => `<ellipse class="breathe" cx="${x}" cy="232" rx="270" ry="130" fill="url(#g${i})" style="animation-delay:${(i * 1.6).toFixed(1)}s"/>`)
    .join("\n");
  const grid = Array.from({ length: Math.floor(W / 40) + 1 }, (_, i) => `<path d="M${i * 40 + 0.5} 0V${H}"/>`).join("") + Array.from({ length: Math.floor(H / 40) + 1 }, (_, i) => `<path d="M0 ${i * 40 + 0.5}H${W}"/>`).join("");
  // background dots stay out of the text block, so none of them can be mistaken for a character
  const dotList = [];
  while (dotList.length < 46) {
    const x = rnd() * W;
    const y = rnd() * H;
    if (x > 330 && x < 870 && y > 36 && y < 232) continue;
    dotList.push(`<circle class="tw" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.7 + rnd() * 1.3).toFixed(1)}" fill-opacity="${(0.3 + rnd() * 0.5).toFixed(2)}" style="animation-duration:${(4 + rnd() * 5).toFixed(1)}s;animation-delay:-${(rnd() * 9).toFixed(1)}s"/>`);
  }
  const dots = dotList.join("");
  const gradients = c.domains
    .map((col, i) => `<radialGradient id="g${i}"><stop offset="0" stop-color="${col}" stop-opacity="${c.glow}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`)
    .join("\n");

  const label = "DamReboot: Full-Stack Developer. Frontend, architecture, backend, DevOps.";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<defs>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></linearGradient>
${gradients}
<radialGradient id="fade" cx="600" cy="130" r="640" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="fadeMask"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
<radialGradient id="halo"><stop offset="0" stop-color="${c.accent2}" stop-opacity="${c.glow * 0.55}"/><stop offset="1" stop-color="${c.accent2}" stop-opacity="0"/></radialGradient>
<linearGradient id="bar" x1="0" x2="1"><stop offset="0" stop-color="${c.domains[0]}" stop-opacity="0"/><stop offset=".14" stop-color="${c.domains[0]}"/><stop offset=".4" stop-color="${c.domains[1]}"/><stop offset=".65" stop-color="${c.domains[2]}"/><stop offset=".86" stop-color="${c.domains[3]}"/><stop offset="1" stop-color="${c.domains[3]}" stop-opacity="0"/></linearGradient>
<linearGradient id="sheenGrad" x1="0" x2="1"><stop offset="0" stop-color="${c.sheen}" stop-opacity="0"/><stop offset=".5" stop-color="${c.sheen}" stop-opacity=".85"/><stop offset="1" stop-color="${c.sheen}" stop-opacity="0"/></linearGradient>
<clipPath id="wordClip"><text x="${WX}" y="${BASE}" textLength="${DW}" lengthAdjust="spacingAndGlyphs" style="font:800 ${FS}px ${SANS}">DamReb</text><rect x="${VX}" y="${VY}" width="${VW}" height="${VH}" rx="${VH / 2}"/><text x="${VX + VW + GAP2}" y="${BASE}" textLength="${TW}" lengthAdjust="spacingAndGlyphs" style="font:800 ${FS}px ${SANS}">t</text></clipPath>
<linearGradient id="word" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.word[0]}"/><stop offset="1" stop-color="${c.word[1]}"/></linearGradient>
<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14213d"/><stop offset="1" stop-color="#070d1c"/></linearGradient>
<filter id="blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>
<style>
.eye{transform-box:fill-box;transform-origin:50% 50%;animation:eyes 5.5s ease-in-out infinite}
@keyframes eyes{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.08)}}
.breathe{animation:breathe 9s ease-in-out infinite}
@keyframes breathe{50%{opacity:.55}}
.tw{animation:tw 6s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.12}}
.sheen{animation:sheen 12s ease-in-out infinite 1s}
@keyframes sheen{0%{transform:translateX(0) skewX(-20deg)}12%{transform:translateX(${total + 220}px) skewX(-20deg)}100%{transform:translateX(${total + 220}px) skewX(-20deg)}}
@media (prefers-reduced-motion:reduce){.eye,.breathe,.tw,.sheen{animation:none}.sheen{display:none}}
</style>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${glows}
<ellipse cx="600" cy="100" rx="340" ry="110" fill="url(#halo)"/>
<g mask="url(#fadeMask)">
<g stroke="${c.grid}" stroke-opacity=".8" stroke-width="1" fill="none">${grid}</g>
<g fill="${c.dots}">${dots}</g>
</g>

<text x="${WX}" y="${BASE}" textLength="${DW}" lengthAdjust="spacingAndGlyphs" style="font:800 ${FS}px ${SANS};fill:url(#word)">DamReb</text>
<rect x="${VX}" y="${VY}" width="${VW}" height="${VH}" rx="${VH / 2}" fill="url(#visor)" stroke="${c.accent2}" stroke-width="2"/>
<path d="M${VX + 10} ${VY + 6}Q${VX + VW / 2} ${VY + 2} ${VX + VW - 10} ${VY + 6}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"/>
${eyes.map((ex) => `<ellipse cx="${ex}" cy="${VY + VH / 2}" rx="${(12 * S).toFixed(1)}" ry="${(16 * S).toFixed(1)}" fill="#22d3ee" filter="url(#blur)"/>`).join("")}
${eyes.map((ex) => `<ellipse class="eye" cx="${ex}" cy="${VY + VH / 2}" rx="${(10 * S).toFixed(1)}" ry="${(14 * S).toFixed(1)}" fill="#67e8f9"/>`).join("")}
<text x="${VX + VW + GAP2}" y="${BASE}" textLength="${TW}" lengthAdjust="spacingAndGlyphs" style="font:800 ${FS}px ${SANS};fill:url(#word)">t</text>
<g clip-path="url(#wordClip)"><rect class="sheen" x="${WX - 130}" y="${VY - 20}" width="70" height="${VH + 60}" fill="url(#sheenGrad)"/></g>

<text x="${SUB_X}" y="${BASE + 40}" textLength="${SUB_W}" lengthAdjust="spacingAndGlyphs" style="font:500 25px ${SANS};fill:${c.muted}">Full-Stack Developer</text>
${colorLine}
${pillars}
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${c.border}"/>
</svg>
`;
}

for (const [theme, c] of Object.entries(THEMES)) writeFileSync(join(OUT, `damreboot-${theme}.svg`), banner(theme, c));
console.log("banner: damreboot-dark.svg + damreboot-light.svg");

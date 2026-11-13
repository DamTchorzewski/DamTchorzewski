/**
 * Generates the section intro banners of README.md (light + dark variants). Each section has its own
 * layout, so the page does not read as the same banner three times; the DamReboot robot (a different pose
 * per section) is always part of the picture:
 *  - img/cards/intro-domains-*.svg:   terminal, robot idle on the LEFT: `ls ~/domains`, 6 domains in two columns,
 *  - img/cards/intro-featured-*.svg:  terminal, robot soldering on the right: `git log --graph` with one colored node per project,
 *  - img/cards/intro-telemetry-*.svg: terminal with progress bars, robot analyzing on the LEFT.
 *
 *  - img/cards/intro-ending-*.svg:    closing banner: celebrating robot centered in a burst of confetti, status pill below,
 *  - img/hero/heading-<id>-*.svg:   the section titles shown in the collapsible summaries of README.md (an image keeps the
 *                                     big heading look while the disclosure arrow stays on its left).
 *
 * Text is monospace and every token is pinned to its column with textLength, so the layout does not depend
 * on the viewer's fonts. Robots are the cut-out poses in img/mascot/ embedded as data URIs.
 * Run when the config changes: node scripts/generate-sections.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconTile } from "./icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "profile.config.json"), "utf8"));
const OUT = join(ROOT, "img/cards");
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const W = 880;
const BAR = 38;
const SIZE = 13.5;
const CW = SIZE * 0.6;
const LH = 22;
const ROBOT_H = 180;

const THEMES = {
  dark: { idx: 0, bg: "#0e131a", border: "#232c3a", bar: "#121a24", barText: "#79c0ff", text: "#c9d1d9", name: "#d2a8ff", prop: "#79c0ff", comment: "#38bdf8", ok: "#3fb950", tree: "#3d4a5c", grid: "#1a2230" },
  light: { idx: 1, bg: "#ffffff", border: "#d0d7de", bar: "#f6f8fa", barText: "#0550ae", text: "#24292f", name: "#8250df", prop: "#0550ae", comment: "#0969da", ok: "#1a7f37", tree: "#a7b1bc", grid: "#eef1f4" },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function tok(t, x, y, fill, weight = "", size = SIZE) {
  return `<text x="${x.toFixed(1)}" y="${y}" textLength="${(t.length * size * 0.6).toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve" style="font:${weight}${size}px ${MONO};fill:${fill}">${esc(t)}</text>`;
}

function robot(file) {
  const buf = readFileSync(join(ROOT, "img/mascot", file));
  // canvas size from the WebP VP8X header (24-bit width-1 / height-1 fields)
  if (buf.toString("ascii", 12, 16) !== "VP8X") throw new Error(`${file}: expected an extended (VP8X) WebP`);
  const w = buf.readUIntLE(24, 3) + 1;
  const h = buf.readUIntLE(27, 3) + 1;
  return { uri: `data:image/webp;base64,${buf.toString("base64")}`, ratio: w / h };
}

const svgOpen = (w, h, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(label)}</title>`;

/** Robot centered in a slot of `slot` px starting at x0, standing on the bottom edge. */
function robotImage(bot, x0, slot, H) {
  const rw = Math.round(ROBOT_H * bot.ratio);
  return `<image href="${bot.uri}" x="${x0 + Math.round((slot - rw) / 2)}" y="${H - ROBOT_H - 1}" width="${rw}" height="${ROBOT_H}"/>`;
}

/** Terminal banner: window (lines = token lists [text, color, weight]) + robot in a slot on `side`. */
function terminal(c, { title, lines, bot, label, side, overlay }) {
  const SLOT = 210; // same window width in every terminal banner; the robot is centered in its slot
  const winW = W - SLOT - 14;
  const wx = side === "left" ? SLOT + 14 : 0;
  const winH = BAR + 30 + (lines.length - 1) * LH + 24;
  const H = Math.max(winH, ROBOT_H) + 2;
  const y0 = H - winH - 1;
  const dots = ["#ff5f57", "#febc2e", "#28c840"].map((col, i) => `<circle cx="${24 + i * 18}" cy="${y0 + BAR / 2}" r="6" fill="${col}"/>`).join("");
  const body = lines
    .map((tokens, i) => {
      const y = y0 + BAR + 30 + i * LH;
      let col = 0;
      return tokens
        .map(([t, fill, weight = ""]) => {
          const s = t.trim() ? tok(t, 26 + col * CW, y, fill, weight) : "";
          col += t.length;
          return s;
        })
        .join("");
    })
    .join("\n");
  return `${svgOpen(W, H, label)}
<g transform="translate(${wx} 0)">
<rect x=".5" y="${y0 + 0.5}" width="${winW - 1}" height="${winH - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
<path d="M1 ${y0 + BAR}V${y0 + 11}A10 10 0 0 1 11 ${y0 + 1}H${winW - 11}A10 10 0 0 1 ${winW - 1} ${y0 + 11}V${y0 + BAR}Z" fill="${c.bar}"/>
<line x1="1" y1="${y0 + BAR}" x2="${winW - 1}" y2="${y0 + BAR}" stroke="${c.border}"/>
${dots}
${tok(title, 92, y0 + BAR / 2 + 4.5, c.barText, "600 ", 12.5)}
${body}
${overlay ? overlay(y0) : ""}
</g>
${robotImage(bot, side === "left" ? 0 : W - SLOT, SLOT, H)}
</svg>
`;
}

/** Closing banner: celebrating robot in the middle, a burst of confetti in the domain colors, status pill below. */
function finale(c) {
  const H = 232;
  const RH = 172;
  const bot = ROBOTS.ending;
  const rw = Math.round(RH * bot.ratio);
  const cx = W / 2;
  const cy = 6 + RH / 2;
  let seed = 7;
  const rnd = () => ((seed = (seed + 0x6d2b79f5) | 0), ((t) => ((t = Math.imul(t ^ (t >>> 15), t | 1)), (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)), ((t ^ (t >>> 14)) >>> 0) / 4294967296))(seed));
  const colors = CONFIG.domains.map((d) => d.color[c.idx]);
  const bits = [];
  for (let i = 0; bits.length < 56 && i < 400; i++) {
    const ang = rnd() * Math.PI * 2;
    const rad = 0.28 + rnd() * 0.72;
    const x = cx + Math.cos(ang) * rad * 400;
    const y = cy + Math.sin(ang) * rad * 100;
    if (Math.abs(x - cx) < rw * 0.42 && y > 4) continue; // keep the robot clear
    if (y < 6 || y > 6 + RH - 6) continue;
    const col = colors[Math.floor(rnd() * colors.length)];
    const kind = Math.floor(rnd() * 3);
    const rot = Math.round(rnd() * 180);
    const delay = (rnd() * 3).toFixed(2);
    const dur = (2.2 + rnd() * 2).toFixed(2);
    let shape;
    if (kind === 0) shape = `<rect x="-4" y="-2" width="${6 + Math.round(rnd() * 4)}" height="4" rx="1" fill="${col}"/>`;
    else if (kind === 1) shape = `<circle r="${(2 + rnd() * 1.6).toFixed(1)}" fill="${col}"/>`;
    else shape = `<path d="M0-5L1.6-1.6L5 0L1.6 1.6L0 5L-1.6 1.6L-5 0L-1.6-1.6Z" fill="${col}"/>`;
    bits.push(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})"><g class="bit" style="animation-delay:${delay}s;animation-duration:${dur}s">${shape}</g></g>`);
  }
  const status = CONFIG.status.value;
  const tw = Math.round([...status].reduce((w, ch) => w + charEm(ch), 0) * 15 * 1.07);
  const pw = tw + 58;
  const px = Math.round((W - pw) / 2);
  const py = H - 40;
  const label = `Thanks for scrolling this far. ${status}. The DamReboot robot is celebrating with confetti.`;
  return `${svgOpen(W, H, label)}
<style>.bit{animation:twinkle 3s ease-in-out infinite}@keyframes twinkle{50%{opacity:.25}}.dot{animation:pulse 1.8s ease-out infinite;transform-origin:${px + 24}px ${py + 17}px}@keyframes pulse{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}@media (prefers-reduced-motion:reduce){.bit,.dot{animation:none}}</style>
${bits.join("\n")}
<image href="${bot.uri}" x="${Math.round(cx - rw / 2)}" y="6" width="${rw}" height="${RH}"/>
<rect x="${px + 0.5}" y="${py + 0.5}" width="${pw - 1}" height="33" rx="16.5" fill="${c.bg}" stroke="${c.border}"/>
<circle class="dot" cx="${px + 24}" cy="${py + 17}" r="4.5" fill="${c.ok}"/>
<circle cx="${px + 24}" cy="${py + 17}" r="4.5" fill="${c.ok}"/>
<text x="${px + 40}" y="${py + 22}" textLength="${tw}" lengthAdjust="spacingAndGlyphs" style="font:600 15px ${SANS};fill:${c.text}">${esc(status)}</text>
</svg>
`;
}

const prompt = (c, cmd) => [["$", c.ok, "700 "], [" ", c.text], [cmd, c.text]];

function domainLines(c) {
  const D = CONFIG.domains;
  const rows = Math.ceil(D.length / 2);
  const COL = 36; // chars per column
  const cell = (d) => {
    if (!d) return [];
    const name = `${d.id}/`.padEnd(11);
    return [[name, d.color[c.idx], "600 "], [`# ${d.tag}`.padEnd(COL - 11), c.comment, "italic "]];
  };
  return [
    prompt(c, "ls -1 ~/domains"),
    ...Array.from({ length: rows }, (_, r) => [...cell(D[r]), ...cell(D[r + rows])]),
    [[`# ${D.length} areas · commercial delivery since ${CONFIG.commercialSince}`, c.comment, "italic "]],
  ];
}

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function featuredLines(c) {
  const names = CONFIG.featured.map((f) => slug(f.title));
  const pad = Math.max(...names.map((n) => n.length)) + 3;
  return [
    prompt(c, "git log --graph featured/"),
    ...CONFIG.featured.map((f, i) => [["    ", c.text], [names[i].padEnd(pad), f.color[c.idx], "600 "], [`# ${f.tag}`, c.comment, "italic "]]),
  ];
}

/** Commit graph: a vertical line with one colored node per featured project, drawn left of the names. */
function featuredGraph(c, y0) {
  const x = 26 + CW * 1.5;
  const ys = CONFIG.featured.map((_, i) => y0 + BAR + 30 + (i + 1) * LH - 4);
  return `<line x1="${x}" y1="${ys[0]}" x2="${x}" y2="${ys[ys.length - 1]}" stroke="${c.tree}" stroke-width="2"/>\n` +
    CONFIG.featured.map((f, i) => `<circle cx="${x}" cy="${ys[i]}" r="5" fill="${c.bg}" stroke="${f.color[c.idx]}" stroke-width="2.5"/>`).join("\n");
}

function telemetryLines(c) {
  const bar = "██████████";
  const row = (name, text) => [["✓", c.ok, "700 "], [" ", c.text], [name.padEnd(10), c.prop], [bar, c.ok], [" 100%  ", c.text], [text, c.text]];
  return [
    prompt(c, "node scripts/generate-stats.mjs"),
    row("overview", "contributions · repos · stars · streaks"),
    row("languages", "most used languages by code size"),
    [["✓", c.ok, "700 "], [" ", c.text], ["cards".padEnd(10), c.prop], ["overview + languages · light and dark SVG", c.text]],
    [["# refreshed daily by GitHub Actions", c.comment, "italic "]],
  ];
}

const ROBOTS = {
  domains: robot("robot-idle.webp"),
  featured: robot("robot-building.webp"),
  telemetry: robot("robot-problem-solving.webp"),
  ending: robot("robot-celebrating.webp"),
};

const SECTIONS = {
  domains: (c) =>
    terminal(c, {
      title: "~/damreboot — domains",
      lines: domainLines(c),
      bot: ROBOTS.domains,
      side: "left",
      label: `Engineering domains: ${CONFIG.domains.map((d) => d.title).join(", ")}. The DamReboot robot stands next to the terminal.`,
    }),
  featured: (c) =>
    terminal(c, {
      title: "~/damreboot — git log",
      lines: featuredLines(c),
      overlay: (y0) => featuredGraph(c, y0),
      bot: ROBOTS.featured,
      side: "right",
      label: `Featured systems as a commit graph: ${CONFIG.featured.map((f) => `${f.title} (${f.tag})`).join(", ")}. The DamReboot robot is soldering a chip next to the terminal.`,
    }),
  ending: (c) => finale(c),
  telemetry: (c) =>
    terminal(c, {
      title: "~/damreboot — stats",
      lines: telemetryLines(c),
      bot: ROBOTS.telemetry,
      side: "left",
      label: "GitHub telemetry: overview of contributions, repositories, stars and streaks over the last 12 months, and the most used languages by code size. The DamReboot robot is analyzing a chart next to the terminal.",
    }),
};

// ---------- section headings (inline images for <summary>), with a custom icon set instead of emoji ----------
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
function charEm(ch) {
  if ("ilj.,:;'!|".includes(ch)) return 0.28;
  if (" ()[]/-".includes(ch)) return 0.32;
  if ("tfrI".includes(ch)) return 0.36;
  if ("mM".includes(ch)) return 0.86;
  if ("wW".includes(ch)) return 0.8;
  if (/[A-Z]/.test(ch)) return 0.66;
  if (/[0-9]/.test(ch)) return 0.56;
  return 0.54;
}
const HEADINGS = {
  domains: "Engineering Domains & Production Experience",
  stack: "Core Tech Stack & Ecosystem",
  featured: "Featured Systems & Architecture Highlights",
  telemetry: "GitHub Telemetry & Language Distribution",
};
const HEADING_COLOR = { dark: "#f0f6fc", light: "#1f2328" };
for (const [id, text] of Object.entries(HEADINGS)) {
  const size = 24;
  const tw = Math.round([...text].reduce((w, ch) => w + charEm(ch), 0) * size * 1.07);
  const w = 40 + tw + 4;
  for (const name of Object.keys(THEMES)) {
    writeFileSync(
      join(ROOT, "img/hero", `heading-${id}-${name}.svg`),
      `${svgOpen(w, 28, text)}
<g transform="translate(0 .5) scale(1.0833)">${iconTile(id, name, 0)}</g>
<text x="40" y="20" textLength="${tw}" lengthAdjust="spacingAndGlyphs" style="font:600 ${size}px ${SANS};fill:${HEADING_COLOR[name]}">${esc(text)}</text>
</svg>
`,
    );
  }
}

for (const [id, render] of Object.entries(SECTIONS)) {
  for (const [name, c] of Object.entries(THEMES)) writeFileSync(join(OUT, `intro-${id}-${name}.svg`), render(c));
}
console.log(`section banners: ${Object.keys(SECTIONS).join(", ")} x 2 themes`);

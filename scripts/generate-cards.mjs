/**
 * Generates the content cards of README.md from profile.config.json (light + dark variants):
 *  - img/cards/domain-<id>-*.svg and featured-<id>-*.svg: framed cards (colored title, tag, text with code chips),
 *  - img/hero/role-*.svg: the colored role line under the heading.
 *
 * GitHub strips CSS from README, so frames and colors live in SVG. Every word is its own <text> with a pinned
 * textLength, so the layout is the same whatever fonts the viewer has; the full text is in each image's alt text.
 * Cards of one section share one height.
 * Run when the config changes: node scripts/generate-cards.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "profile.config.json"), "utf8"));
const OUT = join(ROOT, "img/cards");
mkdirSync(OUT, { recursive: true });

// single quotes: these strings land inside style="..." attributes
const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace`;
const EMOJI = `'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`;

const THEMES = {
  dark: { bg: "#0e131a", border: "#232c3a", text: "#c9d1d9", strong: "#f0f6fc", chipBg: "#1b2433", chipText: "#79c0ff", idx: 0 },
  light: { bg: "#ffffff", border: "#d0d7de", text: "#2b3137", strong: "#0d1117", chipBg: "#ddf4ff", chipText: "#0550ae", idx: 1 },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const plain = (s) => s.replace(/[`*]/g, "");

// ---------- text measuring (font independent: widths are estimated, then pinned with textLength) ----------
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
const sansW = (s, size, bold = false) => [...s].reduce((w, ch) => w + charEm(ch), 0) * size * (bold ? 1.07 : 1);
const monoW = (s, size) => s.length * size * 0.6;

const open = (w, h, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(label)}</title>`;
const frame = (th, w, h) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${th.bg}" stroke="${th.border}"/>`;
// ---------- domain + featured cards (framed images, equal height within a section) ----------
const emoji = (e, x, y) => `<text x="${x}" y="${y}" style="font:18px ${EMOJI}">${e}</text>`;

/** "**bold**" and "`chip`" markup -> tokens carrying whether a space precedes them. */
function tokenize(text) {
  const tokens = [];
  let carry = false;
  for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).filter(Boolean)) {
    if (part.startsWith("`")) {
      tokens.push({ k: "chip", s: part.slice(1, -1), sp: carry });
      carry = false;
      continue;
    }
    const bold = part.startsWith("**");
    const s = bold ? part.slice(2, -2) : part;
    let first = true;
    for (const [, ws, w] of s.matchAll(/(\s*)(\S+)/g)) {
      tokens.push({ k: "w", s: w, bold, sp: ws.length > 0 || (first && carry) });
      first = false;
    }
    carry = /\s$/.test(s);
  }
  return tokens;
}

/**
 * Flows tokens into lines. Returns the SVG and the number of lines.
 * kind "sans" = body text, "mono" = tech list, "title" = bold heading words.
 */
function flow(tokens, { x0, y0, maxW, lineH, th, accent, kind = "sans" }) {
  const size = kind === "title" ? 16 : kind === "mono" ? 12 : 14.5;
  const space = kind === "mono" ? size * 0.6 : size * 0.3;
  let x = 0;
  let line = 0;
  let svg = "";
  for (const t of tokens) {
    const chip = t.k === "chip";
    const w = chip ? monoW(t.s, 12) + 14 : kind === "mono" ? monoW(t.s, size) : sansW(t.s, size, t.bold || kind === "title");
    const gap = x === 0 ? 0 : t.sp ? space : chip ? 4 : 0;
    if (x > 0 && x + gap + w > maxW) {
      line++;
      x = 0;
    }
    const px = x0 + x + (x === 0 ? 0 : gap);
    const y = y0 + line * lineH;
    if (chip) {
      svg += `<rect x="${px.toFixed(1)}" y="${y - 15}" width="${w.toFixed(1)}" height="22" rx="6" fill="${th.chipBg}"/>`;
      svg += `<text x="${(px + 7).toFixed(1)}" y="${y}" textLength="${monoW(t.s, 12).toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="font:600 12px ${MONO};fill:${th.chipText}">${esc(t.s)}</text>`;
    } else {
      const fill = kind === "title" ? accent : kind === "mono" ? th.text : t.bold ? th.strong : th.text;
      const font = kind === "mono" ? `500 ${size}px ${MONO}` : `${t.bold || kind === "title" ? 700 : 400} ${size}px ${SANS}`;
      svg += `<text x="${px.toFixed(1)}" y="${y}" textLength="${w.toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="font:${font};fill:${fill}">${esc(t.s)}</text>`;
    }
    x += gap + w;
  }
  return { svg, lines: line + 1 };
}

const CW = 436;
const PAD = 22;

function tagPill(th, text, color, W) {
  const w = Math.round(monoW(text, 11) + 22);
  const x = W - PAD - w;
  return {
    w,
    svg: `<rect x="${x}" y="17" width="${w}" height="25" rx="7" fill="${color}" fill-opacity=".13" stroke="${color}" stroke-opacity=".55"/>
<text x="${x + 11}" y="34" textLength="${monoW(text, 11).toFixed(1)}" lengthAdjust="spacingAndGlyphs" style="font:600 11px ${MONO};fill:${color}">${esc(text)}</text>`,
  };
}

/** Measures a card (text metrics only), returns its natural height and a renderer for a given height. */
function infoCard(spec, kind) {
  const measure = (th) => {
    const accent = spec.color[th.idx];
    const tagColor = (spec.tagColor ?? spec.color)[th.idx];
    const tag = tagPill(th, spec.tag, tagColor, CW);
    const title = flow(tokenize(spec.title), { x0: PAD + 30, y0: 38, maxW: CW - PAD * 2 - 30 - tag.w - 12, lineH: 22, th, accent, kind: "title" });
    const descY = 38 + (title.lines - 1) * 22 + 36;
    // text may be one paragraph or several (a gap of 8px between them)
    let base = descY;
    let descSvg = "";
    [].concat(spec.text).forEach((para, i) => {
      if (i > 0) base += 27 + 8;
      const d = flow(tokenize(para), { x0: PAD, y0: base, maxW: CW - PAD * 2, lineH: 27, th });
      descSvg += d.svg;
      base += (d.lines - 1) * 27;
    });
    const desc = { svg: descSvg };
    let bottom = base + 22;
    let tech = null;
    let divY = 0;
    if (kind === "featured" && spec.tech) {
      divY = bottom;
      const techTokens = spec.tech.flatMap((t, i) => [{ k: "w", s: t, sp: i > 0 }, ...(i < spec.tech.length - 1 ? [{ k: "w", s: "\u2022", sp: true }] : [])]);
      tech = flow(techTokens, { x0: PAD + 18, y0: divY + 30, maxW: CW - PAD * 2 - 18, lineH: 22, th, kind: "mono" });
      bottom = divY + 30 + (tech.lines - 1) * 22 + 22;
    }
    return { accent, tagColor, tag, title, desc, tech, divY, height: bottom };
  };
  return {
    height: Math.max(...Object.values(THEMES).map((th) => measure(th).height)),
    render(th, H) {
      const m = measure(th);
      const label = `${plain(spec.title)} (${spec.tag}): ${plain([].concat(spec.text).join(" "))}${spec.tech ? ` Stack: ${spec.tech.join(", ")}.` : ""}`;
      return `${open(CW, H, label)}
${frame(th, CW, H)}
${emoji(spec.emoji, PAD, 39)}
${m.title.svg}
${m.tag.svg}
${m.desc.svg}
${
  m.tech
    ? `<line x1="${PAD}" y1="${m.divY}" x2="${CW - PAD}" y2="${m.divY}" stroke="${th.border}"/>
<circle cx="${PAD + 4}" cy="${m.divY + 26}" r="4.5" fill="${spec.dot ?? m.accent}"/>
${m.tech.svg}`
    : ""
}
</svg>
`;
    },
  };
}

/** Every card of a section gets the same height, so the grid stays even. */
function writeSection(prefix, specs, kind) {
  const cards = specs.map((spec) => infoCard(spec, kind));
  const H = Math.ceil(Math.max(...cards.map((c) => c.height)));
  cards.forEach((card, i) => {
    for (const [name, th] of Object.entries(THEMES)) writeFileSync(join(OUT, `${prefix}-${specs[i].id}-${name}.svg`), card.render(th, H));
  });
}
writeSection("domain", CONFIG.domains, "domain");
writeSection("featured", CONFIG.featured, "featured");

// ---------- colored role line ----------
mkdirSync(join(ROOT, "img/hero"), { recursive: true });
for (const [name, th] of Object.entries(THEMES)) {
  const color = name === "dark" ? "#38bdf8" : "#0969da";
  const w = Math.round(sansW(CONFIG.role, 16.5, false)) + 4;
  writeFileSync(
    join(ROOT, `img/hero/role-${name}.svg`),
    `${open(w, 30, CONFIG.role)}
<text x="0" y="21" textLength="${w - 4}" lengthAdjust="spacingAndGlyphs" style="font:italic 600 16.5px ${SANS};fill:${color}">${esc(CONFIG.role)}</text>
</svg>
`,
  );
}

console.log(`cards: ${CONFIG.domains.length} domain + ${CONFIG.featured.length} featured cards, x 2 themes + role line`);

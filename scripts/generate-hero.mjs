/**
 * Generates the hero assets of README.md from profile.config.json:
 *  - img/badges/*.svg: two-part link badges under the banner (+ status and experience badges),
 *    light + dark variants. Each badge is its own image, so README can wrap it in a link.
 *  - img/hero/robot.svg: fixed 560x560 slot for the mascot (circle backdrop baked in, so the same
 *    file works on light and dark pages). Replace the SOURCE file or the output with the final render.
 *
 * Text width is pinned with textLength, so badges look the same whatever monospace font the viewer has.
 * Icons: Remix Icon (Apache-2.0). Run when the config changes: node scripts/generate-hero.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = JSON.parse(readFileSync(join(ROOT, "profile.config.json"), "utf8"));
const ROBOT_SOURCE = process.env.ROBOT_SOURCE || join(ROOT, "img/hero/source/robot-waving.png");

const ICONS = {
  mail: "M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.23792L12.0718 14.338L4 7.21594V19H20V7.23792ZM4.51146 5L12.0619 11.662L19.501 5H4.51146Z",
  linkedin: "M6.94048 4.99993C6.94011 5.81424 6.44608 6.54702 5.69134 6.85273C4.9366 7.15845 4.07187 6.97605 3.5049 6.39155C2.93793 5.80704 2.78195 4.93715 3.1105 4.19207C3.43906 3.44699 4.18654 2.9755 5.00048 2.99993C6.08155 3.03238 6.94097 3.91837 6.94048 4.99993ZM7.00048 8.47993H3.00048V20.9999H7.00048V8.47993ZM13.3205 8.47993H9.34048V20.9999H13.2805V14.4299C13.2805 10.7699 18.0505 10.4299 18.0505 14.4299V20.9999H22.0005V13.0699C22.0005 6.89993 14.9405 7.12993 13.2805 10.1599L13.3205 8.47993Z",
  globe: "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM9.71002 19.6674C8.74743 17.6259 8.15732 15.3742 8.02731 13H4.06189C4.458 16.1765 6.71639 18.7747 9.71002 19.6674ZM10.0307 13C10.1811 15.4388 10.8778 17.7297 12 19.752C13.1222 17.7297 13.8189 15.4388 13.9693 13H10.0307ZM19.9381 13H15.9727C15.8427 15.3742 15.2526 17.6259 14.29 19.6674C17.2836 18.7747 19.542 16.1765 19.9381 13ZM4.06189 11H8.02731C8.15732 8.62577 8.74743 6.37407 9.71002 4.33256C6.71639 5.22533 4.458 7.8235 4.06189 11ZM10.0307 11H13.9693C13.8189 8.56122 13.1222 6.27025 12 4.24799C10.8778 6.27025 10.1811 8.56122 10.0307 11ZM14.29 4.33256C15.2526 6.37407 15.8427 8.62577 15.9727 11H19.9381C19.542 7.8235 17.2836 5.22533 14.29 4.33256Z",
  cv: "M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM12 11.5C10.6193 11.5 9.5 10.3807 9.5 9C9.5 7.61929 10.6193 6.5 12 6.5C13.3807 6.5 14.5 7.61929 14.5 9C14.5 10.3807 13.3807 11.5 12 11.5ZM7.52746 17C7.77619 14.75 9.68372 13 12 13C14.3163 13 16.2238 14.75 16.4725 17H7.52746Z",
  code: "M23 12L15.9289 19.0711L14.5147 17.6569L20.1716 12L14.5147 6.34315L15.9289 4.92893L23 12ZM3.82843 12L9.48528 17.6569L8.07107 19.0711L1 12L8.07107 4.92893L9.48528 6.34315L3.82843 12Z",
};

const THEMES = {
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#6ea8ff" },
  light: { bg: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#2f5fb3" },
};

const FONT = `ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace`;
const H = 34;
const CHAR = 7.1; // advance per character at 11px bold + .6px letter spacing
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const textWidth = (s) => Math.round(s.length * CHAR);

/** Dark text on light fills, white text on dark fills. */
function onColor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#06121f" : "#ffffff";
}

const icon = (name, x, y, size, fill) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="${fill}" d="${ICONS[name]}"/></svg>`;

/** Two-part badge: left = label (+ icon or status dot), right = value on a solid color. */
function badge(c, { icon: iconName, dot, label, value, color, accessible, width }) {
  const upperLabel = label.toUpperCase();
  const upperValue = value.toUpperCase();
  const lw = textWidth(upperLabel);
  const vw = textWidth(upperValue);
  const leftW = 12 + (iconName || dot ? 22 : 0) + lw + 14;
  const rightW = width ? width - leftW : 14 + vw + 14;
  const W = leftW + rightW;
  const mark = dot
    ? `<circle cx="20" cy="${H / 2}" r="3.5" fill="${color}"><animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></circle>`
    : iconName
      ? icon(iconName, 12, H / 2 - 7, 14, c.muted)
      : "";
  const tx = 12 + (iconName || dot ? 22 : 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(accessible ?? `${label}: ${value}`)}">
<title>${esc(accessible ?? `${label}: ${value}`)}</title>
<style>
text{font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.6px}
@media (prefers-reduced-motion:reduce){*{animation:none!important}animate{display:none}}
</style>
<clipPath id="r"><rect width="${W}" height="${H}" rx="6"/></clipPath>
<g clip-path="url(#r)">
<rect width="${leftW}" height="${H}" fill="${c.bg}"/>
<rect x="${leftW}" width="${rightW}" height="${H}" fill="${color}"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="5.5" fill="none" stroke="${c.border}"/>
${mark}
<text x="${tx}" y="${H / 2 + 4}" textLength="${lw}" lengthAdjust="spacing" style="fill:${c.muted}">${esc(upperLabel)}</text>
<text x="${leftW + (rightW - vw) / 2}" y="${H / 2 + 4}" textLength="${vw}" lengthAdjust="spacing" style="fill:${onColor(color)}">${esc(upperValue)}</text>
</svg>
`;
}

// ---------- link bar: one connected strip, every cell is its own image (so it can be a link) ----------
const OUT_BADGES = join(ROOT, "img/badges");
mkdirSync(OUT_BADGES, { recursive: true });
const BAR_H = 36;
const STATUS = { id: "status", dot: true, text: CONFIG.status.value, tone: ["#3fb950", "#1a7f37"], tint: true };

function barCell(c, themeIdx, item, first, last) {
  const tone = item.tone[themeIdx];
  const text = item.text.toUpperCase();
  const tw = textWidth(text);
  const lead = item.icon || item.dot ? 22 : 0;
  const W = 14 + lead + tw + 14;
  const x0 = first ? 0.5 : -10;
  const x1 = last ? W - 0.5 : W + 10;
  const shape = `x="${x0}" y=".5" width="${x1 - x0}" height="${BAR_H - 1}" rx="8"`;
  const mark = item.dot
    ? `<circle cx="21" cy="${BAR_H / 2}" r="3.5" fill="${tone}"><animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></circle>`
    : icon(item.icon, 14, BAR_H / 2 - 7, 14, tone);
  const label = item.dot ? `Status: ${item.text}` : item.text;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAR_H}" viewBox="0 0 ${W} ${BAR_H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>
text{font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.6px}
@media (prefers-reduced-motion:reduce){animate{display:none}}
</style>
<clipPath id="r"><rect width="${W}" height="${BAR_H}"/></clipPath>
<g clip-path="url(#r)">
<rect ${shape} fill="${c.bg}" stroke="${c.border}"/>
${item.tint ? `<rect ${shape} fill="${tone}" fill-opacity=".1"/>` : ""}
${last ? "" : `<line x1="${W - 0.5}" y1="0" x2="${W - 0.5}" y2="${BAR_H}" stroke="${c.border}"/>`}
</g>
${mark}
<text x="${14 + lead}" y="${BAR_H / 2 + 4}" textLength="${tw}" lengthAdjust="spacing" style="fill:${tone}">${esc(text)}</text>
</svg>
`;
}

const years = new Date().getFullYear() - CONFIG.codingSince;
const experience = {
  id: "experience",
  icon: "code",
  label: "Commercial experience",
  value: `Since ${CONFIG.commercialSince} (${years}+ yrs coding)`,
  color: "#3fb6d6",
};
const bar = [...CONFIG.badges, STATUS];
for (const [theme, c] of Object.entries(THEMES)) {
  const idx = theme === "dark" ? 0 : 1;
  bar.forEach((item, i) => writeFileSync(join(OUT_BADGES, `${item.id}-${theme}.svg`), barCell(c, idx, item, i === 0, i === bar.length - 1)));
  writeFileSync(join(OUT_BADGES, `experience-${theme}.svg`), badge(c, experience));
}

// ---------- robot slot ----------
const OUT_HERO = join(ROOT, "img/hero");
mkdirSync(OUT_HERO, { recursive: true });
const S = 560;
const robot = readFileSync(ROBOT_SOURCE);
const mime = ROBOT_SOURCE.endsWith(".svg") ? "image/svg+xml" : ROBOT_SOURCE.endsWith(".gif") ? "image/gif" : "image/png";
const robotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="DamReboot robot mascot">
<title>DamReboot robot mascot</title>
<defs>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#16294d"/><stop offset=".7" stop-color="#0f1b36"/><stop offset="1" stop-color="#0b1326"/></radialGradient>
</defs>
<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 4}" fill="url(#glow)" stroke="#1f2b4d" stroke-width="2"/>
<image x="40" y="40" width="${S - 80}" height="${S - 80}" href="data:${mime};base64,${robot.toString("base64")}"/>
</svg>
`;
writeFileSync(join(OUT_HERO, "robot.svg"), robotSvg);

console.log(`hero: ${bar.length} bar cells + experience badge x 2 themes + robot slot`);

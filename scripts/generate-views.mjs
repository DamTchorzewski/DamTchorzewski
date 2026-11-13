/**
 * Generates the profile views badge (img/badges/views-dark.svg and views-light.svg) in the style of the
 * "Commercial experience" badge: a dark/white label cell with an icon and the teal value cell.
 *
 * The number comes from the komarev.com counter. The counter is incremented by the hidden 1px image in README.md
 * (GitHub fetches it for every page view); this script only reads the current number, so it can run on a schedule
 * (.github/workflows/views.yml) without changing it - the service ignores requests that do not come from GitHub.
 * If the service cannot be reached, the existing badge is left as it is.
 *
 * Run: node scripts/generate-views.mjs   (VIEWS_COUNT=1234 renders a given number without the network)
 * Zero dependencies, Node 20+.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "DamTchorzewski";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../img/badges");
const CELL = 7.1; // width of one character of the 11px monospace text with letter spacing, as in the experience badge

const THEMES = {
  dark: { left: "#0d1117", border: "#30363d", label: "#6ea8ff", value: "#06121f", right: "#3fb6d6" },
  light: { left: "#ffffff", border: "#d0d7de", label: "#2f5fb3", value: "#06121f", right: "#3fb6d6" },
};

async function readCount() {
  if (process.env.VIEWS_COUNT) return Number(process.env.VIEWS_COUNT);
  const res = await fetch(`https://komarev.com/ghpvc/?username=${USER}&label=views&color=3fb6d6&style=for-the-badge`);
  if (!res.ok) throw new Error(`komarev answered ${res.status}`);
  const svg = await res.text();
  // the number is in the aria-label ("VIEWS: 12") and as the last text of the badge
  const found = svg.match(/aria-label="[^"]*?:\s*([\d,]+)"/) || [...svg.matchAll(/>\s*([\d,]+)\s*</g)].pop();
  if (!found) throw new Error("no number in the response");
  return Number(found[1].replace(/,/g, ""));
}

function badge(c, count) {
  const value = count.toLocaleString("en-US");
  const labelText = "PROFILE VIEWS";
  const lw = Math.round(34 + labelText.length * CELL + 14); // icon + label + padding
  const vw = Math.max(56, Math.round(value.length * CELL + 28));
  const W = lw + vw;
  const a11y = `Profile views: ${value}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="34" viewBox="0 0 ${W} 34" role="img" aria-label="${a11y}">
<title>${a11y}</title>
<style>
text{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.6px}
</style>
<clipPath id="r"><rect width="${W}" height="34" rx="6"/></clipPath>
<g clip-path="url(#r)">
<rect width="${lw}" height="34" fill="${c.left}"/>
<rect x="${lw}" width="${vw}" height="34" fill="${c.right}"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="33" rx="5.5" fill="none" stroke="${c.border}"/>
<svg x="12" y="10" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c.label}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3.2"/></svg>
<text x="34" y="21" textLength="${Math.round(labelText.length * CELL)}" lengthAdjust="spacing" style="fill:${c.label}">${labelText}</text>
<text x="${lw + 14}" y="21" textLength="${Math.round(value.length * CELL)}" lengthAdjust="spacing" style="fill:${c.value}">${value}</text>
</svg>
`;
}

let count;
try {
  count = await readCount();
} catch (err) {
  console.log(`views: ${err.message}; badge left unchanged`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
for (const [name, c] of Object.entries(THEMES)) writeFileSync(join(OUT, `views-${name}.svg`), badge(c, count));
console.log(`views: ${count} -> views-dark.svg + views-light.svg`);

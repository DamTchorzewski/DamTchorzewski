/**
 * Generates the "Core stack" card (img/stats/stack-{dark,light}.svg) in the same style as the stat
 * cards: one row of rounded tiles with icons and names, grouped into languages and frameworks.
 *
 * Icons: devicon (MIT) - local copies from img/ where they exist, the rest from the devicon package
 * on jsDelivr (pinned version). They are embedded as data URIs, so the card is a single file.
 * Run when the stack changes: node scripts/generate-stack.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "img/stats");
const DEVICON = "https://cdn.jsdelivr.net/npm/devicon@2.16.0/icons";

const GROUPS = [
  {
    label: "Languages",
    items: [
      { name: "TypeScript", icon: "img/typescript-original.svg" },
      { name: "JavaScript", icon: "img/javascript-original.svg" },
      { name: "Python", icon: `${DEVICON}/python/python-original.svg` },
      { name: "C#", icon: `${DEVICON}/csharp/csharp-original.svg` },
      { name: "Java", icon: `${DEVICON}/java/java-original.svg` },
    ],
  },
  {
    label: "Frameworks & platforms",
    items: [
      { name: "React", icon: "img/react-original.svg" },
      // black disc: on the dark card it gets a light ring so it does not disappear
      { name: "Next.js", icon: "img/nextjs-original.svg", ring: true },
      { name: "Node.js", icon: "img/nodejs-original.svg" },
      { name: "React Native", icon: "img/reactnative-original.svg" },
      { name: "Electron", icon: "img/electron-original.svg" },
      { name: "Tailwind CSS", icon: "img/tailwindcss-original.svg" },
    ],
  },
];

const THEMES = {
  dark: { bg: "#0d1117", border: "#30363d", tile: "#161b22", tileBorder: "#262c36", text: "#e6edf3", muted: "#8d96a0", ring: "#e6edf3" },
  light: { bg: "#ffffff", border: "#d0d7de", tile: "#f6f8fa", tileBorder: "#e4e8ec", text: "#1f2328", muted: "#59636e", ring: "transparent" },
};

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function loadIcon(src) {
  const svg = src.startsWith("http")
    ? await fetch(src).then((r) => {
        if (!r.ok) throw new Error(`${src} -> ${r.status}`);
        return r.text();
      })
    : readFileSync(join(ROOT, src), "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ---------- layout ----------
const PAD = 24;
const TILE = 52;
const ICON = 28;
const GAP = 22; // between tiles
const GROUP_GAP = 44; // between groups (with a divider in the middle)
const COL = TILE + GAP;
const count = GROUPS.reduce((n, g) => n + g.items.length, 0);
const W = 2 * PAD + count * TILE + (count - GROUPS.length) * GAP + (GROUPS.length - 1) * GROUP_GAP + 2 * 14;
const H = 150;
const TOP = 50;

function card(c, icons) {
  let x = PAD + 14;
  let i = 0;
  const parts = [];
  GROUPS.forEach((group, g) => {
    const groupW = group.items.length * TILE + (group.items.length - 1) * GAP;
    parts.push(
      `<text class="label" x="${x}" y="32">${esc(group.label.toUpperCase())}</text>`,
    );
    group.items.forEach((item, k) => {
      const tx = x + k * COL;
      const cx = tx + TILE / 2;
      const ring = item.ring && c.ring !== "transparent"
        ? `<circle cx="${cx}" cy="${TOP + TILE / 2}" r="${ICON / 2 + 1}" fill="none" stroke="${c.ring}" stroke-opacity=".55" stroke-width="1"/>`
        : "";
      parts.push(`<g class="tile" style="animation-delay:${60 + i * 45}ms">
<rect x="${tx + 0.5}" y="${TOP + 0.5}" width="${TILE - 1}" height="${TILE - 1}" rx="12" fill="${c.tile}" stroke="${c.tileBorder}"/>
<image href="${icons[i]}" x="${cx - ICON / 2}" y="${TOP + (TILE - ICON) / 2}" width="${ICON}" height="${ICON}"/>${ring}
<text class="name" x="${cx}" y="${TOP + TILE + 20}" text-anchor="middle">${esc(item.name)}</text>
</g>`);
      i++;
    });
    x += groupW;
    if (g < GROUPS.length - 1) {
      const dx = x + GROUP_GAP / 2;
      parts.push(`<line x1="${dx}" y1="${TOP + 6}" x2="${dx}" y2="${TOP + TILE - 6}" stroke="${c.border}"/>`);
      x += GROUP_GAP;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Core stack: ${esc(GROUPS.flatMap((g) => g.items.map((i) => i.name)).join(", "))}">
<title>Core stack</title>
<style>
text{font-family:${FONT}}
.label{font-size:11px;font-weight:600;letter-spacing:.08em;fill:${c.muted}}
.name{font-size:12px;font-weight:500;fill:${c.text}}
.tile{animation:rise .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
${parts.join("\n")}
</svg>
`;
}

const icons = await Promise.all(GROUPS.flatMap((g) => g.items.map((i) => loadIcon(i.icon))));
mkdirSync(OUT, { recursive: true });
for (const [name, c] of Object.entries(THEMES)) writeFileSync(join(OUT, `stack-${name}.svg`), card(c, icons));
console.log(`stack card ${W}x${H}, ${count} items`);

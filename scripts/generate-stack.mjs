/**
 * Generates the "Core stack" cards in the same style as the stat cards (light + dark variants):
 *  - img/stats/stack-*.svg: one row of rounded tiles, languages and frameworks & platforms,
 * and the plain icon strip of every other language and tool in README.md (between the
 * tools markers, inside the collapsible section right under the stack card).
 *
 * Icons: devicon (MIT) and the logos in img/ - local files where they exist, the rest from the
 * devicon package on jsDelivr (pinned version). They are embedded as data URIs, so each card is a
 * single file. Run when the stack changes: node scripts/generate-stack.mjs
 *
 * Style rules: no uppercase text, no grey text (secondary text uses the brand accent).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
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
      { name: "Next.js", icon: "img/nextjs-original.svg", dark: true },
      { name: "Node.js", icon: "img/nodejs-original.svg" },
      { name: "React Native", icon: "img/reactnative-original.svg" },
      { name: "Electron", icon: "img/electron-original.svg" },
      { name: "Tailwind CSS", icon: "img/tailwindcss-original.svg" },
    ],
  },
];

/**
 * Everything else. Third field: `true` = the logo is (nearly) black, so on the dark card its tile is
 * light; "mono" = single-color logo, repainted in the text color of each theme.
 */
const TOOLS = [
  ["Git", "git-original.svg"],
  ["GitHub", "github-original.svg", "mono"],
  ["GitHub Actions", "githubactions-original.svg"],
  ["VS Code", "vscode-original.svg"],
  ["Claude Code", "claudecode-original.svg"],
  ["Claude", "claude-original.svg"],
  ["Gemini", "gemini.svg"],
  ["Bash", "bash-original.svg", true],
  ["Figma", "figma-original.svg"],
  ["HTML5", "html5-original.svg"],
  ["CSS3", "css3-original.svg"],
  ["shadcn/ui", "shadcn-original.svg", "mono"],
  ["Sass", "sass-original.svg"],
  ["BEM", "bem-original.svg", "mono"],
  ["Zod", "zod.svg"],
  ["npm", "npm-original-wordmark.svg"],
  ["pnpm", "pnpm-original.svg"],
  ["Turborepo", "turborepo.svg"],
  ["Terminal", "terminal.png"],
  ["Parcel", "parcel.svg"],
  ["Webpack", "webpack.svg"],
  ["CodePen", "codepen-plain.svg", "mono"],
  ["Slack", "slack-original.svg"],
  ["Trello", "trello-plain.svg"],
  ["Browserslist", "brouslist.svg"],
  ["Windows", "windows-icon.svg"],
  ["BIOS", "bios.png"],
  ["Office", "office.png"],
  ["Vite", "vite.svg"],
  ["MongoDB", "mongodb.svg"],
  ["Prisma", "prisma.svg", "mono"],
  ["Docker", "docker.svg"],
  ["Firebase", "firebase-original.svg"],
  ["OVHcloud", "ovhcloud.svg", "mono"],
  ["Web3Forms", "web3forms.svg"],
  ["Jest", "jest.svg"],
  ["Vitest", "vitest-original.svg"],
  ["Playwright", "playwright-original.svg"],
  ["Storybook", "storybook-original.svg"],
  ["ESLint", "eslint-original.svg"],
  ["Redux", "redux.svg"],
  ["Babel", "babel.svg"],
  ["Express", `${DEVICON}/express/express-original.svg`, "mono"],
  ["Insomnia", "insomnia.svg"],
  ["PHP", "php.png"],
  ["WordPress", "wordpress.png"],
  ["MySQL", "mysql.png", true],
].map(([name, file, kind]) => ({
  name,
  icon: file.startsWith("http") ? file : `img/${file}`,
  dark: kind === true,
  mono: kind === "mono",
}));

const THEMES = {
  dark: { bg: "#0d1117", border: "#30363d", tile: "#161b22", tileBorder: "#262c36", lightTile: "#e6edf3", text: "#e6edf3", accent: "#6ea8ff" },
  light: { bg: "#ffffff", border: "#d0d7de", tile: "#f6f8fa", tileBorder: "#e4e8ec", lightTile: "#f6f8fa", text: "#1f2328", accent: "#2f5fb3" },
};

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const sources = new Map();
async function source(src) {
  if (!sources.has(src)) {
    sources.set(
      src,
      src.startsWith("http")
        ? fetch(src).then((res) => {
            if (!res.ok) throw new Error(`${src} -> ${res.status}`);
            return res.arrayBuffer().then((b) => Buffer.from(b));
          })
        : Promise.resolve(readFileSync(join(ROOT, src))),
    );
  }
  return sources.get(src);
}

/** SVG source; `color` repaints a single-color logo (its own styles are dropped). */
async function iconSvg(src, color) {
  let svg = (await source(src)).toString("utf8");
  if (color) {
    svg = svg.replace(/<style[\s\S]*?<\/style>/g, "");
    const open = svg.indexOf(">", svg.indexOf("<svg")) + 1;
    svg = `${svg.slice(0, open)}<style>path,circle,rect,polygon,ellipse{fill:${color}!important}</style>${svg.slice(open)}`;
  }
  return svg;
}

/** Icon as a data URI (for the cards). */
async function loadIcon(src, color) {
  if (extname(src) === ".png") return `data:image/png;base64,${(await source(src)).toString("base64")}`;
  return `data:image/svg+xml;base64,${Buffer.from(await iconSvg(src, color)).toString("base64")}`;
}

const style = (c, extra = "") => `<style>
text{font-family:${FONT}}
.label{font-size:16px;font-weight:600;fill:${c.text}}
.name{font-size:12px;font-weight:500;fill:${c.text}}
.tile{animation:rise .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}${extra}
</style>`;

const svgOpen = (w, h, title, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(title)}</title>`;
const frame = (c, w, h) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>`;

/** Rounded tile with an icon and the name under it, centered on cx. */
function tile(c, item, icon, cx, top, size, iconSize, delay) {
  const fill = item.dark && c === THEMES.dark ? c.lightTile : c.tile;
  return `<g class="tile" style="animation-delay:${delay}ms">
<rect x="${cx - size / 2 + 0.5}" y="${top + 0.5}" width="${size - 1}" height="${size - 1}" rx="${Math.round(size * 0.24)}" fill="${fill}" stroke="${c.tileBorder}"/>
<image href="${icon}" x="${cx - iconSize / 2}" y="${top + (size - iconSize) / 2}" width="${iconSize}" height="${iconSize}"/>
<text class="name" x="${cx}" y="${top + size + 19}" text-anchor="middle">${esc(item.name)}</text>
</g>`;
}

// ---------- stack card ----------
const PAD = 24;
const TILE = 52;
const GAP = 22;
const GROUP_GAP = 44;
const count = GROUPS.reduce((n, g) => n + g.items.length, 0);
const W = 2 * PAD + count * TILE + (count - GROUPS.length) * GAP + (GROUPS.length - 1) * GROUP_GAP + 2 * 14;

function stackCard(c, icons) {
  const H = 160;
  const TOP = 58;
  let x = PAD + 14;
  let i = 0;
  const parts = [];
  GROUPS.forEach((group, g) => {
    parts.push(`<text class="label" x="${x}" y="38">${esc(group.label)}</text>`);
    group.items.forEach((item, k) => {
      parts.push(tile(c, item, icons[i], x + k * (TILE + GAP) + TILE / 2, TOP, TILE, 28, 60 + i * 45));
      i++;
    });
    x += group.items.length * TILE + (group.items.length - 1) * GAP;
    if (g < GROUPS.length - 1) {
      const dx = x + GROUP_GAP / 2;
      parts.push(`<line x1="${dx}" y1="${TOP + 6}" x2="${dx}" y2="${TOP + TILE - 6}" stroke="${c.border}"/>`);
      x += GROUP_GAP;
    }
  });
  const names = GROUPS.flatMap((g) => g.items.map((it) => it.name)).join(", ");
  return `${svgOpen(W, H, "Core stack", `Core stack: ${names}`)}\n${style(c)}\n${frame(c, W, H)}\n${parts.join("\n")}\n</svg>\n`;
}

/** Mobile variant: the same groups, three tiles per row, so icons and names stay readable. */
function stackCardNarrow(c, icons) {
  const NW = 360;
  const COLS = 3;
  const ROW = TILE + 38;
  const colW = (NW - 2 * PAD) / COLS;
  const parts = [];
  let y = 38;
  let i = 0;
  GROUPS.forEach((group) => {
    parts.push(`<text class="label" x="${PAD}" y="${y}">${esc(group.label)}</text>`);
    const top = y + 18;
    group.items.forEach((item, k) => {
      const cx = PAD + (k % COLS) * colW + colW / 2;
      parts.push(tile(c, item, icons[i], cx, top + Math.floor(k / COLS) * ROW, TILE, 28, 60 + i * 45));
      i++;
    });
    y = top + Math.ceil(group.items.length / COLS) * ROW + 30;
  });
  const H = y - 30 + 4;
  const names = GROUPS.flatMap((g) => g.items.map((it) => it.name)).join(", ");
  return `${svgOpen(NW, H, "Core stack", `Core stack: ${names}`)}\n${style(c)}\n${frame(c, NW, H)}\n${parts.join("\n")}\n</svg>\n`;
}

// ---------- tools strip (README, collapsible section under the stack card) ----------
// Plain icons like a classic README strip; names show on hover. Single-color logos get a dark and a
// light file in img/tools/ and a <picture>, so they stay visible in both GitHub themes.
const ICON_H = 30;
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function toolsStrip() {
  mkdirSync(join(ROOT, "img/tools"), { recursive: true });
  const items = [];
  for (const t of TOOLS) {
    const attrs = `title="${esc(t.name)}" alt="${esc(t.name)}" height="${ICON_H}"`;
    if (!t.mono) {
      items.push(`<img src="${t.icon}" ${attrs}/>`);
      continue;
    }
    const files = {};
    for (const [theme, c] of Object.entries(THEMES)) {
      files[theme] = `img/tools/${slug(t.name)}-${theme}.svg`;
      writeFileSync(join(ROOT, files[theme]), await iconSvg(t.icon, c.text));
    }
    items.push(
      `<picture><source media="(prefers-color-scheme: dark)" srcset="${files.dark}"><img src="${files.light}" ${attrs}/></picture>`,
    );
  }
  return items.join("&nbsp;\n");
}

/** Replaces the block between the tools markers in README.md. */
function writeReadme(strip) {
  const path = join(ROOT, "README.md");
  const readme = readFileSync(path, "utf8");
  const start = "<!-- tools:start -->";
  const end = "<!-- tools:end -->";
  const a = readme.indexOf(start);
  const b = readme.indexOf(end);
  if (a < 0 || b < a) throw new Error("README.md: tools markers not found");
  writeFileSync(path, `${readme.slice(0, a + start.length)}\n${strip}\n${readme.slice(b)}`);
}

mkdirSync(OUT, { recursive: true });
for (const [name, c] of Object.entries(THEMES)) {
  const stackIcons = await Promise.all(GROUPS.flatMap((g) => g.items.map((it) => loadIcon(it.icon))));
  writeFileSync(join(OUT, `stack-${name}.svg`), stackCard(c, stackIcons));
  writeFileSync(join(OUT, `stack-${name}-narrow.svg`), stackCardNarrow(c, stackIcons));
}
writeReadme(await toolsStrip());
console.log(`stack card ${W}px wide, ${count} items; tools strip ${TOOLS.length} icons`);

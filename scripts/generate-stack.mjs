/**
 * Generates the "Core stack" cards in the same style as the stat cards (light + dark variants):
 *  - img/stats/stack-*.svg: one row of rounded tiles, languages and frameworks & platforms,
 * and the README "Core Tech Stack" terminal cards in img/cards/: stack-terminal-*.svg (stack.ts with
 * the groups from profile.config.json and the coding robot) and tools-terminal-*.svg (npm ls --all).
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
.label{font-size:14.5px;font-weight:600;fill:${c.text}}
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

// ---------- terminal cards (README "Core Tech Stack"): stack.ts + npm ls --all ----------
// Both cards are editor / terminal windows in the frame and colors of the content cards
// (generate-cards.mjs). Text is monospace, every token pinned to its column with textLength, so the
// layout does not depend on the viewer's fonts. The coding robot sits in the corner of stack.ts.
const CONFIG = JSON.parse(readFileSync(join(ROOT, "profile.config.json"), "utf8"));
const CARDS = join(ROOT, "img/cards");
const ROBOT = join(ROOT, "img/mascot/robot-coding.webp");
const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
const TW = 880;
const BAR = 38;

const TERM = {
  dark: {
    bg: "#0e131a", border: "#232c3a", bar: "#121a24", barText: "#79c0ff", gutter: "#3d4a5c",
    text: "#c9d1d9", kw: "#ff7b72", name: "#d2a8ff", prop: "#79c0ff", str: "#a5d6ff", comment: "#38bdf8",
    ok: "#3fb950", tree: "#3d4a5c", lightTile: "#e6edf3",
  },
  light: {
    bg: "#ffffff", border: "#d0d7de", bar: "#f6f8fa", barText: "#0550ae", gutter: "#a7b1bc",
    text: "#24292f", kw: "#cf222e", name: "#8250df", prop: "#0550ae", str: "#0a3069", comment: "#0969da",
    ok: "#1a7f37", tree: "#a7b1bc", lightTile: "#f6f8fa",
  },
};

/** Monospace token at a column: width pinned to its length x the char width. */
function tok(t, x, y, size, fill, weight = "") {
  const w = (t.length * size * 0.6).toFixed(1);
  return `<text x="${x.toFixed(1)}" y="${y}" textLength="${w}" lengthAdjust="spacingAndGlyphs" xml:space="preserve" style="font:${weight}${size}px ${MONO};fill:${fill}">${esc(t)}</text>`;
}

function windowChrome(c, H, title) {
  const dots = ["#ff5f57", "#febc2e", "#28c840"].map((col, i) => `<circle cx="${24 + i * 18}" cy="${BAR / 2}" r="6" fill="${col}"/>`).join("");
  return `<rect x=".5" y=".5" width="${TW - 1}" height="${H - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
<path d="M1 ${BAR}V11A10 10 0 0 1 11 1H${TW - 11}A10 10 0 0 1 ${TW - 1} 11V${BAR}Z" fill="${c.bar}"/>
<line x1="1" y1="${BAR}" x2="${TW - 1}" y2="${BAR}" stroke="${c.border}"/>
${dots}
${tok(title, 92, BAR / 2 + 4.5, 12.5, c.barText, "600 ")}`;
}

/** Lines of stack.ts as token lists [text, role]; arrays wrap under the opening bracket. */
function stackLines(maxCols) {
  const L = [];
  L.push([["// DamReboot IT · core tech stack", "comment"]]);
  L.push([["export", "kw"], [" ", "text"], ["const", "kw"], [" ", "text"], ["stack", "name"], [" = {", "text"]]);
  for (const g of CONFIG.stack) {
    L.push([[`  // ${g.title}`, "comment"]]);
    const head = `  ${g.id}: [`;
    const items = g.items.map((it) => `"${it[1]}"`);
    let line = [["  ", "text"], [g.id, "prop"], [": [", "text"]];
    let col = head.length;
    items.forEach((item, i) => {
      const tail = i < items.length - 1 ? ", " : "],";
      if (col + item.length + tail.trimEnd().length > maxCols && col > head.length) {
        L.push(line);
        line = [[" ".repeat(head.length), "text"]];
        col = head.length;
      }
      line.push([item, "str"], [tail, "text"]);
      col += item.length + tail.length;
    });
    L.push(line);
  }
  L.push([["} ", "text"], ["as", "kw"], [" ", "text"], ["const", "kw"], [";", "text"]]);
  return L;
}

function stackTerminal(c, robot) {
  const SIZE = 13.5;
  const CW = SIZE * 0.6;
  const LH = 22;
  const CODE_X = 60;
  const ROBOT_W = 228;
  const maxCols = Math.floor((TW - ROBOT_W - CODE_X - 34) / CW);
  const lines = stackLines(maxCols);
  const top = BAR + 30;
  const promptY = top + (lines.length + 1) * LH;
  const H = promptY + LH + 26;
  const parts = [];
  lines.forEach((tokens, i) => {
    const y = top + i * LH;
    parts.push(tok(String(i + 1).padStart(2, " "), CODE_X - 38, y, 12, c.gutter));
    let col = 0;
    for (const [t, role] of tokens) {
      if (t.trim()) parts.push(tok(t, CODE_X + col * CW, y, SIZE, c[role], role === "comment" ? "italic " : ""));
      col += t.length;
    }
  });
  // prompt line with a blinking cursor
  const cmd = "pnpm turbo build";
  const ok = "✓ ready to ship";
  const x = CODE_X - 38;
  parts.push(tok("$", x, promptY, SIZE, c.ok, "700 "));
  parts.push(tok(cmd, x + 2 * CW, promptY, SIZE, c.text));
  const okX = x + (cmd.length + 5) * CW;
  parts.push(tok(ok, okX, promptY, SIZE, c.ok, "600 "));
  parts.push(`<rect class="cursor" x="${(okX + (ok.length + 1) * CW).toFixed(1)}" y="${promptY - 13}" width="${CW.toFixed(1)}" height="17" fill="${c.comment}"/>`);
  const rh = Math.round((ROBOT_W * 411) / 400);
  const robotImg = `<image href="${robot}" x="${TW - ROBOT_W - 14}" y="${H - rh - 6}" width="${ROBOT_W}" height="${rh}"/>`;
  const label = `Core tech stack: ${CONFIG.stack.map((g) => `${g.title}: ${g.items.map((i) => i[1]).join(", ")}`).join("; ")}`;
  return `${svgOpen(TW, H, "Core tech stack", label)}
<style>.cursor{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.cursor{animation:none}}</style>
${windowChrome(c, H, "~/damreboot — stack.ts")}
${parts.join("\n")}
${robotImg}
</svg>
`;
}

async function toolsTerminal(c) {
  const SIZE = 13;
  const CW = SIZE * 0.6;
  const COLS = 4;
  const ROWS = Math.ceil(TOOLS.length / COLS);
  const RH = 27;
  const X0 = 28;
  const COLW = (TW - 2 * X0) / COLS;
  const top = BAR + 30;
  const treeTop = top + 34;
  const H = treeTop + ROWS * RH + 14;
  const parts = [];
  parts.push(tok("$", X0, top, SIZE, c.ok, "700 "));
  parts.push(tok("npm ls --all", X0 + 2 * CW, top, SIZE, c.text));
  parts.push(tok(`# ${TOOLS.length} languages & tools`, X0 + 16 * CW, top, SIZE, c.comment, "italic "));
  parts.push(tok("damreboot@stack", X0, top + 24, SIZE, c.name, "600 "));
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const col = Math.floor(i / ROWS);
    const row = i % ROWS;
    const last = row === ROWS - 1 || i === TOOLS.length - 1;
    const x = X0 + col * COLW;
    const y = treeTop + row * RH + 18;
    parts.push(tok(last ? "└──" : "├──", x, y, SIZE, c.tree));
    const icon = await loadIcon(t.icon, t.mono ? c.text : undefined);
    const ix = x + 4 * CW;
    if (t.dark && c === TERM.dark) parts.push(`<rect x="${(ix - 2).toFixed(1)}" y="${y - 16}" width="22" height="22" rx="5" fill="${c.lightTile}"/>`);
    parts.push(`<image href="${icon}" x="${ix.toFixed(1)}" y="${y - 14}" width="18" height="18"/>`);
    parts.push(tok(t.name, ix + 28, y, SIZE, c.text));
  }
  return `${svgOpen(TW, H, "All languages and tools", `All languages and tools: ${TOOLS.map((t) => t.name).join(", ")}`)}
${windowChrome(c, H, "~/damreboot — zsh")}
${parts.join("\n")}
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [name, c] of Object.entries(THEMES)) {
  const stackIcons = await Promise.all(GROUPS.flatMap((g) => g.items.map((it) => loadIcon(it.icon))));
  writeFileSync(join(OUT, `stack-${name}.svg`), stackCard(c, stackIcons));
}
const robot = `data:image/webp;base64,${readFileSync(ROBOT).toString("base64")}`;
for (const [name, c] of Object.entries(TERM)) {
  writeFileSync(join(CARDS, `stack-terminal-${name}.svg`), stackTerminal(c, robot));
  writeFileSync(join(CARDS, `tools-terminal-${name}.svg`), await toolsTerminal(c));
}
console.log(`stack card ${W}px wide, ${count} items; terminal cards: stack.ts + npm ls (${TOOLS.length} tools) x 2 themes`);

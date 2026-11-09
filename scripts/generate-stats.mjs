/**
 * Generates the profile stat cards (img/stats/*.svg) in a GitHub-native look with DamReboot accents:
 *  - overview: contributions, repositories, stars, current/longest streak, best day + last 12 months,
 *  - languages: most used languages by code size (bytes, the same way GitHub computes the repo bar).
 * Each card comes in a dark and a light variant (README picks one with <picture>).
 *
 * Only aggregated numbers are rendered - never names of repositories (private ones may be under NDA).
 *
 * Token: STATS_TOKEN (fine-grained PAT of DamTchorzewski -> full picture incl. private repos and
 * contributions) or GITHUB_TOKEN (Actions token -> public data only). Run: node scripts/generate-stats.mjs
 * Zero dependencies, Node 20+.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "DamTchorzewski";
const API = "https://api.github.com";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../img/stats");
/** Repos skipped only when counting languages (a single generated ~19 MB HTML file skews the bar). */
const LANGUAGE_EXCLUDED = new Set(["Proffico/wms-sync"]);
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN || "";

// ---------- GitHub API ----------
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${USER}-profile-stats`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(path, attempts = 3) {
  for (let i = 1; ; i++) {
    const res = await fetch(`${API}${path}`, { headers });
    if (res.ok) return res.json();
    if (i >= attempts) throw new Error(`GET ${path} -> ${res.status}`);
    const retry = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retry) && retry > 0 ? retry * 1000 : i * 500);
  }
}

async function graphql(query, variables = {}) {
  if (!TOKEN) return null;
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors?.length) {
    console.warn(`GraphQL failed: ${res.status} ${JSON.stringify(body.errors ?? "")}`);
    return null;
  }
  return body.data;
}

/** "viewer" when the token belongs to the profile owner (sees private data), otherwise public user(login). */
async function detectMode() {
  const data = await graphql("query { viewer { login } }");
  return data?.viewer?.login?.toLowerCase() === USER.toLowerCase() ? "viewer" : "user";
}

async function fetchRepos(mode) {
  const base =
    mode === "viewer"
      ? "/user/repos?per_page=100&visibility=all&affiliation=owner,collaborator,organization_member"
      : `/users/${USER}/repos?per_page=100&type=owner`;
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await rest(`${base}&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}

async function fetchLanguages(repos) {
  const totals = new Map();
  const queue = repos.filter((r) => !r.fork && !LANGUAGE_EXCLUDED.has(r.full_name));
  let next = 0;
  const worker = async () => {
    while (next < queue.length) {
      const repo = queue[next++];
      const langs = await rest(`/repos/${repo.full_name}/languages`).catch(() => ({}));
      for (const [lang, bytes] of Object.entries(langs)) totals.set(lang, (totals.get(lang) ?? 0) + bytes);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return { totals, counted: queue.length };
}

/** Whole account history, one GraphQL window per year (the API caps a window at one year). */
async function fetchCalendar(mode) {
  const who = mode === "viewer" ? "viewer" : `user(login: "${USER}")`;
  const account = await graphql(`query { ${who} { createdAt } }`);
  const createdAt = account?.[mode === "viewer" ? "viewer" : "user"]?.createdAt;
  if (!createdAt) return null;

  const days = new Map();
  const now = new Date();
  for (let from = new Date(createdAt); from < now; ) {
    const to = new Date(from);
    to.setUTCFullYear(to.getUTCFullYear() + 1);
    const data = await graphql(
      `query ($from: DateTime!, $to: DateTime!) { ${who} { contributionsCollection(from: $from, to: $to) {
        contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`,
      { from: from.toISOString(), to: (to > now ? now : to).toISOString() },
    );
    const root = data?.[mode === "viewer" ? "viewer" : "user"];
    for (const week of root?.contributionsCollection.contributionCalendar.weeks ?? []) {
      for (const d of week.contributionDays) if (!days.has(d.date)) days.set(d.date, d.contributionCount);
    }
    from = to;
  }
  const list = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
  return { createdAt, days: list };
}

function streaks(days) {
  let longest = 0;
  let run = 0;
  let best = 0;
  for (const [, count] of days) {
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    best = Math.max(best, count);
  }
  // current streak: today may still be empty, so it can end yesterday
  let i = days.length - 1;
  if (i >= 0 && days[i][1] === 0) i--;
  let current = 0;
  for (; i >= 0 && days[i][1] > 0; i--) current++;
  return { longest, current, best };
}

function lastMonths(days, n = 12) {
  const now = new Date();
  const months = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), count: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const [date, count] of days) {
    const m = byKey.get(date.slice(0, 7));
    if (m) m.count += count;
  }
  return months;
}

// ---------- SVG ----------
const THEMES = {
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#8d96a0",
    track: "#21262d",
    empty: "#161b22",
    blue: "#4c8bec",
    blueBg: "rgba(76,139,236,.14)",
    levels: ["#1b3873", "#2856ad", "#3a73d6", "#4c8bec"],
    flame: "#f97316",
    trophy: "#f59e0b",
    zap: "#eab308",
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    text: "#1f2328",
    muted: "#59636e",
    track: "#eff2f5",
    empty: "#eff2f5",
    blue: "#3d6cc9",
    blueBg: "rgba(61,108,201,.1)",
    levels: ["#b3c8f0", "#7c9fe2", "#5784d6", "#3d6cc9"],
    flame: "#ea580c",
    trophy: "#d97706",
    zap: "#ca8a04",
  },
};

/** Lucide icons (ISC license), 24px grid. */
const ICONS = {
  commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
  repo: '<path d="M18 19a5 5 0 0 1-5-5v8"/><path d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5"/><circle cx="13" cy="12" r="2"/><circle cx="20" cy="19" r="2"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  flame: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  trophy: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
  zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
};

/** GitHub linguist colors. */
const LANGUAGE_COLORS = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", HTML: "#e34c26", CSS: "#663399", SCSS: "#c6538c",
  Python: "#3572A5", PHP: "#4F5D95", "C#": "#178600", Java: "#b07219", Go: "#00ADD8", Rust: "#dea584",
  Shell: "#89e051", PowerShell: "#012456", Dockerfile: "#384d54", Vue: "#41b883", Svelte: "#ff3e00",
  Astro: "#ff5a03", MDX: "#fcb32c", Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB", Ruby: "#701516",
  "C++": "#f34b7d", C: "#555555", Handlebars: "#f7931e", EJS: "#a91e50", Less: "#1d365d", Sass: "#a53b70",
};

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmt = (n) => n.toLocaleString("en-US");

const W = 480;
const H = 250;
const PAD = 24;

const frame = (c, title, aside, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>
text{font-family:${FONT};fill:${c.text}}
.muted{fill:${c.muted}}
.t{font-size:16px;font-weight:600}
.s{font-size:12px}
.v{font-size:19px;font-weight:700}
.fade{animation:fade .6s cubic-bezier(.2,.8,.2,1) both}
.grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow .8s cubic-bezier(.2,.8,.2,1) both}
.growx{transform-box:fill-box;transform-origin:0 50%;animation:growx 1s cubic-bezier(.2,.8,.2,1) both}
@keyframes fade{from{opacity:0;transform:translateY(5px)}}
@keyframes grow{from{transform:scaleY(0)}}
@keyframes growx{from{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
<text class="t" x="${PAD}" y="38">${esc(title)}</text>
<text class="s muted" x="${W - PAD}" y="38" text-anchor="end">${esc(aside)}</text>
${body}
</svg>
`;

function overviewCard(c, s) {
  const cells = [
    { icon: "commit", tone: c.blue, bg: c.blueBg, value: fmt(s.contributions), label: "Contributions" },
    { icon: "repo", tone: c.blue, bg: c.blueBg, value: fmt(s.repos), label: "Repositories" },
    { icon: "star", tone: c.blue, bg: c.blueBg, value: fmt(s.stars), label: "Stars earned" },
    { icon: "flame", tone: c.flame, bg: `${c.flame}22`, value: `${s.current} days`, label: "Current streak" },
    { icon: "trophy", tone: c.trophy, bg: `${c.trophy}22`, value: `${s.longest} days`, label: "Longest streak" },
    { icon: "zap", tone: c.zap, bg: `${c.zap}22`, value: fmt(s.best), label: "Best day" },
  ];
  const colW = (W - 2 * PAD) / 3;
  const grid = cells
    .map((cell, i) => {
      const x = PAD + (i % 3) * colW;
      const y = 60 + Math.floor(i / 3) * 50;
      return `<g class="fade" style="animation-delay:${80 + i * 70}ms">
<circle cx="${x + 16}" cy="${y + 17}" r="16" fill="${cell.bg}"/>
<svg x="${x + 7}" y="${y + 8}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${cell.tone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[cell.icon]}</svg>
<text class="v" x="${x + 42}" y="${y + 17}">${esc(cell.value)}</text>
<text class="s muted" x="${x + 42}" y="${y + 33}">${esc(cell.label)}</text>
</g>`;
    })
    .join("\n");

  const gap = 8;
  const bw = (W - 2 * PAD - 11 * gap) / 12;
  const top = 186;
  const bh = 34;
  const max = Math.max(1, ...s.months.map((m) => m.count));
  const bars = s.months
    .map((m, i) => {
      const x = PAD + i * (bw + gap);
      const h = m.count > 0 ? Math.max(4, (m.count / max) * bh) : 3;
      const last = i === s.months.length - 1;
      const level = Math.min(3, Math.floor((m.count / max) * 4));
      const fill = m.count === 0 ? c.empty : last ? c.trophy : c.levels[level];
      return `<rect class="grow" style="animation-delay:${450 + i * 40}ms" x="${x.toFixed(1)}" y="${(top + bh - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}"><title>${m.label}: ${fmt(m.count)}</title></rect>
<text class="muted" x="${(x + bw / 2).toFixed(1)}" y="${top + bh + 16}" text-anchor="middle" style="font-size:10px">${m.label.slice(0, 3)}</text>`;
    })
    .join("\n");
  const yearTotal = s.months.reduce((sum, m) => sum + m.count, 0);
  const body = `${grid}
<text class="s muted" x="${PAD}" y="${top - 10}">Last 12 months</text>
<text class="s muted" x="${W - PAD}" y="${top - 10}" text-anchor="end">${fmt(yearTotal)} contributions</text>
${bars}`;
  return frame(c, "GitHub activity", `since ${s.since}`, body, `GitHub activity of ${USER}`);
}

function languagesCard(c, s) {
  const total = s.languages.reduce((sum, l) => sum + l.bytes, 0) || 1;
  const top = s.languages.slice(0, 6).map((l) => ({ ...l, pct: (l.bytes / total) * 100 }));
  const rest = 100 - top.reduce((sum, l) => sum + l.pct, 0);
  const segments = rest >= 0.5 ? [...top, { name: "Other", pct: rest, other: true }] : top;
  const color = (l) => (l.other ? c.muted : LANGUAGE_COLORS[l.name] ?? c.blue);

  const barW = W - 2 * PAD;
  let x = PAD;
  const bar = segments
    .map((l, i) => {
      const w = (l.pct / 100) * barW;
      const seg = `<rect x="${x.toFixed(2)}" y="56" width="${Math.max(0, w - (i < segments.length - 1 ? 2 : 0)).toFixed(2)}" height="10" fill="${color(l)}"/>`;
      x += w;
      return seg;
    })
    .join("");

  const colW = (W - 2 * PAD - 24) / 2;
  const items = top
    .map((l, i) => {
      const cx = PAD + (i % 2) * (colW + 24);
      const y = 100 + Math.floor(i / 2) * 48;
      const pct = l.pct >= 10 ? l.pct.toFixed(0) : l.pct.toFixed(1);
      return `<g class="fade" style="animation-delay:${250 + i * 70}ms">
<circle cx="${cx + 5}" cy="${y - 5}" r="5" fill="${color(l)}"/>
<text x="${cx + 17}" y="${y}" style="font-size:14px;font-weight:600">${esc(l.name)}</text>
<text class="muted" x="${cx + colW}" y="${y}" text-anchor="end" style="font-size:13px">${pct}%</text>
<rect x="${cx}" y="${y + 10}" width="${colW}" height="4" rx="2" fill="${c.track}"/>
<rect class="growx" style="animation-delay:${350 + i * 70}ms" x="${cx}" y="${y + 10}" width="${Math.max(4, (l.pct / top[0].pct) * colW).toFixed(1)}" height="4" rx="2" fill="${color(l)}"/>
</g>`;
    })
    .join("\n");

  const body = `<clipPath id="bar"><rect x="${PAD}" y="56" width="${barW}" height="10" rx="5"/></clipPath>
<g clip-path="url(#bar)"><rect x="${PAD}" y="56" width="${barW}" height="10" fill="${c.track}"/><g class="growx">${bar}</g></g>
${items}`;
  return frame(c, "Most used languages", `by code size · ${s.counted} repos`, body, `Most used languages of ${USER}`);
}

// ---------- main ----------
// In Actions without the owner token the cards would drop private work - keep the committed ones instead.
if (process.env.GITHUB_ACTIONS && !process.env.STATS_TOKEN && process.env.STATS_PUBLIC_ONLY !== "1") {
  console.warn("STATS_TOKEN secret is not set - keeping the existing cards (set STATS_PUBLIC_ONLY=1 to allow public-only).");
  process.exit(0);
}
const mode = await detectMode();
console.log(`Mode: ${mode === "viewer" ? "owner token (public + private)" : "public data"}`);
const [repos, calendar] = await Promise.all([fetchRepos(mode), fetchCalendar(mode)]);
const { totals, counted } = await fetchLanguages(repos);
const days = calendar?.days ?? [];
const st = streaks(days);
const stats = {
  repos: repos.length,
  stars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
  contributions: days.reduce((sum, [, n]) => sum + n, 0),
  ...st,
  months: lastMonths(days),
  since: calendar ? new Date(calendar.createdAt).getUTCFullYear() : "",
  languages: [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name, bytes]) => ({ name, bytes })),
  counted,
};

mkdirSync(OUT, { recursive: true });
for (const [name, c] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `overview-${name}.svg`), overviewCard(c, stats));
  writeFileSync(join(OUT, `languages-${name}.svg`), languagesCard(c, stats));
}
console.log(
  `repos ${stats.repos}, stars ${stats.stars}, contributions ${stats.contributions}, streak ${st.current}/${st.longest}, best ${st.best}, languages ${stats.languages.length} (${counted} repos)`,
);

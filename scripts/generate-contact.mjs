/**
 * Generates the contact block for README.md (img/contact/*): a call-to-action banner and four
 * clickable contact cards (email, LinkedIn, portfolio, company site), light + dark variants, in the
 * same style as the other cards. Each card is its own image so README can wrap it in a link.
 *
 * Icons: Remix Icon (Apache-2.0). Style rules: no uppercase text, no grey text.
 * Run when the contact details change: node scripts/generate-contact.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../img/contact");

export const CONTACTS = [
  { id: "email", icon: "mail", label: "Email", value: "damianchabracki@gmail.com", href: "mailto:damianchabracki@gmail.com" },
  { id: "linkedin", icon: "linkedin", label: "LinkedIn", value: "Damian Tchorzewski", href: "https://www.linkedin.com/in/damian-tchorzewski-3b2388275/" },
  { id: "portfolio", icon: "cv", label: "Portfolio & CV", value: "cv.damreboot.pl", href: "https://cv.damreboot.pl" },
  { id: "company", icon: "globe", label: "DamReboot IT", value: "damreboot.pl", href: "https://damreboot.pl" },
];

const ICONS = {
  mail: "M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.23792L12.0718 14.338L4 7.21594V19H20V7.23792ZM4.51146 5L12.0619 11.662L19.501 5H4.51146Z",
  linkedin: "M6.94048 4.99993C6.94011 5.81424 6.44608 6.54702 5.69134 6.85273C4.9366 7.15845 4.07187 6.97605 3.5049 6.39155C2.93793 5.80704 2.78195 4.93715 3.1105 4.19207C3.43906 3.44699 4.18654 2.9755 5.00048 2.99993C6.08155 3.03238 6.94097 3.91837 6.94048 4.99993ZM7.00048 8.47993H3.00048V20.9999H7.00048V8.47993ZM13.3205 8.47993H9.34048V20.9999H13.2805V14.4299C13.2805 10.7699 18.0505 10.4299 18.0505 14.4299V20.9999H22.0005V13.0699C22.0005 6.89993 14.9405 7.12993 13.2805 10.1599L13.3205 8.47993Z",
  globe: "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM9.71002 19.6674C8.74743 17.6259 8.15732 15.3742 8.02731 13H4.06189C4.458 16.1765 6.71639 18.7747 9.71002 19.6674ZM10.0307 13C10.1811 15.4388 10.8778 17.7297 12 19.752C13.1222 17.7297 13.8189 15.4388 13.9693 13H10.0307ZM19.9381 13H15.9727C15.8427 15.3742 15.2526 17.6259 14.29 19.6674C17.2836 18.7747 19.542 16.1765 19.9381 13ZM4.06189 11H8.02731C8.15732 8.62577 8.74743 6.37407 9.71002 4.33256C6.71639 5.22533 4.458 7.8235 4.06189 11ZM10.0307 11H13.9693C13.8189 8.56122 13.1222 6.27025 12 4.24799C10.8778 6.27025 10.1811 8.56122 10.0307 11ZM14.29 4.33256C15.2526 6.37407 15.8427 8.62577 15.9727 11H19.9381C19.542 7.8235 17.2836 5.22533 14.29 4.33256Z",
  cv: "M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM12 11.5C10.6193 11.5 9.5 10.3807 9.5 9C9.5 7.61929 10.6193 6.5 12 6.5C13.3807 6.5 14.5 7.61929 14.5 9C14.5 10.3807 13.3807 11.5 12 11.5ZM7.52746 17C7.77619 14.75 9.68372 13 12 13C14.3163 13 16.2238 14.75 16.4725 17H7.52746Z",
  arrow: "M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z",
};

const THEMES = {
  dark: {
    bg: "#0d1117", border: "#30363d", text: "#e6edf3", accent: "#6ea8ff", accentBg: "rgba(110,168,255,.14)",
    empty: "#151b24", levels: ["#13254a", "#1b3873", "#2856ad", "#4c8bec"], amber: "#f59e0b",
  },
  light: {
    bg: "#ffffff", border: "#d0d7de", text: "#1f2328", accent: "#2f5fb3", accentBg: "rgba(47,95,179,.1)",
    empty: "#eff2f5", levels: ["#dbe5f8", "#b3c8f0", "#7c9fe2", "#3d6cc9"], amber: "#f59e0b",
  },
};

const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const style = (c) => `<style>
text{font-family:${FONT};fill:${c.text}}
.fade{animation:fade .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes fade{from{opacity:0;transform:translateY(5px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
const open = (w, h, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">\n<title>${esc(label)}</title>`;
const frame = (c, w, h) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>`;
const icon = (name, x, y, size, fill) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="${fill}" d="${ICONS[name]}"/></svg>`;

// ---------- call-to-action banner (same width as the stack card) ----------
const BW = 890;
const BH = 132;

function banner(c) {
  // contribution grid on the right, fading towards the text (the motif of the main banner)
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const cells = [];
  const STEP = 14;
  for (let y = 12; y + 10 <= BH - 10; y += STEP) {
    for (let x = BW - 24 - 10; x > BW * 0.68; x -= STEP) {
      const fade = Math.min(1, (x - BW * 0.68) / (BW * 0.16));
      const v = rnd();
      if (v < 0.5) continue;
      const level = v < 0.75 ? 0 : v < 0.9 ? 1 : v < 0.97 ? 2 : 3;
      const hot = rnd() < 0.04;
      cells.push(`<rect x="${x}" y="${y}" width="10" height="10" rx="2" fill="${hot ? c.amber : c.levels[level]}" opacity="${(fade * 0.9).toFixed(2)}"/>`);
    }
  }
  return `${open(BW, BH, "Let's build something together")}
${style(c)}
${frame(c, BW, BH)}
<g>${cells.join("")}</g>
<g class="fade">
<text x="32" y="56" style="font-size:26px;font-weight:700;letter-spacing:-.01em">Let's build something together</text>
<text x="32" y="88" style="font-size:15px">Web, desktop and mobile applications for businesses, <tspan style="fill:${c.accent};font-weight:600">from idea to production.</tspan></text>
</g>
</svg>
`;
}

// ---------- contact cards (two per row in README) ----------
const CW = 440;
const CH = 84;

function card(c, item, i) {
  return `${open(CW, CH, `${item.label}: ${item.value}`)}
${style(c)}
${frame(c, CW, CH)}
<g class="fade" style="animation-delay:${80 + i * 70}ms">
<circle cx="46" cy="${CH / 2}" r="22" fill="${c.accentBg}"/>
${icon(item.icon, 35, CH / 2 - 11, 22, c.accent)}
<text x="84" y="36" style="font-size:12.5px;font-weight:600;fill:${c.accent}">${esc(item.label)}</text>
<text x="84" y="59" style="font-size:16px;font-weight:600">${esc(item.value)}</text>
${icon("arrow", CW - 46, CH / 2 - 10, 20, c.text)}
</g>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [theme, c] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `banner-${theme}.svg`), banner(c));
  CONTACTS.forEach((item, i) => writeFileSync(join(OUT, `${item.id}-${theme}.svg`), card(c, item, i)));
}
console.log(`contact: banner + ${CONTACTS.length} cards`);

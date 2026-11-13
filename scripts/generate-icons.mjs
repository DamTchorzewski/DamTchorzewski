/**
 * Generates the inline icons of README.md (img/icons/<name>-dark.svg and -light.svg): the "Open to" line and the
 * footer. Same tile as the section headings (see icons.mjs), so they sit in a line of text like
 * the emoji they replace. align="middle" puts the middle of the whole image on the baseline of the line, and the optical
 * middle of the text is about 0.33em above it, so each canvas has empty space under the tile that lifts it there.
 * Run when the icon set changes: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconGlyph, iconTile } from "./icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "img/icons");
mkdirSync(OUT, { recursive: true });

// file name -> [glyph in the set, empty space under it, tile or bare glyph]
const ICONS = {
  "open-to": ["openTo", 11.8, "bare"], // 16px body text: bare glyph, 22px box, center 5px above the baseline
  engineered: ["stack", 11.8, "bare"],
};

for (const [file, [glyph, pad, kind]] of Object.entries(ICONS)) {
  for (const theme of ["dark", "light"]) {
    const g = kind === "tile" ? iconTile(glyph, theme, 0) : iconGlyph(glyph, theme);
    writeFileSync(join(OUT, `${file}-${theme}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="${24 + pad}" viewBox="0 0 24 ${24 + pad}" aria-hidden="true">
${g}
</svg>
`);
  }
}
console.log(`icons: ${Object.keys(ICONS).length} x 2 themes`);

/**
 * Generates the inline icon of the footer of README.md (img/icons/engineered-dark.svg and -light.svg): the bare glyph, no
 * tile and no frame. It sits in a line of text like the emoji it replaces. align="middle" puts the middle of the whole
 * image on the baseline of the line, and the optical middle of the text is about 0.33em above it, so the canvas has empty
 * space under the glyph that lifts it there.
 * Run when the icon set changes: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconGlyph } from "./icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "img/icons");
mkdirSync(OUT, { recursive: true });

// file name -> [glyph in the set, empty space under it]
const ICONS = {
  engineered: ["stack", 11.8],
};

for (const [file, [glyph, pad]] of Object.entries(ICONS)) {
  for (const theme of ["dark", "light"]) {
    const g = iconGlyph(glyph, theme);
    writeFileSync(join(OUT, `${file}-${theme}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="${24 + pad}" viewBox="0 0 24 ${24 + pad}" aria-hidden="true">
${g}
</svg>
`);
  }
}
console.log(`icons: ${Object.keys(ICONS).length} x 2 themes`);

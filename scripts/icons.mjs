/**
 * The icons of README.md (replace the emoji): one line weight, one accent color. Every glyph is drawn on a 24x24 grid
 * with round caps and joins, so they all look like one family. Used by generate-sections.mjs (section headings, in a
 * tile) and generate-icons.mjs (the header "Hi, I'm ..." in a tile; "Open to" and the footer as the bare glyph).
 *
 * The tile is drawn on 24x24 and shown at 26x26 everywhere (the section headings and the "Hi, I'm ..." header, so they
 * share one size), a little larger than the emoji it replaces. In the section headings its center sits at y = 13.5:
 * between the middle of the capital and of the lowercase letters of the 24px heading text next to it (baseline y = 20),
 * so icon and text are optically centered on each other.
 */
export const ICONS = {
  featured: // rocket
    `<path d="M12 2.5c3 2 5 5.4 5 9.3 0 1.6-.4 3-1 4.2H8c-.6-1.2-1-2.6-1-4.2 0-3.9 2-7.3 5-9.3z"/><circle cx="12" cy="9.5" r="1.9"/><path d="M8 15.6l-3 2.9v-3.4l2-2.5M16 15.6l3 2.9v-3.4l-2-2.5M10 19c.5 1 1 1.9 2 2.6 1-.7 1.5-1.6 2-2.6"/>`,
  domains: // compass
    `<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z"/>`,
  stack: // bolt
    `<path d="M13.2 2.5L5.5 13.4h5.8L10.4 21.5l8.1-11.4h-5.9z"/>`,
  telemetry: // bar chart
    `<path d="M5.5 20.5v-8M12 20.5v-16M18.5 20.5v-11"/>`,
  hi: // person
    `<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c.6-3.8 3.7-6 7.5-6s6.9 2.2 7.5 6"/>`,
  openTo: // briefcase
    `<rect x="3" y="7.5" width="18" height="12.5" rx="2.2"/><path d="M8.5 7.5V6a1.8 1.8 0 0 1 1.8-1.8h3.4A1.8 1.8 0 0 1 15.5 6v1.5M3 13h18M10.5 13v1.6h3V13"/>`,
};

export const ICON_COLOR = { dark: "#38bdf8", light: "#0969da" };

/** Tile (outer size `size`) with the glyph inside, in the given theme; `y` moves the tile down inside its canvas. */
export function iconTile(id, theme, y = 1, size = 24) {
  const col = ICON_COLOR[theme];
  const k = (size - 4) / 24; // glyph scale: 2 units of padding on every side
  return `<rect x=".5" y="${y + 0.5}" width="${size - 1}" height="${size - 1}" rx="${(size * 0.29).toFixed(1)}" fill="${col}" fill-opacity="${theme === "dark" ? 0.14 : 0.1}" stroke="${col}" stroke-opacity=".45"/>
<g transform="translate(2 ${y + 2}) scale(${k.toFixed(3)})" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</g>`;
}

/** The glyph alone (no tile, no frame) in its 24x24 box, a little heavier than in the tile since it stands bare. */
export function iconGlyph(id, theme, y = 0) {
  return `<g transform="translate(0 ${y})" fill="none" stroke="${ICON_COLOR[theme]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[id]}</g>`;
}

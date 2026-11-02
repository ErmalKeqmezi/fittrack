// Generates the PWA icons in public/icons and app/apple-icon.png from one SVG design.
// Run with: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#101014";
const CARD = "#1A1A22";
const PRIMARY = "#9B6DFF";
const SOFT = "#BCA0FF";

/** Dumbbell mark centred in a square; `inset` keeps it inside the maskable safe zone. */
function svg({ size, inset, rounded }) {
  const s = size;
  const pad = s * inset;
  const inner = s - pad * 2;
  const u = inner / 64; // design grid of the 64×64 favicon
  const x = (v) => pad + v * u;
  const r = (v) => v * u;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" ${rounded ? `rx="${s * 0.22}"` : ""} fill="${BG}"/>
  <rect x="${x(4)}" y="${x(4)}" width="${r(56)}" height="${r(56)}" rx="${r(14)}" fill="${CARD}"/>
  <g fill="${PRIMARY}">
    <rect x="${x(12)}" y="${x(24)}" width="${r(6)}" height="${r(16)}" rx="${r(2)}"/>
    <rect x="${x(46)}" y="${x(24)}" width="${r(6)}" height="${r(16)}" rx="${r(2)}"/>
    <rect x="${x(19)}" y="${x(20)}" width="${r(6)}" height="${r(24)}" rx="${r(2)}"/>
    <rect x="${x(39)}" y="${x(20)}" width="${r(6)}" height="${r(24)}" rx="${r(2)}"/>
  </g>
  <rect x="${x(25)}" y="${x(30)}" width="${r(14)}" height="${r(4)}" rx="${r(2)}" fill="${SOFT}"/>
</svg>`;
}

async function png(path, size, options) {
  await writeFile(path, await sharp(Buffer.from(svg({ size, ...options }))).png().toBuffer());
  console.log("wrote", path);
}

await mkdir("public/icons", { recursive: true });
await png("public/icons/icon-192.png", 192, { inset: 0, rounded: true });
await png("public/icons/icon-512.png", 512, { inset: 0, rounded: true });
// Maskable: full-bleed background, mark within the central 80% safe zone.
await png("public/icons/maskable-512.png", 512, { inset: 0.12, rounded: false });
await png("public/icons/maskable-192.png", 192, { inset: 0.12, rounded: false });
await png("src/app/apple-icon.png", 180, { inset: 0.06, rounded: false });

/* Renders the app icons from the mascot, so they cannot drift away from it.
 *
 * Only run this when the owl or the icon design changes:
 *     node tools/make-icons.js
 * It needs Playwright, which the app itself does not — nothing in `npm start`
 * or `npm test` touches this file, and the PNGs it writes are committed.
 */
"use strict";
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const OUT = path.join(__dirname, "..", "icons");
const NAVY = "#10143a";
const ACCENT = "#4f7bff";
const GOLD = "#ffcf5c";

/* The same shapes as App.UI.owl(), with the stylesheet's colours inlined. */
const OWL = `
  <ellipse cx="60" cy="104" rx="30" ry="7" fill="rgba(0,0,0,0.25)"/>
  <path d="M28 34 L20 10 L44 22 Z" fill="${ACCENT}"/>
  <path d="M92 34 L100 10 L76 22 Z" fill="${ACCENT}"/>
  <ellipse cx="60" cy="62" rx="42" ry="44" fill="${ACCENT}"/>
  <ellipse cx="60" cy="76" rx="27" ry="28" fill="rgba(255,255,255,0.92)"/>
  <circle cx="43" cy="52" r="17" fill="#fff"/>
  <circle cx="77" cy="52" r="17" fill="#fff"/>
  <circle cx="45" cy="54" r="8" fill="#101430"/>
  <circle cx="79" cy="54" r="8" fill="#101430"/>
  <circle cx="48" cy="51" r="3" fill="#fff"/>
  <circle cx="82" cy="51" r="3" fill="#fff"/>
  <path d="M60 62 L52 72 L68 72 Z" fill="${GOLD}"/>
  <path d="M22 70 q-10 14 4 26" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="6" stroke-linecap="round"/>
  <path d="M98 70 q10 14 -4 26" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="6" stroke-linecap="round"/>
`;

/* `scale` is how much of the tile the owl fills. A maskable icon may be
 * cropped to a circle, so it keeps the mascot inside the middle 80 %. */
function page(size, scale, radius) {
  const box = 120 / scale;
  const offset = (box - 120) / 2;
  return `<!doctype html><meta charset="utf-8">
  <style>html,body{margin:0;width:${size}px;height:${size}px}</style>
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
       viewBox="${-offset} ${-offset} ${box} ${box}">
    <rect x="${-offset}" y="${-offset}" width="${box}" height="${box}"
          rx="${radius}" fill="${NAVY}"/>
    ${OWL}
  </svg>`;
}

const JOBS = [
  { file: "icon-192.png", size: 192, scale: 0.86, radius: 18 },
  { file: "icon-512.png", size: 512, scale: 0.86, radius: 48 },
  /* Full bleed and well inside the safe area: Android crops these to whatever
     shape the launcher likes. */
  { file: "icon-maskable-512.png", size: 512, scale: 0.62, radius: 0 },
  /* iOS puts its own rounded corners on, and does not like transparency. */
  { file: "apple-touch-icon.png", size: 180, scale: 0.84, radius: 0 }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const p = await browser.newPage({ viewport: { width: job.size, height: job.size } });
    await p.setContent(page(job.size, job.scale, job.radius));
    await p.screenshot({ path: path.join(OUT, job.file), omitBackground: false });
    await p.close();
    console.log("  " + job.file + "  " + job.size + "×" + job.size);
  }
  await browser.close();
})();

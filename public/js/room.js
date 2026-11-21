// The ballroom backdrop, painted once onto its own canvas.
import { W, H, FLOOR_Y, CEILING_Y, PLATFORMS, CHANDELIER } from "./sim.js";
import { INK } from "./art.js";

const GOLD = "#f2b632";
const GOLD_DARK = "#b8862b";
const CREAM = "#f4e4c1";
const WINDOWS = [118, 208];
const SCONCES = [22, 324];
const CANDLES = [2, 10, 24, 32];

// Where candle flames are drawn each frame: [x, y].
export const FLAMES = [];
for (const x of CANDLES) FLAMES.push([CHANDELIER.x + x, CHANDELIER.y + 2]);
for (const x of SCONCES) FLAMES.push([x + 2, 94]);

function paintWindow(R, wx) {
  const ww = 24;
  const top = 30;
  const bot = 150;
  R("#2a1436", wx - 2, top + 4, ww + 4, bot - top - 4);
  R("#2a1436", wx, top + 2, ww, 2);
  R("#2a1436", wx + 2, top, ww - 4, 2);
  R("#16224a", wx, top + 6, ww, bot - top - 8);
  R("#16224a", wx + 2, top + 4, ww - 4, 2);
  R("#16224a", wx + 4, top + 2, ww - 8, 2);
  R("#1e2f63", wx, 112, ww, 22);
  R("#0f2a22", wx, 134, ww, 14);
  for (let i = 0; i < ww; i += 6) R("#0f2a22", wx + i + 1, 131, 4, 3);
  for (const [sx, sy] of [[3, 12], [17, 20], [8, 34], [20, 48], [5, 58], [14, 70]]) R(CREAM, wx + sx, top + sy, 1, 1);
  R("#2a1436", wx + ww / 2 - 1, top + 2, 2, bot - top - 4);
  R("#2a1436", wx, 70, ww, 2);
  R("#2a1436", wx, 110, ww, 2);
}

function paintPortrait(R, x, y, coat) {
  R(GOLD_DARK, x, y, 18, 22);
  R(GOLD, x + 1, y + 1, 16, 20);
  R("#2a1436", x + 3, y + 3, 12, 16);
  R("#d8d2e0", x + 6, y + 6, 6, 5);
  R("#f1c7a4", x + 7, y + 8, 4, 4);
  R(coat, x + 5, y + 13, 8, 6);
}

function paintCurtain(R, x0, flip) {
  R("#8b1e3f", x0, CEILING_Y, 13, 142);
  for (let i = 0; i < 13; i += 4) {
    R("#651530", x0 + i + (flip ? 0 : 3), CEILING_Y, 1, 142);
    R("#a8324f", x0 + i + 1, CEILING_Y, 1, 142);
  }
  R(GOLD, x0, 150, 13, 2);
}

function paintPlatform(R, pl) {
  R(CREAM, pl.x - 2, pl.y, pl.w + 4, 1);
  R("#d8c8a8", pl.x - 2, pl.y + 1, pl.w + 4, 2);
  R("#a8977b", pl.x - 1, pl.y + 3, pl.w + 2, 1);
  R("#6f6152", pl.x + 1, pl.y + 4, pl.w - 2, 1);
  R(INK, pl.x + 1, pl.y + 5, pl.w - 2, 1);
  for (const cx of [pl.x + 6, pl.x + pl.w - 12]) {
    R("#a8977b", cx, pl.y + 5, 6, 1);
    R("#8a7a66", cx + 1, pl.y + 6, 4, 1);
    R("#6f6152", cx + 2, pl.y + 7, 2, 2);
  }
}

function paintChandelier(R) {
  const c = CHANDELIER;
  const mid = c.x + c.w / 2;
  R("#6b4a1c", mid - 1, CEILING_Y, 2, c.y - CEILING_Y + 6);
  R(GOLD, mid - 3, c.y + 4, 6, 2);
  R(GOLD_DARK, c.x + 1, c.y + 10, c.w - 2, 2);
  R(GOLD, c.x + 1, c.y + 10, c.w - 2, 1);
  for (const x of CANDLES) {
    R(CREAM, c.x + x, c.y + 5, 2, 5);
    R(GOLD, c.x + x - 1, c.y + 9, 4, 1);
    R("#2ec4b6", c.x + x, c.y + 12, 1, 3);
  }
  R(GOLD, mid - 2, c.y + 6, 4, 12);
  R(GOLD_DARK, mid + 1, c.y + 6, 1, 12);
  R(GOLD, mid - 6, c.y + 14, 12, 3);
  R(GOLD_DARK, mid - 4, c.y + 17, 8, 2);
  R(GOLD, mid - 2, c.y + 19, 4, 2);
  R("#2ec4b6", mid - 1, c.y + 21, 2, 3);
}

export function paintRoom() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const R = (colour, x, y, w, h) => {
    g.fillStyle = colour;
    g.fillRect(x, y, w, h);
  };
  // Wallpaper.
  R("#3d2050", 0, 0, W, H);
  for (let x = 0; x < W; x += 16) R("#381c4a", x, CEILING_Y, 8, 140);
  for (let row = 0; row < 8; row++) {
    for (let x = 4 + (row & 1) * 8; x < W; x += 16) R("#4a2b5f", x, 22 + row * 16, 1, 1);
  }
  for (const wx of WINDOWS) paintWindow(R, wx);
  // The moon, in the left window.
  R(CREAM, 124, 44, 5, 5);
  R("#16224a", 124, 44, 1, 1);
  R("#16224a", 128, 48, 1, 1);
  paintPortrait(R, 62, 88, "#8b1e3f");
  paintPortrait(R, 270, 88, "#1f8f86");
  for (const x of SCONCES) {
    R(CREAM, x + 2, 97, 2, 5);
    R(GOLD, x, 102, 6, 2);
    R(GOLD_DARK, x + 2, 104, 2, 4);
  }
  // Wainscot.
  R("#2a1436", 0, 150, W, 28);
  R("#5a3472", 0, 150, W, 1);
  R("#1a0d26", 0, 151, W, 1);
  for (let x = 16; x < W - 40; x += 42) {
    R("#3d2050", x, 156, 34, 1);
    R("#3d2050", x, 172, 34, 1);
    R("#3d2050", x, 156, 1, 17);
    R("#3d2050", x + 33, 156, 1, 17);
  }
  paintCurtain(R, 0, false);
  paintCurtain(R, W - 13, true);
  // Ceiling and cornice.
  R("#140a1e", 0, 0, W, CEILING_Y);
  for (let x = 2; x < W; x += 6) R("#4a2b5f", x, 4, 3, 2);
  R(GOLD_DARK, 0, CEILING_Y - 2, W, 1);
  R("#6b4a1c", 0, CEILING_Y - 1, W, 1);
  // Chequered floor.
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i * 14 < W; i++) R((i + row) & 1 ? "#cdb99a" : "#3a2247", i * 14, FLOOR_Y + row * 9, 14, 9);
  }
  R(CREAM, 0, FLOOR_Y, W, 1);
  for (const pl of PLATFORMS) paintPlatform(R, pl);
  paintChandelier(R);
  return c;
}

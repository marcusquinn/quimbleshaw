// The end-of-round picture: all four players and their towers, the verdict and
// the site name, drawn onto a 1200x630 canvas that can be saved or shared.
import { BODY_H, HAT_TYPES } from "./sim.js";
import { INK, COLOURS, makeSprites } from "./art.js";

// Picture size, and where things sit in it, in real pixels.
const PW = 1200;
const PH = 630;
const FLOOR_PX = 384;
const PANEL_PX = 450;
const COLUMNS_PX = [150, 450, 750, 1050];
const ORDINALS = ["", "1ST", "2ND", "3RD", "4TH"];
const DISPLAY = '"Press Start 2P", ui-monospace, "Courier New", monospace';
const GOLD = "#f2b632";
const GOLD_DARK = "#b8862b";
const CREAM = "#f4e4c1";
const MUTED = "#cdb99a";

let sprites = null;

function towerHeight(hats) {
  let h = 0;
  for (const t of hats) h += HAT_TYPES[t].adv;
  return h;
}

// The room behind the players, painted in art pixels: w wide, floor at `floor`.
function paintHall(g, w, floor, floorH) {
  const R = (colour, x, y, rw, rh) => {
    g.fillStyle = colour;
    g.fillRect(x, y, rw, rh);
  };
  const dado = floor - 28;
  // Wallpaper.
  R("#3d2050", 0, 0, w, floor);
  for (let x = 0; x < w; x += 16) R("#381c4a", x, 6, 8, dado - 6);
  for (let y = 14, row = 0; y < dado - 4; y += 16, row++) {
    for (let x = 4 + (row & 1) * 8; x < w; x += 16) R("#4a2b5f", x, y, 1, 1);
  }
  // Candles between the players.
  for (let i = 1; i < 4; i++) {
    const x = (w * i) / 4;
    R(CREAM, x - 1, floor - 71, 2, 5);
    R(GOLD, x - 3, floor - 66, 6, 2);
    R(GOLD_DARK, x - 1, floor - 64, 2, 4);
    R("#ffd76a", x - 1, floor - 74, 2, 3);
    R("#fff3c4", x - 1, floor - 72, 1, 1);
  }
  // Wainscot.
  R("#2a1436", 0, dado, w, 28);
  R("#5a3472", 0, dado, w, 1);
  R("#1a0d26", 0, dado + 1, w, 1);
  for (let x = 14; x < w - 34; x += 42) {
    R("#3d2050", x, dado + 6, 34, 1);
    R("#3d2050", x, dado + 22, 34, 1);
    R("#3d2050", x, dado + 6, 1, 17);
    R("#3d2050", x + 33, dado + 6, 1, 17);
  }
  // Curtains.
  for (const x0 of [0, w - 10]) {
    R("#8b1e3f", x0, 6, 10, floor - 6);
    for (let i = 1; i < 10; i += 4) R("#a8324f", x0 + i, 6, 1, floor - 6);
    for (let i = 3; i < 10; i += 4) R("#651530", x0 + i, 6, 1, floor - 6);
  }
  // Cornice.
  R("#140a1e", 0, 0, w, 6);
  R(GOLD_DARK, 0, 4, w, 1);
  R("#6b4a1c", 0, 5, w, 1);
  // Chequered floor, two rows deep.
  const half = Math.ceil(floorH / 2);
  for (let i = 0; i * 14 < w; i++) {
    R(i & 1 ? "#cdb99a" : "#3a2247", i * 14, floor, 14, half);
    R(i & 1 ? "#3a2247" : "#cdb99a", i * 14, floor + half, 14, floorH - half);
  }
  R(CREAM, 0, floor, w, 1);
}

// Draws one player and their tower; returns the top of the tower.
function paintPlayer(g, e, cx, floor, faceLeft) {
  const set = sprites.people[e.kind] || sprites.people.you;
  g.drawImage(set[faceLeft ? 1 : 0][0], cx - 6, floor - BODY_H - 1);
  let base = floor - BODY_H;
  for (let i = 0; i < e.hats.length; i++) {
    const t = HAT_TYPES[e.hats[i]];
    const hx = cx + e.lean * (i + 1);
    g.drawImage(sprites.hats[e.hats[i]], Math.round(hx - t.w / 2) - 1, Math.round(base) - t.h - 1);
    base -= t.adv;
  }
  return base;
}

function font(g, px) {
  g.font = "400 " + px + "px " + DISPLAY;
}

// Centred text in more than one colour.
function parts(g, list, cx, y) {
  let w = 0;
  for (const p of list) w += g.measureText(p.text).width;
  let x = cx - w / 2;
  g.textAlign = "left";
  for (const p of list) {
    g.fillStyle = p.colour;
    g.fillText(p.text, Math.round(x), y);
    x += g.measureText(p.text).width;
  }
}

// info: { day, rank, head, line, entries: [{ kind, name, bot, place, hats, lean }] }
export async function drawCard(canvas, info) {
  try {
    await document.fonts.load("16px " + DISPLAY);
  } catch {
    // The picture is still drawn, in the fallback font.
  }
  sprites = sprites || makeSprites();

  // Art pixels are three real pixels across, or two when a tower is too tall
  // to fit. Either way every pixel of art in one picture is the same size.
  const tallest = Math.max(...info.entries.map((e) => towerHeight(e.hats)));
  const S = tallest > 96 ? 2 : 3;
  const floor = FLOOR_PX / S;
  const scene = document.createElement("canvas");
  scene.width = PW / S;
  scene.height = PANEL_PX / S;
  const sg = scene.getContext("2d");
  paintHall(sg, scene.width, floor, scene.height - floor);
  const tops = info.entries.map((e, i) => paintPlayer(sg, e, COLUMNS_PX[i] / S, floor, i >= 2));

  canvas.width = PW;
  canvas.height = PH;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(scene, 0, 0, PW, PANEL_PX);
  g.textBaseline = "middle";

  info.entries.forEach((e, i) => {
    const cx = COLUMNS_PX[i];
    const colour = COLOURS[e.kind] || COLOURS.you;
    // Hat count above the tower.
    const n = e.hats.length;
    const tx = Math.round(cx + e.lean * n * S);
    const ty = Math.max(26, tops[i] * S - 28);
    font(g, 24);
    const w = g.measureText(String(n)).width + 16;
    g.fillStyle = INK;
    g.fillRect(Math.round(tx - w / 2), ty - 18, Math.round(w), 36);
    g.textAlign = "center";
    g.fillStyle = colour;
    g.fillText(String(n), tx + 2, ty + 2);
    // Place and name on the floor.
    g.fillStyle = INK;
    g.fillRect(cx - 132, FLOOR_PX + 6, 264, 54);
    font(g, 16);
    const place = [{ text: ORDINALS[e.place] || "", colour: GOLD }];
    if (e.bot) place.push({ text: "  BOT", colour: MUTED });
    parts(g, place, cx, FLOOR_PX + 22);
    parts(g, [{ text: e.name.toUpperCase(), colour }], cx, FLOOR_PX + 45);
  });

  // The caption panel: the verdict, the line from the house and the site name.
  g.fillStyle = "#24122f";
  g.fillRect(0, PANEL_PX, PW, PH - PANEL_PX);
  g.fillStyle = GOLD;
  g.fillRect(0, PANEL_PX, PW, 6);
  g.fillStyle = INK;
  g.fillRect(0, PANEL_PX + 6, PW, 3);
  let size = 48;
  const head = info.head.toUpperCase();
  font(g, size);
  while (size > 24 && g.measureText(head).width > 1100) {
    size -= 8;
    font(g, size);
  }
  g.textAlign = "center";
  g.fillStyle = "#8b1e3f";
  g.fillText(head, 604, 504, 1120);
  g.fillStyle = GOLD;
  g.fillText(head, 600, 500, 1120);
  g.font = 'italic 26px Georgia, "Times New Roman", serif';
  g.fillStyle = CREAM;
  g.fillText(info.line, 600, 553, 1120);
  font(g, 16);
  g.textAlign = "left";
  g.fillStyle = "#2ec4b6";
  g.fillText("BALLROOM #" + info.day, 36, 603);
  // The rank the round was played at, which sets how hard the house played.
  if (info.rank) {
    const x = 36 + g.measureText("BALLROOM #" + info.day).width + 28;
    g.fillStyle = MUTED;
    g.fillText("RANK: " + info.rank.toUpperCase(), x, 603);
  }
  font(g, 24);
  g.textAlign = "right";
  g.fillStyle = GOLD;
  g.fillText("QUIMBLESHAW.MEME", 1164, 602);
}

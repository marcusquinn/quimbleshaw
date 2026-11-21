// Draws a round onto a 350x196 canvas: backdrop, hats, players and effects.
import { W, H, BODY_H, HAT_TYPES, LEAN_LIMIT, POWERS, POWER_KEYS, towerTop } from "./sim.js";
import { INK, COLOURS, makeSprites } from "./art.js";
import { paintRoom, FLAMES } from "./room.js";

// A 3x5 font for the numbers drawn in the room.
const GLYPHS = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111",
  "+": "000010111010000", "-": "000000111000000", "!": "010010010000010",
};

const RED = "#ff6b6b";

function label(g, str, cx, y, colour) {
  const w = str.length * 4 - 1;
  let x = Math.round(cx - w / 2);
  x = Math.max(1, Math.min(W - w - 1, x));
  y = Math.max(1, Math.round(y));
  g.fillStyle = INK;
  g.fillRect(x - 1, y - 1, w + 2, 7);
  g.fillStyle = colour;
  for (const ch of str) {
    const bits = GLYPHS[ch];
    if (bits) for (let i = 0; i < 15; i++) if (bits[i] === "1") g.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
    x += 4;
  }
}

export function createRenderer(canvas, opts) {
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  const calm = !!(opts && opts.calm);
  const sprites = makeSprites();
  const room = paintRoom();
  let bits = [];
  let pops = [];
  let shake = 0;
  let frame = 0;

  function burst(x, y, n, colour, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const v = speed * (0.4 + Math.random() * 0.6);
      bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: 14 + Math.random() * 12, colour });
    }
  }

  function pop(x, y, str, colour) {
    pops.push({ x, y, str, colour, life: 44 });
  }

  // Turn a simulation event into sparks, numbers and screen shake.
  function event(e, s, me) {
    if (e.type === "catch") {
      if (e.p === me) pop(e.x, e.y - 12, "+1", COLOURS[s.players[e.p].kind]);
      else burst(e.x, e.y, 2, "#f4e4c1", 0.6);
    } else if (e.type === "spill") {
      const p = s.players[e.p];
      burst(p.x, towerTop(p), 6, "#f4e4c1", 1.2);
      if (e.p === me) {
        pop(p.x, towerTop(p) - 12, "-" + e.n, RED);
        shake = Math.max(shake, 6);
      }
    } else if (e.type === "knock") {
      burst(e.x, e.y, 12, "#ffd76a", 1.8);
      if (e.v === me) {
        pop(e.x, e.y - 12, "-" + e.n, RED);
        shake = Math.max(shake, 12);
      } else if (e.a === me) {
        pop(e.x, e.y - 12, "-" + e.n, "#ffd76a");
        shake = Math.max(shake, 5);
      }
    } else if (e.type === "land" && e.hard) {
      const p = s.players[e.p];
      burst(p.x, p.y - 1, 5, "#cdb99a", 0.9);
    } else if (e.type === "power") {
      burst(e.x, e.y, 10, "#ffd76a", 1.4);
    } else if (e.type === "blast") {
      burst(e.x, e.y, 26, "#ff8a3d", 2.6);
      burst(e.x, e.y, 14, "#fff3c4", 1.6);
      shake = Math.max(shake, e.p === me ? 14 : 8);
    } else if (e.type === "clang") {
      burst(e.x, e.y, 8, "#d5dbe8", 1.4);
    }
  }

  // The propeller cap has two frames; every other hat has one.
  function hatSprite(t) {
    return HAT_TYPES[t].power === "prop" && (frame >> 1) & 1 ? sprites.spin : sprites.hats[t];
  }

  // The top of everything a player is wearing, special hats included.
  function crownTop(p) {
    let y = towerTop(p);
    for (const k of POWER_KEYS) if (p.pw[k] > 0) y -= HAT_TYPES[POWERS[k].t].adv;
    return y;
  }

  // Move the effects on by one simulation step.
  function advance() {
    frame++;
    if (shake > 0) shake--;
    for (const b of bits) {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.08;
      b.life--;
    }
    bits = bits.filter((b) => b.life > 0);
    for (const p of pops) {
      p.y -= 0.35;
      p.life--;
    }
    pops = pops.filter((p) => p.life > 0);
  }

  function reset() {
    bits = [];
    pops = [];
    shake = 0;
  }

  function drawFreeHats(s) {
    for (const h of s.hats) {
      // A hat on the floor blinks before it is cleared away.
      if (h.state === "rest" && h.life < 1.5 && (frame >> 2) & 1) continue;
      const t = HAT_TYPES[h.t];
      const x = Math.round(h.x - t.w / 2) - 1;
      const y = Math.round(h.y) - t.h - 1;
      g.drawImage(hatSprite(h.t), x, y);
      if (!t.power) continue;
      // A special hat has a spark that goes round its four corners.
      const k = (frame >> 3) & 3;
      const sx = k === 0 || k === 3 ? x - 2 : x + t.w + 3;
      const sy = k < 2 ? y - 1 : y + t.h + 1;
      g.fillStyle = INK;
      g.fillRect(sx - 2, sy - 1, 5, 3);
      g.fillRect(sx - 1, sy - 2, 3, 5);
      g.fillStyle = "#fff3c4";
      g.fillRect(sx - 1, sy, 3, 1);
      g.fillRect(sx, sy - 1, 1, 3);
    }
  }

  function drawPlayer(p) {
    const set = sprites.people[p.kind] || sprites.people.you;
    const stride = !p.onGround || (Math.abs(p.vx) > 8 && (Math.floor(p.x / 5) & 1) === 1);
    g.drawImage(set[p.face < 0 ? 1 : 0][stride ? 1 : 0], Math.round(p.x) - 6, Math.round(p.y) - BODY_H - 1);
    // The tower, bottom hat first. A tower that cannot be knocked flickers.
    if (p.inv > 0 && (frame >> 2) & 1) g.globalAlpha = 0.5;
    let base = p.y - BODY_H;
    for (let i = 0; i < p.hats.length; i++) {
      const t = HAT_TYPES[p.hats[i]];
      const hx = p.x + p.lean * (i + 1);
      g.drawImage(sprites.hats[p.hats[i]], Math.round(hx - t.w / 2) - 1, Math.round(base) - t.h - 1);
      base -= t.adv;
    }
    g.globalAlpha = 1;
    // Special hats in use sit on top of the tower and blink as they run out.
    // A keg does not blink: its fuse is counted down above it.
    let j = p.hats.length;
    for (const k of POWER_KEYS) {
      if (p.pw[k] <= 0) continue;
      const id = POWERS[k].t;
      const t = HAT_TYPES[id];
      j++;
      if (k === "keg" || p.pw[k] > 1.5 || (frame >> 2) & 1) {
        g.drawImage(hatSprite(id), Math.round(p.x + p.lean * j - t.w / 2) - 1, Math.round(base) - t.h - 1);
      }
      base -= t.adv;
    }
  }

  function drawLabel(p, isMe) {
    const n = p.hats.length;
    const cx = p.x + p.lean * n;
    let y = Math.max(8, crownTop(p) - 10);
    const wobbling = n >= 4 && Math.abs(p.lean) > (0.6 * LEAN_LIMIT) / n;
    const warn = isMe && wobbling && (frame >> 2) & 1;
    if (n > 0) label(g, warn ? n + "!" : String(n), cx, y, warn ? RED : COLOURS[p.kind] || COLOURS.you);
    // Seconds left on a keg, above the hat count.
    if (p.pw.keg > 0) {
      if (n > 0) y = Math.max(1, y - 8);
      label(g, Math.ceil(p.pw.keg) + "!", cx, y, (frame >> 2) & 1 ? RED : "#ffd76a");
    }
    if (!isMe) return;
    // A gold arrow marks the human player.
    const ay = Math.max(1, Math.round(y) - 6 + ((frame >> 4) & 1));
    const ax = Math.max(3, Math.min(W - 4, Math.round(cx)));
    g.fillStyle = INK;
    g.fillRect(ax - 3, ay - 1, 7, 3);
    g.fillRect(ax - 2, ay + 2, 5, 1);
    g.fillRect(ax - 1, ay + 3, 3, 1);
    g.fillStyle = "#ffd76a";
    g.fillRect(ax - 2, ay, 5, 1);
    g.fillRect(ax - 1, ay + 1, 3, 1);
    g.fillRect(ax, ay + 2, 1, 1);
  }

  function draw(s, me) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = INK;
    g.fillRect(0, 0, W, H);
    if (shake > 0 && !calm) g.translate(Math.round(Math.random() * 2 - 1), Math.round(Math.random() * 2 - 1));
    g.drawImage(room, 0, 0);
    for (let i = 0; i < FLAMES.length; i++) {
      const tall = ((frame >> 3) + i) & 1;
      g.fillStyle = "#ffd76a";
      g.fillRect(FLAMES[i][0], FLAMES[i][1] + (tall ? 0 : 1), 2, tall ? 3 : 2);
      g.fillStyle = "#fff3c4";
      g.fillRect(FLAMES[i][0] + (tall ? 0 : 1), FLAMES[i][1] + 2, 1, 1);
    }
    if (!s) return;
    drawFreeHats(s);
    for (const p of s.players) if (p.id !== me) drawPlayer(p);
    if (s.players[me]) drawPlayer(s.players[me]);
    for (const b of bits) {
      g.fillStyle = b.colour;
      g.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
    }
    for (const p of s.players) drawLabel(p, p.id === me);
    for (const p of pops) label(g, p.str, p.x, p.y, p.colour);
  }

  return { draw, event, advance, reset };
}

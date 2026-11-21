// Quimbleshaw simulation core.
// No DOM and no Math.random: the same seed and the same inputs give the same
// round, so this file can later run on a server to decide scores.

export const W = 350;
export const H = 196;
export const DT = 1 / 60;
export const FLOOR_Y = 178;
export const CEILING_Y = 10;
export const BODY_H = 18;
export const ROUND_SECONDS = 180;
export const STORM_SECONDS = 30;

export const PLATFORMS = [
  { x: 24, y: 140, w: 80 },
  { x: 246, y: 140, w: 80 },
  { x: 127, y: 106, w: 96 },
  { x: 40, y: 72, w: 72 },
  { x: 238, y: 72, w: 72 },
];

// The chandelier body. Heads bump on it and it clips any tower that passes under.
export const CHANDELIER = { x: 157, y: 26, w: 36, h: 24 };

// w and h are the sprite size; adv is how much one hat adds to a tower.
export const HAT_TYPES = [
  { id: "tophat", w: 10, h: 8, adv: 7, weight: 22 },
  { id: "bowler", w: 10, h: 6, adv: 5, weight: 18 },
  { id: "fez", w: 8, h: 7, adv: 6, weight: 12 },
  { id: "deerstalker", w: 12, h: 6, adv: 5, weight: 10 },
  { id: "jester", w: 12, h: 8, adv: 6, weight: 9 },
  { id: "sombrero", w: 16, h: 6, adv: 4, weight: 9 },
  { id: "party", w: 8, h: 9, adv: 7, weight: 9 },
  { id: "crown", w: 10, h: 6, adv: 5, weight: 7 },
  { id: "teapot", w: 12, h: 8, adv: 7, weight: 4 },
  // Special hats. They are caught like any hat but never join the tower: each
  // gives its catcher a power for a few seconds, and each has a catch.
  { id: "magnet", w: 10, h: 8, adv: 7, weight: 0, power: "magnet" },
  { id: "helm", w: 10, h: 9, adv: 8, weight: 0, power: "helm" },
  { id: "propeller", w: 12, h: 7, adv: 6, weight: 0, power: "prop" },
  { id: "keg", w: 10, h: 9, adv: 8, weight: 0, power: "keg" },
];
const BOWLER = 1;
const WEIGHT_SUM = HAT_TYPES.reduce((a, t) => a + t.weight, 0);

// t is the hat type; secs is how long the power lasts, or the fuse of a keg.
export const POWERS = {
  magnet: { t: 9, secs: 8 },
  helm: { t: 10, secs: 8 },
  prop: { t: 11, secs: 8 },
  keg: { t: 12, secs: 4 },
};
export const POWER_KEYS = ["magnet", "helm", "prop", "keg"];
// The share of falling hats that are special, and the quiet start of a round.
const POWER_RATE = 0.07;
const POWER_FROM = 10;
// Magnet: how far it reaches sideways and how fast it drags a hat.
const MAGNET_REACH = 64;
const MAGNET_PULL = 46;
// Iron helm: nothing shifts the tower, but its wearer runs at this share of full speed.
const HELM_RUN = 0.62;
// Propeller cap: a bigger jump, and a slow fall while jump is held.
const PROP_JUMP = 1.3;
const PROP_FALL = 70;
// Keg: how close a rival must be, sideways and in height, to be caught by it.
const BLAST_REACH = 48;
const BLAST_RISE = 30;

const WALL = 7;
const HALF_W = 5;
const MAX_RUN = 92;
const RUN_ACC = 620;
const AIR_ACC = 440;
const TURN_ACC = 950;
const FRICTION = 560;
const AIR_FRICTION = 160;
const GRAV = 900;
const JUMP_V = 300;
const JUMP_CUT = 120;
const MAX_FALL = 420;
const JUMP_REACH = 46;
// Landing faster than this shakes hats loose: a drop of more than one level.
export const HARD_LAND = 372;
// Seconds a tower cannot be knocked again after a knock.
export const KNOCK_SAFE = 2.5;
// How close, sideways, falling boots must be to the middle of a tower.
const KNOCK_REACH = 8;

// Tower lean is a damped spring pushed by sideways acceleration.
const LEAN_K = 81;
const LEAN_C = 6.3;
const LEAN_G = 0.143;
// A tower of n hats spills when |lean| goes over LEAN_LIMIT / n.
export const LEAN_LIMIT = 9.6;
const SPILL_MIN_HATS = 4;

const MAX_FREE_HATS = 70;

function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function towerHeight(p) {
  let h = 0;
  for (let i = 0; i < p.hats.length; i++) h += HAT_TYPES[p.hats[i]].adv;
  return h;
}

export function towerTop(p) {
  return p.y - BODY_H - towerHeight(p);
}

// The surface a thing at (x, y) would land on if it fell.
function surfaceBelow(x, y) {
  let best = FLOOR_Y;
  for (const pl of PLATFORMS) {
    if (x >= pl.x && x <= pl.x + pl.w && pl.y >= y - 1 && pl.y < best) best = pl.y;
  }
  return best;
}

// The lowest thing above a tower standing at x on surface sy.
function ceilingAbove(x, sy) {
  const c = CHANDELIER;
  if (x > c.x - 6 && x < c.x + c.w + 6 && sy > c.y + c.h) return c.y + c.h;
  return CEILING_Y;
}

const BOT_STYLE = {
  lord: { aggr: 0.15, care: 0.3, loose: 1 },
  duchess: { aggr: 1, care: 0.9, loose: 1 },
  baron: { aggr: 0.55, care: 1, loose: 1.6 },
  you: { aggr: 0.6, care: 0.8, loose: 1.2 },
};

function makeAi(kind, skill, rng) {
  const s = clamp(skill, 0, 1);
  const style = BOT_STYLE[kind] || BOT_STYLE.you;
  return {
    react: lerp(0.6, 0.14, s),
    aim: lerp(12, 2, s),
    aggr: style.aggr * lerp(0.25, 1, s),
    // Times a second the bot forgets about balance and ceilings for a moment.
    sloppy: lerp(0.5, 0, s * style.care),
    careless: false,
    carelessT: 0,
    loose: style.loose,
    // Times a second the bot stops to admire the room.
    doze: lerp(0.5, 0.03, s),
    // Seconds of good behaviour after knocking someone.
    atkRest: lerp(8, 3, s),
    atkCd: 2 + rng() * 4,
    chaseT: 0,
    speed: lerp(0.68, 1, s),
    t: rng() * 0.4,
    target: null,
    err: 0,
    hold: 0,
    pause: 0,
  };
}

export function createRound(opts) {
  const rng = mulberry32((opts.seed >>> 0) || 1);
  const spots = [60, 135, 215, 290];
  const duration = opts.duration || ROUND_SECONDS;
  const players = opts.players.map((d, i) => ({
    id: i,
    kind: d.kind,
    name: d.name,
    bot: !!d.bot,
    x: spots[i % spots.length],
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    face: i < 2 ? 1 : -1,
    onGround: true,
    hats: [],
    lean: 0,
    leanV: 0,
    inv: 0,
    kcd: 0,
    coyote: 0,
    jbuf: 0,
    jumpPrev: false,
    dropT: 0,
    peak: 0,
    caught: 0,
    knocked: 0,
    lost: 0,
    // Seconds left of each power; for the keg, seconds left on the fuse.
    pw: { magnet: 0, helm: 0, prop: 0, keg: 0 },
    powers: 0,
    ai: d.bot ? makeAi(d.kind, d.skill === undefined ? 0.5 : d.skill, rng) : null,
  }));
  return {
    rng,
    // Hat spawns draw from their own stream, so the hats that fall in a round
    // depend only on the seed and never on what the players do.
    spawnRng: mulberry32((((opts.seed >>> 0) || 1) ^ 0x9e3779b9) | 0),
    tick: 0,
    time: duration,
    duration,
    over: false,
    players,
    hats: [],
    spawnT: 0.5,
    nextHatId: 1,
    events: [],
  };
}

function pickType(rng) {
  let r = rng() * WEIGHT_SUM;
  for (let i = 0; i < HAT_TYPES.length; i++) {
    r -= HAT_TYPES[i].weight;
    if (r < 0) return i;
  }
  return 0;
}

function spawnHat(s) {
  // Every draw happens before the room-is-full check, so a skipped hat does
  // not shift the hats that come after it.
  const r = s.spawnRng;
  const c = CHANDELIER;
  let x = 14 + r() * (W - 28);
  if (x > c.x - 8 && x < c.x + c.w + 8) x = x < c.x + c.w / 2 ? c.x - 8 : c.x + c.w + 8;
  // The floor gets an extra slot so most hats still reach it.
  const levels = [FLOOR_Y];
  for (const pl of PLATFORMS) if (x > pl.x + 6 && x < pl.x + pl.w - 6) levels.push(pl.y);
  const k = Math.floor(r() * (levels.length + 1));
  const restY = k < levels.length ? levels[k] : FLOOR_Y;
  let t = pickType(r);
  const phase = r() * 6.283;
  // Special hats come from the same stream, so they too are the same for everyone.
  const roll = r();
  const which = r();
  if (roll < POWER_RATE && s.duration - s.time >= POWER_FROM) {
    t = POWERS[POWER_KEYS[Math.floor(which * POWER_KEYS.length)]].t;
  }
  if (s.hats.length >= MAX_FREE_HATS) return;
  s.hats.push({
    id: s.nextHatId++,
    t,
    x,
    x0: x,
    y: CEILING_Y + 2,
    vx: 0,
    vy: 20,
    state: "fall",
    life: 7,
    restY,
    lock: -1,
    lockT: 0,
    phase,
  });
}

// Take `count` hats off the top of a tower and throw them into the room.
function shed(s, p, count, o) {
  const n = Math.min(count, p.hats.length);
  if (n <= 0) return 0;
  let y = towerTop(p);
  for (let i = 0; i < n; i++) {
    const t = p.hats.pop();
    y += HAT_TYPES[t].adv;
    s.hats.push({
      id: s.nextHatId++,
      t,
      x: clamp(p.x + p.lean * (p.hats.length + 1), WALL, W - WALL),
      x0: 0,
      y,
      vx: o.vx + (s.rng() * 2 - 1) * o.spread,
      vy: -(o.up + s.rng() * o.upVar),
      state: "loose",
      life: 6,
      restLife: o.rest,
      restY: 0,
      lock: p.id,
      lockT: o.lock,
      phase: 0,
    });
  }
  p.lost += n;
  return n;
}

function findHat(s, id) {
  for (const h of s.hats) if (h.id === id) return h;
  return null;
}

// ---------------------------------------------------------------- bots

// Tower size from which a bot has to think about balance.
const CARE_N = 6;

// True when walking from p to x on this level would drag the tower through the chandelier.
function chandelierInTheWay(p, th, x) {
  const c = CHANDELIER;
  const low = c.y + c.h;
  if (p.y - BODY_H <= low || p.y - BODY_H - th >= low) return false;
  const a = Math.min(p.x, x);
  const b = Math.max(p.x, x);
  return b > c.x - 8 && a < c.x + c.w + 8;
}

function think(s, p) {
  const ai = p.ai;
  const r = s.rng;
  ai.t = ai.react * (0.7 + 0.6 * r());
  if (r() < ai.doze * ai.t) ai.pause = 0.25 + r() * 0.6;
  if (r() < ai.sloppy * ai.t) ai.carelessT = 0.4 + r() * 0.6;
  ai.careless = ai.carelessT > 0;
  const n = p.hats.length;
  const th = towerHeight(p);
  ai.err = 0;
  // A lit keg close by: a bot with hats to lose gets away from it.
  if (!ai.careless && n >= 3 && p.pw.helm <= 0) {
    for (const q of s.players) {
      if (q === p || q.pw.keg <= 0 || Math.abs(q.x - p.x) > 70 || Math.abs(q.y - p.y) > 40) continue;
      ai.target = { kind: "flee", id: q.id };
      return;
    }
  }
  // Carrying one: take it to whoever has the most hats, if they have more to lose.
  if (p.pw.keg > 0) {
    let most = null;
    for (const q of s.players) {
      if (q !== p && q.hats.length >= 2 && q.pw.helm <= 0 && (!most || q.hats.length > most.hats.length)) most = q;
    }
    if (most && most.hats.length * 2 > n) {
      ai.target = { kind: "carry", id: most.id };
      return;
    }
  }
  let best = null;
  let bestScore = 0;
  for (const h of s.hats) {
    if (h.lock === p.id && h.lockT > 0.3) continue;
    const power = HAT_TYPES[h.t].power;
    // A keg is worth catching only with little to lose.
    if (power === "keg" && n >= 4 && !ai.careless) continue;
    const sy = h.state === "fall" ? h.restY : surfaceBelow(h.x, h.y);
    // Careful bots will not carry a tall tower somewhere it would be clipped.
    if (!ai.careless) {
      if (sy - BODY_H - th < ceilingAbove(h.x, sy) + 4) continue;
      if (Math.abs(sy - p.y) < 6 && chandelierInTheWay(p, th, h.x)) continue;
    }
    const d = Math.abs(h.x - p.x) + Math.abs(sy - p.y) * 1.6;
    const ttl = h.state === "fall" ? (sy - h.y) / 50 + 7 : h.life + 0.5;
    if (d / 80 > ttl) continue;
    let sc = 100 / (25 + d);
    if (h.state !== "fall") sc *= ai.loose;
    if (power) sc *= 1.5;
    if (sc > bestScore) {
      bestScore = sc;
      best = { kind: "hat", id: h.id };
    }
  }
  for (const q of s.players) {
    if (ai.atkCd > 0 || q === p || q.hats.length < 3 || q.inv > 0.3 || q.pw.helm > 0.3) continue;
    const d = Math.abs(q.x - p.x) + Math.abs(q.y - p.y) * 1.4;
    const lead = q.hats.length - n;
    const sc = ai.aggr * (36 / (30 + d)) * (0.6 + Math.min(q.hats.length, 12) * 0.12) * (lead > 0 ? 1.3 : 0.8);
    if (sc > bestScore) {
      bestScore = sc;
      best = { kind: "rival", id: q.id };
    }
  }
  // A new chase gets a few seconds, then the bot gives up and rests.
  if (best && best.kind === "rival" && !(ai.target && ai.target.kind === "rival" && ai.target.id === best.id)) ai.chaseT = 4;
  ai.target = best;
  ai.err = (r() * 2 - 1) * ai.aim;
}

function botInputs(s, p) {
  const ai = p.ai;
  const inp = { left: false, right: false, jump: false, down: false };
  ai.t -= DT;
  if (ai.pause > 0) ai.pause -= DT;
  if (ai.carelessT > 0) ai.carelessT -= DT;
  if (ai.atkCd > 0) ai.atkCd -= DT;
  if (ai.target && ai.target.kind === "rival") {
    ai.chaseT -= DT;
    if (ai.chaseT <= 0) {
      ai.target = null;
      ai.atkCd = ai.atkRest * 0.5;
      ai.t = 0;
    }
  }
  if (ai.t <= 0) think(s, p);
  if (ai.hold > 0) {
    ai.hold -= DT;
    inp.jump = true;
  }
  // With a propeller cap, float down from the big jumps unless diving at a rival.
  if (p.pw.prop > 0 && !p.onGround && p.vy > 160 && !ai.careless && !(ai.target && ai.target.kind === "rival")) inp.jump = true;
  if (ai.pause > 0 || !ai.target) return inp;

  const n = p.hats.length;
  const th = towerHeight(p);
  const top = p.y - BODY_H - th;
  const roomToJump = top - (p.pw.prop > 0 ? 88 : 50) > ceilingAbove(p.x, p.y) || ai.careless;
  let gx = p.x;
  let gy = p.y;
  let dropOn = false;

  if (ai.target.kind === "flee") {
    const q = s.players[ai.target.id];
    if (q.pw.keg <= 0) {
      ai.target = null;
      ai.t = Math.min(ai.t, 0.05);
      return inp;
    }
    const away = p.x >= q.x ? 1 : -1;
    gx = clamp(p.x + away * 60, WALL, W - WALL);
    // Cornered: leave the level instead.
    if (p.onGround && Math.abs(gx - p.x) < 20) {
      if (p.y < FLOOR_Y) inp.down = true;
      else if (roomToJump) ai.hold = 0.3;
    }
  } else if (ai.target.kind === "carry") {
    const q = s.players[ai.target.id];
    if (p.pw.keg <= 0 || q.hats.length < 1) {
      ai.target = null;
      ai.t = Math.min(ai.t, 0.05);
      return inp;
    }
    gx = q.x + q.vx * 0.3;
    gy = q.y;
  } else if (ai.target.kind === "hat") {
    const h = findHat(s, ai.target.id);
    if (!h) {
      ai.target = null;
      ai.t = Math.min(ai.t, 0.05);
      return inp;
    }
    gx = h.x + ai.err;
    gy = h.state === "fall" ? h.restY : surfaceBelow(h.x, h.y);
    if (h.state === "loose" && h.vy < 0) gy = p.y;
    // Jump for a hat that is coming down right above the tower.
    if (p.onGround && h.state !== "rest" && roomToJump && Math.abs(h.x - p.x) < 8 && h.y < top - 6 && h.y > top - 42) {
      ai.hold = 0.18;
    }
  } else {
    const q = s.players[ai.target.id];
    if (q.hats.length < 1 || q.inv > 0.3) {
      ai.target = null;
      ai.t = Math.min(ai.t, 0.05);
      return inp;
    }
    gx = q.x + q.vx * 0.3 + ai.err;
    gy = q.y;
    if (p.onGround && p.y <= q.y - 20) {
      // Already above them: walk over and step off.
      gy = p.y;
      dropOn = Math.abs(p.x - gx) < 7;
    } else if (p.onGround && Math.abs(p.y - q.y) < 6) {
      // Same level: a running jump puts boots into the tower.
      const dx = Math.abs(gx - p.x);
      if (dx < 30 && dx > 4 && roomToJump) ai.hold = 0.3;
    }
  }

  let dir = 0;
  if (p.onGround && gy < p.y - 6) {
    // Target is higher: head for the nearest ledge one jump up.
    let step = null;
    let stepD = 1e9;
    for (const pl of PLATFORMS) {
      if (pl.y >= p.y - 6 || p.y - pl.y > JUMP_REACH) continue;
      const near = clamp(p.x, pl.x + 6, pl.x + pl.w - 6);
      const d = Math.abs(near - p.x) + Math.abs(clamp(gx, pl.x, pl.x + pl.w) - gx) * 0.8 + (pl.y < gy - 2 ? 60 : 0);
      if (d < stepD) {
        stepD = d;
        step = pl;
      }
    }
    if (step) {
      const tx = clamp(p.x, step.x + 6, step.x + step.w - 6);
      const dx = tx - p.x;
      if (Math.abs(dx) > 2) dir = dx > 0 ? 1 : -1;
      if (Math.abs(dx) < 30 && roomToJump) ai.hold = Math.max(ai.hold, 0.3);
    } else {
      dir = gx > p.x ? 1 : -1;
    }
  } else if (p.onGround && gy > p.y + 6) {
    // Target is lower: step off the ledge or drop through it.
    const dx = gx - p.x;
    if (Math.abs(dx) > 3) dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) < 12 && p.y < FLOOR_Y) inp.down = true;
  } else {
    const dx = gx - p.x;
    if (Math.abs(dx) > 2.5) dir = dx > 0 ? 1 : -1;
    if (dropOn && p.y < FLOOR_Y) inp.down = true;
  }

  // Weaker bots are slower on their feet.
  if (dir !== 0 && p.vx * dir > MAX_RUN * ai.speed) dir = 0;
  // Balance: with a tall tower, coast before turning, never go faster than the
  // tower can stop from, and wait for it to swing back before pushing it again.
  if (dir !== 0 && !ai.careless && n >= CARE_N) {
    const swinging = -p.lean * dir > (0.3 * LEAN_LIMIT) / n;
    if (swinging || p.vx * dir < -8 || p.vx * dir > MAX_RUN * clamp(8.5 / n, 0.2, 1)) dir = 0;
  }
  // Mind the chandelier: stop short of it, or drop a level to pass underneath.
  if (dir !== 0 && !ai.careless && p.onGround && chandelierInTheWay(p, th, p.x + dir * 10) && !chandelierInTheWay(p, th, p.x)) {
    dir = 0;
    if (p.y < FLOOR_Y) inp.down = true;
  }
  if (dir > 0) inp.right = true;
  else if (dir < 0) inp.left = true;
  if (ai.hold > 0) inp.jump = true;
  return inp;
}

// ---------------------------------------------------------------- step

const NO_INPUT = { left: false, right: false, jump: false, down: false };

function movePlayer(s, p, inp) {
  const n = p.hats.length;
  const helm = p.pw.helm > 0;
  const prop = p.pw.prop > 0;
  // Sideways.
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const maxRun = helm ? MAX_RUN * HELM_RUN : MAX_RUN;
  let nv;
  if (dir !== 0) {
    const turning = p.vx * dir < 0;
    nv = p.vx + dir * (turning ? TURN_ACC : p.onGround ? RUN_ACC : AIR_ACC) * DT;
    if (nv * dir > maxRun) nv = dir * maxRun;
    p.face = dir;
  } else {
    const dec = (p.onGround ? FRICTION : AIR_FRICTION) * DT;
    nv = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
  }
  const ax = (nv - p.vx) / DT;
  p.vx = nv;

  // Lean.
  p.leanV += (-LEAN_K * p.lean - LEAN_C * p.leanV - LEAN_G * ax) * DT;
  p.lean += p.leanV * DT;
  // Under an iron helm the tower is held straight.
  if (helm) {
    p.lean *= 0.8;
    p.leanV *= 0.8;
  }

  // Jump: buffered, with a short grace after leaving a ledge.
  if (inp.jump && !p.jumpPrev) p.jbuf = 0.12;
  p.jumpPrev = inp.jump;
  if (p.onGround) p.coyote = 0.09;
  if (p.jbuf > 0 && p.coyote > 0) {
    p.vy = prop ? -JUMP_V * PROP_JUMP : -JUMP_V;
    p.onGround = false;
    p.coyote = 0;
    p.jbuf = 0;
    s.events.push({ type: "jump", p: p.id });
  }
  p.jbuf -= DT;
  p.coyote -= DT;
  if (!inp.jump && p.vy < -JUMP_CUT) p.vy = -JUMP_CUT;
  if (inp.down && p.onGround && p.y < FLOOR_Y) {
    p.dropT = 0.2;
    p.onGround = false;
    p.coyote = 0;
  }
  if (p.dropT > 0) p.dropT -= DT;
  // A propeller cap floats its wearer down for as long as jump is held.
  p.vy = Math.min(p.vy + GRAV * DT, prop && inp.jump ? PROP_FALL : MAX_FALL);

  // Move.
  p.x += p.vx * DT;
  if (p.x < WALL) {
    p.x = WALL;
    p.vx = 0;
  } else if (p.x > W - WALL) {
    p.x = W - WALL;
    p.vx = 0;
  }
  const prevY = p.y;
  const wasOnGround = p.onGround;
  p.y += p.vy * DT;
  p.onGround = false;

  // Head bump on the chandelier.
  const c = CHANDELIER;
  if (p.vy < 0 && p.x + HALF_W > c.x && p.x - HALF_W < c.x + c.w) {
    const head = p.y - BODY_H;
    if (head < c.y + c.h && head > c.y) {
      p.y = c.y + c.h + BODY_H;
      p.vy = 0;
    }
  }

  if (p.vy >= 0) {
    let land = -1;
    if (p.y >= FLOOR_Y) land = FLOOR_Y;
    if (p.dropT <= 0) {
      for (const pl of PLATFORMS) {
        if (prevY <= pl.y && p.y >= pl.y && p.x >= pl.x - 3 && p.x <= pl.x + pl.w + 3) {
          if (land < 0 || pl.y < land) land = pl.y;
        }
      }
    }
    if (land >= 0) {
      const impact = p.vy;
      p.y = land;
      p.vy = 0;
      p.onGround = true;
      if (!wasOnGround) {
        const hard = impact >= HARD_LAND;
        s.events.push({ type: "land", p: p.id, hard });
        if (hard && n >= 3 && !helm) {
          const k = shed(s, p, Math.max(1, Math.round(n * 0.25)), { vx: p.vx * 0.4, spread: 80, up: 90, upVar: 90, lock: 1.5, rest: 1.6 });
          s.events.push({ type: "spill", p: p.id, n: k, cause: "land" });
        }
      }
    }
  }

  // Too much lean for the height of the tower.
  const m = p.hats.length;
  if (m >= SPILL_MIN_HATS && !helm && Math.abs(p.lean) > LEAN_LIMIT / m) {
    const side = Math.sign(p.lean);
    const k = shed(s, p, Math.max(1, Math.round(m * 0.3)), { vx: side * 60 + p.vx * 0.3, spread: 45, up: 70, upVar: 80, lock: 1.5, rest: 1.6 });
    p.lean *= 0.3;
    p.leanV = 0;
    s.events.push({ type: "spill", p: p.id, n: k, cause: "lean" });
  }

  // Clipped by the ceiling or the chandelier.
  if (p.hats.length > 0) {
    const limit = ceilingAbove(p.x, p.y - BODY_H + 1);
    let over = 0;
    let top = towerTop(p);
    for (let i = p.hats.length - 1; i >= 0 && top < limit; i--) {
      top += HAT_TYPES[p.hats[i]].adv;
      over++;
    }
    if (over > 0) {
      const k = shed(s, p, over, { vx: -p.vx * 0.5, spread: 70, up: 10, upVar: 40, lock: 1.5, rest: 1.6 });
      s.events.push({ type: "spill", p: p.id, n: k, cause: limit === CEILING_Y ? "ceiling" : "chandelier" });
    }
  }

  if (p.inv > 0) p.inv -= DT;
  if (p.kcd > 0) p.kcd -= DT;
  if (p.hats.length > p.peak) p.peak = p.hats.length;
}

// A magnet hat drags the hats near its wearer sideways towards them. It does
// not choose: a keg comes as readily as a crown.
function pullHats(s) {
  for (const p of s.players) {
    if (p.pw.magnet <= 0) continue;
    const high = towerTop(p) - 60;
    for (const h of s.hats) {
      if (h.lock === p.id && h.lockT > 0) continue;
      const dx = p.x - h.x;
      if (Math.abs(dx) > MAGNET_REACH || Math.abs(dx) < 2 || h.y < high || h.y > p.y + 4) continue;
      const dir = dx > 0 ? 1 : -1;
      if (h.state === "fall") {
        h.x0 = clamp(h.x0 + dir * MAGNET_PULL * DT, WALL, W - WALL);
        h.restY = surfaceBelow(h.x0, h.y);
      } else if (h.state === "loose") {
        h.vx = clamp(h.vx + dir * 320 * DT, -90, 90);
      } else {
        h.vx = dir * MAGNET_PULL;
      }
    }
  }
}

function moveHats(s) {
  for (let i = s.hats.length - 1; i >= 0; i--) {
    const h = s.hats[i];
    if (h.lockT > 0) h.lockT -= DT;
    if (h.state === "fall") {
      h.vy = Math.min(h.vy + 120 * DT, 50);
      h.y += h.vy * DT;
      h.phase += 2.4 * DT;
      h.x = h.x0 + Math.sin(h.phase) * 4;
      if (h.y >= h.restY) {
        h.y = h.restY;
        h.state = "rest";
        h.vx = 0;
        h.life = 5;
      }
    } else if (h.state === "loose") {
      h.vy = Math.min(h.vy + 520 * DT, 300);
      h.x += h.vx * DT;
      if (h.x < WALL) {
        h.x = WALL;
        h.vx = -h.vx * 0.5;
      } else if (h.x > W - WALL) {
        h.x = W - WALL;
        h.vx = -h.vx * 0.5;
      }
      const prevY = h.y;
      h.y += h.vy * DT;
      if (h.vy > 0) {
        let land = h.y >= FLOOR_Y ? FLOOR_Y : -1;
        for (const pl of PLATFORMS) {
          if (prevY <= pl.y && h.y >= pl.y && h.x >= pl.x && h.x <= pl.x + pl.w && (land < 0 || pl.y < land)) land = pl.y;
        }
        if (land >= 0) {
          h.y = land;
          if (h.vy > 90) {
            h.vy = -h.vy * 0.35;
            h.vx *= 0.6;
          } else {
            h.vy = 0;
            h.state = "rest";
            // A hat dragged off a ledge by a magnet was never thrown, so it has no rest time of its own.
            h.life = h.restLife || 3;
            if (h.t !== BOWLER) h.vx = 0;
          }
        }
      }
    } else {
      h.life -= DT;
      if (h.vx !== 0) {
        // Bowlers roll.
        h.x += h.vx * DT;
        h.vx *= 0.975;
        if (Math.abs(h.vx) < 4) h.vx = 0;
        if (h.x < WALL || h.x > W - WALL) {
          h.x = clamp(h.x, WALL, W - WALL);
          h.vx = -h.vx * 0.5;
        }
        if (h.y < FLOOR_Y && surfaceBelow(h.x, h.y) !== h.y) {
          h.state = "loose";
          h.vy = 0;
        }
      }
      if (h.life <= 0) s.hats.splice(i, 1);
    }
  }
}

function catchHats(s) {
  const np = s.players.length;
  for (let i = s.hats.length - 1; i >= 0; i--) {
    const h = s.hats[i];
    const ht = HAT_TYPES[h.t];
    const hx0 = h.x - ht.w / 2;
    const hx1 = h.x + ht.w / 2;
    const hy0 = h.y - ht.h;
    // Rotate who is checked first so ties are not always won by the same lord.
    for (let k = 0; k < np; k++) {
      const p = s.players[(k + s.tick) % np];
      if (h.lock === p.id && h.lockT > 0) continue;
      const top = towerTop(p);
      const onTop = hx0 < p.x + 7 && hx1 > p.x - 7 && hy0 < top + 5 && h.y > top - 4;
      const onBody = hx0 < p.x + 6 && hx1 > p.x - 6 && hy0 < p.y && h.y > p.y - BODY_H;
      if (!onTop && !onBody) continue;
      if (ht.power) {
        p.pw[ht.power] = POWERS[ht.power].secs;
        p.powers++;
        s.hats.splice(i, 1);
        s.events.push({ type: "power", p: p.id, power: ht.power, x: p.x, y: top });
        break;
      }
      p.hats.push(h.t);
      p.caught++;
      p.leanV += clamp(h.x - p.x, -6, 6) * 0.04;
      s.hats.splice(i, 1);
      s.events.push({ type: "catch", p: p.id, t: h.t, x: p.x, y: top });
      break;
    }
  }
}

// Falling boots that touch a rival's tower knock off every hat above them.
function knockTowers(s) {
  for (const a of s.players) {
    if (a.onGround || a.vy < 100 || a.kcd > 0) continue;
    for (const v of s.players) {
      const n = v.hats.length;
      if (v === a || n === 0 || v.inv > 0) continue;
      if (Math.abs(a.x - v.x) >= KNOCK_REACH) continue;
      const base = v.y - BODY_H;
      const top = base - towerHeight(v);
      if (a.y <= top || a.y - 6 >= base) continue;
      // An iron helm holds the tower together: the boots bounce off.
      if (v.pw.helm > 0) {
        a.kcd = 1;
        a.vy = -210;
        if (a.ai) a.ai.atkCd = a.ai.atkRest;
        s.events.push({ type: "clang", a: a.id, v: v.id, x: v.x, y: top });
        break;
      }
      let hit = 0;
      let y = top;
      for (let i = n - 1; i >= 0 && y < a.y; i--) {
        y += HAT_TYPES[v.hats[i]].adv;
        hit++;
      }
      // At least two hats and at most half the tower go in one knock.
      hit = Math.min(n, Math.max(2, Math.min(hit, Math.ceil(n * 0.5))));
      const k = shed(s, v, hit, { vx: a.vx * 0.5, spread: 85, up: 130, upVar: 100, lock: 1.2, rest: 3.5 });
      v.inv = KNOCK_SAFE;
      v.lean = 0;
      v.leanV = 0;
      a.knocked += k;
      a.kcd = 1;
      a.vy = -210;
      if (a.ai) a.ai.atkCd = a.ai.atkRest;
      s.events.push({ type: "knock", a: a.id, v: v.id, n: k, x: v.x, y: top });
      break;
    }
  }
}

// A keg goes off. Everyone close by on the same level loses half a tower; the
// carrier loses a quarter. An iron helm, or having just been knocked, saves a tower.
function blast(s, p) {
  s.events.push({ type: "blast", p: p.id, x: p.x, y: p.y - BODY_H });
  for (const v of s.players) {
    const n = v.hats.length;
    if (v === p || n === 0 || v.inv > 0 || v.pw.helm > 0) continue;
    if (Math.abs(v.x - p.x) > BLAST_REACH || Math.abs(v.y - p.y) > BLAST_RISE) continue;
    const top = towerTop(v);
    const side = v.x >= p.x ? 1 : -1;
    const k = shed(s, v, Math.max(2, Math.ceil(n * 0.5)), { vx: side * 70, spread: 85, up: 150, upVar: 100, lock: 1.2, rest: 3.5 });
    v.inv = KNOCK_SAFE;
    v.lean = 0;
    v.leanV = 0;
    p.knocked += k;
    s.events.push({ type: "knock", a: p.id, v: v.id, n: k, x: v.x, y: top, blast: true });
  }
  const n = p.hats.length;
  if (n > 0 && p.pw.helm <= 0) {
    const k = shed(s, p, Math.max(1, Math.round(n * 0.25)), { vx: 0, spread: 90, up: 150, upVar: 100, lock: 1.5, rest: 1.6 });
    p.lean = 0;
    p.leanV = 0;
    s.events.push({ type: "spill", p: p.id, n: k, cause: "keg" });
  }
}

function tickPowers(s) {
  for (const p of s.players) {
    for (const k of POWER_KEYS) {
      if (p.pw[k] <= 0) continue;
      p.pw[k] -= DT;
      if (p.pw[k] > 0) continue;
      p.pw[k] = 0;
      if (k === "keg") blast(s, p);
    }
  }
}

export function step(s, inputs) {
  if (s.over) return;
  s.tick++;
  s.time -= DT;

  s.spawnT -= DT;
  if (s.spawnT <= 0) {
    spawnHat(s);
    const storm = s.time <= STORM_SECONDS;
    s.spawnT = (storm ? 0.75 : 1.5) * (0.75 + s.spawnRng() * 0.5);
  }
  if (s.tick === Math.round((s.duration - STORM_SECONDS) / DT)) s.events.push({ type: "storm" });

  for (const p of s.players) {
    const inp = p.bot ? botInputs(s, p) : (inputs && inputs[p.id]) || NO_INPUT;
    movePlayer(s, p, inp);
  }
  pullHats(s);
  moveHats(s);
  catchHats(s);
  knockTowers(s);
  tickPowers(s);

  if (s.time <= 0) {
    s.time = 0;
    s.over = true;
    s.events.push({ type: "bell" });
  }
}

// Final places. Equal hat counts share a place.
export function standings(s) {
  const rows = s.players.map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    bot: p.bot,
    hats: p.hats.length,
    peak: p.peak,
    caught: p.caught,
    knocked: p.knocked,
    lost: p.lost,
    powers: p.powers,
    place: 1,
  }));
  rows.sort((a, b) => b.hats - a.hats || a.id - b.id);
  for (let i = 0; i < rows.length; i++) {
    rows[i].place = i > 0 && rows[i].hats === rows[i - 1].hats ? rows[i - 1].place : i + 1;
  }
  return rows;
}

// Quimbleshaw game shell: input, the round loop, the scoreboard and the results.
import { createRound, step, standings, DT, STORM_SECONDS, HAT_TYPES } from "./sim.js";
import { COLOURS, makeSprites } from "./art.js";
import { createRenderer } from "./render.js";
import { drawCard } from "./card.js";

const SITE = "https://quimbleshaw.meme/";
const EPOCH = Date.UTC(2026, 10, 20);
const STORE = "quimbleshaw:v1";
const ME = 0;
// The house: three bots, always labelled as bots. `edge` is how much better or
// worse each plays than the level set by the player's rank.
const HOUSE = [
  { kind: "lord", name: "Lord Quimbleshaw", short: "Lord Q", bot: true, edge: -0.2 },
  { kind: "duchess", name: "The Dowager Duchess", short: "Duchess", bot: true, edge: 0.1 },
  { kind: "baron", name: "The Baron", short: "Baron", bot: true, edge: 0 },
];
// The ladder against the house, lowest rank first, and how well the house
// plays at each rank (0 is hopeless, 1 is as good as a bot gets).
const RANKS = ["Commoner", "Squire", "Knight", "Baron", "Earl", "Duke", "Quimbleshaw"];
const RANK_SKILL = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92];
// Feathers needed to go up a rank, and feathers won or lost for each place.
const RANK_FEATHERS = 5;
const PLACE_FEATHERS = [0, 2, 1, -1, -2];
const CONTROLS = "Move: arrow keys or A and D. Jump: up, W or space. Drop through a ledge: down or S. Pause: P. Land on a rival\u2019s tower to knock their hats off.";
// What to shout, and what to explain under the picture, when the player catches a special hat.
const POWER_SAY = { magnet: "Magnet!", helm: "Iron helm!", prop: "Propeller!", keg: "Lit keg!" };
const POWER_TIP = {
  magnet: "Magnet hat: for 8 seconds, hats near you slide your way. So do kegs.",
  helm: "Iron helm: for 8 seconds nothing shakes or knocks your tower, but you run slowly.",
  prop: "Propeller cap: for 8 seconds you jump far higher. Hold jump to float down, or you will land hard.",
  keg: "Lit keg: it goes off in 4 seconds. Everyone close to you on your level loses half a tower; you lose a quarter.",
};
const CODES = {
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  ArrowUp: "jump", KeyW: "jump", Space: "jump", ArrowDown: "down", KeyS: "down",
};

const $ = (id) => document.getElementById(id);
const el = {};
for (const id of ["play", "hud", "chips", "clock", "poster", "arena", "msg", "start", "caption", "pad", "name", "sound", "pause", "daily", "result", "result-h", "result-line", "result-rows", "result-best", "again", "share", "share-text", "share-status", "card", "save", "copy", "rank", "result-rank"]) {
  el[id] = $(id);
}

const coarse = window.matchMedia("(pointer:coarse)").matches;
const calm = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

// ---------------------------------------------------------------- saved data

const data = { name: "", mute: false, rounds: 0, wins: 0, best: 0, day: 0, dayBest: 0, dayPlays: 0, streak: 0, rank: 0, feathers: 0 };
try {
  Object.assign(data, JSON.parse(localStorage.getItem(STORE) || "{}"));
} catch {
  // Private mode or a full disk: play without saved scores.
}
data.rank = Math.min(RANKS.length - 1, Math.max(0, Math.floor(Number(data.rank)) || 0));
data.feathers = Math.max(0, Math.floor(Number(data.feathers)) || 0);

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(data));
  } catch {
    // Nothing to do.
  }
}

function cleanName(v) {
  return String(v || "").replace(/[^\p{L}\p{N} _.@-]/gu, "").trim().slice(0, 14);
}

// One ballroom a day, numbered from the day the word was announced.
function today() {
  const d = new Date();
  return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1);
}

function seedFor(day) {
  return ((Math.imul(day, 0x9e3779b1) ^ 0x51b1e) >>> 0) || 1;
}

// ---------------------------------------------------------------- sound

let audio = null;

function tone(freq, dur, type, vol, slide, delay) {
  if (data.mute) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime + (delay || 0);
    const o = audio.createOscillator();
    const v = audio.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    v.gain.setValueAtTime(vol || 0.04, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(v);
    v.connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    // No audio on this device.
  }
}

const sfx = {
  catch: (n) => tone(520 + Math.min(n, 16) * 36, 0.07),
  jump: () => tone(210, 0.08, "square", 0.025, 160),
  spill: () => tone(320, 0.26, "sawtooth", 0.05, -230),
  hit: () => {
    tone(880, 0.08);
    tone(1175, 0.12, "square", 0.04, 0, 0.08);
  },
  ouch: () => tone(170, 0.32, "sawtooth", 0.07, -110),
  tick: () => tone(440, 0.08),
  go: () => tone(880, 0.18),
  storm: () => {
    for (let i = 0; i < 3; i++) tone(660, 0.09, "square", 0.04, 0, i * 0.13);
  },
  bell: () => {
    tone(784, 0.7, "triangle", 0.09);
    tone(523, 1.1, "triangle", 0.09, 0, 0.18);
  },
  power: () => {
    tone(660, 0.07);
    tone(880, 0.07, "square", 0.04, 0, 0.07);
    tone(1320, 0.14, "square", 0.04, 0, 0.14);
  },
  fuse: () => tone(980, 0.05, "square", 0.03),
  blast: () => {
    tone(110, 0.5, "sawtooth", 0.09, -70);
    tone(70, 0.6, "square", 0.06, -30, 0.03);
  },
  clang: () => tone(1568, 0.25, "triangle", 0.07, -200),
};

// ---------------------------------------------------------------- round state

const keys = { left: false, right: false, jump: false, down: false };
const inputs = [keys];
let renderer = null;
let round = null;
let day = today();
let state = "title"; // title, countdown, playing, paused, over
let last = 0;
let looping = false;
let acc = 0;
let countT = 0;
let countN = 0;
let msgT = 0;
let chips = [];
let shareText = "";
let cardBlob = null;
let cardJob = 0;
// The rank this round is played at, the last second counted on a keg's fuse,
// and how long the caption keeps explaining a special hat.
let roundRank = 0;
let fuseN = 0;
let tipT = 0;

function say(text, seconds) {
  el.msg.textContent = text;
  el.msg.hidden = !text;
  msgT = seconds || 0;
}

// The house at one rank of the ladder.
function houseFor(rank) {
  return HOUSE.map((b) => ({ kind: b.kind, name: b.name, bot: true, skill: Math.min(1, Math.max(0, RANK_SKILL[rank] + b.edge)) }));
}

function rankLine() {
  const top = data.rank === RANKS.length - 1;
  return "Your rank: " + RANKS[data.rank] + ". Feathers: " + data.feathers + (top ? "" : " of " + RANK_FEATHERS) + ".";
}

function showRank() {
  el.rank.textContent = rankLine() + (data.rank === RANKS.length - 1
    ? " There is no rank above it. Lose a feather you do not have and you are a Duke again."
    : " Beat the house to win feathers. Five lift you a rank, and the house plays harder at each one.");
}

// Feathers for one round and any change of rank. Returns "up", "down" or "",
// and the sentence for the results card.
function settle(me) {
  const won = me.hats === 0 ? PLACE_FEATHERS[4] : PLACE_FEATHERS[me.place];
  const n = Math.abs(won);
  const what = (won > 0 ? "You win " : "You lose ") + n + (n === 1 ? " feather" : " feathers");
  const had = data.feathers;
  let moved = "";
  let text = "";
  data.feathers += won;
  if (data.feathers < 0 && data.rank === 0) {
    data.feathers = 0;
    text = (had > 0 ? "You lose your last feather. " : "A Commoner with no feathers has none to lose. ") + rankLine();
  } else if (data.feathers < 0) {
    data.rank--;
    data.feathers = RANK_FEATHERS - 2;
    moved = "down";
    text = what + " and drop to " + RANKS[data.rank] + ". " + rankLine();
  } else if (data.feathers >= RANK_FEATHERS && data.rank < RANKS.length - 1) {
    data.rank++;
    data.feathers = 2;
    moved = "up";
    text = what + " and rise to " + RANKS[data.rank] + ". " +
      (data.rank === RANKS.length - 1 ? "There is nothing above it." : "The house will play harder now.");
  } else {
    text = what + ". " + rankLine();
  }
  return [moved, text];
}

// Explain a special hat under the picture for a few seconds.
function tip(text) {
  el.caption.textContent = text;
  tipT = 7;
}

function clearKeys() {
  keys.left = keys.right = keys.jump = keys.down = false;
}

function buildChips() {
  el.chips.textContent = "";
  chips = round.players.map((p, i) => {
    const li = document.createElement("li");
    li.className = "chip" + (i === ME ? " me" : "");
    const swatch = document.createElement("i");
    swatch.style.background = COLOURS[p.kind];
    const name = document.createElement("span");
    name.textContent = i === ME ? p.name : HOUSE[i - 1].short;
    const count = document.createElement("b");
    count.textContent = "0";
    li.append(swatch, name);
    if (p.bot) {
      const tag = document.createElement("small");
      tag.textContent = "bot";
      li.append(tag);
    }
    li.append(count);
    el.chips.append(li);
    return { li, count, n: -1, lead: false };
  });
}

function updateHud() {
  let top = 0;
  for (const p of round.players) top = Math.max(top, p.hats.length);
  round.players.forEach((p, i) => {
    const c = chips[i];
    const n = p.hats.length;
    if (c.n !== n) {
      c.n = n;
      c.count.textContent = String(n);
    }
    const lead = n > 0 && n === top;
    if (c.lead !== lead) {
      c.lead = lead;
      c.li.classList.toggle("lead", lead);
    }
  });
  const secs = Math.ceil(round.time);
  const text = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
  if (el.clock.textContent !== text) el.clock.textContent = text;
  el.clock.classList.toggle("storm", round.time <= STORM_SECONDS);
}

function handleEvents() {
  for (const e of round.events) {
    renderer.event(e, round, ME);
    if (e.type === "catch" && e.p === ME) sfx.catch(round.players[ME].hats.length);
    else if (e.type === "jump" && e.p === ME) sfx.jump();
    else if (e.type === "spill" && e.p === ME) sfx.spill();
    else if (e.type === "knock" && e.a === ME) sfx.hit();
    else if (e.type === "knock" && e.v === ME) sfx.ouch();
    else if (e.type === "storm") {
      sfx.storm();
      say("Hat storm!", 1.6);
    } else if (e.type === "power" && e.p === ME) {
      sfx.power();
      say(POWER_SAY[e.power], 1.2);
      tip(POWER_TIP[e.power]);
    } else if (e.type === "blast") sfx.blast();
    else if (e.type === "clang" && (e.a === ME || e.v === ME)) sfx.clang();
  }
  round.events.length = 0;
  // One tick for each second left on a keg the player is carrying.
  const fuse = Math.ceil(round.players[ME].pw.keg);
  if (fuse !== fuseN) {
    fuseN = fuse;
    if (fuse > 0) sfx.fuse();
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (msgT > 0) {
    msgT -= dt;
    if (msgT <= 0) say("");
  }
  if (state === "countdown") {
    countT -= dt;
    const n = Math.ceil(countT / 0.8);
    if (n !== countN && n > 0) {
      countN = n;
      say(String(n));
      sfx.tick();
    }
    if (countT <= 0) {
      state = "playing";
      acc = 0;
      say("Go!", 0.6);
      sfx.go();
    }
  } else if (state === "playing") {
    if (tipT > 0) {
      tipT -= dt;
      if (tipT <= 0) el.caption.textContent = CONTROLS;
    }
    acc += dt;
    let n = 0;
    while (acc >= DT && n < 5 && !round.over) {
      step(round, inputs);
      handleEvents();
      renderer.advance();
      acc -= DT;
      n++;
    }
    if (n === 5) acc = 0;
    updateHud();
    if (round.over) finish();
  }
  renderer.draw(round, ME);
  if (state === "countdown" || state === "playing") requestAnimationFrame(frame);
  else looping = false;
}

// Only ever one animation loop, however quickly play, pause and resume are pressed.
function run() {
  last = performance.now();
  if (looping) return;
  looping = true;
  requestAnimationFrame(frame);
}

function begin() {
  if (!renderer) renderer = createRenderer(el.arena, { calm });
  data.name = cleanName(el.name.value);
  save();
  day = today();
  const me = { kind: "you", name: data.name || "You" };
  roundRank = data.rank;
  fuseN = 0;
  tipT = 0;
  round = createRound({ seed: seedFor(day), players: [me].concat(houseFor(roundRank)) });
  renderer.reset();
  clearKeys();
  buildChips();
  updateHud();
  el.poster.hidden = true;
  el.arena.hidden = false;
  el.hud.hidden = false;
  el.result.hidden = true;
  el.start.hidden = true;
  el.pause.hidden = false;
  el.pad.hidden = !coarse;
  // On a phone the caption would push the buttons away from the picture.
  el.caption.hidden = coarse;
  el.caption.textContent = CONTROLS;
  el.arena.focus({ preventScroll: true });
  el.play.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  state = "countdown";
  countT = 2.4;
  countN = 0;
  if (audio && audio.state === "suspended") audio.resume();
  run();
}

function pause() {
  if (state !== "playing") return;
  state = "paused";
  clearKeys();
  say("Paused");
  el.start.textContent = "Resume";
  el.start.hidden = false;
}

function resume() {
  if (state !== "paused") return;
  state = "playing";
  say("");
  el.start.hidden = true;
  el.arena.focus({ preventScroll: true });
  run();
}

// ---------------------------------------------------------------- results

const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// How the round went for the human player: none, joint, win, last or middle.
function outcome(me, rows) {
  if (me.hats === 0) return "none";
  if (me.place === 1) return rows.filter((r) => r.place === 1).length > 1 ? "joint" : "win";
  return me.place === rows[rows.length - 1].place ? "last" : "middle";
}

function verdict(kind, me, rows) {
  if (kind === "none") return ["Quimbleshawed", "Not one hat. Even the teapot left."];
  if (kind === "joint") return ["Joint first", "A shared victory, which is to say nobody is happy."];
  if (kind === "win") {
    return ["You win the ballroom", pick(["Lord Quimbleshaw demands a recount.", "The house is appalled. Well stacked.", "The Duchess has left without saying goodbye."])];
  }
  if (kind === "last") {
    return ["Quimbleshawed", pick(["The Baron sends his regards and keeps your hat.", "Pride, then the floor. In that order.", "The house thanks you for the hats."])];
  }
  return [ORDINALS[me.place] + " of " + rows.length, pick(["Respectable. The Duchess has almost stopped laughing.", "Close enough to hear the winner gloat."])];
}

// The same verdict for the picture, which other people will read.
function cardHead(kind, me, rows) {
  const who = data.name;
  if (kind === "none" || kind === "last") return who ? who + " got quimbleshawed" : "Quimbleshawed";
  if (kind === "joint") return who ? who + ": joint first" : "Joint first";
  if (kind === "win") return who ? who + " wins the ballroom" : "The house is beaten";
  return (who ? who + ": " : "") + ORDINALS[me.place] + " of " + rows.length;
}

function cardName() {
  return "quimbleshaw-ballroom-" + day + ".png";
}

function cardButtons() {
  el.save.disabled = !cardBlob;
  el.copy.disabled = !cardBlob;
}

// Draws the picture for this round and keeps a PNG of it for saving and sharing.
async function makeCard(info, alt) {
  const job = ++cardJob;
  cardBlob = null;
  cardButtons();
  el.card.setAttribute("aria-label", alt);
  try {
    await drawCard(el.card, info);
    const blob = await new Promise((done) => el.card.toBlob(done, "image/png"));
    if (job === cardJob) cardBlob = blob;
  } catch {
    // No picture on this device; the text result still works.
  }
  cardButtons();
}

function cell(tr, text, cls) {
  const td = document.createElement("td");
  td.textContent = text;
  if (cls) td.className = cls;
  tr.append(td);
}

function finish() {
  state = "over";
  clearKeys();
  sfx.bell();
  say("The bell!", 2);
  const rows = standings(round);
  const me = rows.find((r) => r.id === ME);
  const kind = outcome(me, rows);
  const [head, line] = verdict(kind, me, rows);

  if (data.day !== day) {
    data.streak = data.day === day - 1 ? data.streak + 1 : 1;
    data.day = day;
    data.dayBest = 0;
    data.dayPlays = 0;
  }
  const record = me.hats > data.best && data.rounds > 0;
  data.rounds++;
  data.dayPlays++;
  if (me.place === 1) data.wins++;
  data.best = Math.max(data.best, me.hats);
  data.dayBest = Math.max(data.dayBest, me.hats);
  const [moved, rankText] = settle(me);
  save();
  showRank();

  el["result-rank"].textContent = rankText;
  el["result-h"].textContent = head;
  el["result-line"].textContent = line;
  el["result-rows"].textContent = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    if (r.id === ME) tr.className = "me";
    cell(tr, ORDINALS[r.place]);
    cell(tr, r.bot ? r.name + " (bot)" : r.name);
    cell(tr, String(r.hats));
    cell(tr, String(r.peak), "wide");
    cell(tr, String(r.knocked));
    cell(tr, String(r.lost), "wide");
    el["result-rows"].append(tr);
  }
  el["result-best"].textContent =
    (record ? "A new best. " : "") +
    "Best today: " + data.dayBest + ". Best ever: " + data.best + ". Rounds played: " + data.rounds +
    ". Days in a row: " + data.streak + ".";
  shareText =
    "Quimbleshaw ballroom #" + day + "\n" +
    (data.name || "I") + " finished " + ORDINALS[me.place] + " of " + rows.length + " with " + me.hats + (me.hats === 1 ? " hat" : " hats") +
    " (tallest tower: " + me.peak + ").\n" +
    "Knocked off " + me.knocked + ", dropped " + me.lost + ". Rank: " + RANKS[roundRank] + "." +
    (moved === "up" ? " Promoted to " + RANKS[data.rank] + "." : "") + "\n" + SITE;
  el["share-text"].value = shareText;
  el["share-status"].textContent = "";
  const entries = rows.map((r) => ({
    kind: r.kind,
    name: r.id === ME ? data.name || "You" : HOUSE[r.id - 1].short,
    bot: r.bot,
    place: r.place,
    hats: round.players[r.id].hats.slice(),
    lean: round.players[r.id].lean,
  }));
  const alt =
    "Result picture for ballroom #" + day + ". " +
    entries.map((e) => ORDINALS[e.place] + ": " + e.name + (e.bot ? " (bot)" : "") + ", " + e.hats.length + (e.hats.length === 1 ? " hat" : " hats")).join("; ") + ".";
  makeCard({ day, rank: RANKS[roundRank], head: cardHead(kind, me, rows), line, entries }, alt);
  el.pause.hidden = true;
  el.pad.hidden = true;
  el.result.hidden = false;
  el["result-h"].focus({ preventScroll: true });
  el.result.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
}

// On a phone the share sheet takes the picture and the text. Elsewhere the
// text is copied; the picture has its own Save and Copy buttons.
async function share() {
  if (coarse && navigator.share) {
    const payload = { text: shareText };
    if (cardBlob && navigator.canShare) {
      const files = [new File([cardBlob], cardName(), { type: "image/png" })];
      if (navigator.canShare({ files })) payload.files = files;
    }
    try {
      await navigator.share(payload);
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(shareText);
    el["share-status"].textContent = "Text copied. Paste it anywhere.";
  } catch {
    el["share-text"].focus();
    el["share-text"].select();
    el["share-status"].textContent = "Select the text and copy it.";
  }
}

function savePicture() {
  if (!cardBlob) return;
  const url = URL.createObjectURL(cardBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cardName();
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  el["share-status"].textContent = "Picture saved as " + cardName() + ".";
}

async function copyPicture() {
  if (!cardBlob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob })]);
    el["share-status"].textContent = "Picture copied. Paste it into a post or a chat.";
  } catch {
    el["share-status"].textContent = "This browser would not copy the picture. Save it instead.";
  }
}

// ---------------------------------------------------------------- input

function typing(t) {
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    if (state === "playing") pause();
    else if (state === "paused" && e.code === "KeyP") resume();
    return;
  }
  const k = CODES[e.code];
  if (!k || (state !== "playing" && state !== "countdown")) return;
  keys[k] = true;
  e.preventDefault();
});

window.addEventListener("keyup", (e) => {
  const k = CODES[e.code];
  if (k) keys[k] = false;
});

window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});

// The left half of the pad is one sliding control; the right half is two buttons.
function bindPad() {
  const move = el.pad.querySelector("[data-pad=move]");
  const set = (e) => {
    const r = move.getBoundingClientRect();
    const left = e.clientX < r.left + r.width / 2;
    keys.left = left;
    keys.right = !left;
    move.dataset.on = left ? "left" : "right";
  };
  const stop = () => {
    keys.left = keys.right = false;
    move.dataset.on = "";
  };
  move.addEventListener("pointerdown", (e) => {
    move.setPointerCapture(e.pointerId);
    set(e);
    e.preventDefault();
  });
  move.addEventListener("pointermove", (e) => {
    if (move.hasPointerCapture(e.pointerId)) set(e);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) move.addEventListener(type, stop);
  for (const b of el.pad.querySelectorAll("[data-key]")) {
    const k = b.dataset.key;
    b.addEventListener("pointerdown", (e) => {
      b.setPointerCapture(e.pointerId);
      keys[k] = true;
      b.classList.add("on");
      e.preventDefault();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      b.addEventListener(type, () => {
        keys[k] = false;
        b.classList.remove("on");
      });
    }
  }
  el.pad.addEventListener("contextmenu", (e) => e.preventDefault());
}

function setSound() {
  el.sound.textContent = data.mute ? "Sound: off" : "Sound: on";
  el.sound.setAttribute("aria-pressed", String(!data.mute));
}

// Small pictures of the special hats, for the list further down the page.
function drawIcons() {
  const icons = document.querySelectorAll("canvas[data-hat]");
  if (!icons.length) return;
  const hats = makeSprites().hats;
  for (const c of icons) {
    const t = Number(c.dataset.hat);
    if (!HAT_TYPES[t] || !hats[t]) continue;
    c.getContext("2d").drawImage(hats[t], 0, c.height - hats[t].height);
  }
}

function init() {
  for (const id of Object.keys(el)) if (!el[id]) return;
  el.name.value = cleanName(data.name);
  el.daily.textContent = "Today is ballroom #" + day + ". The same hats fall in the same places for every player today.";
  showRank();
  drawIcons();
  setSound();
  bindPad();
  el.start.addEventListener("click", () => (state === "paused" ? resume() : begin()));
  el.again.addEventListener("click", begin);
  el.pause.addEventListener("click", pause);
  el.share.addEventListener("click", share);
  el.save.addEventListener("click", savePicture);
  el.copy.addEventListener("click", copyPicture);
  el.copy.hidden = !(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
  el.sound.addEventListener("click", () => {
    data.mute = !data.mute;
    save();
    setSound();
  });
  el.start.hidden = false;
  el.play.classList.add("ready");
}

init();

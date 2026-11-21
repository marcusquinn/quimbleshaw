// Bot-only rounds of the Quimbleshaw simulation, to check that power-up hats
// work, that a round is repeatable, and how hard each rank is.
// Usage: node sim-check.mjs <path to public/js/sim.js> [rounds per cell]
import { pathToFileURL } from "node:url";

const sim = await import(pathToFileURL(process.argv[2]).href);
const ROUNDS = Number(process.argv[3] || 40);
const { createRound, step, standings } = sim;

const RANK_SKILL = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92];
const EDGE = { lord: -0.2, duchess: 0.1, baron: 0 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function house(rank) {
  return ["lord", "duchess", "baron"].map((kind) => ({ kind, name: kind, bot: true, skill: clamp01(RANK_SKILL[rank] + EDGE[kind]) }));
}

function play(seed, rank, mySkill, tally) {
  const s = createRound({ seed, players: [{ kind: "you", name: "you", bot: true, skill: mySkill }].concat(house(rank)) });
  while (!s.over) {
    step(s, null);
    for (const e of s.events) {
      tally[e.type] = (tally[e.type] || 0) + 1;
      if (e.type === "power") tally["power:" + e.power] = (tally["power:" + e.power] || 0) + 1;
      if (e.type === "spill") tally["spill:" + e.cause] = (tally["spill:" + e.cause] || 0) + 1;
      if (e.type === "knock" && e.blast) tally.blastKnock = (tally.blastKnock || 0) + 1;
    }
    s.events.length = 0;
    for (const p of s.players) {
      if (!Number.isFinite(p.x + p.y + p.vx + p.vy + p.lean + p.leanV)) throw new Error("player state is not a number at tick " + s.tick);
    }
    for (const h of s.hats) {
      if (!Number.isFinite(h.x + h.y + h.vx + h.vy + h.life)) throw new Error("hat state is not a number at tick " + s.tick + " " + JSON.stringify(h));
    }
  }
  return standings(s);
}

// 1. The same seed gives the same round.
const a = JSON.stringify(play(12345, 2, 0.5, {}));
const b = JSON.stringify(play(12345, 2, 0.5, {}));
console.log("repeatable:", a === b);

// 2. What happens in a round, on average.
const tally = {};
let hats = 0;
for (let i = 0; i < ROUNDS; i++) {
  for (const r of play(1000 + i * 7919, 3, 0.6, tally)) hats += r.hats;
}
const per = (k) => ((tally[k] || 0) / ROUNDS).toFixed(1);
console.log("per round at rank 3: hats held at the bell", (hats / ROUNDS).toFixed(1),
  "| catches", per("catch"), "| knocks", per("knock"), "(by keg", per("blastKnock") + ")",
  "| spills lean", per("spill:lean"), "land", per("spill:land"), "ceiling", per("spill:ceiling"), "chandelier", per("spill:chandelier"), "keg", per("spill:keg"),
  "| powers", per("power"), "magnet", per("power:magnet"), "helm", per("power:helm"), "prop", per("power:prop"), "keg", per("power:keg"),
  "| blasts", per("blast"), "| clangs", per("clang"));

// 3. How a stand-in player of each skill does at each rank: average feathers a round.
const FEATHERS = [0, 2, 1, -1, -2];
console.log("average feathers a round (rows: rank 0-6, columns: stand-in skill 0.2 to 1.0)");
for (let rank = 0; rank < 7; rank++) {
  const row = [];
  for (const skill of [0.2, 0.4, 0.6, 0.8, 1.0]) {
    let f = 0;
    let first = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const me = play(50000 + i * 104729 + rank * 31, rank, skill, {}).find((r) => r.id === 0);
      f += FEATHERS[me.place];
      if (me.place === 1) first++;
    }
    row.push((f / ROUNDS >= 0 ? "+" : "") + (f / ROUNDS).toFixed(2) + " (" + Math.round((first / ROUNDS) * 100) + "% 1st)");
  }
  console.log("rank " + rank + ": " + row.join("  "));
}

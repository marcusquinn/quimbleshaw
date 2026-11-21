// Browser check for the special hats and the rank ladder.
// Usage: node checks/powers-check.mjs <base-url> <out-dir> [sections]
// Needs Playwright with Chromium. If Node cannot find `playwright`, set
// PLAYWRIGHT_MODULE to the path of its index.mjs.
// Sections, comma separated: page, probe, round, ladder, promotion, phone.
// Each section prints its own report and writes it to <out-dir>/report-<section>.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2];
const out = process.argv[3];
const wanted = (process.argv[4] || "page,probe,round,ladder,promotion,phone").split(",");
mkdirSync(out, { recursive: true });
const mod = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const { chromium, devices } = mod.default || mod;

const STORE = "quimbleshaw:v1";
let report = {};

function watch(page, tag) {
  report.errors = report.errors || [];
  report.failed = report.failed || [];
  page.on("console", (m) => m.type() === "error" && report.errors.push(tag + ": " + m.text()));
  page.on("pageerror", (e) => report.errors.push(tag + ": " + e.message));
  page.on("requestfailed", (r) => report.failed.push(tag + ": " + r.url()));
  page.on("response", (r) => r.status() >= 400 && report.failed.push(tag + ": " + r.status() + " " + r.url()));
}

// Plays one round to the bell. "sweep" walks the floor from wall to wall.
async function playRound(page, mode, onTick) {
  for (let i = 0; i < 60; i++) {
    if (await page.isVisible("#result")) return true;
    if (mode === "sweep") {
      const k = i & 1 ? "ArrowLeft" : "ArrowRight";
      await page.keyboard.down(k);
      await page.clock.runFor(2100);
      if (onTick) await onTick();
      await page.clock.runFor(2040);
      await page.keyboard.up(k);
      await page.clock.runFor(60);
      if (onTick) await onTick();
    } else {
      await page.clock.runFor(9000);
    }
  }
  return page.isVisible("#result");
}

function resultInfo(page) {
  return page.evaluate((key) => {
    const text = (id) => document.getElementById(id).textContent;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      head: text("result-h"),
      rankLine: text("result-rank"),
      rankNote: text("rank"),
      rows: [...document.querySelectorAll("#result-rows tr")].map((tr) => [...tr.children].map((td) => td.textContent).join(" | ")),
      share: document.getElementById("share-text").value,
      saved: { rank: saved.rank, feathers: saved.feathers, rounds: saved.rounds },
      scrollX: document.documentElement.scrollWidth > window.innerWidth,
    };
  }, STORE);
}

async function savePng(page, file) {
  await page.waitForSelector("#save:not([disabled])", { timeout: 10000 });
  const url = await page.evaluate(() => document.getElementById("card").toDataURL("image/png"));
  writeFileSync(join(out, file), Buffer.from(url.split(",")[1], "base64"));
}

async function fresh(browser, opts, preset, time) {
  const ctx = await browser.newContext(opts);
  if (preset !== undefined) {
    await ctx.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORE, typeof preset === "string" ? preset : JSON.stringify(preset)]);
  }
  const page = await ctx.newPage();
  await page.clock.install(time ? { time: new Date(time) } : undefined);
  return [ctx, page];
}

const sections = {
  // The page at three desktop sizes: errors, sideways scrolling, the new sections.
  async page(browser) {
    report.sizes = {};
    for (const [w, h] of [[1366, 768], [1440, 900], [1280, 900]]) {
      const [ctx, page] = await fresh(browser, { viewport: { width: w, height: h } });
      watch(page, w + "x" + h);
      await page.goto(base, { waitUntil: "networkidle" });
      report.sizes[w + "x" + h] = await page.evaluate(() => ({
        scrollX: document.documentElement.scrollWidth > window.innerWidth,
        rankNote: document.getElementById("rank").textContent,
        // A drawn icon has pixels that are not transparent.
        icons: [...document.querySelectorAll("canvas[data-hat]")].map((c) => {
          const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
          return n;
        }),
        faqOnPage: document.querySelectorAll("#faq h3").length,
        faqInSchema: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)["@graph"].find((x) => x["@type"] === "FAQPage").mainEntity.length,
        playButtonBottom: Math.round(document.getElementById("start").getBoundingClientRect().bottom),
        viewport: window.innerHeight,
      }));
      if (w === 1366) {
        await page.locator("#hats").screenshot({ path: join(out, "desktop-hats.png") });
        await page.locator("#game").screenshot({ path: join(out, "desktop-how.png") });
        await page.locator("#play").screenshot({ path: join(out, "desktop-play-idle.png") });
        await page.locator("#faq").screenshot({ path: join(out, "desktop-faq.png") });
      }
      await ctx.close();
    }
  },

  // Every special hat, falling and worn, drawn by the real renderer.
  async probe(browser) {
    const [ctx, page] = await fresh(browser, { viewport: { width: 1280, height: 900 } });
    watch(page, "probe");
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const sim = await import("/js/sim.js");
      const { createRenderer } = await import("/js/render.js");
      const bot = (kind) => ({ kind, name: kind, bot: true, skill: 0.5 });
      const s = sim.createRound({ seed: 7, players: [{ kind: "you", name: "You" }, bot("lord"), bot("duchess"), bot("baron")] });
      const set = (i, x, y, hats, power, secs) => {
        const p = s.players[i];
        p.x = x;
        p.y = y;
        p.hats = hats;
        if (power) p.pw[power] = secs;
      };
      set(0, 60, 178, [0, 1, 2], "magnet", 5);
      set(1, 130, 178, [0, 7, 3, 4], "helm", 5);
      set(2, 175, 106, [5], "prop", 5);
      set(3, 290, 178, [1, 1], "keg", 2.4);
      [9, 10, 11, 12].forEach((t, i) => {
        s.hats.push({ id: 100 + i, t, x: 60 + i * 30, x0: 60 + i * 30, y: 60 + i * 12, vx: 0, vy: 20, state: "fall", life: 7, restY: 178, lock: -1, lockT: 0, phase: 0 });
      });
      s.hats.push({ id: 200, t: 0, x: 220, x0: 220, y: 178, vx: 0, vy: 0, state: "rest", life: 4, restY: 178, lock: -1, lockT: 0, phase: 0 });
      s.hats.push({ id: 201, t: 12, x: 250, x0: 250, y: 140, vx: 0, vy: 0, state: "rest", life: 4, restY: 140, lock: -1, lockT: 0, phase: 0 });
      const c = document.createElement("canvas");
      c.id = "probe";
      c.width = 350;
      c.height = 196;
      c.style.position = "fixed";
      c.style.left = "0";
      c.style.top = "0";
      c.style.width = "1050px";
      c.style.height = "588px";
      c.style.zIndex = "99";
      c.style.imageRendering = "pixelated";
      document.body.append(c);
      const r = createRenderer(c, { calm: true });
      window.probe = { r, s };
      r.draw(s, 0);
    });
    await page.locator("#probe").screenshot({ path: join(out, "probe-frame-a.png") });
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) window.probe.r.advance();
      window.probe.r.draw(window.probe.s, 0);
    });
    await page.locator("#probe").screenshot({ path: join(out, "probe-frame-b.png") });
    report.probe = "drawn";
    await ctx.close();
  },

  // A real round on the keys: catch what falls, note every special hat caught.
  async round(browser) {
    const [ctx, page] = await fresh(browser, { viewport: { width: 1366, height: 768 } });
    watch(page, "round");
    await page.goto(base, { waitUntil: "networkidle" });
    // The hats that fall depend only on the day, so the special hats of this
    // ballroom can be worked out ahead of the round.
    const day = Number((await page.textContent("#daily")).match(/#(\d+)/)[1]);
    const specials = await page.evaluate(async (d) => {
      const sim = await import("/js/sim.js");
      const seed = ((Math.imul(d, 0x9e3779b1) ^ 0x51b1e) >>> 0) || 1;
      const idle = (kind) => ({ kind, name: kind });
      const s = sim.createRound({ seed, players: [idle("you"), idle("lord"), idle("duchess"), idle("baron")] });
      const seen = new Set();
      const list = [];
      while (!s.over) {
        sim.step(s, null);
        for (const h of s.hats) {
          if (seen.has(h.id)) continue;
          seen.add(h.id);
          const power = sim.HAT_TYPES[h.t].power;
          if (power && h.state === "fall") list.push({ t: s.tick / 60, x: Math.round(h.x0), restY: h.restY, power });
        }
        s.events.length = 0;
      }
      return list;
    }, day);
    report.day = day;
    report.specials = specials.map((h) => h.power + "@" + Math.round(h.t) + "s x" + h.x + (h.restY === 178 ? " floor" : " ledge")).join(", ");

    const tips = {};
    const shouts = {};
    const captions = [];
    let clock = 0; // Milliseconds since Play was pressed; the round starts 2400 in.
    let lastCap = "";
    const simNow = () => (clock - 2400) / 1000;
    const look = async () => {
      const [cap, msg] = await page.evaluate(() => [document.getElementById("caption").textContent, document.getElementById("msg").textContent]);
      if (msg) shouts[msg] = (shouts[msg] || 0) + 1;
      const key = cap.split(":")[0];
      if (key !== lastCap) {
        lastCap = key;
        captions.push(Math.round(simNow()) + "s " + key);
      }
      if (key !== "Move" && !tips[key]) {
        tips[key] = cap;
        await page.locator("#play .frame").screenshot({ path: join(out, "round-" + key.toLowerCase().replace(/\s+/g, "-") + ".png") });
      }
    };
    const run = async (ms) => {
      while (ms > 0) {
        const d = Math.min(ms, 400);
        await page.clock.runFor(d);
        clock += d;
        ms -= d;
        await look();
      }
    };
    await page.fill("#name", "Tester");
    await page.click("#start");
    // To the left wall, which is a known place to start each walk from.
    await page.keyboard.down("ArrowLeft");
    await run(4000);
    await page.keyboard.up("ArrowLeft");
    const tried = [];
    let prev = -99;
    for (const h of specials) {
      if (h.restY !== 178 || h.x < 30 || h.x > 322 || h.t < prev + 14) continue;
      // Seconds of walking from the wall that end with the player standing at h.x.
      const walk = 0.148 + Math.max(0, h.x - 21.4) / 92;
      const leave = h.t - 1;
      if (leave < simNow() + 0.3) continue;
      prev = h.t;
      await run((leave - simNow()) * 1000);
      await page.keyboard.down("ArrowRight");
      await run(walk * 1000);
      await page.keyboard.up("ArrowRight");
      // Caught means the game named this hat on the stage. Any other shout in
      // the window (the hat storm, the bell) must not count.
      const shout = { magnet: "Magnet!", helm: "Iron helm!", prop: "Propeller!", keg: "Lit keg!" }[h.power];
      const before = shouts[shout] || 0;
      await run((h.t + 5.2 - simNow()) * 1000);
      tried.push(h.power + "@" + Math.round(h.t) + "s x" + h.x + ((shouts[shout] || 0) !== before ? " caught" : " missed"));
      await page.keyboard.down("ArrowLeft");
      await run((walk / 0.6 + 1) * 1000);
      await page.keyboard.up("ArrowLeft");
      if (await page.isVisible("#result")) break;
    }
    while (!(await page.isVisible("#result")) && clock < 200000) await run(3000);
    report.roundOver = await page.isVisible("#result");
    report.tried = tried;
    report.tips = tips;
    report.shouts = shouts;
    report.captions = captions.join(" > ");
    await savePng(page, "card-rank.png");
    report.round = await resultInfo(page);
    await page.locator("#result").screenshot({ path: join(out, "desktop-result.png") });
    await ctx.close();
  },

  // The ladder, from saved states. An idle player ends with no hats and loses two feathers.
  async ladder(browser) {
    const cases = {
      commonerFloor: { rank: 0, feathers: 0 },
      demotion: { rank: 2, feathers: 1 },
      noDemotion: { rank: 2, feathers: 4 },
      topRank: { rank: 6, feathers: 7 },
      badData: { rank: "x", feathers: -3 },
      brokenJson: "{not json",
    };
    report.ladder = {};
    for (const name of Object.keys(cases)) {
      const [ctx, page] = await fresh(browser, { viewport: { width: 1280, height: 900 } }, cases[name]);
      watch(page, name);
      await page.goto(base, { waitUntil: "networkidle" });
      const before = await page.textContent("#rank");
      await page.click("#start");
      const over = await playRound(page, "idle");
      const r = await resultInfo(page);
      report.ladder[name] = { before, over, rows: r.rows, rankLine: r.rankLine, saved: r.saved, shareLast: r.share.split("\n").slice(-2)[0] };
      await ctx.close();
    }
  },

  // Going up. The test player cannot beat the house, so in this section only the
  // feather table in game.js is patched on its way to the browser: every finish
  // wins two feathers. The rest of game.js is as served.
  async promotion(browser) {
    const UP = "[0, 2, 2, 2, 2]";
    const DOWN = "[0, -2, -2, -2, -2]";
    const cases = {
      toSquire: { rank: 0, feathers: 4, table: UP },
      staysCommoner: { rank: 0, feathers: 1, table: UP },
      toQuimbleshaw: { rank: 5, feathers: 3, table: UP },
      topKeepsCounting: { rank: 6, feathers: 9, table: UP },
      lastFeather: { rank: 0, feathers: 1, table: DOWN },
      topFalls: { rank: 6, feathers: 1, table: DOWN },
    };
    const only = process.argv[5] ? process.argv[5].split(",") : null;
    report.promotion = {};
    for (const name of Object.keys(cases)) {
      if (only && !only.includes(name)) continue;
      const [ctx, page] = await fresh(browser, { viewport: { width: 1280, height: 900 } }, { rank: cases[name].rank, feathers: cases[name].feathers });
      watch(page, name);
      let patched = 0;
      await page.route("**/js/game.js", async (route) => {
        const res = await route.fetch();
        const body = await res.text();
        const next = body.replace("const PLACE_FEATHERS = [0, 2, 1, -1, -2];", "const PLACE_FEATHERS = " + cases[name].table + ";");
        if (next !== body) patched++;
        await route.fulfill({ response: res, body: next });
      });
      await page.goto(base, { waitUntil: "networkidle" });
      await page.click("#start");
      const over = await playRound(page, "idle");
      const r = await resultInfo(page);
      report.promotion[name] = { patched, over, rankLine: r.rankLine, rankNote: r.rankNote, saved: r.saved, shareLast: r.share.split("\n").slice(-2)[0] };
      if (name === "toSquire") {
        await savePng(page, "card-promoted.png");
        await page.locator("#result").screenshot({ path: join(out, "desktop-promoted.png") });
      }
      await ctx.close();
    }
  },

  async phone(browser) {
    const [ctx, page] = await fresh(browser, { ...devices["iPhone 13"] }, { rank: 3, feathers: 2 });
    watch(page, "phone");
    await page.goto(base, { waitUntil: "networkidle" });
    report.phoneLoad = await page.evaluate(() => ({ scrollX: document.documentElement.scrollWidth > window.innerWidth, rankNote: document.getElementById("rank").textContent }));
    await page.locator("#special-hats").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(out, "phone-hats.png"), scale: "css" });
    await page.locator("#ranks").screenshot({ path: join(out, "phone-ranks.png"), scale: "css" });
    await page.tap("#start");
    await page.clock.runFor(6000);
    await page.locator("#play").screenshot({ path: join(out, "phone-play.png"), scale: "css" });
    report.phoneOver = await playRound(page, "idle");
    report.phone = await resultInfo(page);
    await page.locator("#result-rank").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(out, "phone-result.png"), scale: "css" });
    await ctx.close();
  },
};

const browser = await chromium.launch();
for (const name of wanted) {
  report = {};
  const t0 = Date.now();
  try {
    await sections[name](browser);
  } catch (e) {
    report.crash = String((e && e.stack) || e);
  }
  report.seconds = Math.round((Date.now() - t0) / 1000);
  writeFileSync(join(out, "report-" + name + ".json"), JSON.stringify(report, null, 2));
  console.log("== " + name + "\n" + JSON.stringify(report, null, 2));
}
await browser.close();

---
mode: subagent
---

<!-- SPDX-License-Identifier: MIT -->
<!-- SPDX-FileCopyrightText: 2025-2026 Marcus Quinn -->
# Execution Plans

Complex, multi-session work requiring research, design decisions, and detailed tracking.

Based on [OpenAI's PLANS.md](https://cookbook.openai.com/articles/codex_exec_plans)
with TOON-enhanced parsing for dependency tracking.

<!--TOON:meta{version,format,updated}:
1.0,plans-md+toon,2026-11-21
-->

## Format

Each plan includes:

- **Plan ID**: `p001`, `p002`, etc. (for cross-referencing)
- **Status**: Planning / In Progress (Phase X/Y) / Blocked / Completed
- **Time Estimate**: `~2w (ai:1w test:0.5w read:0.5w)`
- **Timestamps**: `logged:`, `started:`, `completed:`
- **Dependencies**: `blocked-by:p001` or `blocks:p003`
- **Linkage (The Pin)**: File:line references for search hit-rate (see below)
- **Progress**: Timestamped checkboxes with estimates and actuals
- **Decision Log**: Key decisions with rationale
- **Surprises & Discoveries**: Unexpected findings
- **Outcomes & Retrospective**: Results and lessons (when complete)

### Linkage (The Pin)

Each plan should include a Linkage section that functions as a lookup table for
AI search:

| Concept | Files | Lines | Synonyms |
| --------- | ------- | ------- | ---------- |
| {concept} | {file path} | {line range} | {related terms} |

**Why this matters:**

- Reduces hallucination by providing explicit anchors
- Improves search hit-rate with synonyms
- Points to exact file hunks for context
- Prevents AI from inventing when it should reference

## Active Plans

<!-- Add active plans here - see Plan Template below -->

### p001: Quimbleshaw, the hat-stacking game at quimbleshaw.meme

**Status:** In Progress (Phase 3/5)
**Owner:** @marcusquinn
**Tags:** #game #pixel-art #cloudflare
**Logged:** 2026-11-20

#### Purpose

Quimbleshaw is an invented word (see the README for where it came from). This
project gives it a meaning people can play: a character, Lord Quimbleshaw, and
a replayable browser game named after him.

This plan covers the game and the site. This repository is public, so search
strategy, account details and operator scripts are kept outside it (see
`AGENTS.md`).

#### Concept

- **Entity:** Lord Quimbleshaw, a pompous, endlessly humiliated English lord.
  "Getting quimbleshawed" = your hat tower falling.
- **Game:** 2D platform arena (manor ballroom). Hats rain down; walk into one to
  wear it. Towers sway when you turn, hard landings shake hats loose, low
  ceilings clip tall towers. Jump on a rival's tower to steal top hats. Most
  hats at the bell wins. A round lasts three minutes.
- **Meme layer:** the end-of-round picture (every player, tower and name, plus
  a line from the house) is a shareable meme. Planned: a page for each shared
  picture, an embed code that credits the site, a remix button, and `/make`, a
  free-form meme generator with original Quimbleshaw reaction faces.
- **Cold start:** every round starts immediately; empty seats are filled by an
  obviously fictional cast of bot aristocrats, marked as bots. Bots never get
  real-looking social handles.
- **Skill, not grind:** rank measures placement against opponent strength, not
  time played. Planned for live play: a rating, five rounds minimum to appear
  on a board, only the first five rounds a day counting, scores decided on
  the server.
- **Ranks:** Commoner, Squire, Knight, Baron, Earl, Duke, and the top tier is
  "Quimbleshaw".
- **Handles (planned):** display name plus optional X, Facebook or Instagram
  handle; no login; unverified (no tick), blocklist and report button.
- **Honesty:** no invented player counts, winners, testimonials or statistics,
  anywhere on the site or in this repository.

#### Development Environment

| Item | Value |
|------|-------|
| Hosting | Cloudflare Workers with static assets |
| Later | D1 (data), R2 (images), Durable Objects (live rooms), Turnstile |
| Deploy | By the owner's deploy script, and only when the owner asks. The script adds files that are kept out of this repository, so `wrangler deploy` is not run directly. Credentials are never stored in the repository |
| Site | `public/` is served as-is; no build step. `wrangler.jsonc` binds the apex as a custom domain; `workers.dev` and preview URLs are off. `www` redirects to the apex by a zone rule |
| Art | Game sprites are drawn in code (`public/js/art.js`). The title pictures were made with an image model; the prompt base is in `DESIGN.md` |
| Do NOT | enable paid hosting plans without the owner's approval |
| Run locally | `python3 -m http.server 8791 --bind 127.0.0.1 --directory public`, then open `http://127.0.0.1:8791/` |
| Production headers locally | `npx wrangler@4 dev --port 8792 --ip 127.0.0.1` serves `public/` with the `_headers` rules, so the content security policy can be tested before a deploy. A wrangler older than the `compatibility_date` in `wrangler.jsonc` needs `--compatibility-date` with a date it supports |
| Checks | `node --check` on each file in `public/js/`; `node checks/sim-check.mjs public/js/sim.js`; `node checks/powers-check.mjs <base-url> <out-dir> [sections]` (needs Playwright; the top of the file says how). No test runner is installed |
| When a page changes | Update `lastmod` in `public/sitemap.xml` and `dateModified` in `public/index.html` in the same change |

#### Linkage (The Pin)

| Concept | Files | Lines | Synonyms |
|---------|-------|-------|----------|
| Game rules and physics | `public/js/sim.js` | 1-98, 533-899 | simulation, lean, spill, knock, hard landing |
| Hat fall for a seed | `public/js/sim.js` | 177-272 | `createRound`, `spawnRng`, `spawnHat`, daily ballroom |
| Special hats | `public/js/sim.js` | 36-67, 669-690, 759-790, 833-869 | power-up, `POWERS`, magnet, iron helm, propeller cap, keg, `pullHats`, `blast`, `tickPowers` |
| Bot players | `public/js/sim.js` | 143-175, 308-531 | house, AI, `BOT_STYLE`, skill, `think`, flee, carry |
| Sprites | `public/js/art.js` | 1-124 | pixel maps, palette, `bake`, hats, characters, `SPIN` |
| Backdrop | `public/js/room.js` | 1-139 | ballroom, chandelier, ledges, windows |
| Drawing and effects | `public/js/render.js` | 1-227 | canvas, labels, sparks, screen shake, fuse countdown |
| Round loop, input, results, saved scores | `public/js/game.js` | 1-699 | shell, HUD, touch pad, share text, `localStorage` |
| Rank ladder | `public/js/game.js` | 11-24, 169-213 | `RANKS`, `RANK_SKILL`, `PLACE_FEATHERS`, `houseFor`, `settle`, feathers, promotion, demotion |
| Result picture | `public/js/card.js`, `public/js/game.js` | 1-197, 399-540 | `drawCard`, `makeCard`, share image, save, copy, verdict |
| Game markup and styles | `public/index.html` | 99-144, 280-334 | `#play`, stage, scoreboard, results card, `#card`, `#rank` |
| Rules and hat lists on the page | `public/index.html` | 355-412 | `#game`, `#ranks`, `#hats`, `#special-hats` |
| Bot-only rounds | `checks/sim-check.mjs` | 1-73 | balance, rank difficulty, repeatable round, feathers a round |
| Browser check | `checks/powers-check.mjs` | 1-363 | Playwright, special hats, ladder, promotion, phone, result picture |

#### Progress

- [x] (2026-11-20) Phase 1: site live at <https://quimbleshaw.meme/> —
      landing page with character, definition, game design and FAQ; robots,
      sitemap, schema, 404, social card.
- [x] (2026-11-20) Phase 2: stage-1 game — platform arena against bots, in the
      browser. Checked on the live site (see Surprises).
- [x] (2026-11-20) Phase 2 follow-up: the owner played several rounds on the
      live site and said it plays well. Knock and spill rates were left
      alone. The phone layout was not commented on.
- [x] (2026-11-20) Phase 3a: result picture. Every round ends with a 1200 by
      630 picture that can be saved, copied or shared. Drawn in the browser;
      nothing is uploaded.
- [x] (2026-11-21) Phase 2b: four special hats (magnet, iron helm, propeller
      cap, lit keg) in the daily hat stream, each a gamble, and a rank ladder
      against the house (Commoner to Quimbleshaw, the house harder at each
      rank), kept in the browser. The page explains both and the FAQ has nine
      questions, on the page and in the schema. Live since 2026-11-21.
- [x] (2026-11-21) The project moved to this repository with a fresh history.
      The work up to here was done in a private repository, which is kept as
      an archive. The two check scripts moved into `checks/`.
- [ ] Phase 3b: meme pages, embed code, `/make`
- [ ] Later: more rooms rotating by day; a hat cabinet with rare hats on
      certain days.
- [ ] Phase 4: launch
- [ ] Phase 5: stage-2 live multiplayer, rating, ranks, handles, daily board

#### Decision Log

- 2026-11-20: A game, not an article. A made-up word has no meaning; a
  character and a game give it one.
- 2026-11-20: Single-player-capable first. An empty multiplayer site looks
  bad; bots fill seats and stage 1 runs with no server.
- 2026-11-20: 2D platform arena chosen over a League-style game (needs ten
  players a match and 30-minute rounds) and over a flat left/right arena
  (less skill expression).
- 2026-11-20: Original art only.
- 2026-11-20: Pixel art, chosen by the owner. 16-bit look, deep plum, gold,
  burgundy and teal. Tokens and rules are in `DESIGN.md`.
- 2026-11-20: Page copy states plainly that the word is invented. No invented
  player counts, winners or testimonials.
- 2026-11-20: Cloudflare Web Analytics (the beacon Cloudflare injects on new
  zones) is allowed in the CSP rather than turned off, for free visit counts.
- 2026-11-20: One ballroom a day. The seed comes from the day number (day 1 is
  2026-11-20, by the player's own calendar), and hat spawns draw from their own
  random stream, so every player gets the same hat fall that day whatever they
  or the bots do. This is the Wordle-style hook: one shared daily challenge,
  replayable, with a number to quote. A score is one round, never a total.
- 2026-11-20: The house was three bots with fixed skill: Lord Quimbleshaw 0.4,
  the Duchess 0.7, the Baron 0.6. Chosen from bot-only rounds, where those
  levels end on roughly 8 to 17 hats. Replaced by the ladder on 2026-11-21.
- 2026-11-20: The title art stays in the frame until Play is pressed. It keeps
  the original picture as the largest element at load, works with no
  JavaScript, and costs no processor time on an idle page.
- 2026-11-20: Scores, names and the clock are HTML above the canvas, not drawn
  in it, so they are readable text for assistive technology and stay sharp.
- 2026-11-20: Best scores, name and sound setting are kept in the browser only
  (`localStorage` key `quimbleshaw:v1`). Nothing is sent to a server, so no
  leaderboard or player count is shown.
- 2026-11-20: Game art is drawn in code rather than generated.
- 2026-11-20: Feature order, chosen by the owner after playing: the result
  picture first, then power-up hats and a rank ladder. New rooms come later
  (each needs its own layout and bot behaviour). A scrolling manor to explore
  was turned down: it breaks the one-screen, three-minute, same-for-everyone
  round and makes the phone view smaller. A hat cabinet with rare hats gives
  the discovery pull instead.
- 2026-11-20: The result picture is made in the browser and never uploaded,
  so it needs no storage, moderation or server. It carries the site name, so
  a shared picture says where it came from. Its verdict is in the third
  person ("Tester got quimbleshawed"), because the reader is somebody else.
- 2026-11-20: On a phone, Share result opens the share sheet with the picture
  and the text. On a desktop it copies the text, and the picture has its own
  Save and Copy buttons, because desktop share sheets are unreliable.
- 2026-11-20: Browser checks cover 1366 by 768, 1440 by 900 and 1280 by 900 on
  desktop, and an iPhone 13 profile.
- 2026-11-21: Special hats are a power with a price, never a free gift, so
  catching one is a decision. Magnet: hats within 64 pixels slide to you for
  8 seconds, kegs included. Iron helm: for 8 seconds the tower cannot lean,
  spill or be knocked, and you run at 62% speed. Propeller cap: for 8 seconds
  the jump is 1.3 times as fast (about 84 pixels high instead of 50); holding
  jump floats you down, letting go at the top is a hard landing, and the
  ceiling still clips. Keg: goes off 4 seconds after the catch; everyone
  within 48 pixels on the same level loses half a tower and the carrier a
  quarter. None of them joins the tower or counts at the bell.
- 2026-11-21: Special hats come from the spawn stream (about one hat in
  fourteen, none in the first ten seconds), so they are the same for every
  player that day. The two extra draws for each hat change the hat fall of
  every ballroom from this release on; there were no stored scores to keep
  comparable.
- 2026-11-21: The ladder replaces the fixed house (0.4, 0.7, 0.6). House skill
  is set by the player's rank: 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92 from
  Commoner to Quimbleshaw, with Lord Quimbleshaw 0.2 below that level, the
  Duchess 0.1 above and the Baron on it. The house the owner played and liked
  sits between Baron and Earl.
- 2026-11-21: Feathers: 1st +2, 2nd +1, 3rd -1, 4th -2, and -2 for finishing
  with no hats. Five feathers go up a rank (starting the new rank on 2);
  losing a feather you do not have goes down one (starting on 3), except at
  Commoner. At the top rank feathers keep counting. Going down is what makes
  rank a measure of skill: with no way down, anyone who played long enough
  would reach the top.
- 2026-11-21: Levels were set from bot-only rounds, 200 for each pairing of a
  stand-in player's skill and a rank. A stand-in about as good as the house
  comes out within a third of a feather a round of even at every rank; the
  best stand-in (skill 1.0) gains about a feather a round at Commoner and a
  quarter of one at Quimbleshaw. These are bots standing in for people, so
  the levels need retuning once people play.
- 2026-11-21: The result picture and the share text carry the rank the round
  was played at, because the same ballroom is harder at a higher rank. Two
  scores are a fair comparison only on the same day and rank; the page says
  so.
- 2026-11-21: One repository, written to be public. It holds the site, the
  game, the design notes, the checks and this plan. Search strategy, account
  details and operator scripts are not committed here.
- 2026-11-21: No open licence yet. The code and art are published to be read;
  all rights are reserved until the owner picks a licence.
- 2026-11-21: The page footer links to this repository, and the `VideoGame`
  item in the structured data names it in `sameAs`. The link text describes
  where the link goes.
- 2026-11-21: MIT License for the code and the art, chosen by the owner. This
  replaces "no open licence yet" above. The display font keeps its own
  licence (SIL Open Font License 1.1).

#### Surprises & Discoveries

- 2026-11-20: Cloudflare injects its analytics beacon on new zones. A strict
  CSP blocks it and logs a console error unless the beacon hosts are allowed.
- 2026-11-20: Phase 2 browser check on a local server (Chromium, 1280 by 900
  and an iPhone 13 profile): no console errors or failed requests; Play,
  pause, resume, a full three-minute round, the results card and the touch pad
  all worked; no sideways scrolling on the phone; accessibility check found 0
  structure errors and 108 contrast passes. A player pressing keys at random
  finished 4th with 7 hats against 17, 15 and 8.
- 2026-11-20: Rounds are very busy. In that round each bot dropped about 200
  hats and knocked off 70 to 90. Whether that reads as lively or as noise
  needs a person to play it; knock and spill rates are the first things to
  tune.
- 2026-11-20: On a phone the canvas is about 350px wide, so characters are
  small. A landscape or full-screen mode is the likely fix.
- 2026-11-20: Phase 2 live check at <https://quimbleshaw.meme/> under the
  production CSP (Chromium, desktop and an iPhone 13 profile): no console
  errors or failed requests; Play, pause, resume and the touch pad worked.
  `/js/game.js` is served as `text/javascript`. One `h1`, six JSON-LD types
  including `VideoGame`, and the same FAQ items in the schema as on the page.
  Safari and Firefox were not tested.
- 2026-11-20: Playwright's `page.clock` runs a three-minute round in a few
  seconds, so whole rounds can be checked without waiting. With no key
  presses the round is the same every time, which confirms the seed decides
  the round.
- 2026-11-20: Result picture check under the production CSP (Chromium,
  desktop and an iPhone 13 profile): no console errors or failed requests;
  Save picture downloaded `quimbleshaw-ballroom-1.png`; Copy picture put an
  `image/png` on the clipboard; Share result copied the text on desktop. The
  phone share sheet cannot be driven by the test browser and was not checked.
  Safari and Firefox were not tested.
- 2026-11-21: Phase 2b check under the production CSP (`wrangler dev`,
  Chromium). At 1366 by 768, 1440 by 900 and 1280 by 900: no console errors,
  no failed requests, no sideways scrolling, the Play button inside the first
  screen, four special hat icons drawn, nine FAQ items on the page and in the
  schema. iPhone 13 profile: no sideways scrolling, rank line and results
  line shown. Accessibility check: 0 errors, 250 contrast passes. In a real
  round the test player caught a keg and a magnet: each time the name showed
  on the stage, the caption explained the hat and went back to the controls
  seven seconds later. The iron helm and the propeller cap were not caught in
  a real round by the test player; they were checked in bot-only rounds and
  drawn by the real renderer from a set scene. Safari and Firefox were not
  tested.
- 2026-11-21: Ladder check from saved states, one full round each: a Commoner
  with no feathers who comes last stays where they are; Knight on 1 loses 2
  and drops to Squire on 3; Knight on 4 loses 2 and stays; bad or unreadable
  saved data starts at Commoner. The test player cannot reliably beat the
  house, so the rest was checked with the feather table alone changed in the
  test browser: Commoner on 4 rose to Squire on 2 and the share text gained
  "Promoted to Squire."; Commoner on 1 gained 2 and stayed; Duke on 3 rose to
  Quimbleshaw; Quimbleshaw on 9 went to 11; Commoner on 1 lost its last
  feather and stayed; Quimbleshaw on 1 lost 2 and dropped to Duke on 3.
- 2026-11-21: A player who never touches the keys finished 2nd of 4 with 10
  hats at Commoner, because hats land on anyone standing still and the
  Commoner house rarely attacks. Standing still therefore earns a feather a
  round at the bottom rank. At Knight the same player finished last with 2.
  Left as it is for now: the bottom rank is meant to be easy.
- 2026-11-21: In bot-only rounds with a house near Baron level, about nine
  special hats are caught in a round between the four players, with two kegs
  going off and two knocks bouncing off an iron helm. Hats held at the bell
  were unchanged (about 43 between four players, as before).
- 2026-11-21: Because hat spawns ignore what players do, the special hats of
  a ballroom can be listed before the round by running the simulation with
  nobody moving. The browser check uses this to walk the test player under
  a chosen hat. A three-minute round takes about 50 seconds in the test
  browser. The test player's key presses are timed by the real clock, so the
  same check gave different rounds on two runs (4th with 2 hats, then 2nd
  with 8); only a round with no key presses repeats exactly.
- 2026-11-21: Live check of the release at <https://quimbleshaw.meme/>
  (Chromium, three desktop sizes and an iPhone 13 profile): no console errors
  or failed requests, no sideways scrolling, nine FAQ items on the page and
  in the schema, `/js/card.js` served as `text/javascript`. In a full round
  the test player caught a keg and a magnet and each was named and explained.
  The iron helm and the propeller cap have still not been caught in a real
  round by the test player. Safari and Firefox were not tested.
- 2026-11-21: The check script reported a propeller cap as caught on the live
  site when it was not. It counted any new shout on the stage as a catch, and
  the hat storm was announced in the same few seconds. The script now counts
  only the shout that names the hat. No "Propeller!" shout and no propeller
  caption appeared in that round.

<!--TOON:active_plans[0]{id,title,status,phase,total_phases,owner,tags,est,est_ai,est_test,est_read,logged,started}:
-->

## Completed Plans

<!-- Move completed plans here with Outcomes & Retrospective -->

<!--TOON:completed_plans[0]{id,title,owner,tags,est,actual,logged,started,completed,lead_time_days}:
-->

## Archived Plans

<!-- Plans that were abandoned or superseded -->

<!--TOON:archived_plans[0]{id,title,reason,logged,archived}:
-->

---

## Plan Template

```markdown
### p00X: Plan Title

**Status:** Planning
**Owner:** @username
**Tags:** #tag1 #tag2
**Estimate:** ~Xd (ai:Xd test:Xd read:Xd)
**Dependencies:** blocked-by:p001 (if any)
**PRD:** [todo/tasks/prd-{slug}.md](tasks/prd-{slug}.md)
**Tasks:** [todo/tasks/tasks-{slug}.md](tasks/tasks-{slug}.md)
**Logged:** YYYY-MM-DD

#### Purpose

Brief description of why this work matters.

#### Development Environment

<!-- Required for Python, Node.js, and any project with non-trivial setup.
     Workers read this section to avoid broken installs in worktrees. -->

| Item | Value |
|------|-------|
| Language/runtime | e.g. Python 3.12, Node 20 |
| Venv/install | e.g. `python3 -m venv .venv && pip install -e ".[dev]"` |
| Tests | e.g. `source .venv/bin/activate && pytest` |
| Do NOT | e.g. install globally; use the canonical worktree venv |

#### Linkage (The Pin)

| Concept | Files | Lines | Synonyms |
|---------|-------|-------|----------|
| {main concept} | src/path/file.ts | 45-120 | {term1}, {term2} |
| {related concept} | src/path/other.ts | 12-89 | {term3}, {term4} |

#### Progress

- [ ] (YYYY-MM-DD HH:MMZ) Phase 1: Description ~Xh
- [ ] (YYYY-MM-DD HH:MMZ) Phase 2: Description ~Xh

#### Decision Log

(Decisions recorded during implementation)

#### Surprises & Discoveries

(Unexpected findings during implementation)
```

---

## Analytics

<!--TOON:dependencies-->
<!-- Format: child_id|relation|parent_id -->
<!--/TOON:dependencies-->

<!--TOON:analytics{total_plans,active,completed,archived,avg_lead_time_days,avg_variance_pct}:
0,0,0,0,,
-->

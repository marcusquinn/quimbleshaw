# quimbleshaw

<!-- AI-CONTEXT-START -->

## Quick Reference

- **Build**: none. `public/` is served as it is.
- **Run**: `python3 -m http.server 8791 --bind 127.0.0.1 --directory public`
- **Check**: `node --check` on each file in `public/js/`, then `node checks/sim-check.mjs public/js/sim.js`. The browser check is `checks/powers-check.mjs`; its header says how to run it.
- **Deploy**: by the owner's deploy script only, and only when the owner has asked for it. The script adds files that are kept out of this repository, so do not run `wrangler deploy` directly.

## Project Overview

Quimbleshaw is a pixel-art hat-stacking browser game at <https://quimbleshaw.meme/>.
This repository is the whole site: the game, the page it sits on, the design
notes (`DESIGN.md`) and the plan (`todo/PLANS.md`).

## This repository is public

Everything committed here, and every branch name, issue, pull request and
comment, can be read by anyone. Keep these out of all of them:

- search and marketing strategy: who the site should be found by, where links
  or listings are sought, launch timing;
- account names, secret names, credential file paths and local paths;
- operator scripts and notes that name any of the above.

Where they go instead:

- Search targets and strategy: `context/keywords.md` and `context/keywords/`.
  Git ignores both here. `aidevops keywords sync` fetches and publishes them.
- Operator scripts and notes: on the owner's machine, outside any repository.
- `todo/PLANS.md` is public. It holds game design, decisions and check results
  only.

Never state a player count, winner, testimonial or statistic that has not been
measured.

## Architecture

The file table is in `README.md` under "How it is built". Rules that the code
relies on:

- No framework, no build step and no dependency. Do not add any without the
  owner's approval.
- `public/js/sim.js` has no DOM access and takes all randomness from seeded
  generators, so the same seed and inputs give the same round. Hat spawns
  draw from their own stream. Changing how many numbers a spawn draws changes
  the hat fall of every daily ballroom.
- `public/_headers` sets the content security policy. Scripts run only from
  the site itself and the Cloudflare analytics beacon; an inline script would
  be blocked.
- Saved data is in the browser only (`localStorage` key `quimbleshaw:v1`).
  Nothing is sent to a server.
- Visual rules are in `DESIGN.md`. Update it in the same change when the look
  changes.

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
- Branches: `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `chore/`
- Documentation: human/operator guides in `docs/`, AI-only context in `.agents/`;
  retain conventional root entrypoints and respect existing repository conventions.

## Key Files

| File | Purpose |
|------|---------|
| `README.md` | What the project is, how a round plays, how it is built |
| `DESIGN.md` | Colours, type and the rules for how things look |
| `todo/PLANS.md` | Plan, decisions and check results |
| `checks/` | Bot-only rounds and the browser check |
| `.agents/AGENTS.md` | Project-specific agent instructions |
| `TODO.md` | Task tracking |

<!-- AI-CONTEXT-END -->

## Search targets

Search keywords, AI-answer questions and search entities live in `context/keywords.md` and `context/keywords/` (standard: `~/.aidevops/agents/seo/keywords-standard.md`). Git ignores them in this public repository. Read them, or run `aidevops keywords brief`, before naming, copy, metadata, schema, media, social or PR work. If the files are missing in a clone, run `aidevops keywords sync`.

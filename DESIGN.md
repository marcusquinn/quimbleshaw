---
version: alpha
name: quimbleshaw
description: Pixel-art design system for the Quimbleshaw hat-stacking meme game
colors:
  primary: "#f2b632"
  secondary: "#8b1e3f"
  tertiary: "#2ec4b6"
  neutral: "#cdb99a"
  background: "#160b22"
  surface: "#24122f"
  on-surface: "#f4e4c1"
  error: "#ff6b6b"
  outline: "#4a2b5f"
  ink: "#0b0612"
  primary-hover: "#ffd76a"
typography:
  headline-display:
    fontFamily: "Press Start 2P"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: "Press Start 2P"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.6
  headline-md:
    fontFamily: "Press Start 2P"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: Georgia
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Georgia
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: Georgia
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: "Press Start 2P"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: 0px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 56px
  gutter: 20px
  margin: 20px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: 24px
---

<!--
DESIGN.md — AI-readable design system document
Format: google-labs-code/design.md alpha
Spec: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
Validate: npx @google/design.md lint DESIGN.md
Sections 1-8 follow the spec order. Sections 9-10 are aidevops extensions.
-->

# Design System: quimbleshaw

## 1. Overview

**Mood**: playful, pompous, 16-bit
**Density**: balanced
**Atmosphere**: a candle-lit English manor ballroom at night, drawn for a 1990s games console.

**Key Characteristics:**

- Everything looks like a game screen: hard pixel edges, chunky 4px borders, hard offset shadows, no blur.
- Pixel art carries the brand. Reference art: `design/concepts/ballroom-hat-fight-v1.png` and `design/concepts/lord-quimbleshaw-v1.png`.
- Long text stays easy to read: the pixel font is for titles and labels only, body text is a serif.
- The tone is dry English understatement. The joke is always on Lord Quimbleshaw.

## 2. Colors

A dark plum night with candle gold, taken from the reference art.

- **Primary (`#f2b632`)**: candle gold. Titles, links, the one main button per screen.
- **Secondary (`#8b1e3f`)**: curtain burgundy. Title shadows and picture-frame shadows.
- **Tertiary (`#2ec4b6`)**: duchess teal. Small labels, status notes, focus rings.
- **Neutral (`#cdb99a`)**: aged parchment. Captions and secondary text.
- **Background (`#160b22`)**: deep plum. It matches the flat background of the character sprite so sprites sit on the page with no visible box.
- **Surface (`#24122f`)**: raised plum for cards and panels.
- **On-surface (`#f4e4c1`)**: parchment cream for body text.
- **Error (`#ff6b6b`)**: errors and destructive actions.
- **Outline (`#4a2b5f`)**: card borders and dividers.
- **Ink (`#0b0612`)**: hard shadows and text on gold.

## 3. Typography

**Press Start 2P** (self-hosted, SIL Open Font License) for titles and labels; **Georgia** for everything people read at length.

- **Headlines**: Press Start 2P, weight 400 only. The page title is uppercase with a two-step hard shadow (burgundy, then ink).
- **Body**: Georgia at 18px, line height 1.65.
- **Labels**: Press Start 2P at 12px, uppercase for navigation and buttons. Never below 10px.

| Role | Token | Font | Size | Notes |
|------|-------|------|------|-------|
| Display | `headline-display` | Press Start 2P | 24px to 64px, fluid | Uppercase, hard shadow |
| Heading 2 | `headline-lg` | Press Start 2P | 16px to 24px, fluid | Gold |
| Heading 3 | `headline-md` | Press Start 2P | 14px | Teal |
| Lede | `body-lg` | Georgia | 20px | |
| Body | `body-md` | Georgia | 18px | |
| Caption | `body-sm` | Georgia | 16px | Neutral colour, often italic |
| Label | `label-md` | Press Start 2P | 12px | Uppercase |

## 4. Layout

A single centred column, **1100px** maximum, on a 4px grid. Sections are separated by 56px of space, not by lines.

- **Container padding**: 20px.
- **Card grids**: four, three or two columns on desktop; two at 900px; one at 640px.
- Art sits in a gold picture frame at full column width.

## 5. Elevation & Depth

Depth comes from **hard offset shadows and borders**. No blur, no gradients, no transparency.

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow | Page, hat list items |
| Raised | 4px `outline` border, `6px 6px 0` ink shadow | Cards, buttons |
| Framed | 4px gold border, 4px ink ring, `10px 10px 0` burgundy shadow | Pictures |

## 6. Shapes

Square corners everywhere (`rounded.none`). Borders are 4px. Nothing is rounded, blurred or tilted, except the character sprite, which wobbles.

## 7. Components

### Cross-cutting component rules

- Accessibility: WCAG AA contrast, a visible 3px teal focus ring with 3px offset, a skip link, real headings and lists.
- Motion: only the sprite wobble and the button press. Both stop under `prefers-reduced-motion`. The game moves only after the player presses Play; its screen shake is off under `prefers-reduced-motion`.
- Touch targets: 44px minimum height for links in navigation and for buttons.
- Images: always set `width` and `height`; describe what is visible in `alt`.

### Buttons

**Primary** (`{components.button-primary}`): gold with ink text, ink border and hard shadow. Hover lightens to `primary-hover`. Pressing moves the button 3px down and right and shortens the shadow. One per screen.

**Secondary** (`{components.button-secondary}`): surface background, outline border; the border turns gold on hover.

### Links

Gold, underlined, lighter gold on hover.

### Cards & Containers

**Card** (`{components.card}`): surface background, 4px outline border, hard ink shadow.

**Status note**: a card with a teal border, used for one honest line about what is and is not live.

### The game

Reference: `public/index.html` (`#play`), `public/js/art.js`, `public/js/room.js`, `public/js/render.js`, `public/js/card.js`.

- **Stage**: the picture frame holds the title art until Play is pressed, then a 350 by 196 canvas scaled up with `image-rendering: pixelated`. On a wide screen it is 1050px wide, exactly three times the canvas, so every game pixel is square.
- **In-game art**: drawn in code from small letter maps, with a one-pixel ink outline round every sprite. Characters are 10 by 18 pixels. No text is drawn on the canvas except hat counts in a 3 by 5 number font.
- **Player colours** (scoreboard swatch and in-room hat count): you `#ff6b6b`, Lord Quimbleshaw `#c58cf0`, the Duchess `#2ec4b6`, the Baron `#6fcf5f`. A gold arrow marks the human player.
- **Scoreboard**: one chip per player above the stage: swatch, short name, the word "bot" in italic serif for house players, hat count in gold. The leader's chip has a gold border. The clock turns error red for the last 30 seconds.
- **Play button**: the one gold button, centred on the stage. It becomes Resume when paused; after a round the gold button is Play again in the results card.
- **Touch pad**: shown only for touch screens, under the stage: a sliding left and right control, then drop and jump. Buttons are 64px squares.
- **Special hats**: magnet (red horseshoe, white tips), iron helm (steel grey, red plume), propeller cap (blue cap, yellow blades, two frames so the blades spin) and keg (brown wood, dark hoops, a gold spark on the fuse). In the room a special hat has a cream spark that steps round its four corners, so it reads as different from an ordinary hat at a glance. Worn, it sits on top of the tower and blinks for its last second and a half. A lit keg does not blink: the seconds left on its fuse are drawn above the hat count, flashing red and gold. Catching one puts its name on the stage for about a second and explains it in the caption for seven seconds; the caption then goes back to the controls. A keg going off is an orange and cream burst with screen shake.
- **Special hat list**: in "The hats" section each special hat has a 16 by 12 canvas drawn from the game sprite at four times its size. Ordinary hats have no icon.
- **Rank line**: one muted note under the controls: rank, feathers, and the rule in a sentence. The same words are in the page before the script runs, so nothing moves for a new visitor. The results card has its own line saying what the round did to the rank.
- **Results card**: verdict as the heading, one dry line from the house, the result picture, the buttons (gold Play again, then Save picture, Copy picture and Share result as ghost buttons), a table of all four players, the rank line, then the result as plain text.
- **Result picture** (`public/js/card.js`): 1200 by 630, the size of a social card. The four players stand in finishing order with their final towers, in front of a plain ballroom wall. Art pixels are three real pixels across, or two when the tallest tower would not fit, never mixed in one picture. Text is drawn at full size, not as enlarged pixels: hat count above each tower in the player's colour, place and name on an ink plate at their feet, house players tagged BOT. The caption panel holds the verdict in the display font (gold, burgundy shadow, shrinking in 8px steps to fit), the line from the house in italic serif, the ballroom number in teal, the rank the round was played at in muted cream beside it, and `QUIMBLESHAW.MEME` in gold at the bottom right. The verdict is written in the third person, because other people read it.

### Canonical examples

#### Page: the homepage

Reference: `public/index.html`

Follow: inline CSS, no JavaScript unless the game needs it, one `h1`, the title screen feel of the hero, the picture frame.

Avoid: stock imagery, rounded corners, drop-shadow blur, gradients, emoji, invented statistics.

## 8. Do's and Don'ts

**Do:**

- Use original pixel art that exists nowhere else.
- Keep the pixel font to short strings.
- Say plainly what is planned and what is playable.

**Don't:**

- Set body text in the pixel font.
- Use more than one gold button on a screen.
- Smooth, blur or round anything.

---

## 9. Responsive Behaviour

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | up to 640px | One column; navigation centred on one row at 10px; sprite above its text |
| Tablet | 641px to 900px | Two-column card grids |
| Desktop | over 900px | Full grids, 1100px column |

- The page must look finished on a desktop screen and on a phone.
- No horizontal scrolling at 360px.

## 10. Agent Prompt Guide

| Use | Token | Value |
|-----|-------|-------|
| Page background | `{colors.background}` | `#160b22` |
| Card background | `{colors.surface}` | `#24122f` |
| Body text | `{colors.on-surface}` | `#f4e4c1` |
| Muted text | `{colors.neutral}` | `#cdb99a` |
| Titles, links, main button | `{colors.primary}` | `#f2b632` |
| Labels, focus | `{colors.tertiary}` | `#2ec4b6` |

**Art prompt base** (image models): "16-bit pixel art in the style of a classic SNES-era 2D platform game. Crisp hard-edged pixels on a consistent pixel grid, limited colour palette, flat shading, no anti-aliasing, no blur, no gradients, no text." For sprites add: "flat solid deep plum background (hex #1a1023), no scenery". Lord Quimbleshaw: portly English lord, huge curled ginger moustache, gold monocle, plum tailcoat, mustard waistcoat, white cravat, striped trousers, tower of mismatched hats.

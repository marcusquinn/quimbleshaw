// Quimbleshaw pixel art. Every sprite is a small map of letters; `bake` turns a
// map into a canvas with a one-pixel ink outline. No image files are loaded.

export const INK = "#0b0612";

// Scoreboard and label colour for each character.
export const COLOURS = { you: "#ff6b6b", lord: "#c58cf0", duchess: "#2ec4b6", baron: "#6fcf5f" };

function bake(rows, pal) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement("canvas");
  c.width = w + 2;
  c.height = h + 2;
  const g = c.getContext("2d");
  g.fillStyle = INK;
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error("sprite row " + y + " is not " + w + " wide");
    for (let x = 0; x < w; x++) {
      if (rows[y][x] === ".") continue;
      g.fillRect(x, y + 1, 3, 1);
      g.fillRect(x + 1, y, 1, 3);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      if (!pal[ch]) throw new Error("sprite colour " + ch + " is not in the palette");
      g.fillStyle = pal[ch];
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return c;
}

function mirror(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d");
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

const SKIN = "#f1c7a4";
const CREAM = "#f4e4c1";
const GOLD = "#f2b632";
const BOOT = "#2a2036";

// Each map is 10 wide and 18 tall, facing right. `walk` replaces the last four rows.
const PEOPLE = {
  lord: {
    pal: { o: "#d9722b", s: SKIN, k: INK, g: GOLD, m: "#f08a35", w: CREAM, c: "#9a4fc4", v: "#d9a520", t: "#d8d2e0", T: "#6d6480", b: BOOT },
    rows: [
      "..oooooo..", ".ossssss..", ".osskssgg.", ".ossssssg.", "..mmmmmmmm", "..smmssmm.",
      "...wwww...", ".ccwwvvcc.", "cccvvvvccc", "cccvgvvccc", "cscvvvvcsc", "cccvgvvccc",
      ".ccvvvvcc.", ".cctttccc.", ".c.tTtT.c.", "...tT.tT..", "...tT.tT..", "..bbb.bbb.",
    ],
    walk: [".c.tTtT.c.", "..tT..tT..", ".tT....tT.", "bbb....bbb"],
  },
  duchess: {
    pal: { h: "#c9c9d6", s: SKIN, k: INK, r: "#c0392b", p: "#ffffff", d: "#2ec4b6", D: "#1f8f86", g: GOLD, w: CREAM },
    rows: [
      "...hhhh...", "..hhhhhh..", ".hhssssh..", ".hsksskh..", ".hsssss...", "..ssrrs...",
      "...pppp...", "..dddddd..", ".sdddddds.", ".sddgddds.", "..dddddd..", "..dDddDd..",
      ".ddDddDdd.", ".ddDddDdd.", "dddDddDddd", "dddDddDddd", "ddddddddDd", "wwwwwwwwww",
    ],
    walk: [".ddDddDdd.", "dddDddDddd", "ddDdddDddd", ".wwwwwwww."],
  },
  baron: {
    pal: { n: "#3a2a22", s: SKIN, k: INK, w: CREAM, e: "#4caf50", g: GOLD, q: "#e8dcc0", b: BOOT },
    rows: [
      "..nnnnnn..", ".nnnnnnnn.", ".nssssss..", ".nskssks..", "..ssssss..", "..snnnnn..",
      "...wwww...", "..eewwee..", ".eeeweeee.", ".eeegeeee.", "seeeeeeees", ".eeegeeee.",
      ".eeeeeeee.", "..eeeeee..", "..qq..qq..", "..qq..qq..", "..bb..bb..", ".bbb.bbb..",
    ],
    walk: ["..qq..qq..", ".qq....qq.", ".bb....bb.", "bbb...bbb."],
  },
  you: {
    pal: { u: "#7a4a2a", s: SKIN, k: INK, w: CREAM, r: "#e5484d", g: GOLD, b: BOOT },
    rows: [
      "..uuuuuu..", ".uuuuuuuu.", ".ussssss..", ".usksskss.", "..ssssss..", "..sssrss..",
      "...wwww...", "..rrwwrr..", ".rrrgrrrr.", ".rrrrrrrr.", "srrrgrrrrs", ".rrrrrrrr.",
      ".rrrgrrrr.", "..rrrrrr..", "..ww..ww..", "..ww..ww..", "..bb..bb..", ".bbb.bbb..",
    ],
    walk: ["..ww..ww..", ".ww....ww.", ".bb....bb.", "bbb...bbb."],
  },
};

// In the same order as HAT_TYPES in sim.js, and the same sizes.
const HATS = [
  { pal: { a: "#39405c", A: "#6a74a0", r: "#c0392b" }, rows: ["..aaaaaa..", "..aAaaaa..", "..aAaaaa..", "..aAaaaa..", "..aaaaaa..", "..rrrrrr..", "..aaaaaa..", "aaaaaaaaaa"] },
  { pal: { b: "#8a5a2b", B: "#b07a40", n: "#3a2a22" }, rows: ["...bbbb...", "..bBbbbb..", "..bBbbbb..", "..nnnnnn..", "bbbbbbbbbb", ".bbbbbbbb."] },
  { pal: { r: "#c0392b", R: "#e2584a", g: GOLD }, rows: ["..rrrrg.", ".rRrrrrg", ".rRrrrrg", ".rRrrrr.", "rrRrrrrr", "rrRrrrrr", "rrrrrrrr"] },
  { pal: { t: "#b89a6a", T: "#8a6f45", n: "#5a4630" }, rows: ["....tnnt....", "...tTtTtt...", "..tTtTtTtt..", "..tttttttt..", "tttTtTtTtttt", "tt.tttttt.tt"] },
  { pal: { p: "#a55cd0", y: "#f2d03b", g: "#ffd76a" }, rows: ["g....gg....g", "p....yy....p", "pp...yy...pp", ".pp.yyyy.pp.", ".pppyyyyppp.", "..ppyyyypp..", "..gpgyygpg..", "..pppyyppp.."] },
  { pal: { y: "#e3c16f", Y: "#f5dea0", r: "#c0392b", g: "#2e9e5b" }, rows: ["......yyyy......", ".....yYyyyy.....", ".....rgrgrg.....", "y...yyyyyyyy...y", "yyyyyyyyyyyyyyyy", ".yrgrgrgrgrgrgy."] },
  { pal: { p: "#ff6fae", c: "#2ec4b6", w: "#ffffff" }, rows: ["...ww...", "...ww...", "...pp...", "..cccc..", "..pppp..", ".cccccc.", ".pppppp.", "cccccccc", "pppppppp"] },
  { pal: { g: GOLD, G: "#b8862b", r: "#e5484d", b: "#3fa7ff" }, rows: ["g...gg...g", "gg.gggg.gg", "gggggggggg", "grggbbggrg", "gggggggggg", "GGGGGGGGGG"] },
  { pal: { w: "#f4f0e6", b: "#4a7bd0" }, rows: [".....bb.....", "....wwww....", ".ww.wwwwww.w", "w..wwwwwwwww", "w..wbwwbwww.", ".wwwwwwwww..", "...wwwwww...", "...bbbbbb..."] },
  // The special hats: magnet, iron helm, propeller cap, keg.
  { pal: { r: "#d6303a", R: "#ff8a8a", w: "#e8e8f0" }, rows: ["..rrrrrr..", ".rrRRrrrr.", "rrRrrrrrrr", "rrr....rrr", "rrr....rrr", "rrr....rrr", "www....www", "www....www"] },
  { pal: { s: "#9aa3b5", S: "#d5dbe8", k: "#1b1426", p: "#e5484d", g: GOLD }, rows: ["....pp....", "...ppp....", "..ssssss..", ".sSssssss.", ".sSssssss.", ".skkkkkks.", ".sSsssgss.", ".sSssssss.", "ssssssssss"] },
  { pal: { y: "#f2d03b", k: "#39405c", b: "#3fa7ff", B: "#b5ddff", r: "#e5484d" }, rows: ["yyyyykkyyyyy", ".....kk.....", "....bbbb....", "...bBbbrr...", "..bbBbbrrr..", "..bbbbbrrr..", ".bbbbbbbbbb."] },
  { pal: { w: "#8a5a2b", W: "#b07a40", b: "#39405c", k: "#cdb99a", f: "#ffd76a" }, rows: ["......f...", ".....k....", "..wwwwww..", ".wWwwwwww.", ".bbbbbbbb.", ".wWwwwwww.", ".wWwwwwww.", ".bbbbbbbb.", "..wwwwww.."] },
];

// The propeller cap a moment later, with its blades end on.
const SPIN = { pal: { y: "#f2d03b", k: "#39405c", b: "#3fa7ff", B: "#b5ddff", r: "#e5484d" }, rows: ["....ykky....", ".....kk.....", "....bbbb....", "...bBbbrr...", "..bbBbbrrr..", "..bbbbbrrr..", ".bbbbbbbbbb."] };

// people[kind][0 = facing right, 1 = facing left][0 = standing, 1 = mid-stride]
export function makeSprites() {
  const people = {};
  for (const kind of Object.keys(PEOPLE)) {
    const d = PEOPLE[kind];
    const stand = bake(d.rows, d.pal);
    const stride = bake(d.rows.slice(0, d.rows.length - d.walk.length).concat(d.walk), d.pal);
    people[kind] = [[stand, stride], [mirror(stand), mirror(stride)]];
  }
  return { people, hats: HATS.map((h) => bake(h.rows, h.pal)), spin: bake(SPIN.rows, SPIN.pal) };
}

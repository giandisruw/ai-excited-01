// The Day the Sky Folded — deterministic procedural render.
// Node standard library only. Writes one PNG to $MAKEFUN_OUTPUT_DIR/entry.png.
// No randomness except a fixed-seed PRNG; identical bytes on every run.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 960;
const H = 960;

// ---------- fixed-seed PRNG (deterministic) ----------
let seed = 20261117;
function rnd(): number {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------- pixel buffer ----------
const buf = Buffer.alloc(W * H * 3);
type RGB = [number, number, number];
function px(x: number, y: number, c: RGB): void {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function blend(x: number, y: number, c: RGB, a: number): void {
  const xi = x | 0, yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  buf[i] = Math.round(buf[i] * (1 - a) + c[0] * a);
  buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + c[1] * a);
  buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + c[2] * a);
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function shade(c: RGB, f: number): RGB {
  return [
    Math.max(0, Math.min(255, Math.round(c[0] * f))),
    Math.max(0, Math.min(255, Math.round(c[1] * f))),
    Math.max(0, Math.min(255, Math.round(c[2] * f))),
  ];
}

// ---------- shapes ----------
function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
    }
  }
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px(x, y, c);
    }
  }
}
function fillCircleBlend(cx: number, cy: number, r: number, c: RGB, a: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) blend(x, y, c, a);
    }
  }
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(x, y, c);
    }
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1): void {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + dx * t), y = Math.round(y0 + dy * t);
    if (w <= 1) px(x, y, c);
    else fillCircle(x, y, w / 2, c);
  }
}
function quad(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB): void {
  fillTriangle(x0, y0, x1, y1, x2, y2, c);
  fillTriangle(x0, y0, x2, y2, x3, y3, c);
}

// ---------- 1. sky: warm dawn gradient ----------
const skyTop: RGB = [43, 30, 94];      // deep violet
const skyMid: RGB = [214, 74, 110];    // magenta rose
const skyLow: RGB = [255, 178, 84];    // warm gold horizon
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const c = t < 0.55 ? mix(skyTop, skyMid, t / 0.55) : mix(skyMid, skyLow, (t - 0.55) / 0.45);
  for (let x = 0; x < W; x++) px(x, y, c);
}

// ---------- 2. sun with glow, upper right ----------
const sunX = 748, sunY = 205;
fillCircleBlend(sunX, sunY, 190, [255, 214, 130], 0.35);
fillCircleBlend(sunX, sunY, 150, [255, 226, 150], 0.45);
fillCircle(sunX, sunY, 108, [255, 236, 170]);
fillCircle(sunX, sunY, 88, [255, 246, 205]);
for (let i = 0; i < 12; i++) { // short rays
  const a = (i / 12) * Math.PI * 2 + 0.26;
  const x0 = sunX + Math.cos(a) * 122, y0 = sunY + Math.sin(a) * 122;
  const x1 = sunX + Math.cos(a) * 158, y1 = sunY + Math.sin(a) * 158;
  line(x0, y0, x1, y1, [255, 232, 160], 5);
}

// ---------- 3. folded sky: giant origami facets ----------
// Facets fan out from a fold point; each facet a slightly shifted sky tone.
const foldX = 470, foldY = 430;
const crease: RGB = [58, 28, 84];
const facetTones: RGB[] = [
  [96, 52, 138], [150, 58, 122], [196, 82, 108], [232, 118, 96],
  [120, 62, 150], [178, 66, 118], [222, 100, 100], [84, 44, 128],
];
const rim: [number, number][] = [
  [-40, -40], [240, -40], [480, -40], [720, -40], [1000, -40],
  [1000, 200], [1000, 430], [1000, 660], [760, 760], [520, 760],
  [280, 760], [-40, 660], [-40, 430], [-40, 200],
];
for (let i = 0; i < rim.length; i++) {
  const [ax, ay] = rim[i];
  const [bx, by] = rim[(i + 1) % rim.length];
  fillTriangle(foldX, foldY, ax, ay, bx, by, facetTones[i % facetTones.length]);
}
// crease lines from fold point to every rim joint
for (const [rx, ry] of rim) line(foldX, foldY, rx, ry, crease, 3);
// soft light wash over facets near the sun side
for (let i = 0; i < 2600; i++) {
  const x = 560 + rnd() * 400, y = 60 + rnd() * 420;
  blend(x, y, [255, 220, 160], 0.05);
}

// ---------- 4. soft clouds ----------
function cloud(cx: number, cy: number, s: number, c: RGB): void {
  fillEllipse(cx, cy, 78 * s, 30 * s, c);
  fillEllipse(cx - 52 * s, cy + 8 * s, 52 * s, 22 * s, c);
  fillEllipse(cx + 52 * s, cy + 8 * s, 56 * s, 24 * s, c);
  fillEllipse(cx, cy - 18 * s, 48 * s, 24 * s, c);
}
cloud(180, 180, 1.05, [255, 214, 205]);
cloud(880, 470, 0.9, [255, 200, 190]);
cloud(120, 640, 0.8, [244, 178, 178]);
cloud(700, 620, 0.7, [255, 208, 196]);

// ---------- 5. birds ----------
function bird(x: number, y: number, s: number): void {
  line(x - 14 * s, y, x, y - 8 * s, [46, 22, 70], 3);
  line(x, y - 8 * s, x + 14 * s, y, [46, 22, 70], 3);
}
bird(210, 300, 1); bird(300, 250, 0.8); bird(660, 120, 0.9); bird(120, 420, 0.7);

// ---------- 6. speed lines behind the plane ----------
for (let i = 0; i < 9; i++) {
  const y = 300 + i * 26 + (i % 3) * 7;
  const x0 = 60 + (i % 4) * 30, x1 = 300 + (i % 3) * 60;
  line(x0, y, x1, y - 14, [255, 244, 220], 4);
}

// ---------- 7. the giant paper plane ----------
// Nose right, tail left, diving across the folded sky.
const nose: [number, number] = [838, 330];
const tailTop: [number, number] = [252, 468];
const tailBot: [number, number] = [330, 560];
const keel: [number, number] = [560, 470];
const paperHi: RGB = [255, 252, 240];
const paperMid: RGB = [238, 226, 200];
const paperShade: RGB = [198, 178, 150];
const paperEdge: RGB = [120, 96, 84];
// top wing (bright, catching the sun)
fillTriangle(nose[0], nose[1], tailTop[0], tailTop[1], keel[0], keel[1], paperHi);
// bottom wing (in shade)
fillTriangle(nose[0], nose[1], keel[0], keel[1], tailBot[0], tailBot[1], paperMid);
// centre fold panel
fillTriangle(nose[0], nose[1], 430, 500, keel[0], keel[1], paperShade);
// fold lines
line(nose[0], nose[1], keel[0], keel[1], paperEdge, 4);
line(nose[0], nose[1], tailTop[0], tailTop[1], paperEdge, 4);
line(nose[0], nose[1], tailBot[0], tailBot[1], paperEdge, 4);
line(tailTop[0], tailTop[1], keel[0], keel[1], paperEdge, 3);
line(keel[0], keel[1], tailBot[0], tailBot[1], paperEdge, 3);
// sun glint on the top wing
fillTriangle(700, 380, 800, 350, 690, 430, [255, 255, 255]);
// trailing paper scraps (deterministic)
for (let i = 0; i < 26; i++) {
  const t = rnd();
  const sx = 300 - t * 220 + rnd() * 30;
  const sy = 480 + t * 130 + (rnd() - 0.5) * 60;
  const s = 6 + rnd() * 12;
  const a = rnd() * Math.PI;
  const c: RGB = rnd() > 0.5 ? paperHi : [255, 190, 150];
  const dx = Math.cos(a) * s, dy = Math.sin(a) * s;
  quad(sx - dx, sy - dy, sx + dy, sy - dx, sx + dx, sy + dy, sx - dy, sy + dx, c);
}

// ---------- 8. hills + child silhouette ----------
for (let x = 0; x < W; x++) { // rolling dark hill
  const yTop = 800 + Math.sin(x / 260) * 22 - (x / W) * 30;
  for (let y = Math.floor(yTop); y < H; y++) px(x, y, [34, 22, 66]);
}
for (let x = 0; x < W; x++) { // nearer hill band
  const yTop = 880 + Math.sin(x / 180 + 1.2) * 14;
  for (let y = Math.floor(yTop); y < H; y++) px(x, y, [22, 14, 48]);
}
// small child watching, arms raised toward the plane
const chX = 430, chY = 812;
fillCircle(chX, chY - 52, 15, [16, 10, 36]);            // head
line(chX - 3, chY - 38, chX - 5, chY + 2, [16, 10, 36], 9); // body
line(chX - 5, chY + 2, chX - 16, chY + 34, [16, 10, 36], 8); // leg L
line(chX - 5, chY + 2, chX + 8, chY + 34, [16, 10, 36], 8);  // leg R
line(chX - 3, chY - 30, chX - 30, chY - 58, [16, 10, 36], 7); // arm L up
line(chX - 3, chY - 30, chX + 24, chY - 60, [16, 10, 36], 7); // arm R up
// tiny paper plane in the child's hand? no — a small kite string to the sky
line(chX + 24, chY - 60, chX + 60, chY - 130, [255, 240, 210], 2);

// ---------- 9. "WOW!" — hand-drawn 5x7 block letters, top left ----------
// Glyphs: W, O, ! — rows of 5 bits, top to bottom.
const GLYPHS: Record<string, string[]> = {
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "01010"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
};
function drawGlyph(g: string[], ox: number, oy: number, s: number, c: RGB): void {
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") {
        for (let dy = 0; dy < s; dy++)
          for (let dx = 0; dx < s; dx++) px(ox + col * s + dx, oy + r * s + dy, c);
      }
    }
  }
}
const word = "WOW!";
const gs = 13, gap = 16;
let tx = 58, ty = 56;
// dark outline pass, then white face
for (const pass of [[6, [46, 22, 70]], [0, [255, 250, 235]]] as const) {
  let x = tx + pass[0] / 2, y = ty + pass[0] / 2;
  const off = pass[0];
  for (const ch of word) {
    const g = GLYPHS[ch];
    // outline: draw glyph shifted in 8 directions when off>0, else once
    if (off > 0) {
      for (const [dx, dy] of [[-off, 0], [off, 0], [0, -off], [0, off], [-off, -off], [off, -off], [-off, off], [off, off]])
        drawGlyph(g, x + dx, y + dy, gs, pass[1]);
    } else {
      drawGlyph(g, x, y, gs, pass[1]);
    }
    x += 5 * gs + gap;
  }
}

// ---------- PNG encode (deterministic: filter Up, fixed zlib level) ----------
function crc32(data: Buffer): number {
  let table = (crc32 as any)._t as Int32Array | undefined;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as any)._t = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // scanlines: row 0 filter 0, rest filter 2 (Up) — smooth gradients compress well
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const rowStart = y * (1 + W * 3);
    raw[rowStart] = y === 0 ? 0 : 2;
    for (let x = 0; x < W * 3; x++) {
      const v = buf[y * W * 3 + x];
      raw[rowStart + 1 + x] = y === 0 ? v : (v - buf[(y - 1) * W * 3 + x] + 256) & 0xff;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
fs.mkdirSync(outDir, { recursive: true });
const png = encodePNG();
fs.writeFileSync(path.join(outDir, "entry.png"), png);
console.log(`wrote ${path.join(outDir, "entry.png")} ${png.length} bytes ${W}x${H}`);

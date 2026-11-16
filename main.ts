// The Day the Sky Folded — ai-excited-01
// Deterministic procedural render: the whole sky folds like origami.
// Pure Node stdlib only (node:fs, node:path, node:zlib). No network, no Date, no Math.random.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 960;
const H = 960;

// --- Seeded RNG (mulberry32) ---------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261117);

// --- Pixel buffer ----------------------------------------------------------
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function blendPixel(x: number, y: number, c: RGB, a: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  if (a <= 0) return;
  if (a >= 1) {
    setPixel(x, y, c);
    return;
  }
  const i = (y * W + x) * 3;
  px[i] = clamp255(Math.round(px[i] * (1 - a) + c[0] * a));
  px[i + 1] = clamp255(Math.round(px[i + 1] * (1 - a) + c[1] * a));
  px[i + 2] = clamp255(Math.round(px[i + 2] * (1 - a) + c[2] * a));
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function fillRect(x0: number, y0: number, w: number, h: number, c: RGB): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) setPixel(x, y, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB, alpha: number): void {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) blendPixel(x, y, c, alpha);
    }
  }
}

function fillTriangle(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB
): void {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
      const w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPixel(x, y, c);
    }
  }
}

function drawThickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const steps = Math.ceil(len);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    fillCircle(x0 + dx * t, y0 + dy * t, w / 2, c, 1);
  }
}

function fillQuad(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number, c: RGB
): void {
  fillTriangle(ax, ay, bx, by, cx, cy, c);
  fillTriangle(ax, ay, cx, cy, dx, dy, c);
}

// --- 1. Dawn sky gradient ---------------------------------------------------
const skyTop: RGB = [43, 16, 84];
const skyMid: RGB = [122, 34, 110];
const skyLow: RGB = [255, 122, 89];
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  const c = t < 0.55 ? mix(skyTop, skyMid, t / 0.55) : mix(skyMid, skyLow, (t - 0.55) / 0.45);
  for (let x = 0; x < W; x++) setPixel(x, y, c);
}

// --- 2. Folded-sky wedges radiating from the vanishing point ---------------
const VX = 480;
const VY = 400;
const wedgePalette: RGB[] = [
  [88, 28, 120],
  [150, 44, 130],
  [214, 74, 120],
  [255, 126, 95],
  [255, 178, 102],
  [178, 52, 140],
];
const WEDGES = 24;
const R_OUT = 860;
for (let i = 0; i < WEDGES; i++) {
  const a0 = (i / WEDGES) * Math.PI * 2;
  const a1 = ((i + 1) / WEDGES) * Math.PI * 2;
  const base = wedgePalette[i % wedgePalette.length];
  const shade = i % 2 === 0 ? 1.0 : 0.72;
  const col: RGB = [
    Math.round(base[0] * shade),
    Math.round(base[1] * shade),
    Math.round(base[2] * shade),
  ];
  fillTriangle(
    VX, VY,
    VX + Math.cos(a0) * R_OUT, VY + Math.sin(a0) * R_OUT,
    VX + Math.cos(a1) * R_OUT, VY + Math.sin(a1) * R_OUT,
    col
  );
  // Crease line along each fold edge, darker, so the origami reads clearly.
  drawThickLine(
    VX, VY,
    VX + Math.cos(a0) * R_OUT, VY + Math.sin(a0) * R_OUT,
    3, [30, 8, 55]
  );
}

// --- 3. The blazing sun at the vanishing point ------------------------------
// Glow rings, outermost to innermost: [radius, colour, alpha].
const SUN_GLOW_RINGS: Array<[number, RGB, number]> = [
  [150, [255, 190, 90], 0.22],
  [105, [255, 205, 110], 0.35],
  [68, [255, 232, 150], 0.9],
  [46, [255, 248, 205], 1],
];
for (const [radius, colour, alpha] of SUN_GLOW_RINGS) {
  fillCircle(VX, VY, radius, colour, alpha);
}
for (let r = 0; r < 8; r++) {
  const ang = (r / 8) * Math.PI * 2 + 0.35;
  drawThickLine(
    VX + Math.cos(ang) * 58, VY + Math.sin(ang) * 58,
    VX + Math.cos(ang) * 92, VY + Math.sin(ang) * 92,
    6, [255, 220, 130]
  );
}

// --- 4. Paper scraps trailing behind the plane ------------------------------
const scrapPalette: RGB[] = [
  [255, 255, 255],
  [255, 214, 220],
  [255, 178, 120],
  [230, 160, 255],
];
for (let s = 0; s < 30; s++) {
  const t = s / 30;
  const bx = 300 + t * 330 + (rand() - 0.5) * 90;
  const by = 250 + t * 120 + (rand() - 0.5) * 110 - t * t * 40;
  const size = 7 + rand() * 16;
  const rot = rand() * Math.PI * 2;
  const c = scrapPalette[Math.floor(rand() * scrapPalette.length)];
  const cs = Math.cos(rot) * size;
  const sn = Math.sin(rot) * size;
  fillQuad(
    bx - cs, by - sn,
    bx + sn * 0.6, by - cs * 0.6,
    bx + cs, by + sn,
    bx - sn * 0.6, by + cs * 0.6,
    c
  );
}

// --- 5. The giant paper plane, diving across the folded sky -----------------
const planeWhite: RGB = [255, 255, 255];
const planeShade: RGB = [214, 190, 235];
const planeDeep: RGB = [168, 140, 205];
// Nose points down-left, tail up-right: a steep dive.
fillTriangle(268, 428, 640, 210, 560, 330, planeWhite); // top facet
fillTriangle(268, 428, 560, 330, 470, 470, planeShade); // lower facet
fillTriangle(640, 210, 560, 330, 690, 300, planeDeep); // tail fin
fillTriangle(268, 428, 470, 470, 380, 520, planeDeep); // bottom fin
drawThickLine(268, 428, 560, 330, 4, [120, 90, 160]);
drawThickLine(268, 428, 640, 210, 4, [120, 90, 160]);

// --- 6. Dark hill at the bottom ----------------------------------------------
const hillCol: RGB = [26, 12, 46];
for (let y = 700; y < H; y++) {
  const ny = (y - 700) / (H - 700);
  const half = 620 * Math.sqrt(Math.max(0, 1 - ny * ny * 0.55)) + 60 * ny;
  const cx = 480;
  for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
    setPixel(x, y, hillCol);
  }
}
fillCircle(150, 760, 60, [38, 18, 66], 1);
fillCircle(830, 745, 70, [38, 18, 66], 1);

// --- 7. Small child on the hill, both arms raised ----------------------------
const childX = 480;
const childY = 792;
const skin: RGB = [255, 205, 170];
const cloth: RGB = [255, 120, 140];
const hair: RGB = [60, 30, 70];
fillCircle(childX, childY - 58, 17, skin, 1); // head
fillCircle(childX, childY - 66, 18, hair, 1); // hair cap
fillRect(childX - 6, childY - 70, 12, 8, hair);
fillTriangle(childX - 13, childY - 40, childX + 13, childY - 40, childX + 9, childY + 6, cloth); // body
fillTriangle(childX - 13, childY - 40, childX + 9, childY + 6, childX - 9, childY + 6, cloth);
drawThickLine(childX - 11, childY - 36, childX - 34, childY - 78, 7, skin); // left arm up
drawThickLine(childX + 11, childY - 36, childX + 34, childY - 78, 7, skin); // right arm up
fillCircle(childX - 36, childY - 80, 5, skin, 1);
fillCircle(childX + 36, childY - 80, 5, skin, 1);
drawThickLine(childX - 5, childY + 6, childX - 8, childY + 34, 7, [40, 20, 60]); // legs
drawThickLine(childX + 5, childY + 6, childX + 8, childY + 34, 7, [40, 20, 60]);

// --- 8. Big "WOW!" ------------------------------------------------------------
const glyphs: Record<string, string[]> = {
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
};
function drawGlyph(ch: string, x0: number, y0: number, scale: number, c: RGB): void {
  const g = glyphs[ch];
  if (!g) return;
  for (let r = 0; r < g.length; r++) {
    for (let col = 0; col < g[r].length; col++) {
      if (g[r][col] === "1") fillRect(x0 + col * scale, y0 + r * scale, scale, scale, c);
    }
  }
}
function drawText(text: string, x0: number, y0: number, scale: number, c: RGB): void {
  let x = x0;
  for (const ch of text) {
    drawGlyph(ch, x, y0, scale, c);
    x += 6 * scale;
  }
}
drawText("WOW!", 96, 96, 15, [40, 10, 60]); // drop shadow
drawText("WOW!", 90, 90, 15, [255, 255, 255]); // white letters

// --- 9. Minimal PNG encoder ---------------------------------------------------
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || ".";
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "entry.png");
fs.writeFileSync(outPath, encodePNG());
console.log("wrote " + outPath + " " + W + "x" + H);

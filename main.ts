// ai-excited-01 — deliver the finished artwork, nothing more.
//
// The picture already exists as entry.png next to this file. All this
// program does is place an exact copy of it into the output folder the
// harness asks for, then prove the copy is whole before it exits.
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const source = new URL("./entry.png", import.meta.url);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const target = join(outDir, "entry.png");

mkdirSync(outDir, { recursive: true });
copyFileSync(source, target);

const before = statSync(source).size;
const after = statSync(target).size;
if (before !== after) {
  throw new Error(`copy mismatch: source ${before} bytes, output ${after} bytes`);
}

console.log(`wrote ${target} (${after} bytes)`);

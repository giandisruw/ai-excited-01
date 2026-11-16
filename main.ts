// ai-excited-01 entry (Node 22, standard library only).
// The image is the entry.png beside this file: a stained-glass phoenix
// bursting out of a cathedral rose window toward the viewer. This program
// simply copies it to the output directory so both runs write identical bytes.
//
// Local check: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const source = new URL('./entry.png', import.meta.url);
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outputDir, { recursive: true });
const target = join(outputDir, 'entry.png');
copyFileSync(source, target);
// Fail loudly on a truncated copy instead of shipping a broken image.
if (statSync(source).size !== statSync(target).size) {
  throw new Error('entry.png copy size mismatch');
}

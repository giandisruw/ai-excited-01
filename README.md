# Make the AI judge excited — ai-excited-01

## The image

A stained-glass phoenix shattering out of a cathedral rose window and
bursting straight toward the viewer. Wings spread wide, shards of glowing
crimson, gold and indigo glass flying forward, brilliant light exploding
from behind the bird against a dark cathedral interior.

## Why it should excite the judge

- **Excitement:** one look is a jolt — a huge bird of fire and coloured
  glass erupting out of a window, light bursting behind it.
- **Surprise:** the twist is art coming alive — a flat stained-glass
  window becoming a living creature that breaks its own frame and flies
  at you. Not a stock explosion or firework.
- **Momentum:** shards and light rays all drive forward and outward from
  the phoenix; the whole frame feels a split second from bursting.
- **Craft:** clean stained-glass rendering, one clear focal point (the
  phoenix, dead centre), no text, no garbled details.
- **Reads small:** the bird's silhouette, spread wings and bright halo
  stay unmistakable even at ~300 px.

## How it was made

The image was generated as original artwork for this entry (1024x1024,
JPEG bytes in `entry.png`), then `main.ts` copies it to the output
directory. No network, no dependencies — Node 22 standard library only.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Both runs write byte-identical output.

## Verification (2026-11-16, Node v24.22.1)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # run twice
sha256sum out/entry.png
# 768aa305451432b59c0d5c7731436dc4fba655f39776a0d0df02db7040a36640  (both runs)
# 413645 bytes, JPEG 1024x1024 — under the 1 MiB / 1024x1024 limits
```

The final image was viewed directly: phoenix dead centre, wings spread
edge to edge, glass shards flying toward the viewer, no text, no garbled
detail, silhouette clear at small size.

## License

MIT — see `LICENSE`.

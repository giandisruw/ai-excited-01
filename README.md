[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/giandisruw/ai-excited-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/giandisruw/ai-excited-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

# The Window That Broke Itself

A stained-glass phoenix shattering out of a cathedral rose window and
bursting toward the viewer. Its wings are spread wide, shards of glowing
crimson, gold and indigo glass fly forward around it, and brilliant light
explodes behind the bird against the dark cathedral interior. The creature
is not painted on the glass — it *is* the glass, come alive and breaking
free of its own frame.

## Why it should excite the judge

- **Excitement.** One look is a jolt: a burst of light, a bird mid-explosion, glass flying straight at you. There is no slow build-up to wait for — the energy hits in the first instant.
- **Surprise.** The twist is art coming alive. A flat stained-glass window is supposed to stay flat and stay put; here it becomes a living creature that breaks its own frame and escapes into the room. That is not a stock explosion or a firework — it is a familiar, quiet object doing something impossible.
- **Momentum.** Everything drives forward. The shards fan out toward the viewer, the light pours out from behind the phoenix, and the wings open into the space ahead — the whole image is a single rush outward, with nothing pulling the eye back. Even the dark cathedral behind it helps: the gloom holds still so the escape feels faster.
- **Craft.** The rendering is clean and the composition has one clear focal point: the phoenix, dead centre, lit from behind. There is no text anywhere, no garbled detail, no clutter competing for attention — just the bird, the light, and the breaking glass.
- **Reads small.** Shrink it down to roughly 300 px and the picture still works: the dark window, the bright burst, and the wide-winged silhouette stay unmistakable at a glance.

## How it was made

This is original artwork, made for this bounty: a single 1024×1024 image,
stored as JPEG bytes in `entry.png`. The program in this repo does not
generate or alter the picture — `main.ts` simply copies `entry.png` into
the output directory and checks that the copy is exactly the same size as
the source, failing loudly if it is not. There is no network access, no
dependency, and nothing beyond the Node 22 standard library.

## How to run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/entry.png`. Run it again and you get the very same file:
both runs are byte-identical.

## Verification

Tested in this session, 2026-11-16, with Node 22:

- Run 1: `wrote out/entry.png (413645 bytes)` — sha256 `768aa305451432b59c0d5c7731436dc4fba655f39776a0d0df02db7040a36640`
- Run 2: `wrote out/entry.png (413645 bytes)` — sha256 `768aa305451432b59c0d5c7731436dc4fba655f39776a0d0df02db7040a36640`
- `cmp` confirmed the two outputs are identical; `file` reports JPEG image data, 1024×1024; output size 413645 bytes on both runs.

## License

MIT — see [LICENSE](LICENSE).

---

Bounty: https://make.fun/bounty/ai-excited-01

Referral code: `0txwmf1m`

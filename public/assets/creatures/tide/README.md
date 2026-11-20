# PokeCharm — water companion animation kit

One sprite sheet, eight animations, ready for a web widget.

| File | What it is |
|---|---|
| `tide-sheet.png` | 2400 × 1920, 8 columns × 8 rows, each frame 300 × 240, transparent. |
| `tide.css` | Drop-in styles — one class per state. |
| `tide-atlas.json` | Frame data for engines. |
| `tide-demo.html` | Self-contained demo (sheet embedded) with state and size controls. |
| `tide-preview.gif` | Looping showcase: idle → blink → happy → jump → sleep. |
| `tide.png` | The cleaned character on its own, transparent, 146 × 140. |

## Quick start

```html
<link rel="stylesheet" href="tide.css">
<div class="wpet wpet--idle"></div>
```

```js
pet.className = 'wpet wpet--attack';   // switch state
```

## States

| Row | Class | Loops | Length |
|---|---|---|---|
| 0 | `wpet--idle` | yes | 1144 ms |
| 1 | `wpet--walk` | yes | 800 ms |
| 2 | `wpet--run` | yes | 568 ms |
| 3 | `wpet--jump` | one-shot | 664 ms |
| 4 | `wpet--attack` | one-shot | 616 ms |
| 5 | `wpet--hurt` | one-shot | 728 ms |
| 6 | `wpet--sleep` | yes | 2000 ms |
| 7 | `wpet--happy` | one-shot | 888 ms |

One-shots hold their last frame. Return to idle:

```js
pet.addEventListener('animationend', () => {
  pet.className = 'wpet wpet--idle';
});
```

## Sizing

The element is natively 300 × 240. Scale the wrapper, never the element:

```html
<div class="wpet-stage wpet-stage--xl">   <!-- sm 0.75x, lg 1.5x, xl 2x -->
  <div class="wpet wpet--walk"></div>
</div>
```

## Frame geometry

- Frame: 300 × 240, cell = `(column * 300, row * 240)`
- Anchor: **(150, 209)** — horizontal centre, feet baseline at 87% of the frame height
- The creature occupies roughly 146 × 140 px inside each frame; the rest is padding for the jump arc and the water blast
- A baked ground shadow sits under the feet in every frame — don't add a CSS one on top

## Atlas shape

```json
{
  "name": "PokeCharm Water Companion",
  "id": "pokecharm-water-01",
  "image": "tide-sheet.png",
  "image_size": [2400, 1920],
  "frame_width": 300, "frame_height": 240,
  "columns": 8, "rows": 8, "frame_count": 64,
  "anchor": { "x": 150, "y": 209 },
  "animations": {
    "attack": {
      "row": 4, "y": 960, "frames": 8, "fps": 13,
      "frame_ms": 77, "duration_ms": 616, "loop": false,
      "rects": [[0,960,300,240], [300,960,300,240], "..."]
    }
  }
}
```

## Notes on the rig

The source was a single flat 88 × 88 render. It was background-keyed by flood fill from the border (not a chroma key, so the eye highlights and the white sclera survived), the anti-aliased fringe was stripped off the silhouette, and the artwork was integer-upscaled 2× to 146 × 140. **No median filter and no palette quantiser** — those were what smeared the eyes and flattened the colours in the first pass; the original colours are kept as drawn, and no fractional resampling is used anywhere.

Limbs are not cut out and rotated. Each leg is deformed row-by-row and each arm column-by-column, with displacement weighted to zero at the joint, so nothing can tear or leave a fragment. **Both eyes match.** In the source the far (left) eye was a 2 px sliver welded to the silhouette edge, which read as a smudge next to the big eye. It is now rebuilt from the near eye's own construction — dark pupil on the left, thin white sclera on the right, orange iris at the bottom, one soft glint — at a foreshortened scale (5 x 7 art px against the near eye's 12 x 11), aligned to the same top and bottom rows so the pair sits level. Same three palette colours as the near eye, no new hues. The old sliver is painted out and the patch blends into the head's shading per row. Blinking refills each eye row with that row's own skin tone and draws a curved lid across both. The attack is a water gun, and the mouth actually opens to fire it: frames 3-7 swap in an open-mouth pose (dark interior with a tongue) and the jet leaves from the left corner of that opening, with a burst ball at the lip, a thick tapering stream with a white core and deep-blue edge, thrown droplets and an extra spray on the peak frame. The mouth closes again on the last frame.

All 64 frames were verified programmatically: exact sheet size, 8 × 8 grid, every rect in bounds and 300 × 240, every cell populated, no artwork touching a frame edge (so no effect leaks into a neighbour), no orphaned single pixels, and a consistent feet baseline.

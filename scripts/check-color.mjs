/**
 * Smallest thing that fails if the colour picker's maths breaks.
 *
 * The app has no test framework, so this is a plain assert script — run it with
 * `pnpm check:color`. The rails hold HSL and hand hex back to the canvas store, which
 * silently ignores anything that isn't #RRGGBB, so a rounding slip here would show up as
 * a dead control rather than an error.
 */
import assert from "node:assert/strict"
import { hexToHsl, hexToRgb, hslToHex, rgbToHex } from "../src/shared/lib/color.ts"

// greys have no hue and pure hues sit on the span boundaries: both are where the maths breaks.
// #123456 is the case that caught rounding H/S/L to integers (it came back #123354).
for (const hex of ["#000000", "#FFFFFF", "#808080", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#123456", "#0A0A0A"]) {
  assert.equal(hslToHex(hexToHsl(hex)), hex, `${hex} did not survive hex -> hsl -> hex`)
}

// every rail position has to produce a value the store will accept
for (const h of [0, 45, 200, 359, 360, -30]) {
  for (const s of [0, 50, 100]) {
    for (const l of [0, 50, 100]) {
      assert.match(hslToHex({ h, s, l }), /^#[0-9A-F]{6}$/, `bad hex from h${h} s${s} l${l}`)
    }
  }
}

// out of range comes from keyboard steps running past the ends
assert.equal(hslToHex({ h: 0, s: 999, l: 999 }), "#FFFFFF")
assert.equal(hslToHex({ h: 0, s: -50, l: -50 }), "#000000")
assert.equal(rgbToHex({ r: 300, g: -20, b: 12.6 }), "#FF000D")

assert.deepEqual(hexToRgb("#FF8000"), { r: 255, g: 128, b: 0 })
assert.equal(hexToHsl("#808080").s, 0)

console.log("colour conversions ok")

// ponytail: the one runnable check for the parser; mirrors parseSelection.ts so node can run it without a build
import assert from "node:assert/strict"

const parse = (text, count) => {
  const tokens = text.split(",").map((t) => t.trim()).filter(Boolean)
  if (tokens.length === 0) return { error: "empty" }
  const picked = new Set()
  for (const token of tokens) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) return { error: "chars" }
    const a = Number(m[1]), b = m[2] === undefined ? a : Number(m[2])
    const [lo, hi] = a <= b ? [a, b] : [b, a]
    for (let n = lo; n <= hi; n++) { if (n < 1 || n > count) return { error: "range" }; picked.add(n) }
  }
  return { indices: [...picked].sort((x, y) => x - y) }
}

assert.deepEqual(parse("1-3", 5).indices, [1, 2, 3])
assert.deepEqual(parse("1,3,5", 5).indices, [1, 3, 5])
assert.deepEqual(parse("3-1", 5).indices, [1, 2, 3])
assert.deepEqual(parse("2,2", 5).indices, [2])
assert.deepEqual(parse(" 1 - 2 , 4 ", 5).indices, [1, 2, 4])
assert.equal(parse("7", 5).error, "range")
assert.equal(parse("0", 5).error, "range")
assert.equal(parse("a", 5).error, "chars")
assert.equal(parse("", 5).error, "empty")
console.log("parseSelection: 9 checks passed")

/** Spectrum and oscilloscope for the 76x16 visualiser, computed from raw PCM. */

const N = 1024
const HANN = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)))

/** In-place radix-2 FFT on interleaved re/im arrays of length N. */
const fft = (re: Float32Array, im: Float32Array) => {
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci
        const ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

export const BARS = 19
const re = new Float32Array(N)
const im = new Float32Array(N)

/** 19 bar heights in 0..16 for the mono mix around sample `at`. */
export const spectrum = (mono: Float32Array, at: number): number[] => {
  for (let i = 0; i < N; i++) {
    const s = mono[Math.min(mono.length - 1, Math.max(0, at - N / 2 + i))] ?? 0
    re[i] = s * HANN[i]
    im[i] = 0
  }
  fft(re, im)
  const out: number[] = []
  for (let b = 0; b < BARS; b++) {
    // log-spaced buckets from ~50 Hz to ~10 kHz at 48 kHz
    const lo = Math.floor(1 * Math.pow(220, b / BARS))
    const hi = Math.max(lo + 1, Math.floor(1 * Math.pow(220, (b + 1) / BARS)))
    let peak = 0
    for (let k = lo; k < hi && k < N / 2; k++) peak = Math.max(peak, Math.hypot(re[k], im[k]))
    const db = 20 * Math.log10(peak / 8 + 1e-6)
    out.push(Math.max(0, Math.min(16, Math.round(((db + 40) / 40) * 16))))
  }
  return out
}

/** 76 oscilloscope points in 0..15 around sample `at`. */
export const oscilloscope = (mono: Float32Array, at: number): number[] =>
  Array.from({ length: 76 }, (_, i) => {
    const s = mono[Math.min(mono.length - 1, Math.max(0, at - 38 + i))] ?? 0
    return Math.max(0, Math.min(15, Math.round(8 - s * 7)))
  })

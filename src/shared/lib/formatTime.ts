/** 125 -> "2:05"; null -> "--:--" while a duration is still loading. */
export const formatTime = (seconds: number | null) => {
  if (seconds == null || !Number.isFinite(seconds)) return "--:--"
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

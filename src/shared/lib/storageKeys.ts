/** Prefix for everything the app persists to localStorage. */
const PREFIX = "winamp-video-maker-"

export const key = (name: string) => PREFIX + name

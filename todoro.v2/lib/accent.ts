/**
 * Custom accent colours, kept legible on both grounds.
 *
 * A user-picked colour can't be trusted to read against the app's background —
 * a pale lemon vanishes on white, a navy vanishes on near-black. Rather than
 * refuse the colour or ship an unreadable UI, we nudge it toward the ground's
 * opposite until its relative luminance clears a threshold, then say so in the
 * UI so the change doesn't look like a bug.
 *
 * The resolved values for *both* themes are computed once at save time and
 * stored, so the pre-hydration script in app/layout.tsx can apply them without
 * re-deriving anything. That keeps the maths here, in TypeScript, instead of
 * duplicated inside an inline <script> string.
 */

export interface AccentVars {
  accent: string
  hover:  string
  dim:    string
  glow:   string
}

export interface AccentSet {
  raw:   string
  light: AccentVars
  dark:  AccentVars
}

/** Normalise 3- or 6-digit hex to `#rrggbb`; null if it isn't a colour. */
export function parseHex(value: string): string | null {
  let h = String(value ?? "").trim().replace(/^#/, "")
  if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toLowerCase()}` : null
}

function channels(hex: string): [number, number, number] {
  const n = hex.slice(1)
  return [0, 2, 4].map(i => parseInt(n.substr(i, 2), 16)) as [number, number, number]
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex)
    .map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Blend `hex` toward `target` by `t` (0–1). */
export function mix(hex: string, target: string, t: number): string {
  const a = channels(hex), b = channels(target)
  return "#" + a
    .map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0"))
    .join("")
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// These guarantee the accent stays *distinguishable from the ground* — a pale
// colour won't wash out on white, a dark one won't vanish into near-black. They
// do NOT guarantee 4.5:1 for white text sitting on the accent: at the light-mode
// ceiling that lands near 3.2:1, which clears AA for large/bold text but not for
// small. Accent-on-ground text is fine either way; it's white-on-accent at small
// sizes that's the exception. Tightening the ceiling to ~0.18 would fix it, at
// the cost of visibly darkening most colours a user picks — and the nine presets
// don't go through here at all, so they'd disagree with custom ones.
const MIN_LUM_ON_DARK  = 0.24
const MAX_LUM_ON_LIGHT = 0.28
const STEP  = 0.07
const CAP   = 26                // ~85% blend; far past any colour that needs it

/**
 * Nudge a colour until it reads on the given ground. Returns the input
 * unchanged when it already clears the threshold.
 */
export function safeAccent(raw: string, dark: boolean): string {
  let h = parseHex(raw) ?? (dark ? "#ff4d63" : "#e11d48")
  let i = 0
  if (dark) {
    while (relativeLuminance(h) < MIN_LUM_ON_DARK && i++ < CAP) h = mix(h, "#ffffff", STEP)
  } else {
    while (relativeLuminance(h) > MAX_LUM_ON_LIGHT && i++ < CAP) h = mix(h, "#000000", STEP)
  }
  return h
}

function varsFor(raw: string, dark: boolean): AccentVars {
  const accent = safeAccent(raw, dark)
  return {
    accent,
    // Presets darken on hover in both themes; matching that keeps custom
    // colours feeling like the built-ins rather than a separate mode.
    hover: mix(accent, "#000000", 0.12),
    dim:   rgba(accent, 0.15),
    glow:  rgba(accent, 0.45),
  }
}

/** Everything the app needs to render one custom accent, both themes. */
export function buildAccentSet(raw: string): AccentSet | null {
  const hex = parseHex(raw)
  if (!hex) return null
  return { raw: hex, light: varsFor(hex, false), dark: varsFor(hex, true) }
}

/**
 * Plain-language description of what the nudge did, shown next to the picker.
 * A colour that silently changes reads as a bug; a colour that explains itself
 * reads as a feature.
 */
export function adjustmentNote(raw: string): string {
  const hex = parseHex(raw)
  if (!hex) return "Enter a 6-digit hex colour"
  const onLight = safeAccent(hex, false)
  const onDark  = safeAccent(hex, true)
  const movedLight = onLight !== hex
  const movedDark  = onDark  !== hex
  if (!movedLight && !movedDark) return "Reads clearly on both themes"
  if (movedLight && movedDark)   return "Darkened for light mode, lightened for dark — kept legible"
  return movedLight
    ? "Darkened a little in light mode so it stays legible"
    : "Lightened a little in dark mode so it stays legible"
}

/** Applies (or clears) the custom accent on <html>. */
export function applyAccentSet(set: AccentSet | null, dark: boolean) {
  const s = document.documentElement.style
  if (!set) {
    s.removeProperty("--accent")
    s.removeProperty("--accent-hover")
    s.removeProperty("--accent-dim")
    s.removeProperty("--accent-glow")
    return
  }
  const v = dark ? set.dark : set.light
  s.setProperty("--accent", v.accent)
  s.setProperty("--accent-hover", v.hover)
  s.setProperty("--accent-dim", v.dim)
  s.setProperty("--accent-glow", v.glow)
}

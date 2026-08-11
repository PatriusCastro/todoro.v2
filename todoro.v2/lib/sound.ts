/**
 * Session alerts.
 *
 * The original chime was three bare sine tones, 0.15s apart, peaking at 0.15
 * gain — about 0.85s of quiet beeping that was easy to miss from across a room,
 * which is exactly when you need it. These are longer, layered with harmonics
 * so they carry, and repeat their motif rather than fading after one pass.
 *
 * Everything is synthesised at play time, so the built-in sounds cost no bytes
 * and work offline. A user-supplied file is the one exception.
 */

export type AlertSound = "chime" | "bell" | "marimba" | "custom"

export const ALERT_SOUNDS: { id: AlertSound; label: string; hint: string }[] = [
  { id: "chime",   label: "Chime",   hint: "Rising three-note phrase, played twice" },
  { id: "bell",    label: "Bell",    hint: "Struck bell with a long tail" },
  { id: "marimba", label: "Marimba", hint: "Soft wooden pattern, least startling" },
  { id: "custom",  label: "Custom",  hint: "Your own file" },
]

/** Longest a custom sound is allowed to play, so a whole song can't run on. */
const MAX_CUSTOM_SECONDS = 8

/** Upload cap. localStorage is a ~5MB budget shared with tasks and history. */
export const MAX_CUSTOM_BYTES = 512 * 1024

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!ctx) ctx = new AudioContext()
    // Browsers suspend the context until a gesture; resume on each use so an
    // alert fired by the timer isn't silently dropped.
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  } catch { return null }
}

interface ToneOpts {
  freq: number
  start: number
  dur: number
  peak: number
  type?: OscillatorType
}

function tone(c: AudioContext, out: GainNode, { freq, start, dur, peak, type = "sine" }: ToneOpts) {
  const osc = c.createOscillator()
  const g   = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.connect(g); g.connect(out)
  // Ramp in over 12ms rather than jumping — a step change in gain clicks.
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/** A struck note: fundamental plus two quieter harmonics, so it carries. */
function struck(c: AudioContext, out: GainNode, freq: number, at: number, dur: number, peak: number) {
  tone(c, out, { freq,       start: at, dur,           peak })
  tone(c, out, { freq: freq * 2,   start: at, dur: dur * 0.6, peak: peak * 0.32 })
  tone(c, out, { freq: freq * 2.99, start: at, dur: dur * 0.35, peak: peak * 0.14 })
}

function playSynth(kind: Exclude<AlertSound, "custom">, rising: boolean, volume: number) {
  const c = audio()
  if (!c) return
  const out = c.createGain()
  out.gain.value = Math.max(0, Math.min(1, volume))
  out.connect(c.destination)
  const t0 = c.currentTime + 0.03

  if (kind === "bell") {
    // One strike, long tail, then a softer echo — ~3.4s.
    struck(c, out, rising ? 660 : 528, t0,       2.2, 0.34)
    struck(c, out, rising ? 660 : 528, t0 + 1.1, 1.6, 0.16)
    struck(c, out, rising ? 990 : 792, t0 + 2.0, 1.4, 0.10)
    return
  }

  if (kind === "marimba") {
    // Wooden, quick per-note decay but eight notes over ~2.5s. This is the
    // gentle option — gentle should still mean long enough to register.
    const seq = rising
      ? [523, 659, 784, 1047, 784, 659, 784, 1047]
      : [784, 659, 523, 392, 523, 659, 523, 392]
    seq.forEach((f, i) => {
      const at = t0 + i * 0.22
      tone(c, out, { freq: f,     start: at, dur: 0.68, peak: 0.3,  type: "triangle" })
      tone(c, out, { freq: f * 4, start: at, dur: 0.14, peak: 0.05, type: "sine" })
    })
    return
  }

  // chime — the default. Three-note phrase, held last note, repeated. ~2.6s.
  const phrase = rising ? [523, 659, 784] : [784, 659, 523]
  for (const pass of [0, 1]) {
    const base = t0 + pass * 1.25
    phrase.forEach((f, i) => {
      const last = i === phrase.length - 1
      struck(c, out, f, base + i * 0.2, last ? 1.15 : 0.55, last ? 0.34 : 0.28)
    })
  }
}

let customEl: HTMLAudioElement | null = null

function playCustom(src: string, volume: number) {
  try {
    customEl?.pause()
    const el = new Audio(src)
    el.volume = Math.max(0, Math.min(1, volume))
    customEl = el
    void el.play().catch(() => {})
    window.setTimeout(() => { if (customEl === el) { el.pause(); el.currentTime = 0 } },
      MAX_CUSTOM_SECONDS * 1000)
  } catch {}
}

export interface AlertOptions {
  sound:   AlertSound
  custom?: string | null
  volume?: number
  /** Focus ending gets the rising phrase, a break ending the falling one. */
  rising?: boolean
}

export function playAlert({ sound, custom, volume = 0.9, rising = true }: AlertOptions) {
  if (sound === "custom") {
    if (custom) { playCustom(custom, volume); return }
    // Nothing uploaded — fall back rather than going silent.
    playSynth("chime", rising, volume)
    return
  }
  playSynth(sound, rising, volume)
}

/** Stops a preview that's still running. */
export function stopAlert() {
  try { customEl?.pause(); if (customEl) customEl.currentTime = 0 } catch {}
}

export function readAudioFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("audio/")) return reject(new Error("That isn't an audio file."))
    if (file.size > MAX_CUSTOM_BYTES) {
      return reject(new Error(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep it under ${Math.round(MAX_CUSTOM_BYTES / 1024)} KB — it has to share storage with your tasks and history.`
      ))
    }
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Couldn't read that file."))
    reader.readAsDataURL(file)
  })
}

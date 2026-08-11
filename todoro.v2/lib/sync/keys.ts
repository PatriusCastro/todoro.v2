/**
 * Every `todoro:` localStorage key, and what sync does with it.
 *
 * This is the spec the rest of lib/sync reads from. A key that isn't listed
 * here is a key that silently never syncs, which is why keys.test.ts scans the
 * source tree and fails if it finds one that isn't classified.
 */

export type SyncClass =
  /** Belongs to the account and rides in its own table. */
  | "collection"
  /** Belongs to the account and rides as a column on the settings row. */
  | "setting"
  /** Belongs to the account but is a counter — synced as deltas, never a value. */
  | "counter"
  /** A large data-URL, isolated so it never rides a settings write. */
  | "asset"
  /** Stays on this device. Never uploaded, never applied from a pull. */
  | "device"
  /** Read-only migration source. Nothing writes it any more. */
  | "legacy"

export interface KeySpec {
  /** Column on `settings`, or table for collections/assets. Absent for device keys. */
  readonly column?: string
  readonly why?: string
}

export const SYNC_KEYS: Readonly<Record<string, KeySpec & { readonly kind: SyncClass }>> = {
  // ── Collections ───────────────────────────────────────────────────────────
  "todoro:tasks":    { kind: "collection", column: "tasks" },
  "todoro:projects": { kind: "collection", column: "projects" },
  "todoro:history":  { kind: "collection", column: "sessions" },

  // ── Counters ──────────────────────────────────────────────────────────────
  // Last-write-wins on a counter destroys increments: +80 earned offline on one
  // device and +50 on another becomes 80, not 130. These travel as deltas.
  // ── Spend ledger ──────────────────────────────────────────────────────────
  // One append-only log rather than three mutable numbers. Points spent,
  // freezes held and protected dates are all derived from it, and earnings come
  // solely from `sessions` — so none of them is a value a client can assert.
  "todoro:ops": { kind: "collection", column: "point_ops",
    why: "Append-only and id'd, so a retried push can't double-count a purchase" },

  // Read once on upgrade for whatever a device held before the ledger existed,
  // then never written again. Not synced: the ops they seeded are.
  "todoro:freezes":        { kind: "legacy", why: "Superseded by todoro:ops" },
  "todoro:protectedDates": { kind: "legacy", why: "Superseded by todoro:ops" },
  "todoro:points":         { kind: "legacy", why: "Superseded by earnings derived from sessions" },
  "todoro:spent":          { kind: "legacy", why: "Superseded by todoro:ops" },

  // ── Settings ──────────────────────────────────────────────────────────────
  "todoro:userName":     { kind: "setting", column: "user_name" },
  "todoro:dailyGoal":    { kind: "setting", column: "daily_goal" },
  "todoro:theme":        { kind: "setting", column: "theme" },
  "todoro:accentTheme":  { kind: "setting", column: "accent_theme" },
  "todoro:accentCustom": { kind: "setting", column: "accent_custom" },
  "todoro:mode":         { kind: "setting", column: "mode" },
  "todoro:focusMins":    { kind: "setting", column: "focus_mins" },
  "todoro:breakMins":    { kind: "setting", column: "break_mins" },
  "todoro:sound":        { kind: "setting", column: "sound" },
  "todoro:alertSound":   { kind: "setting", column: "alert_sound" },
  "todoro:alertVolume":  { kind: "setting", column: "alert_volume" },
  "todoro:quickMode":    { kind: "setting", column: "quick_mode" },
  "todoro:reverseMode":  { kind: "setting", column: "reverse_mode" },
  "todoro:autoStart":    { kind: "setting", column: "auto_start" },
  "todoro:leaderboard":  { kind: "setting", column: "leaderboard",
    why: "Consent to publish a name and weekly hours — it belongs to the account, so joining on one device joins on all of them" },
  "todoro:pinned":       { kind: "setting", column: "pinned",
    why: "Lives outside React in usePinnedTasks, so it needs its own hydrate path" },

  // ── Assets ────────────────────────────────────────────────────────────────
  "todoro:avatarUrl":   { kind: "asset", column: "avatar" },
  "todoro:alertCustom": { kind: "asset", column: "alert_sound",
    why: "Up to 512KB before base64 — must never ride a settings write" },

  // ── Device-local ──────────────────────────────────────────────────────────
  "todoro:tab":   { kind: "device", why: "Which tab the laptop is on is not a fact about the phone" },
  "todoro:timer": { kind: "device", why: "A paused countdown is device state, and it ticks every second" },
  "todoro:notifications": { kind: "device",
    why: "Mirrors a per-device OS permission; syncing it enables a toggle the device never granted" },
  "todoro:notifPrompted":  { kind: "device", why: "One-time nudge, per device" },
  "todoro:swipeHintSeen":  { kind: "device", why: "One-time coaching, per device. Stored raw, not JSON" },
  "todoro:railCollapsed":  { kind: "device",
    why: "A rail width belongs to a screen, not an account — the phone has no rail. Stored raw, not JSON" },
  "todoro:onboarded":      { kind: "device",
    why: "Already derived from userName, which does sync — syncing this would skip a new device's welcome" },
  "todoro:deviceId": { kind: "device", why: "Identifies this device to the outbox" },
  "todoro:sync":     { kind: "device", why: "Pull watermarks and schema version" },

  // ── Legacy ────────────────────────────────────────────────────────────────
  "todoro:dark": { kind: "legacy", why: "Pre-tri-state theme. Read once for migration, never written" },
} as const

export type SyncedKey = keyof typeof SYNC_KEYS

export const isKnownKey = (key: string): key is SyncedKey => key in SYNC_KEYS

export function classOf(key: string): SyncClass | null {
  return isKnownKey(key) ? SYNC_KEYS[key].kind : null
}

/** Keys that leave this device. Everything not device-local or legacy. */
export function syncedKeys(): string[] {
  return Object.keys(SYNC_KEYS).filter(k => {
    const kind = SYNC_KEYS[k as SyncedKey].kind
    return kind !== "device" && kind !== "legacy"
  })
}

export function keysOfClass(kind: SyncClass): string[] {
  return Object.keys(SYNC_KEYS).filter(k => SYNC_KEYS[k as SyncedKey].kind === kind)
}

/** Maps a `setting` key to its settings-row column, and back. */
export const SETTING_COLUMNS: Readonly<Record<string, string>> = Object.fromEntries(
  keysOfClass("setting").map(k => [k, SYNC_KEYS[k as SyncedKey].column!]),
)

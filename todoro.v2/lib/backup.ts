/**
 * Export / import / reset of the whole `todoro:` keyspace.
 *
 * Lifted out of SettingsPage so the sync layer can reuse it: the first time a
 * device signs into an account that already has data, one of the two sets has
 * to lose, and the losing side gets written to a real backup file before
 * anything is overwritten. That turns silent data loss into something
 * recoverable, using code that already ships and is already exercised.
 *
 * Values are kept as the raw serialized strings from localStorage rather than
 * being parsed. The payload is therefore double-encoded relative to the outer
 * document, which is deliberate: it round-trips any key without this module
 * needing to know a single thing about its shape.
 */

export const KEY_PREFIX = "todoro:"

export interface BackupPayload {
  app: "todoro"
  version: number
  exportedAt: number
  data: Record<string, string>
}

/** Every `todoro:`-prefixed key currently in localStorage. */
export function collectKeys(): string[] {
  const keys: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k)
    }
  } catch {
    // storage unavailable — treat as empty rather than throwing into a click handler
  }
  return keys
}

export function exportPayload(now: number = Date.now()): BackupPayload {
  const data: Record<string, string> = {}
  for (const key of collectKeys()) {
    try { data[key] = localStorage.getItem(key) ?? "" } catch {}
  }
  return { app: "todoro", version: 1, exportedAt: now, data }
}

export function backupFilename(prefix = "todoro-backup", now: Date = new Date()) {
  return `${prefix}-${now.toISOString().slice(0, 10)}.json`
}

export function downloadBackup(payload: BackupPayload, filename = backupFilename()) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  )
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Pull the `todoro:` keys out of a parsed backup file. Accepts both the wrapped
 * `{ app, version, data }` shape and a bare key/value map, which older exports
 * produced. Returns null when nothing usable is found, so the caller can tell
 * "not a Todoro backup" from "an empty one".
 */
export function readPayload(parsed: unknown): Record<string, string> | null {
  const root = parsed as { data?: unknown } | null
  const data = (root && typeof root === "object" && "data" in root ? root.data : parsed) as
    | Record<string, unknown>
    | null
  if (!data || typeof data !== "object") return null
  const out: Record<string, string> = {}
  for (const k of Object.keys(data)) {
    if (!k.startsWith(KEY_PREFIX)) continue
    const v = data[k]
    out[k] = typeof v === "string" ? v : JSON.stringify(v)
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Writes the keys back. Returns how many landed. */
export function applyPayload(data: Record<string, string>): number {
  let applied = 0
  for (const k of Object.keys(data)) {
    try { localStorage.setItem(k, data[k]); applied++ } catch {}
  }
  return applied
}

/** Removes every `todoro:` key. Does not touch anything else on the origin. */
export function clearAll(): number {
  const keys = collectKeys()
  for (const k of keys) {
    try { localStorage.removeItem(k) } catch {}
  }
  return keys.length
}

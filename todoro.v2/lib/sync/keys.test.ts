import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { classOf, isKnownKey, keysOfClass, SETTING_COLUMNS, SYNC_KEYS, syncedKeys } from "./keys"

const ROOT = join(__dirname, "..", "..")
const SEARCH_DIRS = ["app", "components", "hooks", "lib"]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(full)
  }
  return out
}

/** Every `todoro:...` string literal that appears anywhere in the source. */
function keysUsedInSource(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const dir of SEARCH_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, "utf8")
      for (const m of src.matchAll(/["'`](todoro:[A-Za-z0-9_.-]+)["'`]/g)) {
        const key = m[1]
        found.set(key, [...(found.get(key) ?? []), file.slice(ROOT.length + 1)])
      }
    }
  }
  return found
}

describe("key catalogue", () => {
  // The whole point of this file. A key nobody classified is a key that never
  // syncs, and nothing else would ever tell you.
  it("classifies every todoro: key that appears in the source", () => {
    const unclassified = [...keysUsedInSource().entries()]
      .filter(([key]) => !isKnownKey(key))
      .map(([key, files]) => `${key} (used in ${files.join(", ")})`)

    expect(unclassified, "add these to SYNC_KEYS in lib/sync/keys.ts").toEqual([])
  })

  it("does not list keys the source never uses", () => {
    const used = keysUsedInSource()
    // `todoro:deviceId` and `todoro:sync` are written by the sync engine, which
    // does not exist yet; everything else should already appear somewhere.
    const pending = new Set(["todoro:deviceId", "todoro:sync"])
    const orphans = Object.keys(SYNC_KEYS).filter(k => !used.has(k) && !pending.has(k))

    expect(orphans, "stale entries in SYNC_KEYS").toEqual([])
  })
})

describe("classification", () => {
  it("never syncs device-local or legacy keys", () => {
    const synced = new Set(syncedKeys())
    for (const k of [...keysOfClass("device"), ...keysOfClass("legacy")]) {
      expect(synced.has(k), `${k} must not sync`).toBe(false)
    }
  })

  it("keeps the timer device-local, since it is written every second", () => {
    expect(classOf("todoro:timer")).toBe("device")
  })

  it("keeps both large data-URLs out of the settings row", () => {
    expect(classOf("todoro:alertCustom")).toBe("asset")
    expect(classOf("todoro:avatarUrl")).toBe("asset")
    expect(SETTING_COLUMNS["todoro:alertCustom"]).toBeUndefined()
    expect(SETTING_COLUMNS["todoro:avatarUrl"]).toBeUndefined()
  })

  it("treats points and freezes as counters, not values", () => {
    expect(classOf("todoro:points")).toBe("counter")
    expect(classOf("todoro:freezes")).toBe("counter")
  })

  it("gives every non-device key a destination", () => {
    for (const k of syncedKeys()) {
      expect(SYNC_KEYS[k as keyof typeof SYNC_KEYS].column, `${k} needs a column`).toBeTruthy()
    }
  })

  it("maps each settings key to a distinct column", () => {
    const cols = Object.values(SETTING_COLUMNS)
    expect(new Set(cols).size).toBe(cols.length)
  })

  it("returns null for anything unknown", () => {
    expect(classOf("todoro:nope")).toBeNull()
    expect(classOf("sb-abc-auth-token")).toBeNull()
  })
})

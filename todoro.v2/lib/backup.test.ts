import { beforeEach, describe, expect, it } from "vitest"
import { applyPayload, clearAll, collectKeys, exportPayload, readPayload } from "./backup"

/** Minimal localStorage — the module only uses key/length/get/set/remove. */
function stubStorage() {
  const map = new Map<string, string>()
  const store: Storage = {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => { map.clear() },
  }
  globalThis.localStorage = store
  return map
}

beforeEach(() => { stubStorage() })

describe("collectKeys", () => {
  it("takes only the todoro namespace", () => {
    localStorage.setItem("todoro:tasks", "[]")
    localStorage.setItem("todoro:points", "10")
    localStorage.setItem("sb-abc-auth-token", "secret")
    localStorage.setItem("unrelated", "x")
    expect(collectKeys().sort()).toEqual(["todoro:points", "todoro:tasks"])
  })

  it("is empty when nothing is stored", () => {
    expect(collectKeys()).toEqual([])
  })
})

describe("exportPayload", () => {
  it("keeps values as raw serialized strings, not re-parsed", () => {
    localStorage.setItem("todoro:tasks", '[{"id":"1"}]')
    const p = exportPayload(1700000000000)
    expect(p).toEqual({
      app: "todoro",
      version: 1,
      exportedAt: 1700000000000,
      data: { "todoro:tasks": '[{"id":"1"}]' },
    })
  })

  it("never captures another app's keys", () => {
    localStorage.setItem("todoro:points", "5")
    localStorage.setItem("sb-abc-auth-token", "secret")
    expect(Object.keys(exportPayload().data)).toEqual(["todoro:points"])
  })

  it("never captures the session token, which would put a credential in a shared file", () => {
    localStorage.setItem("todoro:points", "5")
    // Supabase's storageKey is dashed precisely so it falls outside this scan.
    localStorage.setItem("todoro-auth", "refresh-token")
    const keys = Object.keys(exportPayload().data)
    expect(keys).toEqual(["todoro:points"])
    expect(keys.some(k => k.includes("auth"))).toBe(false)
  })
})

describe("readPayload", () => {
  it("reads the wrapped shape", () => {
    expect(readPayload({ app: "todoro", version: 1, data: { "todoro:points": "5" } }))
      .toEqual({ "todoro:points": "5" })
  })

  it("reads a bare key/value map, as older exports produced", () => {
    expect(readPayload({ "todoro:points": "5" })).toEqual({ "todoro:points": "5" })
  })

  it("re-serializes values that arrive already parsed", () => {
    expect(readPayload({ data: { "todoro:points": 5 } })).toEqual({ "todoro:points": "5" })
  })

  it("drops foreign keys rather than importing them", () => {
    expect(readPayload({ data: { "todoro:points": "5", evil: "x" } }))
      .toEqual({ "todoro:points": "5" })
  })

  it("is null for anything without todoro keys", () => {
    expect(readPayload({ data: { nope: "1" } })).toBeNull()
    expect(readPayload({})).toBeNull()
    expect(readPayload(null)).toBeNull()
    expect(readPayload("not a backup")).toBeNull()
    expect(readPayload(42)).toBeNull()
  })
})

describe("round trip", () => {
  it("export -> read -> apply restores every key exactly", () => {
    localStorage.setItem("todoro:tasks", '[{"id":"1","title":"a"}]')
    localStorage.setItem("todoro:points", "250")
    localStorage.setItem("todoro:swipeHintSeen", "1")   // raw, not JSON

    const payload = exportPayload()
    stubStorage()                                        // simulate a clean device
    expect(collectKeys()).toEqual([])

    const data = readPayload(payload)
    expect(data).not.toBeNull()
    expect(applyPayload(data!)).toBe(3)

    expect(localStorage.getItem("todoro:tasks")).toBe('[{"id":"1","title":"a"}]')
    expect(localStorage.getItem("todoro:points")).toBe("250")
    expect(localStorage.getItem("todoro:swipeHintSeen")).toBe("1")
  })

  it("survives a JSON stringify/parse hop, as a real file does", () => {
    localStorage.setItem("todoro:tasks", '[{"id":"1"}]')
    const onDisk = JSON.stringify(exportPayload())
    stubStorage()
    applyPayload(readPayload(JSON.parse(onDisk))!)
    expect(localStorage.getItem("todoro:tasks")).toBe('[{"id":"1"}]')
  })
})

describe("clearAll", () => {
  it("removes todoro keys and leaves everything else", () => {
    localStorage.setItem("todoro:tasks", "[]")
    localStorage.setItem("todoro:points", "1")
    localStorage.setItem("sb-abc-auth-token", "secret")

    expect(clearAll()).toBe(2)
    expect(collectKeys()).toEqual([])
    // Documents today's behaviour: the auth token survives a reset, which is
    // why "Reset all data" has to sign out explicitly once sync is on.
    expect(localStorage.getItem("sb-abc-auth-token")).toBe("secret")
  })
})

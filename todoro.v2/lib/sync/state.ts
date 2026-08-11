import { type ShadowMap } from "./types"

/**
 * Per-device sync bookkeeping: which account this device is linked to, how far
 * it has pulled, and the content hashes as of that pull.
 *
 * Lives in localStorage rather than IndexedDB. The original plan said IndexedDB
 * to keep it out of the 5MB origin budget, but dropping the outbox (push
 * re-reads state instead of queueing serialized payloads) left only hashes to
 * store — roughly 55 bytes per row, so a few KB against a budget already
 * holding a 512KB audio data-URL. Not worth an async store and its ceremony.
 * Revisit if history ever moves here too.
 */

const KEY = "todoro:sync"
const SCHEMA_VERSION = 1

export interface SyncMeta {
  schemaVersion: number
  /** auth.uid() this device is linked to. A different one means start over. */
  accountId: string | null
  /** Server timestamp of the newest row seen. Null until the first pull. */
  pulledAt: string | null
  /** Whether a pull has ever succeeded — gates deletions. */
  everPulled: boolean
  shadow: {
    tasks: ShadowMap
    projects: ShadowMap
    settings: Record<string, string>
  }
}

export function emptyMeta(accountId: string | null = null): SyncMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    accountId,
    pulledAt: null,
    everPulled: false,
    shadow: { tasks: {}, projects: {}, settings: {} },
  }
}

export function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyMeta()
    const parsed = JSON.parse(raw) as Partial<SyncMeta>
    // A schema bump invalidates the shadow rather than trying to migrate it.
    // A wrong shadow is worse than no shadow: it makes unchanged rows look
    // edited, or edited rows look untouched.
    if (parsed.schemaVersion !== SCHEMA_VERSION) return emptyMeta(parsed.accountId ?? null)
    return {
      schemaVersion: SCHEMA_VERSION,
      accountId: parsed.accountId ?? null,
      pulledAt: parsed.pulledAt ?? null,
      everPulled: Boolean(parsed.everPulled),
      shadow: {
        tasks:    parsed.shadow?.tasks    ?? {},
        projects: parsed.shadow?.projects ?? {},
        settings: parsed.shadow?.settings ?? {},
      },
    }
  } catch {
    return emptyMeta()
  }
}

export function saveMeta(meta: SyncMeta): void {
  try { localStorage.setItem(KEY, JSON.stringify(meta)) } catch {}
}

export function clearMeta(): void {
  try { localStorage.removeItem(KEY) } catch {}
}

/**
 * Signing into a different account must not reuse the previous one's shadow —
 * the ids would be foreign, every local row would look new, and the merge would
 * try to push one account's data into another.
 */
export function metaForAccount(accountId: string): SyncMeta {
  const meta = loadMeta()
  return meta.accountId === accountId ? meta : emptyMeta(accountId)
}

export type Hash = string

/** Content hash per id, as of the last successful sync. */
export type ShadowMap = Record<string, Hash>

export interface RemoteRow<T> {
  row: T
  /** Server-assigned. Never trust a client clock for ordering. */
  updatedAt: string
  deletedAt: string | null
}

export interface MergeResult<T> {
  /** What local state should become. */
  next: T[]
  /** Rows this device changed, to push. */
  push: T[]
  /** Ids this device deleted, to tombstone. */
  tombstone: string[]
  /** Shadow for the next round: id -> hash of the merged row. */
  shadow: ShadowMap
}

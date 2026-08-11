/** One completed focus session. Append-only, immutable, and the sole input to
 *  the streak — which is why `at` is the client's epoch ms, preserved verbatim. */
export interface SessionRecord {
  taskId:    string
  taskTitle: string
  focusMins: number
  at:        number
}
